-- =====================================================================
-- Tiểu Hoa BJD — cơ sở dữ liệu Supabase
-- Chạy toàn bộ file trong Supabase > SQL Editor, sau đó chạy seed.sql.
-- Chạy lại nhiều lần được (idempotent).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- BẢNG
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text not null default '',
  phone text not null default '',
  birthday date,
  gender text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  slug text primary key,
  name text not null,
  grp text not null,
  sort int not null default 0
);

create table if not exists public.products (
  id text primary key default ('p' || replace(gen_random_uuid()::text, '-', '')),
  slug text not null unique,
  sku text not null unique,
  name text not null,
  category text not null references public.categories(slug),
  kind text not null check (kind in ('doll', 'wig', 'eyes', 'outfit', 'shoes', 'other')),
  scale text not null,                -- '1/3' | '1/4' | '1/6' | '1/8' | 'all'
  skin text,                          -- màu da (búp bê)
  set_type text check (set_type in ('fullset', 'nude')),
  gender text not null default 'nu',
  stock_type text not null default 'order' check (stock_type in ('co-san', 'order')),
  lead_days int not null default 0,   -- thời gian về hàng order (ngày)
  look jsonb,                         -- màu tóc / mắt / trang phục cho ảnh minh họa
  price bigint not null check (price > 0),
  compare_price bigint check (compare_price is null or compare_price > price),
  sizes text[] not null default '{}',
  stock int not null default 0 check (stock >= 0),
  collection text,
  tags text[] not null default '{}',
  rating numeric not null default 0,  -- máy chủ tự tính từ bảng reviews; 0 = chưa có đánh giá
  review_count int not null default 0,
  sold int not null default 0,        -- = sold_real + sold_bonus (trigger product_counters)
  sold_real int not null default 0,   -- số đã bán từ đơn "Đã giao"
  sold_bonus int not null default 0,  -- số shop tự cộng thêm
  description text not null default '',
  images text[] not null default '{}',
  videos text[] not null default '{}',  -- link video (Supabase Storage 'video-san-pham' hoặc YouTube)
  variants jsonb not null default '[]', -- biến thể: [{id, name, price, compare_price, stock, image}]
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.stores (
  id serial primary key,
  name text not null, city text not null, district text not null default '',
  address text not null, phone text not null default '', hours text not null default ''
);

-- Giá nhập — CHỈ quản trị đọc/ghi (khách không thấy giá vốn)
create table if not exists public.product_costs (
  product_id text primary key references public.products(id) on delete cascade,
  yuan numeric not null default 0,
  weight_kg numeric not null default 0,
  cn_ship_yuan numeric not null default 0,
  margin_pct numeric,
  source_url text not null default '',
  updated_at timestamptz not null default now()
);

-- Thông số tính giá nhập (tỷ giá, phí, lãi) — chỉ quản trị
create table if not exists public.import_settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'
);

