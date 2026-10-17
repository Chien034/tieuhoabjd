-- Tiểu Hoa BJD: bảng "Cài đặt cửa hàng" (Quản trị > Cài đặt cửa hàng).
-- Dán hết vào Supabase > SQL Editor rồi bấm Run. Chạy lại nhiều lần vẫn an toàn, không mất dữ liệu đã lưu.

-- Thông tin chung của shop (tên, hotline, liên hệ, tài khoản ngân hàng) — một dòng, dạng JSON
create table if not exists public.shop_info (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
insert into public.shop_info (id) values (1) on conflict do nothing;

-- Phí giao hàng đã có sẵn ở bảng settings; tạo lại phòng khi CSDL cũ chưa có
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  shipping_fee bigint not null default 30000,
  free_ship_from bigint not null default 1000000
);
insert into public.settings (id) values (1) on conflict do nothing;

-- Ai cũng xem được (web cần hiện hotline, số tài khoản), chỉ quản trị được sửa
alter table public.shop_info enable row level security;
alter table public.settings enable row level security;
alter table public.stores enable row level security;

drop policy if exists "ai cũng xem" on public.shop_info;
drop policy if exists "admin ghi" on public.shop_info;
create policy "ai cũng xem" on public.shop_info for select using (true);
create policy "admin ghi" on public.shop_info for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "ai cũng xem" on public.settings;
drop policy if exists "admin ghi" on public.settings;
create policy "ai cũng xem" on public.settings for select using (true);
create policy "admin ghi" on public.settings for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "ai cũng xem" on public.stores;
drop policy if exists "admin ghi" on public.stores;
create policy "ai cũng xem" on public.stores for select using (true);
create policy "admin ghi" on public.stores for all using (public.is_admin()) with check (public.is_admin());

grant select on public.shop_info to anon, authenticated;
grant insert, update, delete on public.shop_info to authenticated;
grant select, insert, update, delete on public.stores to authenticated;
grant usage, select on sequence public.stores_id_seq to authenticated;

-- Đồng bộ bộ đếm id showroom (phòng khi trước đó chèn showroom có sẵn id)
select setval('public.stores_id_seq', greatest(coalesce((select max(id) from public.stores), 0), 1), (select count(*) > 0 from public.stores));

select 'Xong: đã có bảng cài đặt cửa hàng' as ket_qua;
