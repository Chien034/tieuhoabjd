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
  rating numeric not null default 5,
  review_count int not null default 0,
  sold int not null default 0,
  description text not null default '',
  images text[] not null default '{}',
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
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  name text not null default '',
  rating int not null check (rating between 1 and 5),
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
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
  deposit bigint not null default 0,  -- tiền cọc (đơn có hàng đặt trước), 0 = trả một lần
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
  price bigint not null, qty int not null check (qty between 1 and 10), line_total bigint not null
);
create index if not exists order_items_order_idx on public.order_items(order_id);

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
-- Máy chủ tính lại toàn bộ giá, kiểm tra tồn kho (khóa dòng), trừ kho, ghi đơn. Trả về mã đơn.
create or replace function public.place_order(p jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_order uuid; v_code text; v_sub bigint := 0; v_disc bigint := 0; v_ship bigint := 0;
  v_cfg public.settings; v_c public.coupons; v_free boolean := false;
  it jsonb; pr public.products; v_qty int; v_size text; v_n int := 0; v_pre boolean := false; v_total bigint;
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
    if v_qty is null or v_qty < 1 or v_qty > 10 then raise exception 'Số lượng không hợp lệ'; end if;
    select * into pr from public.products where id = it->>'product_id' and active for update;
    if not found then raise exception 'Có sản phẩm đã ngừng bán, vui lòng kiểm tra lại giỏ hàng'; end if;
    if cardinality(pr.sizes) > 0 and not (v_size = any(pr.sizes)) then raise exception 'Vui lòng chọn size cho %', pr.name; end if;
    if cardinality(pr.sizes) = 0 then v_size := ''; end if;
    if pr.stock_type = 'order' then v_pre := true;
    elsif pr.stock < v_qty then raise exception '% chỉ còn % sản phẩm', pr.name, pr.stock; end if;
    update public.products set stock = case when stock_type = 'order' then stock else stock - v_qty end, sold = sold + v_qty where id = pr.id;
    insert into public.order_items (order_id, product_id, sku, name, size, price, qty, line_total)
    values (v_order, pr.id, pr.sku, pr.name, v_size, pr.price, v_qty, pr.price * v_qty);
    v_sub := v_sub + pr.price * v_qty;
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

-- Hoàn kho khi hủy (chỉ hàng có sẵn); ghi thời điểm thanh toán
create or replace function public.order_changed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'da_huy' and old.status <> 'da_huy' then
      update public.products p set stock = case when p.stock_type = 'order' then p.stock else p.stock + i.qty end, sold = greatest(0, p.sold - i.qty)
        from public.order_items i where i.order_id = new.id and i.product_id = p.id;
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

create or replace function public.cancel_my_order(p_code text, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where code = p_code and user_id = auth.uid() for update;
  if not found then raise exception 'Không tìm thấy đơn hàng'; end if;
  if o.status <> 'cho_xac_nhan' or o.payment_status in ('da_thanh_toan', 'da_coc') then
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

-- Số tiền cần trả ở lần thanh toán kế tiếp (cọc, phần còn lại, hoặc cả đơn)
create or replace function public.amount_due(o public.orders) returns bigint
language sql immutable as $$
  select case
    when o.status = 'da_huy' then 0
    when o.payment_status in ('chua_thanh_toan', 'that_bai') then case when o.deposit > 0 then o.deposit else o.total end
    when o.payment_status = 'da_coc' then o.total - o.deposit
    else 0 end
$$;

-- Chỉ máy chủ (service_role, trong /api) được gọi: ghi nhận kết quả từ cổng thanh toán.
-- Số tiền phải đúng bằng số cần trả lúc đó (cọc hoặc phần còn lại hoặc cả đơn).
create or replace function public.record_payment(p_code text, p_amount bigint, p_ok boolean, p_ref text, p_gateway text)
returns text language plpgsql security definer set search_path = public as $$
declare o public.orders; v_due bigint; v_next text;
begin
  select * into o from public.orders where code = p_code for update;
  if not found then return 'not_found'; end if;
  -- Cùng một mã giao dịch gửi lại (khách tải lại trang kết quả, cổng gửi IPN lặp) → không ghi lần hai
  if coalesce(p_ref, '') <> '' and o.payment_ref = p_ref then return 'already'; end if;
  v_due := public.amount_due(o);
  if v_due = 0 then return 'already'; end if;
  if v_due <> p_amount then return 'bad_amount'; end if;
  if p_ok then
    v_next := case when o.deposit > 0 and o.payment_status <> 'da_coc' then 'da_coc' else 'da_thanh_toan' end;
    update public.orders set payment_status = v_next, payment_ref = p_ref where id = o.id;
    insert into public.order_events (order_id, status, note)
    values (o.id, 'thanh_toan', 'Thanh toán ' || case when v_next = 'da_coc' then 'cọc ' else '' end || p_gateway || ' thành công, mã GD ' || coalesce(p_ref, ''));
  else
    update public.orders set payment_status = 'that_bai' where id = o.id and payment_status = 'chua_thanh_toan';
    insert into public.order_events (order_id, status, note) values (o.id, 'thanh_toan', 'Thanh toán ' || p_gateway || ' không thành công');
  end if;
  return 'ok';
end $$;
revoke execute on function public.record_payment(text, bigint, boolean, text, text) from public, anon, authenticated;
grant execute on function public.record_payment(text, bigint, boolean, text, text) to service_role;

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

do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' and tablename in
    ('profiles','categories','products','stores','product_costs','import_settings','coupons','addresses','wishlist','reviews','orders','order_items','order_events','settings')
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

create policy "xem sản phẩm" on public.products for select using (active or public.is_admin());
create policy "admin ghi" on public.products for all using (public.is_admin()) with check (public.is_admin());

create policy "admin" on public.coupons for all using (public.is_admin()) with check (public.is_admin());

create policy "của tôi" on public.addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "của tôi" on public.wishlist for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "ai cũng xem" on public.reviews for select using (true);
create policy "viết của tôi" on public.reviews for insert with check (user_id = auth.uid());
create policy "sửa của tôi" on public.reviews for update using (user_id = auth.uid()) with check (user_id = auth.uid());
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