create table if not exists public.coupons (
  code text primary key,
  kind text not null check (kind in ('percent', 'amount', 'freeship')),
  value bigint not null default 0,
  max_discount bigint,
  min_order bigint not null default 0,
  description text not null default '',
  active boolean not null default true,
  expires_at timestamptz,
  usage_limit int,
  used int not null default 0
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  full_name text not null, phone text not null,
  province text not null, ward text not null, line text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.wishlist (
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  product_id text not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete cascade,
  user_id uuid references auth.users on delete cascade default auth.uid(),  -- null: đánh giá shop tự tạo
  name text not null default '',
  rating int not null check (rating between 1 and 5),
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  user_id uuid references auth.users on delete set null,
  email text not null default '',
  full_name text not null,
  phone text not null,
  delivery text not null check (delivery in ('ship', 'pickup')),
  address text not null default '',
  store_id int references public.stores(id),
  note text not null default '',
  gift_wrap boolean not null default false,
  invoice jsonb,
  subtotal bigint not null,
  discount bigint not null default 0,
  shipping_fee bigint not null default 0,
  total bigint not null,
  deposit bigint not null default 0,  -- tiền trả trước khách chọn (đơn có hàng đặt trước, tối thiểu 50%), 0 = trả một lần
  paid_amount bigint not null default 0,  -- số tiền khách đã trả (cộng dồn)
  coupon_code text,
  payment_method text not null check (payment_method in ('cod', 'bank', 'vnpay', 'momo')),
  payment_status text not null default 'chua_thanh_toan' check (payment_status in ('chua_thanh_toan', 'da_coc', 'da_thanh_toan', 'that_bai', 'hoan_tien')),
  payment_ref text,
  paid_at timestamptz,
  status text not null default 'cho_xac_nhan' check (status in ('cho_xac_nhan', 'da_xac_nhan', 'dang_giao', 'da_giao', 'da_huy')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders(user_id, created_at desc);

create table if not exists public.order_items (
  id bigserial primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  sku text not null, name text not null, size text not null default '',
  variant_id text not null default '', variant text not null default '',  -- biến thể đã chọn (id + tên lúc đặt)
  price bigint not null, qty int not null check (qty between 1 and 10), line_total bigint not null
);
create index if not exists order_items_order_idx on public.order_items(order_id);

-- CSDL tạo trước khi có video / biến thể: thêm cột còn thiếu
alter table public.products add column if not exists videos text[] not null default '{}';
alter table public.products add column if not exists variants jsonb not null default '[]';
alter table public.products drop constraint if exists products_variants_array;
alter table public.products add constraint products_variants_array check (jsonb_typeof(variants) = 'array');
alter table public.order_items add column if not exists variant_id text not null default '';
alter table public.order_items add column if not exists variant text not null default '';
-- Số tiền khách đã trả (cộng dồn qua các lần chuyển khoản / cổng thanh toán)
alter table public.orders add column if not exists paid_amount bigint not null default 0;
-- Đơn có từ trước khi có cột này: suy ra số đã trả từ trạng thái thanh toán
update public.orders set paid_amount = case payment_status when 'da_coc' then deposit else total end
 where paid_amount = 0 and payment_status in ('da_coc', 'da_thanh_toan');

create table if not exists public.order_events (
  id bigserial primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists order_events_order_idx on public.order_events(order_id);

-- Cấu hình phí giao hàng (một dòng)
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  shipping_fee bigint not null default 30000,
  free_ship_from bigint not null default 1000000
);
insert into public.settings (id) values (1) on conflict do nothing;

-- Thông tin chung của shop (Quản trị > Cài đặt cửa hàng): tên, hotline, liên hệ, tài khoản ngân hàng
create table if not exists public.shop_info (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
insert into public.shop_info (id) values (1) on conflict do nothing;

-- ---------------------------------------------------------------- HÀM TIỆN ÍCH
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- Hồ sơ tự tạo khi đăng ký
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), coalesce(new.raw_user_meta_data->>'phone', ''))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Khách không tự nâng quyền / đổi email hồ sơ.
-- Hàm chạy với quyền người gọi (không security definer) để current_user là vai trò thật:
-- authenticated/anon khi gọi từ web; postgres / service_role khi chạy trong SQL Editor hoặc máy chủ.
create or replace function public.protect_profile() returns trigger
language plpgsql set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.email is distinct from old.email)
     and current_user not in ('postgres', 'supabase_admin', 'service_role')
     and not public.is_admin() then
    raise exception 'Không được đổi vai trò / email';
  end if;
  return new;
end $$;
drop trigger if exists protect_profile on public.profiles;
create trigger protect_profile before update on public.profiles for each row execute function public.protect_profile();

-- Admin đầu tiên: select public.make_admin('email@cua-anh.com');  (chạy trong SQL Editor)
create or replace function public.make_admin(p_email text) returns text
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set role = 'admin' where lower(email) = lower(p_email);
  if not found then return 'Không thấy tài khoản ' || p_email || ' — hãy đăng ký trên web trước'; end if;
  return 'Đã cấp quyền quản trị cho ' || p_email;
end $$;
revoke execute on function public.make_admin(text) from public, anon, authenticated;

-- ---------------------------------------------------------------- MÃ GIẢM GIÁ
create or replace function public.check_coupon(p_code text)
returns table (code text, kind text, value bigint, max_discount bigint, min_order bigint, description text)
language sql stable security definer set search_path = public as $$
  select c.code, c.kind, c.value, c.max_discount, c.min_order, c.description
  from public.coupons c
  where c.code = upper(trim(p_code)) and c.active
    and (c.expires_at is null or c.expires_at > now())
    and (c.usage_limit is null or c.used < c.usage_limit)
$$;

-- ---------------------------------------------------------------- ĐẶT HÀNG
-- Cộng / trừ tồn kho của một biến thể trong products.variants (không xuống dưới 0)
create or replace function public.variant_stock_add(v jsonb, vid text, delta int) returns jsonb
language sql immutable as $$
  select coalesce(jsonb_agg(case when e->>'id' = vid
           then jsonb_set(e, '{stock}', to_jsonb(greatest(0, coalesce((e->>'stock')::int, 0) + delta)))
           else e end order by o), '[]'::jsonb)
  from jsonb_array_elements(coalesce(v, '[]'::jsonb)) with ordinality as x(e, o)
$$;

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

-- Xem đơn: chủ đơn / admin, hoặc ai biết đúng mã + số điện thoại
create or replace function public.track_order(p_code text, p_phone text) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(o) || jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(i) order by i.id) from public.order_items i where i.order_id = o.id), '[]'),
    'events', coalesce((select jsonb_agg(jsonb_build_object('status', e.status, 'note', e.note, 'created_at', e.created_at) order by e.id) from public.order_events e where e.order_id = o.id), '[]'))
  from public.orders o
  where o.code = upper(trim(p_code))
    and ((auth.uid() is not null and (o.user_id = auth.uid() or public.is_admin()))
         or (length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 9 and o.phone = regexp_replace(p_phone, '\D', '', 'g')))
