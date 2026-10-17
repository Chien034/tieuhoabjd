-- Tiểu Hoa BJD: khách chọn mức trả trước (tối thiểu 50%) + tự xác nhận thanh toán chuyển khoản (SePay).
-- Dán hết vào Supabase > SQL Editor rồi bấm Run. Chạy lại nhiều lần vẫn an toàn, không mất dữ liệu.
-- Chạy SAU các file cũ (video-bien-the.sql, ma-giam-gia.sql…). Nội dung giống các phần tương ứng trong schema.sql.

-- ---------------------------------------------------------------- CỘT & BẢNG MỚI
-- Số tiền khách đã trả (cộng dồn qua các lần chuyển khoản / cổng thanh toán)
alter table public.orders add column if not exists paid_amount bigint not null default 0;
-- Đơn có từ trước khi có cột này: suy ra số đã trả từ trạng thái thanh toán
update public.orders set paid_amount = case payment_status when 'da_coc' then deposit else total end
 where paid_amount = 0 and payment_status in ('da_coc', 'da_thanh_toan');

-- Mọi khoản tiền nhận được (chuyển khoản báo qua SePay, VNPay, MoMo). Mỗi giao dịch chỉ ghi một lần.
create table if not exists public.payments (
  id bigserial primary key,
  gateway text not null,
  ref text not null,                       -- mã giao dịch của ngân hàng / cổng
  order_code text,                         -- mã đơn tìm được trong nội dung (null = không khớp đơn nào)
  amount bigint not null,
  content text not null default '',
  result text not null default '',         -- ok | khong_khop
  created_at timestamptz not null default now(),
  unique (gateway, ref)
);
create index if not exists payments_order_idx on public.payments (order_code);

