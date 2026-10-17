-- Tiểu Hoa BJD: video sản phẩm + biến thể sản phẩm (giá / tồn kho theo biến thể).
-- Dán hết vào Supabase > SQL Editor rồi bấm Run. Chạy lại nhiều lần vẫn an toàn, không mất dữ liệu.
-- Nội dung giống các phần tương ứng trong schema.sql (CSDL mới chạy schema.sql là đủ).

-- CSDL tạo trước khi có video / biến thể: thêm cột còn thiếu
alter table public.products add column if not exists videos text[] not null default '{}';
alter table public.products add column if not exists variants jsonb not null default '[]';
alter table public.products drop constraint if exists products_variants_array;
alter table public.products add constraint products_variants_array check (jsonb_typeof(variants) = 'array');
alter table public.order_items add column if not exists variant_id text not null default '';
alter table public.order_items add column if not exists variant text not null default '';

-- ---------------------------------------------------------------- ĐẶT HÀNG THEO BIẾN THỂ
-- Cộng / trừ tồn kho của một biến thể trong products.variants (không xuống dưới 0)
create or replace function public.variant_stock_add(v jsonb, vid text, delta int) returns jsonb
language sql immutable as $$
  select coalesce(jsonb_agg(case when e->>'id' = vid
           then jsonb_set(e, '{stock}', to_jsonb(greatest(0, coalesce((e->>'stock')::int, 0) + delta)))
           else e end order by o), '[]'::jsonb)
  from jsonb_array_elements(coalesce(v, '[]'::jsonb)) with ordinality as x(e, o)
$$;

-- Máy chủ tính lại toàn bộ giá, kiểm tra tồn kho (khóa dòng), trừ kho, ghi đơn. Trả về mã đơn.
create or replace function public.place_order(p jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_order uuid; v_code text; v_sub bigint := 0; v_disc bigint := 0; v_ship bigint := 0;
  v_cfg public.settings; v_c public.coupons; v_free boolean := false;
  it jsonb; pr public.products; v_qty int; v_size text; v_n int := 0; v_pre boolean := false; v_total bigint;
  v_vid text; v_vname text; v_vstock int; v_price bigint;
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
  update public.orders set subtotal = v_sub, discount = v_disc, shipping_fee = v_ship, total = v_total,
         deposit = case when v_pre then ceil(v_total * 0.5 / 1000.0)::bigint * 1000 else 0 end,
         coupon_code = case when v_c.code is not null then v_c.code end
   where id = v_order;
  insert into public.order_events (order_id, status, note) values (v_order, 'cho_xac_nhan', 'Đặt hàng thành công');
  return v_code;
end $$;
grant execute on function public.place_order(jsonb) to anon, authenticated;

-- Hoàn kho khi hủy (chỉ hàng có sẵn, cả tồn của biến thể); ghi thời điểm thanh toán
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
  if new.payment_status = 'da_thanh_toan' and old.payment_status is distinct from 'da_thanh_toan' then
    new.paid_at := now();
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists order_changed on public.orders;
create trigger order_changed before update on public.orders for each row execute function public.order_changed();

-- ---------------------------------------------------------------- VIDEO SẢN PHẨM (Storage)
-- Bucket công khai 'video-san-pham': khách xem, chỉ quản trị tải lên / xóa. Tối đa 50 MB/video (MP4, WEBM, MOV).
do $$ begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('video-san-pham', 'video-san-pham', true, 52428800, array['video/mp4', 'video/webm', 'video/quicktime'])
  on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

  drop policy if exists "video_sp_xem" on storage.objects;
  drop policy if exists "video_sp_tai_len" on storage.objects;
  drop policy if exists "video_sp_xoa" on storage.objects;
  create policy "video_sp_xem" on storage.objects for select using (bucket_id = 'video-san-pham');
  create policy "video_sp_tai_len" on storage.objects for insert to authenticated with check (bucket_id = 'video-san-pham' and public.is_admin());
  create policy "video_sp_xoa" on storage.objects for delete to authenticated using (bucket_id = 'video-san-pham' and public.is_admin());
exception when undefined_table or invalid_schema_name then
  raise notice 'Chưa có Supabase Storage — bỏ qua tạo bucket video.';
end $$;

select 'Xong: đã có video và biến thể sản phẩm' as ket_qua;