$$;
grant execute on function public.track_order(text, text) to anon, authenticated;

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

create or replace function public.admin_update_order(p_id uuid, p_status text, p_payment_status text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  if not public.is_admin() then raise exception 'Không có quyền'; end if;
  select * into o from public.orders where id = p_id for update;
  if not found then raise exception 'Không tìm thấy đơn'; end if;
  if o.status = 'da_huy' and p_status is not null and p_status <> 'da_huy' then raise exception 'Đơn đã hủy không mở lại được'; end if;
  update public.orders set status = coalesce(p_status, status), payment_status = coalesce(p_payment_status, payment_status) where id = p_id;
  if p_status is not null and p_status <> o.status then
    insert into public.order_events (order_id, status, note) values (p_id, p_status, coalesce(p_note, ''));
  end if;
  if p_payment_status is not null and p_payment_status <> o.payment_status then
    insert into public.order_events (order_id, status, note) values (p_id, 'thanh_toan', coalesce(nullif(p_note, ''), 'Cập nhật thanh toán'));
  end if;
end $$;
grant execute on function public.admin_update_order(uuid, text, text, text) to authenticated;

-- Số tiền cần trả ở lần thanh toán kế tiếp: phần cọc còn thiếu, hoặc phần còn lại của đơn.
create or replace function public.amount_due(o public.orders) returns bigint
language sql immutable as $$
  select case
    when o.status = 'da_huy' or o.payment_status in ('da_thanh_toan', 'hoan_tien') then 0
    else greatest(0, case when o.deposit > 0 and o.payment_status in ('chua_thanh_toan', 'that_bai') then o.deposit else o.total end - o.paid_amount)
  end
$$;

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

-- ---------------------------------------------------------------- TIỀN VỀ & TỰ XÁC NHẬN (giống supabase/coc-tu-xac-nhan.sql)
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

create or replace function public.fmt_vnd(n bigint) returns text
language sql immutable as $$ select replace(to_char(n, 'FM999,999,999,999'), ',', '.') || ' ₫' $$;


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

-- ---------------------------------------------------------------- PHÂN QUYỀN (RLS)
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.stores enable row level security;
alter table public.product_costs enable row level security;
alter table public.import_settings enable row level security;
alter table public.coupons enable row level security;
alter table public.addresses enable row level security;
alter table public.wishlist enable row level security;
alter table public.reviews enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.settings enable row level security;
alter table public.shop_info enable row level security;

do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' and tablename in
    ('profiles','categories','products','stores','product_costs','import_settings','coupons','addresses','wishlist','reviews','orders','order_items','order_events','settings','shop_info')
  loop execute format('drop policy %I on public.%I', r.policyname, r.tablename); end loop;
end $$;

create policy "xem hồ sơ" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "sửa hồ sơ" on public.profiles for update using (id = auth.uid() or public.is_admin());

create policy "ai cũng xem" on public.categories for select using (true);
create policy "admin ghi" on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy "ai cũng xem" on public.stores for select using (true);
create policy "admin ghi" on public.stores for all using (public.is_admin()) with check (public.is_admin());
create policy "admin" on public.product_costs for all using (public.is_admin()) with check (public.is_admin());
create policy "admin" on public.import_settings for all using (public.is_admin()) with check (public.is_admin());
create policy "ai cũng xem" on public.settings for select using (true);
create policy "admin ghi" on public.settings for all using (public.is_admin()) with check (public.is_admin());
create policy "ai cũng xem" on public.shop_info for select using (true);
create policy "admin ghi" on public.shop_info for all using (public.is_admin()) with check (public.is_admin());

create policy "xem sản phẩm" on public.products for select using (active or public.is_admin());
create policy "admin ghi" on public.products for all using (public.is_admin()) with check (public.is_admin());

create policy "admin" on public.coupons for all using (public.is_admin()) with check (public.is_admin());

create policy "của tôi" on public.addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "của tôi" on public.wishlist for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Khách viết đánh giá qua hàm submit_review (chỉ khi đã nhận hàng), xem phần LƯỢT MUA & ĐÁNH GIÁ cuối file
create policy "ai cũng xem" on public.reviews for select using (true);
create policy "admin ghi" on public.reviews for insert with check (public.is_admin());
create policy "admin sửa" on public.reviews for update using (public.is_admin()) with check (public.is_admin());
create policy "xóa" on public.reviews for delete using (user_id = auth.uid() or public.is_admin());

create policy "xem đơn" on public.orders for select using (user_id = auth.uid() or public.is_admin());
create policy "xem dòng" on public.order_items for select using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));
create policy "xem lịch sử" on public.order_events for select using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));
-- Không có policy insert/update cho orders: chỉ qua hàm place_order / cancel_my_order / admin_update_order / record_payment.

