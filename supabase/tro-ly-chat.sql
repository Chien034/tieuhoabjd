-- Tiểu Hoa BJD: chat trực tiếp khách ↔ cửa hàng + cài đặt trợ lý Ngân Nguyệt.
-- Dán hết vào Supabase > SQL Editor rồi bấm Run. Chạy lại nhiều lần vẫn an toàn, không mất tin nhắn đã có.
-- Cần chạy schema.sql trước (dùng bảng profiles và hàm is_admin).

-- Tin nhắn: mỗi khách (tài khoản web) có một cuộc trò chuyện với shop
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  sender text not null check (sender in ('khach', 'shop')),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  seen boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_customer_idx on public.chat_messages (customer_id, created_at);
create index if not exists chat_messages_created_idx on public.chat_messages (created_at desc);

alter table public.chat_messages enable row level security;
drop policy if exists "xem tin nhắn" on public.chat_messages;
drop policy if exists "gửi tin nhắn" on public.chat_messages;
drop policy if exists "đánh dấu đã xem" on public.chat_messages;
-- Khách chỉ thấy tin của mình; quản trị thấy tất cả
create policy "xem tin nhắn" on public.chat_messages for select
  using (customer_id = auth.uid() or public.is_admin());
-- Khách gửi với tư cách 'khach' vào cuộc của mình; quản trị trả lời với tư cách 'shop'
create policy "gửi tin nhắn" on public.chat_messages for insert
  with check ((customer_id = auth.uid() and sender = 'khach') or (public.is_admin() and sender = 'shop'));
-- Khách đánh dấu đã xem tin của shop; quản trị đánh dấu tin của khách
create policy "đánh dấu đã xem" on public.chat_messages for update
  using ((customer_id = auth.uid() and sender = 'shop') or (public.is_admin() and sender = 'khach'))
  with check ((customer_id = auth.uid() and sender = 'shop') or (public.is_admin() and sender = 'khach'));

revoke all on public.chat_messages from anon, authenticated;
grant select on public.chat_messages to authenticated;
grant insert (customer_id, sender, body) on public.chat_messages to authenticated; -- không tự đặt giờ gửi / đã xem
grant update (seen) on public.chat_messages to authenticated;                      -- chỉ sửa được trạng thái đã xem

-- Bật realtime để tin nhắn hiện ngay không cần tải lại trang
do $$ begin
  alter publication supabase_realtime add table public.chat_messages;
exception
  when duplicate_object then null;  -- đã bật rồi
  when undefined_object then raise notice 'Chưa có publication supabase_realtime — web vẫn chạy, tin nhắn tự cập nhật mỗi 20 giây.';
end $$;

-- Cài đặt trợ lý (tên, lời chào, ảnh) — một dòng, dạng JSON
create table if not exists public.assistant_settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
insert into public.assistant_settings (id) values (1) on conflict do nothing;
alter table public.assistant_settings enable row level security;
drop policy if exists "ai cũng xem" on public.assistant_settings;
drop policy if exists "admin ghi" on public.assistant_settings;
create policy "ai cũng xem" on public.assistant_settings for select using (true);
create policy "admin ghi" on public.assistant_settings for all using (public.is_admin()) with check (public.is_admin());
grant select on public.assistant_settings to anon, authenticated;
grant insert, update on public.assistant_settings to authenticated;

select 'Xong: đã có chat với shop và cài đặt trợ lý' as ket_qua;