-- Thông báo cho shop trong Quản trị (tiền về, đơn tự xác nhận, chuyển khoản không khớp đơn)
create table if not exists public.shop_notices (
  id bigserial primary key,
  kind text not null default 'thanh_toan',
  order_code text,
  title text not null,
  body text not null default '',
  seen boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists shop_notices_created_idx on public.shop_notices (created_at desc);

alter table public.payments enable row level security;
alter table public.shop_notices enable row level security;
drop policy if exists "admin xem" on public.payments;
drop policy if exists "admin xem" on public.shop_notices;
drop policy if exists "admin đánh dấu đã xem" on public.shop_notices;
create policy "admin xem" on public.payments for select using (public.is_admin());
create policy "admin xem" on public.shop_notices for select using (public.is_admin());
create policy "admin đánh dấu đã xem" on public.shop_notices for update using (public.is_admin()) with check (public.is_admin());
revoke all on public.payments from anon, authenticated;
revoke all on public.shop_notices from anon, authenticated;
grant select on public.payments to authenticated;
grant select on public.shop_notices to authenticated;
grant update (seen) on public.shop_notices to authenticated;

-- Bật realtime để thông báo hiện ngay trong Quản trị
do $$ begin
  alter publication supabase_realtime add table public.shop_notices;
exception
  when duplicate_object then null;  -- đã bật rồi
  when undefined_object then raise notice 'Chưa có publication supabase_realtime — Quản trị tự kiểm tra thông báo mỗi 30 giây.';
end $$;

-- ---------------------------------------------------------------- ĐẶT HÀNG: KHÁCH CHỌN MỨC TRẢ TRƯỚC
-- Máy chủ tính lại toàn bộ giá, kiểm tra tồn kho (khóa dòng), trừ kho, ghi đơn. Trả về mã đơn.
-- p->>'deposit': số tiền khách muốn trả trước (hàng đặt trước), từ 50% (làm tròn lên nghìn đồng) đến tổng đơn.
create or replace function public.place_order(p jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_order uuid; v_code text; v_sub bigint := 0; v_disc bigint := 0; v_ship bigint := 0;
  v_cfg public.settings; v_c public.coupons; v_free boolean := false;
  it jsonb; pr public.products; v_qty int; v_size text; v_n int := 0; v_pre boolean := false; v_total bigint;
  v_vid text; v_vname text; v_vstock int; v_price bigint; v_min bigint; v_dep bigint := 0;
  v_phone text := regexp_replace(coalesce(p->>'phone', ''), '[\s.-]', '', 'g');
  v_delivery text := coalesce(p->>'delivery', 'ship');
begin
  if coalesce(trim(p->>'full_name'), '') = '' then raise exception 'Thiếu họ tên người nhận'; end if;
  if v_phone !~ '^0\d{9}$' then raise exception 'Số điện thoại không hợp lệ'; end if;
  if auth.uid() is null and coalesce(p->>'email', '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Email không hợp lệ'; end if;
  if v_delivery = 'ship' and length(coalesce(p->>'address', '')) < 8 then raise exception 'Thiếu địa chỉ giao hàng'; end if;
  if v_delivery = 'pickup' and not exists (select 1 from public.stores where id = (p->>'store_id')::int) then raise exception 'Cửa hàng không hợp lệ'; end if;
  if jsonb_typeof(p->'items') <> 'array' or jsonb_array_length(p->'items') = 0 then raise exception 'Giỏ hàng trống'; end if;
  if jsonb_array_length(p->'items') > 30 then raise exception 'Quá nhiều sản phẩm trong một đơn'; end if;
  if coalesce(p->>'deposit', '') <> '' and p->>'deposit' !~ '^\d{1,12}$' then raise exception 'Số tiền trả trước không hợp lệ'; end if;

  select * into v_cfg from public.settings where id = 1;
  v_code := 'HK' || to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'YYMMDD') || lpad((floor(random() * 100000))::int::text, 5, '0');
  while exists (select 1 from public.orders where code = v_code) loop
    v_code := 'HK' || to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'YYMMDD') || lpad((floor(random() * 100000))::int::text, 5, '0');
  end loop;

  insert into public.orders (code, user_id, email, full_name, phone, delivery, address, store_id, note, gift_wrap, invoice,
                             subtotal, total, payment_method)
  values (v_code, auth.uid(), lower(trim(coalesce(p->>'email', ''))), left(trim(p->>'full_name'), 120), v_phone, v_delivery,
          case when v_delivery = 'ship' then left(p->>'address', 300) else '' end,
          case when v_delivery = 'pickup' then (p->>'store_id')::int end,
          left(coalesce(p->>'note', ''), 500), coalesce((p->>'gift_wrap')::boolean, false),
          case when jsonb_typeof(p->'invoice') = 'object' then p->'invoice' end,
          0, 0, p->>'payment_method')
  returning id into v_order;

  for it in select * from jsonb_array_elements(p->'items') loop
    v_qty := (it->>'qty')::int;
    v_size := coalesce(it->>'size', '');
    v_vid := coalesce(it->>'variant_id', '');
    if v_qty is null or v_qty < 1 or v_qty > 10 then raise exception 'Số lượng không hợp lệ'; end if;
    select * into pr from public.products where id = it->>'product_id' and active for update;
    if not found then raise exception 'Có sản phẩm đã ngừng bán, vui lòng kiểm tra lại giỏ hàng'; end if;
    if cardinality(pr.sizes) > 0 and not (v_size = any(pr.sizes)) then raise exception 'Vui lòng chọn size cho %', pr.name; end if;
    if cardinality(pr.sizes) = 0 then v_size := ''; end if;
    -- Sản phẩm có biến thể: bắt buộc chọn, giá và tồn kho lấy theo biến thể
    v_price := pr.price; v_vname := ''; v_vstock := null;
    if jsonb_array_length(coalesce(pr.variants, '[]'::jsonb)) > 0 then
      select e->>'name', (e->>'price')::bigint, coalesce((e->>'stock')::int, 0) into v_vname, v_price, v_vstock
        from jsonb_array_elements(pr.variants) e where e->>'id' = v_vid limit 1;
      if not found then raise exception 'Vui lòng chọn loại cho %', pr.name; end if;
      if coalesce(v_price, 0) <= 0 then raise exception 'Loại "%" của % chưa có giá', v_vname, pr.name; end if;
    else
      v_vid := '';
    end if;
    if pr.stock_type = 'order' then v_pre := true;
    elsif v_vid <> '' and v_vstock < v_qty then raise exception '% (%) chỉ còn % sản phẩm', pr.name, v_vname, v_vstock;
    elsif pr.stock < v_qty then raise exception '% chỉ còn % sản phẩm', pr.name, pr.stock; end if;
    update public.products set stock = case when stock_type = 'order' then stock else stock - v_qty end, sold = sold + v_qty,
           variants = case when v_vid <> '' and stock_type <> 'order' then public.variant_stock_add(variants, v_vid, -v_qty) else variants end
     where id = pr.id;
    insert into public.order_items (order_id, product_id, sku, name, size, variant_id, variant, price, qty, line_total)
    values (v_order, pr.id, pr.sku, pr.name, v_size, v_vid, coalesce(v_vname, ''), v_price, v_qty, v_price * v_qty);
    v_sub := v_sub + v_price * v_qty;
    v_n := v_n + 1;
  end loop;

  if coalesce(p->>'coupon_code', '') <> '' then
    select * into v_c from public.coupons where code = upper(trim(p->>'coupon_code')) and active
      and (expires_at is null or expires_at > now()) and (usage_limit is null or used < usage_limit) for update;
    if not found then raise exception 'Mã giảm giá không hợp lệ hoặc đã hết hạn'; end if;
    if v_sub < v_c.min_order then raise exception 'Mã % áp dụng cho đơn từ % ₫', v_c.code, replace(to_char(v_c.min_order, 'FM999,999,999,999'), ',', '.'); end if;
    if v_c.kind = 'freeship' then v_free := true;
    else
      v_disc := case when v_c.kind = 'percent' then floor(v_sub * v_c.value / 100.0) else v_c.value end;
      if v_c.max_discount is not null then v_disc := least(v_disc, v_c.max_discount); end if;
      v_disc := least(v_disc, v_sub);
    end if;
    update public.coupons set used = used + 1 where code = v_c.code;
  end if;

  if v_pre and p->>'payment_method' = 'cod' then
    raise exception 'Đơn có hàng đặt trước cần đặt cọc — vui lòng chọn chuyển khoản, VNPay hoặc MoMo';
  end if;
  v_ship := case when v_delivery = 'pickup' or v_free or v_sub >= v_cfg.free_ship_from then 0 else v_cfg.shipping_fee end;
  v_total := v_sub - v_disc + v_ship;
  -- Hàng đặt trước: khách trả trước ít nhất 50% (làm tròn lên nghìn đồng), không quá tổng đơn. Trả đủ = trả một lần (deposit 0).
  if v_pre then
    v_min := least(v_total, ceil(v_total * 0.5 / 1000.0)::bigint * 1000);
    v_dep := coalesce(nullif(p->>'deposit', '')::bigint, v_min);
    if v_dep < v_min or v_dep > v_total then
      raise exception 'Số tiền trả trước từ % ₫ (50%%) đến % ₫', replace(to_char(v_min, 'FM999,999,999,999'), ',', '.'), replace(to_char(v_total, 'FM999,999,999,999'), ',', '.');
    end if;
    if v_dep >= v_total then v_dep := 0; end if;
  end if;
  update public.orders set subtotal = v_sub, discount = v_disc, shipping_fee = v_ship, total = v_total, deposit = v_dep,
         coupon_code = case when v_c.code is not null then v_c.code end
   where id = v_order;
  insert into public.order_events (order_id, status, note) values (v_order, 'cho_xac_nhan', 'Đặt hàng thành công');
  return v_code;
end $$;
grant execute on function public.place_order(jsonb) to anon, authenticated;

-- ---------------------------------------------------------------- GHI NHẬN TIỀN & TỰ XÁC NHẬN
create or replace function public.fmt_vnd(n bigint) returns text
language sql immutable as $$ select replace(to_char(n, 'FM999,999,999,999'), ',', '.') || ' ₫' $$;

-- Số tiền cần trả ở lần thanh toán kế tiếp: phần cọc còn thiếu, hoặc phần còn lại của đơn.
create or replace function public.amount_due(o public.orders) returns bigint
language sql immutable as $$
  select case
    when o.status = 'da_huy' or o.payment_status in ('da_thanh_toan', 'hoan_tien') then 0
    else greatest(0, case when o.deposit > 0 and o.payment_status in ('chua_thanh_toan', 'that_bai') then o.deposit else o.total end - o.paid_amount)
  end
$$;

-- Cộng một khoản tiền vào đơn. Đủ cọc → "Đã đặt cọc", đủ tổng → "Đã thanh toán";
-- đơn đang "Chờ xác nhận" thì tự chuyển "Đã xác nhận". Ghi lịch sử đơn và báo shop.
create or replace function public.apply_payment(p_id uuid, p_amount bigint, p_gateway text, p_ref text)
returns text language plpgsql security definer set search_path = public as $$
declare o public.orders; v_paid bigint; v_next text; v_status text; v_need bigint; v_note text; v_title text;
begin
  select * into o from public.orders where id = p_id for update;
  if not found then return 'not_found'; end if;
  v_paid := o.paid_amount + p_amount;
  v_next := case
    when o.payment_status in ('da_thanh_toan', 'hoan_tien') then o.payment_status
    when v_paid >= o.total then 'da_thanh_toan'
    when o.deposit > 0 and v_paid >= o.deposit then 'da_coc'
    when o.payment_status = 'that_bai' then 'chua_thanh_toan'
    else o.payment_status end;
  v_status := case when o.status = 'cho_xac_nhan' and v_next in ('da_coc', 'da_thanh_toan') then 'da_xac_nhan' else o.status end;
  update public.orders set paid_amount = v_paid, payment_status = v_next, status = v_status,
         payment_ref = coalesce(nullif(p_ref, ''), payment_ref)
   where id = o.id;

  v_need := case when v_next in ('chua_thanh_toan', 'that_bai') and o.deposit > 0 then o.deposit else o.total end;
  v_note := 'Nhận ' || public.fmt_vnd(p_amount) || ' qua ' || p_gateway || coalesce(' (mã GD ' || nullif(p_ref, '') || ')', '')
         || '. Đã trả ' || public.fmt_vnd(v_paid) || ' / ' || public.fmt_vnd(o.total)
         || case when v_next in ('chua_thanh_toan', 'that_bai') then ', còn thiếu ' || public.fmt_vnd(v_need - v_paid) || case when v_need < o.total then ' tiền cọc' else '' end
                 when v_next = 'da_coc' then ', còn lại ' || public.fmt_vnd(o.total - v_paid) else '' end;
  insert into public.order_events (order_id, status, note) values (o.id, 'thanh_toan', v_note);
  if v_status <> o.status then
    insert into public.order_events (order_id, status, note)
    values (o.id, v_status, 'Tự động xác nhận sau khi nhận ' || case when v_next = 'da_coc' then 'tiền cọc' else 'đủ tiền' end);
  end if;

  v_title := case
    when o.status = 'da_huy' then 'Đơn đã hủy ' || o.code || ' vừa nhận ' || public.fmt_vnd(p_amount) || ' — cần hoàn tiền'
    when v_status <> o.status then 'Đơn ' || o.code || ' đã ' || case when v_next = 'da_coc' then 'đặt cọc' else 'thanh toán đủ' end || ', tự chuyển Đã xác nhận'
    when v_next = 'da_thanh_toan' and o.payment_status <> 'da_thanh_toan' then 'Đơn ' || o.code || ' đã thanh toán đủ'
    when v_next in ('chua_thanh_toan', 'that_bai') then 'Đơn ' || o.code || ' chuyển thiếu ' || public.fmt_vnd(v_need - v_paid)
    else 'Đơn ' || o.code || ' nhận thêm ' || public.fmt_vnd(p_amount) end;
  insert into public.shop_notices (kind, order_code, title, body)
  values ('thanh_toan', o.code, v_title, o.full_name || ' · ' || o.phone || ' — ' || v_note);
  return v_next;
end $$;
revoke execute on function public.apply_payment(uuid, bigint, text, text) from public, anon, authenticated;

-- Chỉ máy chủ (service_role, trong /api) được gọi: ghi nhận kết quả từ cổng VNPay / MoMo.
-- Số tiền phải đúng bằng số cần trả lúc đó (cọc hoặc phần còn lại hoặc cả đơn).
create or replace function public.record_payment(p_code text, p_amount bigint, p_ok boolean, p_ref text, p_gateway text)
returns text language plpgsql security definer set search_path = public as $$
declare o public.orders; v_due bigint;
begin
  select * into o from public.orders where code = p_code for update;
  if not found then return 'not_found'; end if;
  -- Cùng một mã giao dịch gửi lại (khách tải lại trang kết quả, cổng gửi IPN lặp) → không ghi lần hai
  if coalesce(p_ref, '') <> '' and (o.payment_ref = p_ref or exists (select 1 from public.payments where gateway = p_gateway and ref = p_ref)) then return 'already'; end if;
  v_due := public.amount_due(o);
  if v_due = 0 then return 'already'; end if;
  if v_due <> p_amount then return 'bad_amount'; end if;
  if p_ok then
    insert into public.payments (gateway, ref, order_code, amount, result)
    values (p_gateway, coalesce(nullif(p_ref, ''), o.code || '-' || extract(epoch from now())::bigint), o.code, p_amount, 'ok')
    on conflict (gateway, ref) do nothing;
    perform public.apply_payment(o.id, p_amount, p_gateway, p_ref);
  else
    update public.orders set payment_status = 'that_bai' where id = o.id and payment_status = 'chua_thanh_toan';
    insert into public.order_events (order_id, status, note) values (o.id, 'thanh_toan', 'Thanh toán ' || p_gateway || ' không thành công');
  end if;
  return 'ok';
end $$;
revoke execute on function public.record_payment(text, bigint, boolean, text, text) from public, anon, authenticated;
grant execute on function public.record_payment(text, bigint, boolean, text, text) to service_role;

-- Chỉ máy chủ được gọi: tiền chuyển khoản vào tài khoản shop (SePay báo qua /api/sepay-webhook).
-- Không đòi đúng số tiền: cộng dồn, đủ cọc / đủ tổng thì tự đổi trạng thái. Chuyển khoản không khớp đơn nào cũng báo shop.
create or replace function public.record_bank_transfer(p_gateway text, p_ref text, p_code text, p_amount bigint, p_content text)
returns text language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_order uuid;
begin
  if coalesce(p_ref, '') = '' or coalesce(p_amount, 0) <= 0 then return 'bad_request'; end if;
  insert into public.payments (gateway, ref, order_code, amount, content)
  values (p_gateway, p_ref, upper(nullif(p_code, '')), p_amount, left(coalesce(p_content, ''), 500))
  on conflict (gateway, ref) do nothing
  returning id into v_id;
  if v_id is null then return 'already'; end if;  -- SePay gửi lại cùng giao dịch

  select id into v_order from public.orders where code = upper(nullif(p_code, ''));
  if v_order is null then
    update public.payments set result = 'khong_khop' where id = v_id;
    insert into public.shop_notices (kind, order_code, title, body)
    values ('khong_khop', null, 'Nhận ' || public.fmt_vnd(p_amount) || ' không khớp đơn nào',
            'Nội dung chuyển khoản: "' || left(coalesce(p_content, ''), 200) || '" (mã GD ' || p_ref || '). Kiểm tra rồi xác nhận tay trong Đơn hàng.');
    return 'not_found';
  end if;
  update public.payments set result = 'ok' where id = v_id;
  perform public.apply_payment(v_order, p_amount, p_gateway, p_ref);
  return 'ok';
end $$;
revoke execute on function public.record_bank_transfer(text, text, text, bigint, text) from public, anon, authenticated;
grant execute on function public.record_bank_transfer(text, text, text, bigint, text) to service_role;

-- Hoàn kho khi hủy (chỉ hàng có sẵn, cả tồn của biến thể); ghi thời điểm thanh toán;
-- quản trị bấm "Đã nhận cọc / Đã nhận đủ tiền" thì số đã trả cũng cập nhật theo.
create or replace function public.order_changed() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if new.status is distinct from old.status then
    if new.status = 'da_huy' and old.status <> 'da_huy' then
      -- từng dòng một: một sản phẩm có thể nằm ở nhiều dòng (khác size / biến thể)
      for r in select i.product_id, i.variant_id, i.qty from public.order_items i where i.order_id = new.id and i.product_id is not null loop
        update public.products p set stock = case when p.stock_type = 'order' then p.stock else p.stock + r.qty end, sold = greatest(0, p.sold - r.qty),
               variants = case when r.variant_id <> '' and p.stock_type <> 'order' then public.variant_stock_add(p.variants, r.variant_id, r.qty) else p.variants end
         where p.id = r.product_id;
      end loop;
    end if;
  end if;
  if new.payment_status is distinct from old.payment_status then
    if new.payment_status = 'da_coc' then new.paid_amount := greatest(new.paid_amount, new.deposit); end if;
    if new.payment_status = 'da_thanh_toan' then new.paid_amount := greatest(new.paid_amount, new.total); end if;
  end if;
  if new.payment_status = 'da_thanh_toan' and old.payment_status is distinct from 'da_thanh_toan' then
    new.paid_at := now();
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists order_changed on public.orders;
create trigger order_changed before update on public.orders for each row execute function public.order_changed();

-- Khách tự hủy: chỉ khi chưa xác nhận và chưa trả đồng nào
create or replace function public.cancel_my_order(p_code text, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where code = p_code and user_id = auth.uid() for update;
  if not found then raise exception 'Không tìm thấy đơn hàng'; end if;
  if o.status <> 'cho_xac_nhan' or o.payment_status in ('da_thanh_toan', 'da_coc') or o.paid_amount > 0 then
    raise exception 'Đơn đã được xác nhận hoặc đã thanh toán, vui lòng gọi hotline để hủy';
  end if;
  update public.orders set status = 'da_huy' where id = o.id;
  insert into public.order_events (order_id, status, note) values (o.id, 'da_huy', left(coalesce(p_reason, ''), 300));
end $$;
grant execute on function public.cancel_my_order(text, text) to authenticated;