-- ---------------------------------------------------------------- ẢNH SẢN PHẨM (Storage)
-- Bucket công khai 'san-pham': khách xem ảnh, chỉ quản trị tải lên / xóa. Tối đa 5 MB/ảnh.
do $$ begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('san-pham', 'san-pham', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

  drop policy if exists "anh_sp_xem" on storage.objects;
  drop policy if exists "anh_sp_tai_len" on storage.objects;
  drop policy if exists "anh_sp_xoa" on storage.objects;
  create policy "anh_sp_xem" on storage.objects for select using (bucket_id = 'san-pham');
  create policy "anh_sp_tai_len" on storage.objects for insert to authenticated with check (bucket_id = 'san-pham' and public.is_admin());
  create policy "anh_sp_xoa" on storage.objects for delete to authenticated using (bucket_id = 'san-pham' and public.is_admin());
exception when undefined_table or invalid_schema_name then
  raise notice 'Chưa có Supabase Storage — bỏ qua tạo bucket ảnh.';
end $$;

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

-- ================================================================ LƯỢT MUA & ĐÁNH GIÁ
-- (giống hệt supabase/danh-gia-luot-mua.sql)
-- ---------------------------------------------------------------- LƯỢT MUA
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'sold_bonus') then
    alter table public.products add column sold_real int not null default 0;
    alter table public.products add column sold_bonus int not null default 0;
    -- Lần đầu: số "đã bán" cũ (nhập tay / CSV) không đến từ đơn hàng thì giữ lại thành số shop cộng thêm
    update public.products p set sold_bonus = greatest(0, p.sold - coalesce((
      select sum(i.qty) from public.order_items i join public.orders o on o.id = i.order_id
       where i.product_id = p.id and o.status <> 'da_huy'), 0));
  end if;
end $$;
alter table public.products alter column rating set default 0;
alter table public.products drop constraint if exists products_sold_bonus_ok;
alter table public.products add constraint products_sold_bonus_ok check (sold_bonus between 0 and 10000000);

-- Số đã bán thật = tổng số lượng trong các đơn đã giao thành công
create or replace function public.product_sold_real(p_id text) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(i.qty), 0)::int from public.order_items i join public.orders o on o.id = i.order_id
   where i.product_id = p_id and o.status = 'da_giao'
$$;

-- Web (kể cả trang quản trị) không tự sửa được số bán thật và điểm đánh giá; chỉ hàm của máy chủ / SQL Editor sửa.
-- Hàm chạy với quyền người gọi để current_user là vai trò thật (giống protect_profile).
create or replace function public.product_counters() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user not in ('postgres', 'supabase_admin', 'service_role') then
    if tg_op = 'INSERT' then
      new.sold_real := 0; new.rating := 0; new.review_count := 0;
    else
      new.sold_real := old.sold_real; new.rating := old.rating; new.review_count := old.review_count;
    end if;
  end if;
  new.sold_bonus := greatest(0, coalesce(new.sold_bonus, 0));
  new.sold := new.sold_real + new.sold_bonus;
  return new;
