-- Tiểu Hoa BJD: mã giảm giá quản lý được (Quản trị > Mã giảm giá).
-- Dán hết vào Supabase > SQL Editor rồi bấm Run. Chạy lại nhiều lần vẫn an toàn, không mất mã đã tạo.
--
-- Máy chủ là nơi quyết định: place_order tự tính tiền giảm, khóa dòng mã và cộng lượt dùng,
-- trigger bên dưới chặn mã chưa tới ngày / khách dùng quá số lượt, và trả lại lượt khi đơn bị hủy.
-- Khách không đọc hay sửa trực tiếp bảng coupons (chỉ quản trị), chỉ kiểm tra mã qua check_coupon.

-- Thêm cột: ngày bắt đầu, số lượt mỗi khách, ngày tạo
alter table public.coupons add column if not exists starts_at timestamptz;
alter table public.coupons add column if not exists per_customer_limit int;
alter table public.coupons add column if not exists created_at timestamptz not null default now();

alter table public.coupons drop constraint if exists coupons_value_ok;
alter table public.coupons add constraint coupons_value_ok check (
  value >= 0 and (kind <> 'percent' or value between 1 and 100) and (kind <> 'amount' or value > 0)
  and (max_discount is null or max_discount > 0) and min_order >= 0 and used >= 0
  and (usage_limit is null or usage_limit > 0) and (per_customer_limit is null or per_customer_limit > 0)
  and (starts_at is null or expires_at is null or starts_at < expires_at));

-- Mã luôn viết hoa, không dấu cách: khách gõ "bjd10 " vẫn khớp BJD10
create or replace function public.coupon_normalize() returns trigger
language plpgsql set search_path = public as $$
begin
  new.code := upper(trim(new.code));
  if new.code !~ '^[A-Z0-9_-]{3,30}$' then
    raise exception 'Mã giảm giá chỉ gồm chữ không dấu, số, gạch ngang; dài 3–30 ký tự';
  end if;
  new.description := left(trim(coalesce(new.description, '')), 200);
  return new;
end $$;
drop trigger if exists coupon_normalize on public.coupons;
create trigger coupon_normalize before insert or update on public.coupons for each row execute function public.coupon_normalize();

-- Kiểm tra mã ở trang thanh toán (ai cũng gọi được, chỉ trả về mã còn dùng được)
create or replace function public.check_coupon(p_code text)
returns table (code text, kind text, value bigint, max_discount bigint, min_order bigint, description text)
language sql stable security definer set search_path = public as $$
  select c.code, c.kind, c.value, c.max_discount, c.min_order, c.description
  from public.coupons c
  where c.code = upper(trim(p_code)) and c.active
    and (c.starts_at is null or c.starts_at <= now())
    and (c.expires_at is null or c.expires_at > now())
    and (c.usage_limit is null or c.used < c.usage_limit)
    and (c.per_customer_limit is null or auth.uid() is null or c.per_customer_limit >
         (select count(*) from public.orders o where o.coupon_code = c.code and o.status <> 'da_huy' and o.user_id = auth.uid()))
$$;
grant execute on function public.check_coupon(text) to anon, authenticated;

-- Chạy khi đơn được cập nhật:
--  * place_order vừa gắn mã cho đơn: chặn mã chưa tới ngày bắt đầu và khách đã dùng hết lượt
--    (đếm theo số điện thoại, và theo tài khoản nếu đã đăng nhập). Lỗi ở đây hủy luôn cả đơn.
--  * đơn chuyển sang "đã hủy": trả lại một lượt dùng cho mã.
create or replace function public.coupon_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.coupons; n int;
begin
  if new.coupon_code is not null and old.coupon_code is null then
    select * into c from public.coupons where code = new.coupon_code;
    if c.starts_at is not null and c.starts_at > now() then
      raise exception 'Mã % chưa đến thời gian áp dụng', c.code;
    end if;
    if c.per_customer_limit is not null then
      select count(*) into n from public.orders o
       where o.id <> new.id and o.coupon_code = c.code and o.status <> 'da_huy'
         and (o.phone = new.phone or (new.user_id is not null and o.user_id = new.user_id));
      if n >= c.per_customer_limit then
        raise exception 'Bạn đã dùng hết lượt của mã % (mỗi khách % lần)', c.code, c.per_customer_limit;
      end if;
    end if;
  end if;
  if new.status = 'da_huy' and old.status <> 'da_huy' and old.coupon_code is not null then
    update public.coupons set used = greatest(0, used - 1) where code = old.coupon_code;
  end if;
  return new;
end $$;
drop trigger if exists coupon_guard on public.orders;
create trigger coupon_guard before update on public.orders for each row execute function public.coupon_guard();

-- Chỉ quản trị đọc / tạo / sửa / xóa mã
alter table public.coupons enable row level security;
drop policy if exists "admin" on public.coupons;
create policy "admin" on public.coupons for all using (public.is_admin()) with check (public.is_admin());
