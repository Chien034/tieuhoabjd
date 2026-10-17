-- Tiểu Hoa BJD: lượt mua thật + đánh giá của khách đã mua + đánh giá shop tự tạo.
-- Dán hết vào Supabase > SQL Editor rồi bấm Run. Chạy lại nhiều lần vẫn an toàn, không mất dữ liệu.
--
-- Lượt mua:  products.sold = sold_real (tự đếm từ đơn "Đã giao") + sold_bonus (shop tự cộng trong Quản trị).
-- Đánh giá:  khách chỉ gửi được qua hàm submit_review, cho sản phẩm nằm trong đơn của chính mình đã giao,
--            mỗi đơn một đánh giá cho mỗi sản phẩm. Shop (quản trị) tự tạo đánh giá với nickname, ảnh, nội dung, số sao.
--            products.rating / review_count do máy chủ tự tính lại, web không sửa tay được. Chưa có đánh giá: rating = 0.

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

select 'Xong: lượt mua thật + đánh giá đã sẵn sàng' as ket_qua;