end $$;
drop trigger if exists product_counters on public.products;
create trigger product_counters before insert or update on public.products for each row execute function public.product_counters();

-- Đơn chuyển sang / rời khỏi "Đã giao" thì đếm lại số bán thật của các sản phẩm trong đơn
create or replace function public.order_sold_sync() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.status = 'da_giao') is distinct from (old.status = 'da_giao') then
    update public.products p set sold_real = public.product_sold_real(p.id)
     where p.id in (select i.product_id from public.order_items i where i.order_id = new.id);
  end if;
  return null;
end $$;
drop trigger if exists order_sold_sync on public.orders;
create trigger order_sold_sync after update of status on public.orders for each row execute function public.order_sold_sync();

-- ---------------------------------------------------------------- ĐÁNH GIÁ
alter table public.reviews add column if not exists order_id uuid references public.orders(id) on delete set null;
alter table public.reviews add column if not exists images text[] not null default '{}';
alter table public.reviews add column if not exists by_shop boolean not null default false;
alter table public.reviews alter column user_id drop not null;
alter table public.reviews drop constraint if exists reviews_product_id_user_id_key;
create unique index if not exists reviews_order_product_key on public.reviews(order_id, product_id) where order_id is not null;
create index if not exists reviews_product_idx on public.reviews(product_id, created_at desc);
alter table public.reviews drop constraint if exists reviews_images_ok;
alter table public.reviews add constraint reviews_images_ok check (cardinality(images) <= 6);

-- Quản trị ghi thẳng vào bảng: luôn là đánh giá của shop; không sửa được đánh giá của khách (chỉ xóa).
create or replace function public.review_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user not in ('postgres', 'supabase_admin', 'service_role') then
    if tg_op = 'INSERT' then
      new.by_shop := true; new.user_id := null; new.order_id := null;
    else
      if not old.by_shop then raise exception 'Không sửa được đánh giá của khách, chỉ xóa được'; end if;
      new.by_shop := true; new.user_id := null; new.order_id := null;
    end if;
  end if;
  new.name := left(trim(coalesce(new.name, '')), 60);
  if new.name = '' then new.name := 'Khách hàng'; end if;
  new.content := left(trim(coalesce(new.content, '')), 1000);
  new.images := coalesce(new.images, '{}');
  new.created_at := coalesce(new.created_at, now());
  return new;
end $$;
drop trigger if exists review_guard on public.reviews;
create trigger review_guard before insert or update on public.reviews for each row execute function public.review_guard();

-- Điểm trung bình (1 số lẻ) + số đánh giá của sản phẩm
create or replace function public.refresh_product_rating(p_id text) returns void
language sql security definer set search_path = public as $$
  update public.products p set
    rating = coalesce((select round(avg(r.rating)::numeric, 1) from public.reviews r where r.product_id = p_id), 0),
    review_count = (select count(*) from public.reviews r where r.product_id = p_id)
  where p.id = p_id
$$;
revoke execute on function public.refresh_product_rating(text) from public, anon, authenticated;

create or replace function public.review_changed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op <> 'INSERT' then perform public.refresh_product_rating(old.product_id); end if;
  if tg_op <> 'DELETE' and (tg_op = 'INSERT' or new.product_id is distinct from old.product_id or new.rating is distinct from old.rating) then
    perform public.refresh_product_rating(new.product_id);
  end if;
  return null;
end $$;
drop trigger if exists review_changed on public.reviews;
create trigger review_changed after insert or update or delete on public.reviews for each row execute function public.review_changed();

-- Các lần mua (đơn đã giao) của khách đang đăng nhập có sản phẩm này, kèm đánh giá đã viết nếu có
create or replace function public.review_slots(p_product text)
returns table (order_id uuid, code text, delivered_at timestamptz, review_id uuid)
language sql stable security definer set search_path = public as $$
  select o.id, o.code, o.updated_at, r.id
    from public.orders o
    left join public.reviews r on r.order_id = o.id and r.product_id = p_product
   where o.user_id = auth.uid() and o.status = 'da_giao'
     and exists (select 1 from public.order_items i where i.order_id = o.id and i.product_id = p_product)
   order by o.created_at
$$;
revoke execute on function public.review_slots(text) from public, anon;
grant execute on function public.review_slots(text) to authenticated;

-- Khách gửi / sửa đánh giá cho một lần mua. Ảnh phải nằm trong thư mục của chính khách ở bucket 'danh-gia'.
create or replace function public.submit_review(p_product text, p_order uuid, p_rating int, p_content text, p_images text[])
returns public.reviews language plpgsql security definer set search_path = public as $$
declare r public.reviews; v_name text; v_img text; v_imgs text[] := coalesce(p_images, '{}');
begin
  if auth.uid() is null then raise exception 'Vui lòng đăng nhập'; end if;
  if not exists (select 1 from public.orders o join public.order_items i on i.order_id = o.id
                  where o.id = p_order and o.user_id = auth.uid() and o.status = 'da_giao' and i.product_id = p_product) then
    raise exception 'Bạn chỉ đánh giá được sản phẩm trong đơn hàng đã nhận thành công';
  end if;
  if p_rating is null or p_rating not between 1 and 5 then raise exception 'Vui lòng chọn từ 1 đến 5 sao'; end if;
  if char_length(trim(coalesce(p_content, ''))) < 5 then raise exception 'Vui lòng viết ít nhất vài chữ'; end if;
  if cardinality(v_imgs) > 3 then raise exception 'Tối đa 3 ảnh cho mỗi đánh giá'; end if;
  foreach v_img in array v_imgs loop
    if v_img !~ ('^https://[^/]+/storage/v1/object/public/danh-gia/' || auth.uid()::text || '/[A-Za-z0-9._-]+$') then
      raise exception 'Ảnh đánh giá không hợp lệ';
    end if;
  end loop;
  select coalesce(nullif(trim(full_name), ''), 'Khách hàng') into v_name from public.profiles where id = auth.uid();
  insert into public.reviews (product_id, user_id, order_id, name, rating, content, images, by_shop)
  values (p_product, auth.uid(), p_order, coalesce(v_name, 'Khách hàng'), p_rating, trim(p_content), v_imgs, false)
  on conflict (order_id, product_id) where order_id is not null
  do update set rating = excluded.rating, content = excluded.content, images = excluded.images
  returning * into r;
  return r;
end $$;
revoke execute on function public.submit_review(text, uuid, int, text, text[]) from public, anon;
grant execute on function public.submit_review(text, uuid, int, text, text[]) to authenticated;

-- Quyền: ai cũng xem; khách chỉ viết qua submit_review; quản trị tạo / sửa đánh giá của shop, xóa mọi đánh giá; khách xóa được đánh giá của mình
do $$ declare r record; begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'reviews' loop
    execute format('drop policy %I on public.reviews', r.policyname);
  end loop;
end $$;
create policy "ai cũng xem" on public.reviews for select using (true);
create policy "admin ghi" on public.reviews for insert with check (public.is_admin());
create policy "admin sửa" on public.reviews for update using (public.is_admin()) with check (public.is_admin());
create policy "xóa" on public.reviews for delete using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------- ẢNH ĐÁNH GIÁ (Storage)
-- Bucket công khai 'danh-gia', tối đa 3 MB/ảnh. Quản trị tải lên mọi chỗ; khách chỉ tải vào thư mục <mã tài khoản>/
-- và chỉ khi đã có đơn được giao.
do $$ begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('danh-gia', 'danh-gia', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

  drop policy if exists "anh_dg_xem" on storage.objects;
  drop policy if exists "anh_dg_tai_len" on storage.objects;
  drop policy if exists "anh_dg_xoa" on storage.objects;
  create policy "anh_dg_xem" on storage.objects for select using (bucket_id = 'danh-gia');
  create policy "anh_dg_tai_len" on storage.objects for insert to authenticated with check (
    bucket_id = 'danh-gia' and (public.is_admin() or (
      (storage.foldername(name))[1] = auth.uid()::text
      and exists (select 1 from public.orders o where o.user_id = auth.uid() and o.status = 'da_giao'))));
  create policy "anh_dg_xoa" on storage.objects for delete to authenticated using (
    bucket_id = 'danh-gia' and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text));
exception when undefined_table or invalid_schema_name then
  raise notice 'Chưa có Supabase Storage — bỏ qua tạo bucket ảnh đánh giá.';
end $$;

-- ---------------------------------------------------------------- ĐỒNG BỘ SỐ LIỆU HIỆN CÓ
do $$ begin
  update public.products p set sold_real = public.product_sold_real(p.id);
  perform public.refresh_product_rating(id) from public.products;
end $$;
