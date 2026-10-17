-- Dữ liệu mẫu. Sinh tự động bởi scripts/seed-sql.mjs — chạy sau schema.sql. Chạy lại được.

insert into public.categories (slug, name, grp, sort) values
  ('bjd-1-3', 'Búp bê 1/3 (60cm)', 'bup-be', 1),
  ('bjd-1-4', 'Búp bê 1/4 (40–45cm)', 'bup-be', 2),
  ('bjd-1-6', 'Búp bê 1/6 (26–30cm)', 'bup-be', 3),
  ('bjd-mini', 'Búp bê mini 1/8', 'bup-be', 4),
  ('toc-gia', 'Tóc giả (wig)', 'phu-kien', 5),
  ('mat', 'Mắt (eyes)', 'phu-kien', 6),
  ('trang-phuc', 'Trang phục', 'phu-kien', 7),
  ('giay', 'Giày', 'phu-kien', 8),
  ('phu-kien-khac', 'Giá đỡ, túi, dụng cụ', 'phu-kien', 9)
on conflict (slug) do update set name = excluded.name, grp = excluded.grp, sort = excluded.sort;

insert into public.products (id, slug, sku, name, category, kind, scale, skin, set_type, gender, stock_type, lead_days, look, price, compare_price, sizes, stock, collection, tags, rating, review_count, sold, description, images, active, created_at) values
  ('p1', 'bup-be-bjd-1-4-ha-vy-full-set-bj0001', 'BJ0001', 'Búp bê BJD 1/4 Hạ Vy — Full set', 'bjd-1-4', 'doll', '1/4', 'trang-hong', 'fullset', 'nu', 'order', 35, '{"hair":3,"eye":0,"outfit":4}'::jsonb, 5630000, 6870000, array[]::text[], 99, 'lolita', array['ban-chay','flash']::text[], 4.4, 2, 31, 'Búp bê khớp cầu (BJD) 1/4 "Hạ Vy" — cô gái cao 40–45cm, đúc nhựa resin (polyurethane) mịn, khớp linh hoạt, tạo dáng được. Bản full set gồm thân, đầu đã makeup, tóc giả, mắt, trang phục và giày như ảnh.

Hàng sản xuất theo đơn tại xưởng Trung Quốc: thời gian về Việt Nam khoảng 35–55 ngày (đặt cọc 50%). Màu resin có thể chênh nhẹ giữa các đợt đúc.

Khuyến cáo: sản phẩm sưu tầm dành cho người từ 15 tuổi, có chi tiết nhỏ, không phù hợp trẻ nhỏ.', array[]::text[], true, '2026-08-25T00:00:00.000Z'),
  ('p2', 'bup-be-bjd-1-4-ha-vy-nude-bj0002', 'BJ0002', 'Búp bê BJD 1/4 Hạ Vy — Nude', 'bjd-1-4', 'doll', '1/4', 'trang-hong', 'nude', 'nu', 'co-san', 0, '{"hair":3,"eye":0,"outfit":4}'::jsonb, 4500000, null, array[]::text[], 3, 'lolita', array['moi']::text[], 4.6, 38, 1, 'Búp bê khớp cầu (BJD) 1/4 "Hạ Vy" — cô gái cao 40–45cm, đúc nhựa resin (polyurethane) mịn, khớp linh hoạt, tạo dáng được. Bản nude gồm thân + đầu đã makeup và mắt mặc định; tóc, quần áo mua riêng.

Hàng sản xuất theo đơn tại xưởng Trung Quốc: thời gian về Việt Nam khoảng 35–55 ngày (đặt cọc 50%). Màu resin có thể chênh nhẹ giữa các đợt đúc.

Khuyến cáo: sản phẩm sưu tầm dành cho người từ 15 tuổi, có chi tiết nhỏ, không phù hợp trẻ nhỏ.', array[]::text[], true, '2026-09-30T00:00:00.000Z'),
  ('p3', 'bup-be-bjd-1-4-lam-nguyet-full-set-bj0003', 'BJ0003', 'Búp bê BJD 1/4 Lam Nguyệt — Full set', 'bjd-1-4', 'doll', '1/4', 'trang-tu-nhien', 'fullset', 'nu', 'co-san', 0, '{"hair":0,"eye":0,"outfit":3}'::jsonb, 9030000, null, array[]::text[], 1, 'co-trang', array[]::text[], 4.9, 47, 2, 'Búp bê khớp cầu (BJD) 1/4 "Lam Nguyệt" — cô gái cao 40–45cm, đúc nhựa resin (polyurethane) mịn, khớp linh hoạt, tạo dáng được. Bản full set gồm thân, đầu đã makeup, tóc giả, mắt, trang phục và giày như ảnh.

Hàng sản xuất theo đơn tại xưởng Trung Quốc: thời gian về Việt Nam khoảng 35–55 ngày (đặt cọc 50%). Màu resin có thể chênh nhẹ giữa các đợt đúc.

Khuyến cáo: sản phẩm sưu tầm dành cho người từ 15 tuổi, có chi tiết nhỏ, không phù hợp trẻ nhỏ.', array[]::text[], true, '2026-05-07T00:00:00.000Z'),
  ('p4', 'bup-be-bjd-1-6-khai-minh-full-set-bj0004', 'BJ0004', 'Búp bê BJD 1/6 Khải Minh — Full set', 'bjd-1-6', 'doll', '1/6', 'trang-su', 'fullset', 'nam', 'order', 30, '{"hair":8,"eye":0,"outfit":5}'::jsonb, 3930000, null, array[]::text[], 99, 'hoc-duong', array[]::text[], 4.5, 25, 19, 'Búp bê khớp cầu (BJD) 1/6 "Khải Minh" — chàng trai cao 26–30cm, đúc nhựa resin (polyurethane) mịn, khớp linh hoạt, tạo dáng được. Bản full set gồm thân, đầu đã makeup, tóc giả, mắt, trang phục và giày như ảnh.

Hàng sản xuất theo đơn tại xưởng Trung Quốc: thời gian về Việt Nam khoảng 30–50 ngày (đặt cọc 50%). Màu resin có thể chênh nhẹ giữa các đợt đúc.

Khuyến cáo: sản phẩm sưu tầm dành cho người từ 15 tuổi, có chi tiết nhỏ, không phù hợp trẻ nhỏ.', array[]::text[], true, '2026-08-16T00:00:00.000Z'),
  ('p5', 'bup-be-bjd-1-6-khai-minh-nude-bj0005', 'BJ0005', 'Búp bê BJD 1/6 Khải Minh — Nude', 'bjd-1-6', 'doll', '1/6', 'trang-su', 'nude', 'nam', 'order', 30, '{"hair":8,"eye":0,"outfit":5}'::jsonb, 3150000, 3630000, array[]::text[], 99, 'hoc-duong', array['moi']::text[], 4.5, 12, 12, 'Búp bê khớp cầu (BJD) 1/6 "Khải Minh" — chàng trai cao 26–30cm, đúc nhựa resin (polyurethane) mịn, khớp linh hoạt, tạo dáng được. Bản nude gồm thân + đầu đã makeup và mắt mặc định; tóc, quần áo mua riêng.

Hàng sản xuất theo đơn tại xưởng Trung Quốc: thời gian về Việt Nam khoảng 30–50 ngày (đặt cọc 50%). Màu resin có thể chênh nhẹ giữa các đợt đúc.

Khuyến cáo: sản phẩm sưu tầm dành cho người từ 15 tuổi, có chi tiết nhỏ, không phù hợp trẻ nhỏ.', array[]::text[], true, '2026-06-10T00:00:00.000Z'),
  ('p6', 'bup-be-bjd-1-3-tu-dang-full-set-bj0006', 'BJ0006', 'Búp bê BJD 1/3 Tử Đằng — Full set', 'bjd-1-3', 'doll', '1/3', 'trang-su', 'fullset', 'nu', 'order', 45, '{"hair":4,"eye":4,"outfit":6}'::jsonb, 17180000, null, array[]::text[], 99, 'dark', array['ban-chay']::text[], 4.6, 30, 22, 'Búp bê khớp cầu (BJD) 1/3 "Tử Đằng" — cô gái cao 58–65cm, đúc nhựa resin (polyurethane) mịn, khớp linh hoạt, tạo dáng được. Bản full set gồm thân, đầu đã makeup, tóc giả, mắt, trang phục và giày như ảnh.

Hàng sản xuất theo đơn tại xưởng Trung Quốc: thời gian về Việt Nam khoảng 45–65 ngày (đặt cọc 50%). Màu resin có thể chênh nhẹ giữa các đợt đúc.

Khuyến cáo: sản phẩm sưu tầm dành cho người từ 15 tuổi, có chi tiết nhỏ, không phù hợp trẻ nhỏ.', array[]::text[], true, '2026-06-16T00:00:00.000Z'),
  ('p7', 'bup-be-bjd-1-4-an-nhien-full-set-bj0007', 'BJ0007', 'Búp bê BJD 1/4 An Nhiên — Full set', 'bjd-1-4', 'doll', '1/4', 'trang-tu-nhien', 'fullset', 'nu', 'order', 35, '{"hair":0,"eye":1,"outfit":3}'::jsonb, 9080000, null, array[]::text[], 99, 'hoc-duong', array['moi']::text[], 4.8, 54, 6, 'Búp bê khớp cầu (BJD) 1/4 "An Nhiên" — cô gái cao 40–45cm, đúc nhựa resin (polyurethane) mịn, khớp linh hoạt, tạo dáng được. Bản full set gồm thân, đầu đã makeup, tóc giả, mắt, trang phục và giày như ảnh.

Hàng sản xuất theo đơn tại xưởng Trung Quốc: thời gian về Việt Nam khoảng 35–55 ngày (đặt cọc 50%). Màu resin có thể chênh nhẹ giữa các đợt đúc.

Khuyến cáo: sản phẩm sưu tầm dành cho người từ 15 tuổi, có chi tiết nhỏ, không phù hợp trẻ nhỏ.', array[]::text[], true, '2026-09-06T00:00:00.000Z'),
  ('p8', 'bup-be-bjd-1-4-an-nhien-nude-bj0008', 'BJ0008', 'Búp bê BJD 1/4 An Nhiên — Nude', 'bjd-1-4', 'doll', '1/4', 'trang-tu-nhien', 'nude', 'nu', 'order', 35, '{"hair":0,"eye":1,"outfit":3}'::jsonb, 7310000, null, array[]::text[], 99, 'hoc-duong', array['ban-chay']::text[], 4.3, 34, 11, 'Búp bê khớp cầu (BJD) 1/4 "An Nhiên" — cô gái cao 40–45cm, đúc nhựa resin (polyurethane) mịn, khớp linh hoạt, tạo dáng được. Bản nude gồm thân + đầu đã makeup và mắt mặc định; tóc, quần áo mua riêng.

Hàng sản xuất theo đơn tại xưởng Trung Quốc: thời gian về Việt Nam khoảng 35–55 ngày (đặt cọc 50%). Màu resin có thể chênh nhẹ giữa các đợt đúc.

Khuyến cáo: sản phẩm sưu tầm dành cho người từ 15 tuổi, có chi tiết nhỏ, không phù hợp trẻ nhỏ.', array[]::text[], true, '2026-04-15T00:00:00.000Z'),
  ('p9', 'bup-be-bjd-1-6-moc-lan-full-set-bj0009', 'BJ0009', 'Búp bê BJD 1/6 Mộc Lan — Full set', 'bjd-1-6', 'doll', '1/6', 'trang-hong', 'fullset', 'nu', 'order', 30, '{"hair":3,"eye":3,"outfit":7}'::jsonb, 5280000, null, array[]::text[], 99, 'co-trang', array[]::text[], 4.8, 0, 20, 'Búp bê khớp cầu (BJD) 1/6 "Mộc Lan" — cô gái cao 26–30cm, đúc nhựa resin (polyurethane) mịn, khớp linh hoạt, tạo dáng được. Bản full set gồm thân, đầu đã makeup, tóc giả, mắt, trang phục và giày như ảnh.

Hàng sản xuất theo đơn tại xưởng Trung Quốc: thời gian về Việt Nam khoảng 30–50 ngày (đặt cọc 50%). Màu resin có thể chênh nhẹ giữa các đợt đúc.

Khuyến cáo: sản phẩm sưu tầm dành cho người từ 15 tuổi, có chi tiết nhỏ, không phù hợp trẻ nhỏ.', array[]::text[], true, '2026-09-07T00:00:00.000Z'),
  ('p10', 'bup-be-bjd-1-8-thien-an-full-set-bj0010', 'BJ0010', 'Búp bê BJD 1/8 Thiên Ân — Full set', 'bjd-mini', 'doll', '1/8', 'trang-su', 'fullset', 'nam', 'order', 25, '{"hair":1,"eye":1,"outfit":5}'::jsonb, 2960000, 3690000, array[]::text[], 99, 'dark', array['ban-chay','moi','flash']::text[], 4.6, 57, 36, 'Búp bê khớp cầu (BJD) 1/8 "Thiên Ân" — chàng trai cao 16–20cm, đúc nhựa resin (polyurethane) mịn, khớp linh hoạt, tạo dáng được. Bản full set gồm thân, đầu đã makeup, tóc giả, mắt, trang phục và giày như ảnh.

Hàng sản xuất theo đơn tại xưởng Trung Quốc: thời gian về Việt Nam khoảng 25–45 ngày (đặt cọc 50%). Màu resin có thể chênh nhẹ giữa các đợt đúc.

Khuyến cáo: sản phẩm sưu tầm dành cho người từ 15 tuổi, có chi tiết nhỏ, không phù hợp trẻ nhỏ.', array[]::text[], true, '2026-06-04T00:00:00.000Z'),
  ('p11', 'bup-be-bjd-1-8-thien-an-nude-bj0011', 'BJ0011', 'Búp bê BJD 1/8 Thiên Ân — Nude', 'bjd-mini', 'doll', '1/8', 'trang-su', 'nude', 'nam', 'order', 25, '{"hair":1,"eye":1,"outfit":5}'::jsonb, 2390000, null, array[]::text[], 99, 'dark', array['moi']::text[], 4.6, 24, 17, 'Búp bê khớp cầu (BJD) 1/8 "Thiên Ân" — chàng trai cao 16–20cm, đúc nhựa resin (polyurethane) mịn, khớp linh hoạt, tạo dáng được. Bản nude gồm thân + đầu đã makeup và mắt mặc định; tóc, quần áo mua riêng.

Hàng sản xuất theo đơn tại xưởng Trung Quốc: thời gian về Việt Nam khoảng 25–45 ngày (đặt cọc 50%). Màu resin có thể chênh nhẹ giữa các đợt đúc.

Khuyến cáo: sản phẩm sưu tầm dành cho người từ 15 tuổi, có chi tiết nhỏ, không phù hợp trẻ nhỏ.', array[]::text[], true, '2026-09-11T00:00:00.000Z'),
  ('p12', 'bup-be-bjd-1-4-bach-van-full-set-bj0012', 'BJ0012', 'Búp bê BJD 1/4 Bạch Vân — Full set', 'bjd-1-4', 'doll', '1/4', 'trang-hong', 'fullset', 'nu', 'order', 35, '{"hair":2,"eye":2,"outfit":5}'::jsonb, 5490000, null, array[]::text[], 99, 'lolita', array[]::text[], 4.4, 49, 22, 'Búp bê khớp cầu (BJD) 1/4 "Bạch Vân" — cô gái cao 40–45cm, đúc nhựa resin (polyurethane) mịn, khớp linh hoạt, tạo dáng được. Bản full set gồm thân, đầu đã makeup, tóc giả, mắt, trang phục và giày như ảnh.

Hàng sản xuất theo đơn tại xưởng Trung Quốc: thời gian về Việt Nam khoảng 35–55 ngày (đặt cọc 50%). Màu resin có thể chênh nhẹ giữa các đợt đúc.

Khuyến cáo: sản phẩm sưu tầm dành cho người từ 15 tuổi, có chi tiết nhỏ, không phù hợp trẻ nhỏ.', array[]::text[], true, '2026-08-11T00:00:00.000Z'),
  ('p13', 'bup-be-bjd-1-3-minh-khang-full-set-bj0013', 'BJ0013', 'Búp bê BJD 1/3 Minh Khang — Full set', 'bjd-1-3', 'doll', '1/3', 'trang-tu-nhien', 'fullset', 'nam', 'order', 45, '{"hair":1,"eye":6,"outfit":1}'::jsonb, 17860000, 22000000, array[]::text[], 99, 'co-trang', array['moi']::text[], 4.6, 36, 11, 'Búp bê khớp cầu (BJD) 1/3 "Minh Khang" — chàng trai cao 58–65cm, đúc nhựa resin (polyurethane) mịn, khớp linh hoạt, tạo dáng được. Bản full set gồm thân, đầu đã makeup, tóc giả, mắt, trang phục và giày như ảnh.

Hàng sản xuất theo đơn tại xưởng Trung Quốc: thời gian về Việt Nam khoảng 45–65 ngày (đặt cọc 50%). Màu resin có thể chênh nhẹ giữa các đợt đúc.

Khuyến cáo: sản phẩm sưu tầm dành cho người từ 15 tuổi, có chi tiết nhỏ, không phù hợp trẻ nhỏ.', array[]::text[], true, '2026-08-30T00:00:00.000Z'),
  ('p14', 'bup-be-bjd-1-3-minh-khang-nude-bj0014', 'BJ0014', 'Búp bê BJD 1/3 Minh Khang — Nude', 'bjd-1-3', 'doll', '1/3', 'trang-tu-nhien', 'nude', 'nam', 'co-san', 0, '{"hair":1,"eye":6,"outfit":1}'::jsonb, 14320000, null, array[]::text[], 2, 'co-trang', array[]::text[], 4.8, 12, 28, 'Búp bê khớp cầu (BJD) 1/3 "Minh Khang" — chàng trai cao 58–65cm, đúc nhựa resin (polyurethane) mịn, khớp linh hoạt, tạo dáng được. Bản nude gồm thân + đầu đã makeup và mắt mặc định; tóc, quần áo mua riêng.

Hàng sản xuất theo đơn tại xưởng Trung Quốc: thời gian về Việt Nam khoảng 45–65 ngày (đặt cọc 50%). Màu resin có thể chênh nhẹ giữa các đợt đúc.

Khuyến cáo: sản phẩm sưu tầm dành cho người từ 15 tuổi, có chi tiết nhỏ, không phù hợp trẻ nhỏ.', array[]::text[], true, '2026-09-12T00:00:00.000Z'),
  ('p15', 'bup-be-bjd-1-6-lac-anh-full-set-bj0015', 'BJ0015', 'Búp bê BJD 1/6 Lạc Anh — Full set', 'bjd-1-6', 'doll', '1/6', 'trang-hong', 'fullset', 'nu', 'order', 30, '{"hair":5,"eye":1,"outfit":6}'::jsonb, 5590000, null, array[]::text[], 99, 'lolita', array[]::text[], 4.5, 23, 38, 'Búp bê khớp cầu (BJD) 1/6 "Lạc Anh" — cô gái cao 26–30cm, đúc nhựa resin (polyurethane) mịn, khớp linh hoạt, tạo dáng được. Bản full set gồm thân, đầu đã makeup, tóc giả, mắt, trang phục và giày như ảnh.

Hàng sản xuất theo đơn tại xưởng Trung Quốc: thời gian về Việt Nam khoảng 30–50 ngày (đặt cọc 50%). Màu resin có thể chênh nhẹ giữa các đợt đúc.

Khuyến cáo: sản phẩm sưu tầm dành cho người từ 15 tuổi, có chi tiết nhỏ, không phù hợp trẻ nhỏ.', array[]::text[], true, '2026-04-12T00:00:00.000Z'),
  ('p16', 'bup-be-bjd-1-4-tieu-mai-full-set-bj0016', 'BJ0016', 'Búp bê BJD 1/4 Tiểu Mai — Full set', 'bjd-1-4', 'doll', '1/4', 'trang-tu-nhien', 'fullset', 'nu', 'order', 35, '{"hair":1,"eye":0,"outfit":3}'::jsonb, 8140000, null, array[]::text[], 99, 'hoc-duong', array['ban-chay','moi']::text[], 4.5, 41, 34, 'Búp bê khớp cầu (BJD) 1/4 "Tiểu Mai" — cô gái cao 40–45cm, đúc nhựa resin (polyurethane) mịn, khớp linh hoạt, tạo dáng được. Bản full set gồm thân, đầu đã makeup, tóc giả, mắt, trang phục và giày như ảnh.

Hàng sản xuất theo đơn tại xưởng Trung Quốc: thời gian về Việt Nam khoảng 35–55 ngày (đặt cọc 50%). Màu resin có thể chênh nhẹ giữa các đợt đúc.

Khuyến cáo: sản phẩm sưu tầm dành cho người từ 15 tuổi, có chi tiết nhỏ, không phù hợp trẻ nhỏ.', array[]::text[], true, '2026-06-06T00:00:00.000Z'),
  ('p17', 'bup-be-bjd-1-4-tieu-mai-nude-bj0017', 'BJ0017', 'Búp bê BJD 1/4 Tiểu Mai — Nude', 'bjd-1-4', 'doll', '1/4', 'trang-tu-nhien', 'nude', 'nu', 'co-san', 0, '{"hair":1,"eye":0,"outfit":3}'::jsonb, 6530000, null, array[]::text[], 1, 'hoc-duong', array[]::text[], 4.8, 5, 9, 'Búp bê khớp cầu (BJD) 1/4 "Tiểu Mai" — cô gái cao 40–45cm, đúc nhựa resin (polyurethane) mịn, khớp linh hoạt, tạo dáng được. Bản nude gồm thân + đầu đã makeup và mắt mặc định; tóc, quần áo mua riêng.

Hàng sản xuất theo đơn tại xưởng Trung Quốc: thời gian về Việt Nam khoảng 35–55 ngày (đặt cọc 50%). Màu resin có thể chênh nhẹ giữa các đợt đúc.

Khuyến cáo: sản phẩm sưu tầm dành cho người từ 15 tuổi, có chi tiết nhỏ, không phù hợp trẻ nhỏ.', array[]::text[], true, '2026-07-19T00:00:00.000Z'),
  ('p18', 'bup-be-bjd-1-6-da-lam-full-set-bj0018', 'BJ0018', 'Búp bê BJD 1/6 Dạ Lam — Full set', 'bjd-1-6', 'doll', '1/6', 'ngam', 'fullset', 'nam', 'co-san', 0, '{"hair":0,"eye":1,"outfit":1}'::jsonb, 5120000, null, array[]::text[], 2, 'dark', array[]::text[], 4.3, 18, 4, 'Búp bê khớp cầu (BJD) 1/6 "Dạ Lam" — chàng trai cao 26–30cm, đúc nhựa resin (polyurethane) mịn, khớp linh hoạt, tạo dáng được. Bản full set gồm thân, đầu đã makeup, tóc giả, mắt, trang phục và giày như ảnh.

Hàng sản xuất theo đơn tại xưởng Trung Quốc: thời gian về Việt Nam khoảng 30–50 ngày (đặt cọc 50%). Màu resin có thể chênh nhẹ giữa các đợt đúc.

Khuyến cáo: sản phẩm sưu tầm dành cho người từ 15 tuổi, có chi tiết nhỏ, không phù hợp trẻ nhỏ.', array[]::text[], true, '2026-04-20T00:00:00.000Z'),
  ('p19', 'bup-be-bjd-1-8-anh-duong-full-set-bj0019', 'BJ0019', 'Búp bê BJD 1/8 Ánh Dương — Full set', 'bjd-mini', 'doll', '1/8', 'trang-tu-nhien', 'fullset', 'nu', 'co-san', 0, '{"hair":2,"eye":6,"outfit":5}'::jsonb, 1970000, 2320000, array[]::text[], 3, 'lolita', array['ban-chay','flash']::text[], 4.8, 45, 18, 'Búp bê khớp cầu (BJD) 1/8 "Ánh Dương" — cô gái cao 16–20cm, đúc nhựa resin (polyurethane) mịn, khớp linh hoạt, tạo dáng được. Bản full set gồm thân, đầu đã makeup, tóc giả, mắt, trang phục và giày như ảnh.

Hàng sản xuất theo đơn tại xưởng Trung Quốc: thời gian về Việt Nam khoảng 25–45 ngày (đặt cọc 50%). Màu resin có thể chênh nhẹ giữa các đợt đúc.

Khuyến cáo: sản phẩm sưu tầm dành cho người từ 15 tuổi, có chi tiết nhỏ, không phù hợp trẻ nhỏ.', array[]::text[], true, '2026-10-06T00:00:00.000Z'),
  ('p20', 'bup-be-bjd-1-8-anh-duong-nude-bj0020', 'BJ0020', 'Búp bê BJD 1/8 Ánh Dương — Nude', 'bjd-mini', 'doll', '1/8', 'trang-tu-nhien', 'nude', 'nu', 'co-san', 0, '{"hair":2,"eye":6,"outfit":5}'::jsonb, 1610000, null, array[]::text[], 1, 'lolita', array['ban-chay']::text[], 4.4, 2, 4, 'Búp bê khớp cầu (BJD) 1/8 "Ánh Dương" — cô gái cao 16–20cm, đúc nhựa resin (polyurethane) mịn, khớp linh hoạt, tạo dáng được. Bản nude gồm thân + đầu đã makeup và mắt mặc định; tóc, quần áo mua riêng.

Hàng sản xuất theo đơn tại xưởng Trung Quốc: thời gian về Việt Nam khoảng 25–45 ngày (đặt cọc 50%). Màu resin có thể chênh nhẹ giữa các đợt đúc.

Khuyến cáo: sản phẩm sưu tầm dành cho người từ 15 tuổi, có chi tiết nhỏ, không phù hợp trẻ nhỏ.', array[]::text[], true, '2026-05-29T00:00:00.000Z'),
  ('p21', 'bup-be-bjd-1-3-han-phong-full-set-bj0021', 'BJ0021', 'Búp bê BJD 1/3 Hàn Phong — Full set', 'bjd-1-3', 'doll', '1/3', 'trang-su', 'fullset', 'nam', 'order', 45, '{"hair":7,"eye":6,"outfit":2}'::jsonb, 13020000, null, array[]::text[], 99, 'co-trang', array[]::text[], 4.3, 3, 27, 'Búp bê khớp cầu (BJD) 1/3 "Hàn Phong" — chàng trai cao 58–65cm, đúc nhựa resin (polyurethane) mịn, khớp linh hoạt, tạo dáng được. Bản full set gồm thân, đầu đã makeup, tóc giả, mắt, trang phục và giày như ảnh.

Hàng sản xuất theo đơn tại xưởng Trung Quốc: thời gian về Việt Nam khoảng 45–65 ngày (đặt cọc 50%). Màu resin có thể chênh nhẹ giữa các đợt đúc.

Khuyến cáo: sản phẩm sưu tầm dành cho người từ 15 tuổi, có chi tiết nhỏ, không phù hợp trẻ nhỏ.', array[]::text[], true, '2026-08-25T00:00:00.000Z'),
  ('p22', 'bup-be-bjd-1-4-nguyet-cam-full-set-bj0022', 'BJ0022', 'Búp bê BJD 1/4 Nguyệt Cầm — Full set', 'bjd-1-4', 'doll', '1/4', 'trang-hong', 'fullset', 'nu', 'order', 35, '{"hair":3,"eye":5,"outfit":4}'::jsonb, 6740000, null, array[]::text[], 99, 'dark', array['ban-chay']::text[], 4.3, 15, 10, 'Búp bê khớp cầu (BJD) 1/4 "Nguyệt Cầm" — cô gái cao 40–45cm, đúc nhựa resin (polyurethane) mịn, khớp linh hoạt, tạo dáng được. Bản full set gồm thân, đầu đã makeup, tóc giả, mắt, trang phục và giày như ảnh.

Hàng sản xuất theo đơn tại xưởng Trung Quốc: thời gian về Việt Nam khoảng 35–55 ngày (đặt cọc 50%). Màu resin có thể chênh nhẹ giữa các đợt đúc.

Khuyến cáo: sản phẩm sưu tầm dành cho người từ 15 tuổi, có chi tiết nhỏ, không phù hợp trẻ nhỏ.', array[]::text[], true, '2026-06-12T00:00:00.000Z'),
  ('p23', 'bup-be-bjd-1-4-nguyet-cam-nude-bj0023', 'BJ0023', 'Búp bê BJD 1/4 Nguyệt Cầm — Nude', 'bjd-1-4', 'doll', '1/4', 'trang-hong', 'nude', 'nu', 'co-san', 0, '{"hair":3,"eye":5,"outfit":4}'::jsonb, 5440000, 6610000, array[]::text[], 2, 'dark', array['ban-chay','flash']::text[], 4.4, 42, 16, 'Búp bê khớp cầu (BJD) 1/4 "Nguyệt Cầm" — cô gái cao 40–45cm, đúc nhựa resin (polyurethane) mịn, khớp linh hoạt, tạo dáng được. Bản nude gồm thân + đầu đã makeup và mắt mặc định; tóc, quần áo mua riêng.

Hàng sản xuất theo đơn tại xưởng Trung Quốc: thời gian về Việt Nam khoảng 35–55 ngày (đặt cọc 50%). Màu resin có thể chênh nhẹ giữa các đợt đúc.

Khuyến cáo: sản phẩm sưu tầm dành cho người từ 15 tuổi, có chi tiết nhỏ, không phù hợp trẻ nhỏ.', array[]::text[], true, '2026-09-02T00:00:00.000Z'),
  ('p24', 'bup-be-bjd-1-6-tinh-tu-full-set-bj0024', 'BJ0024', 'Búp bê BJD 1/6 Tinh Tú — Full set', 'bjd-1-6', 'doll', '1/6', 'trang-su', 'fullset', 'unisex', 'order', 30, '{"hair":4,"eye":1,"outfit":6}'::jsonb, 3250000, null, array[]::text[], 99, 'hoc-duong', array['moi']::text[], 4.6, 44, 21, 'Búp bê khớp cầu (BJD) 1/6 "Tinh Tú" — nhân vật cao 26–30cm, đúc nhựa resin (polyurethane) mịn, khớp linh hoạt, tạo dáng được. Bản full set gồm thân, đầu đã makeup, tóc giả, mắt, trang phục và giày như ảnh.

Hàng sản xuất theo đơn tại xưởng Trung Quốc: thời gian về Việt Nam khoảng 30–50 ngày (đặt cọc 50%). Màu resin có thể chênh nhẹ giữa các đợt đúc.

Khuyến cáo: sản phẩm sưu tầm dành cho người từ 15 tuổi, có chi tiết nhỏ, không phù hợp trẻ nhỏ.', array[]::text[], true, '2026-05-30T00:00:00.000Z'),
  ('p25', 'bup-be-bjd-1-8-bong-full-set-bj0025', 'BJ0025', 'Búp bê BJD 1/8 Bông — Full set', 'bjd-mini', 'doll', '1/8', 'trang-su', 'fullset', 'nu', 'order', 25, '{"hair":0,"eye":5,"outfit":1}'::jsonb, 1770000, null, array[]::text[], 99, 'lolita', array[]::text[], 4.6, 8, 32, 'Búp bê khớp cầu (BJD) 1/8 "Bông" — cô gái cao 16–20cm, đúc nhựa resin (polyurethane) mịn, khớp linh hoạt, tạo dáng được. Bản full set gồm thân, đầu đã makeup, tóc giả, mắt, trang phục và giày như ảnh.

Hàng sản xuất theo đơn tại xưởng Trung Quốc: thời gian về Việt Nam khoảng 25–45 ngày (đặt cọc 50%). Màu resin có thể chênh nhẹ giữa các đợt đúc.

Khuyến cáo: sản phẩm sưu tầm dành cho người từ 15 tuổi, có chi tiết nhỏ, không phù hợp trẻ nhỏ.', array[]::text[], true, '2026-07-27T00:00:00.000Z'),
  ('p26', 'bup-be-bjd-1-8-bong-nude-bj0026', 'BJ0026', 'Búp bê BJD 1/8 Bông — Nude', 'bjd-mini', 'doll', '1/8', 'trang-su', 'nude', 'nu', 'order', 25, '{"hair":0,"eye":5,"outfit":1}'::jsonb, 1400000, null, array[]::text[], 99, 'lolita', array['ban-chay']::text[], 4.6, 5, 3, 'Búp bê khớp cầu (BJD) 1/8 "Bông" — cô gái cao 16–20cm, đúc nhựa resin (polyurethane) mịn, khớp linh hoạt, tạo dáng được. Bản nude gồm thân + đầu đã makeup và mắt mặc định; tóc, quần áo mua riêng.

Hàng sản xuất theo đơn tại xưởng Trung Quốc: thời gian về Việt Nam khoảng 25–45 ngày (đặt cọc 50%). Màu resin có thể chênh nhẹ giữa các đợt đúc.

Khuyến cáo: sản phẩm sưu tầm dành cho người từ 15 tuổi, có chi tiết nhỏ, không phù hợp trẻ nhỏ.', array[]::text[], true, '2026-05-21T00:00:00.000Z'),
  ('p27', 'bup-be-bjd-1-8-gao-full-set-bj0027', 'BJ0027', 'Búp bê BJD 1/8 Gạo — Full set', 'bjd-mini', 'doll', '1/8', 'trang-su', 'fullset', 'unisex', 'order', 25, '{"hair":6,"eye":0,"outfit":2}'::jsonb, 2600000, null, array[]::text[], 99, 'hoc-duong', array['moi']::text[], 4.4, 17, 20, 'Búp bê khớp cầu (BJD) 1/8 "Gạo" — nhân vật cao 16–20cm, đúc nhựa resin (polyurethane) mịn, khớp linh hoạt, tạo dáng được. Bản full set gồm thân, đầu đã makeup, tóc giả, mắt, trang phục và giày như ảnh.

Hàng sản xuất theo đơn tại xưởng Trung Quốc: thời gian về Việt Nam khoảng 25–45 ngày (đặt cọc 50%). Màu resin có thể chênh nhẹ giữa các đợt đúc.

Khuyến cáo: sản phẩm sưu tầm dành cho người từ 15 tuổi, có chi tiết nhỏ, không phù hợp trẻ nhỏ.', array[]::text[], true, '2026-05-11T00:00:00.000Z'),
  ('p28', 'bup-be-bjd-1-6-mochi-full-set-bj0028', 'BJ0028', 'Búp bê BJD 1/6 Mochi — Full set', 'bjd-1-6', 'doll', '1/6', 'trang-hong', 'fullset', 'nu', 'co-san', 0, '{"hair":4,"eye":1,"outfit":1}'::jsonb, 4600000, null, array[]::text[], 1, 'lolita', array['ban-chay']::text[], 4.7, 9, 0, 'Búp bê khớp cầu (BJD) 1/6 "Mochi" — cô gái cao 26–30cm, đúc nhựa resin (polyurethane) mịn, khớp linh hoạt, tạo dáng được. Bản full set gồm thân, đầu đã makeup, tóc giả, mắt, trang phục và giày như ảnh.

Hàng sản xuất theo đơn tại xưởng Trung Quốc: thời gian về Việt Nam khoảng 30–50 ngày (đặt cọc 50%). Màu resin có thể chênh nhẹ giữa các đợt đúc.

Khuyến cáo: sản phẩm sưu tầm dành cho người từ 15 tuổi, có chi tiết nhỏ, không phù hợp trẻ nhỏ.', array[]::text[], true, '2026-09-25T00:00:00.000Z'),
  ('p29', 'bup-be-bjd-1-6-mochi-nude-bj0029', 'BJ0029', 'Búp bê BJD 1/6 Mochi — Nude', 'bjd-1-6', 'doll', '1/6', 'trang-hong', 'nude', 'nu', 'co-san', 0, '{"hair":4,"eye":1,"outfit":1}'::jsonb, 3720000, null, array[]::text[], 1, 'lolita', array['ban-chay']::text[], 4.4, 29, 30, 'Búp bê khớp cầu (BJD) 1/6 "Mochi" — cô gái cao 26–30cm, đúc nhựa resin (polyurethane) mịn, khớp linh hoạt, tạo dáng được. Bản nude gồm thân + đầu đã makeup và mắt mặc định; tóc, quần áo mua riêng.

Hàng sản xuất theo đơn tại xưởng Trung Quốc: thời gian về Việt Nam khoảng 30–50 ngày (đặt cọc 50%). Màu resin có thể chênh nhẹ giữa các đợt đúc.

Khuyến cáo: sản phẩm sưu tầm dành cho người từ 15 tuổi, có chi tiết nhỏ, không phù hợp trẻ nhỏ.', array[]::text[], true, '2026-08-21T00:00:00.000Z'),
  ('p30', 'bup-be-bjd-1-4-nam-full-set-bj0030', 'BJ0030', 'Búp bê BJD 1/4 Nấm — Full set', 'bjd-1-4', 'doll', '1/4', 'ngam', 'fullset', 'unisex', 'order', 35, '{"hair":0,"eye":6,"outfit":4}'::jsonb, 6110000, null, array[]::text[], 99, 'dark', array['moi']::text[], 4.6, 42, 5, 'Búp bê khớp cầu (BJD) 1/4 "Nấm" — nhân vật cao 40–45cm, đúc nhựa resin (polyurethane) mịn, khớp linh hoạt, tạo dáng được. Bản full set gồm thân, đầu đã makeup, tóc giả, mắt, trang phục và giày như ảnh.

Hàng sản xuất theo đơn tại xưởng Trung Quốc: thời gian về Việt Nam khoảng 35–55 ngày (đặt cọc 50%). Màu resin có thể chênh nhẹ giữa các đợt đúc.

Khuyến cáo: sản phẩm sưu tầm dành cho người từ 15 tuổi, có chi tiết nhỏ, không phù hợp trẻ nhỏ.', array[]::text[], true, '2026-08-07T00:00:00.000Z'),
  ('p31', 'toc-gia-dai-xoan-song-mau-do-ruou-size-1-3-pk0031', 'PK0031', 'Tóc giả dài xoăn sóng màu đỏ rượu — size 1/3', 'toc-gia', 'wig', '1/3', null, null, 'unisex', 'order', 15, '{"hair":7,"eye":0,"outfit":7}'::jsonb, 520000, null, array[]::text[], 99, 'lolita', array['ban-chay']::text[], 4.6, 47, 45, 'Tóc giả dài xoăn sóng dành cho búp bê 1/3. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.

Chu vi đầu tham khảo: 1/3 ≈ 8–9 inch, 1/4 ≈ 7–8 inch, 1/6 ≈ 6–7 inch. Đo đầu búp bê trước khi chọn.', array[]::text[], true, '2026-08-03T00:00:00.000Z'),
  ('p32', 'toc-gia-dai-xoan-song-mau-trang-size-1-4-pk0032', 'PK0032', 'Tóc giả dài xoăn sóng màu trắng — size 1/4', 'toc-gia', 'wig', '1/4', null, null, 'unisex', 'co-san', 0, '{"hair":8,"eye":1,"outfit":0}'::jsonb, 320000, 380000, array[]::text[], 5, 'lolita', array['flash']::text[], 4.4, 13, 294, 'Tóc giả dài xoăn sóng dành cho búp bê 1/4. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.

Chu vi đầu tham khảo: 1/3 ≈ 8–9 inch, 1/4 ≈ 7–8 inch, 1/6 ≈ 6–7 inch. Đo đầu búp bê trước khi chọn.', array[]::text[], true, '2026-07-24T00:00:00.000Z'),
  ('p33', 'toc-gia-dai-xoan-song-mau-trang-size-1-6-pk0033', 'PK0033', 'Tóc giả dài xoăn sóng màu trắng — size 1/6', 'toc-gia', 'wig', '1/6', null, null, 'unisex', 'co-san', 0, '{"hair":8,"eye":1,"outfit":0}'::jsonb, 290000, 330000, array[]::text[], 3, 'lolita', array['ban-chay','moi']::text[], 4.8, 9, 137, 'Tóc giả dài xoăn sóng dành cho búp bê 1/6. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.

Chu vi đầu tham khảo: 1/3 ≈ 8–9 inch, 1/4 ≈ 7–8 inch, 1/6 ≈ 6–7 inch. Đo đầu búp bê trước khi chọn.', array[]::text[], true, '2026-04-04T00:00:00.000Z'),
  ('p34', 'toc-gia-bob-ngang-vai-mau-trang-size-1-3-pk0034', 'PK0034', 'Tóc giả bob ngang vai màu trắng — size 1/3', 'toc-gia', 'wig', '1/3', null, null, 'unisex', 'co-san', 0, '{"hair":8,"eye":1,"outfit":0}'::jsonb, 560000, null, array[]::text[], 12, 'hoc-duong', array[]::text[], 4.9, 23, 127, 'Tóc giả bob ngang vai dành cho búp bê 1/3. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.

Chu vi đầu tham khảo: 1/3 ≈ 8–9 inch, 1/4 ≈ 7–8 inch, 1/6 ≈ 6–7 inch. Đo đầu búp bê trước khi chọn.', array[]::text[], true, '2026-08-08T00:00:00.000Z'),
  ('p35', 'toc-gia-bob-ngang-vai-mau-trang-size-1-4-pk0035', 'PK0035', 'Tóc giả bob ngang vai màu trắng — size 1/4', 'toc-gia', 'wig', '1/4', null, null, 'unisex', 'co-san', 0, '{"hair":8,"eye":1,"outfit":0}'::jsonb, 270000, null, array[]::text[], 2, 'hoc-duong', array[]::text[], 4.4, 45, 173, 'Tóc giả bob ngang vai dành cho búp bê 1/4. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.

Chu vi đầu tham khảo: 1/3 ≈ 8–9 inch, 1/4 ≈ 7–8 inch, 1/6 ≈ 6–7 inch. Đo đầu búp bê trước khi chọn.', array[]::text[], true, '2026-08-08T00:00:00.000Z'),
  ('p36', 'toc-gia-bob-ngang-vai-mau-den-size-1-6-pk0036', 'PK0036', 'Tóc giả bob ngang vai màu đen — size 1/6', 'toc-gia', 'wig', '1/6', null, null, 'unisex', 'co-san', 0, '{"hair":0,"eye":0,"outfit":0}'::jsonb, 230000, null, array[]::text[], 10, 'hoc-duong', array['ban-chay','moi']::text[], 4.4, 13, 81, 'Tóc giả bob ngang vai dành cho búp bê 1/6. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.

Chu vi đầu tham khảo: 1/3 ≈ 8–9 inch, 1/4 ≈ 7–8 inch, 1/6 ≈ 6–7 inch. Đo đầu búp bê trước khi chọn.', array[]::text[], true, '2026-07-02T00:00:00.000Z'),
  ('p37', 'toc-gia-bui-co-trang-kem-tram-mau-den-size-1-3-pk0037', 'PK0037', 'Tóc giả búi cổ trang kèm trâm màu đen — size 1/3', 'toc-gia', 'wig', '1/3', null, null, 'unisex', 'order', 15, '{"hair":0,"eye":0,"outfit":0}'::jsonb, 930000, 1100000, array[]::text[], 99, 'co-trang', array['moi','flash']::text[], 4.8, 25, 265, 'Tóc giả búi cổ trang kèm trâm dành cho búp bê 1/3. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.

Chu vi đầu tham khảo: 1/3 ≈ 8–9 inch, 1/4 ≈ 7–8 inch, 1/6 ≈ 6–7 inch. Đo đầu búp bê trước khi chọn.', array[]::text[], true, '2026-08-26T00:00:00.000Z'),
  ('p38', 'toc-gia-bui-co-trang-kem-tram-mau-vang-mat-ong-size-1-4-pk0038', 'PK0038', 'Tóc giả búi cổ trang kèm trâm màu vàng mật ong — size 1/4', 'toc-gia', 'wig', '1/4', null, null, 'unisex', 'co-san', 0, '{"hair":2,"eye":2,"outfit":2}'::jsonb, 610000, 750000, array[]::text[], 7, 'co-trang', array['flash']::text[], 4.5, 59, 184, 'Tóc giả búi cổ trang kèm trâm dành cho búp bê 1/4. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.

Chu vi đầu tham khảo: 1/3 ≈ 8–9 inch, 1/4 ≈ 7–8 inch, 1/6 ≈ 6–7 inch. Đo đầu búp bê trước khi chọn.', array[]::text[], true, '2026-06-22T00:00:00.000Z'),
  ('p39', 'toc-gia-ngan-layer-nam-mau-xam-bac-size-1-3-pk0039', 'PK0039', 'Tóc giả ngắn layer nam màu xám bạc — size 1/3', 'toc-gia', 'wig', '1/3', null, null, 'nam', 'co-san', 0, '{"hair":4,"eye":4,"outfit":4}'::jsonb, 360000, 440000, array[]::text[], 8, 'dark', array[]::text[], 4.4, 14, 64, 'Tóc giả ngắn layer nam dành cho búp bê 1/3. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.

Chu vi đầu tham khảo: 1/3 ≈ 8–9 inch, 1/4 ≈ 7–8 inch, 1/6 ≈ 6–7 inch. Đo đầu búp bê trước khi chọn.', array[]::text[], true, '2026-06-30T00:00:00.000Z'),
  ('p40', 'toc-gia-ngan-layer-nam-mau-vang-mat-ong-size-1-4-pk0040', 'PK0040', 'Tóc giả ngắn layer nam màu vàng mật ong — size 1/4', 'toc-gia', 'wig', '1/4', null, null, 'nam', 'co-san', 0, '{"hair":2,"eye":2,"outfit":2}'::jsonb, 270000, null, array[]::text[], 7, 'dark', array['ban-chay']::text[], 4.6, 2, 162, 'Tóc giả ngắn layer nam dành cho búp bê 1/4. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.

Chu vi đầu tham khảo: 1/3 ≈ 8–9 inch, 1/4 ≈ 7–8 inch, 1/6 ≈ 6–7 inch. Đo đầu búp bê trước khi chọn.', array[]::text[], true, '2026-07-12T00:00:00.000Z'),
  ('p41', 'toc-gia-ngan-layer-nam-mau-hong-phan-size-1-6-pk0041', 'PK0041', 'Tóc giả ngắn layer nam màu hồng phấn — size 1/6', 'toc-gia', 'wig', '1/6', null, null, 'nam', 'order', 15, '{"hair":5,"eye":5,"outfit":5}'::jsonb, 190000, null, array[]::text[], 99, 'dark', array['moi']::text[], 4.9, 52, 178, 'Tóc giả ngắn layer nam dành cho búp bê 1/6. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.

Chu vi đầu tham khảo: 1/3 ≈ 8–9 inch, 1/4 ≈ 7–8 inch, 1/6 ≈ 6–7 inch. Đo đầu búp bê trước khi chọn.', array[]::text[], true, '2026-09-17T00:00:00.000Z'),
  ('p42', 'toc-gia-hai-bim-mau-do-ruou-size-1-4-pk0042', 'PK0042', 'Tóc giả hai bím màu đỏ rượu — size 1/4', 'toc-gia', 'wig', '1/4', null, null, 'unisex', 'co-san', 0, '{"hair":7,"eye":0,"outfit":7}'::jsonb, 260000, null, array[]::text[], 3, 'lolita', array['ban-chay']::text[], 4.8, 3, 28, 'Tóc giả hai bím dành cho búp bê 1/4. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.

Chu vi đầu tham khảo: 1/3 ≈ 8–9 inch, 1/4 ≈ 7–8 inch, 1/6 ≈ 6–7 inch. Đo đầu búp bê trước khi chọn.', array[]::text[], true, '2026-04-19T00:00:00.000Z'),
  ('p43', 'toc-gia-hai-bim-mau-xam-bac-size-1-6-pk0043', 'PK0043', 'Tóc giả hai bím màu xám bạc — size 1/6', 'toc-gia', 'wig', '1/6', null, null, 'unisex', 'co-san', 0, '{"hair":4,"eye":4,"outfit":4}'::jsonb, 160000, null, array[]::text[], 4, 'lolita', array['moi']::text[], 4.6, 20, 96, 'Tóc giả hai bím dành cho búp bê 1/6. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.

Chu vi đầu tham khảo: 1/3 ≈ 8–9 inch, 1/4 ≈ 7–8 inch, 1/6 ≈ 6–7 inch. Đo đầu búp bê trước khi chọn.', array[]::text[], true, '2026-06-26T00:00:00.000Z'),
  ('p44', 'toc-gia-hai-bim-mau-den-size-1-8-pk0044', 'PK0044', 'Tóc giả hai bím màu đen — size 1/8', 'toc-gia', 'wig', '1/8', null, null, 'unisex', 'order', 15, '{"hair":0,"eye":0,"outfit":0}'::jsonb, 160000, null, array[]::text[], 99, 'lolita', array['moi']::text[], 4.5, 59, 168, 'Tóc giả hai bím dành cho búp bê 1/8. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.

Chu vi đầu tham khảo: 1/3 ≈ 8–9 inch, 1/4 ≈ 7–8 inch, 1/6 ≈ 6–7 inch. Đo đầu búp bê trước khi chọn.', array[]::text[], true, '2026-05-30T00:00:00.000Z'),
  ('p45', 'mat-resin-trong-veo-mau-tim-16mm-size-1-3-pk0045', 'PK0045', 'Mắt resin trong veo màu tím 16mm — size 1/3', 'mat', 'eyes', '1/3', null, null, 'unisex', 'order', 15, '{"hair":3,"eye":3,"outfit":3}'::jsonb, 260000, 310000, array[]::text[], 99, null, array['flash']::text[], 4.3, 35, 268, 'Mắt resin trong veo dành cho búp bê 1/3. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.

Kích thước mắt nên chọn theo hốc mắt của đầu (xem thông số của búp bê).', array[]::text[], true, '2026-07-12T00:00:00.000Z'),
  ('p46', 'mat-resin-trong-veo-mau-nau-14mm-size-1-4-pk0046', 'PK0046', 'Mắt resin trong veo màu nâu 14mm — size 1/4', 'mat', 'eyes', '1/4', null, null, 'unisex', 'co-san', 0, '{"hair":7,"eye":0,"outfit":7}'::jsonb, 280000, null, array[]::text[], 8, null, array['ban-chay','moi']::text[], 4.8, 5, 103, 'Mắt resin trong veo dành cho búp bê 1/4. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.

Kích thước mắt nên chọn theo hốc mắt của đầu (xem thông số của búp bê).', array[]::text[], true, '2026-07-16T00:00:00.000Z'),
  ('p47', 'mat-resin-trong-veo-mau-xanh-duong-12mm-size-1-6-pk0047', 'PK0047', 'Mắt resin trong veo màu xanh dương 12mm — size 1/6', 'mat', 'eyes', '1/6', null, null, 'unisex', 'co-san', 0, '{"hair":8,"eye":1,"outfit":0}'::jsonb, 180000, 220000, array[]::text[], 7, null, array['flash']::text[], 4.5, 37, 122, 'Mắt resin trong veo dành cho búp bê 1/6. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.

Kích thước mắt nên chọn theo hốc mắt của đầu (xem thông số của búp bê).', array[]::text[], true, '2026-09-20T00:00:00.000Z'),
  ('p48', 'mat-thuy-tinh-thu-cong-mau-xanh-la-16mm-size-1-3-pk0048', 'PK0048', 'Mắt thủy tinh thủ công màu xanh lá 16mm — size 1/3', 'mat', 'eyes', '1/3', null, null, 'unisex', 'co-san', 0, '{"hair":2,"eye":2,"outfit":2}'::jsonb, 560000, 640000, array[]::text[], 5, null, array[]::text[], 4.8, 1, 195, 'Mắt thủy tinh thủ công dành cho búp bê 1/3. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.

Kích thước mắt nên chọn theo hốc mắt của đầu (xem thông số của búp bê).', array[]::text[], true, '2026-07-21T00:00:00.000Z'),
  ('p49', 'mat-thuy-tinh-thu-cong-mau-do-14mm-size-1-4-pk0049', 'PK0049', 'Mắt thủy tinh thủ công màu đỏ 14mm — size 1/4', 'mat', 'eyes', '1/4', null, null, 'unisex', 'co-san', 0, '{"hair":4,"eye":4,"outfit":4}'::jsonb, 620000, null, array[]::text[], 7, null, array[]::text[], 4.4, 0, 7, 'Mắt thủy tinh thủ công dành cho búp bê 1/4. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.

Kích thước mắt nên chọn theo hốc mắt của đầu (xem thông số của búp bê).', array[]::text[], true, '2026-04-23T00:00:00.000Z'),
  ('p50', 'mat-acrylic-gia-re-mau-xanh-duong-14mm-size-1-4-pk0050', 'PK0050', 'Mắt acrylic giá rẻ màu xanh dương 14mm — size 1/4', 'mat', 'eyes', '1/4', null, null, 'unisex', 'order', 15, '{"hair":1,"eye":1,"outfit":1}'::jsonb, 160000, null, array[]::text[], 99, null, array[]::text[], 4.4, 16, 117, 'Mắt acrylic giá rẻ dành cho búp bê 1/4. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.

Kích thước mắt nên chọn theo hốc mắt của đầu (xem thông số của búp bê).', array[]::text[], true, '2026-07-26T00:00:00.000Z'),
  ('p51', 'mat-acrylic-gia-re-mau-xanh-la-12mm-size-1-6-pk0051', 'PK0051', 'Mắt acrylic giá rẻ màu xanh lá 12mm — size 1/6', 'mat', 'eyes', '1/6', null, null, 'unisex', 'co-san', 0, '{"hair":2,"eye":2,"outfit":2}'::jsonb, 100000, null, array[]::text[], 3, null, array[]::text[], 4.9, 41, 238, 'Mắt acrylic giá rẻ dành cho búp bê 1/6. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.

Kích thước mắt nên chọn theo hốc mắt của đầu (xem thông số của búp bê).', array[]::text[], true, '2026-08-08T00:00:00.000Z'),
  ('p52', 'mat-acrylic-gia-re-mau-xam-xanh-10mm-size-1-8-pk0052', 'PK0052', 'Mắt acrylic giá rẻ màu xám xanh 10mm — size 1/8', 'mat', 'eyes', '1/8', null, null, 'unisex', 'co-san', 0, '{"hair":6,"eye":6,"outfit":6}'::jsonb, 100000, null, array[]::text[], 4, null, array['ban-chay']::text[], 4.3, 14, 159, 'Mắt acrylic giá rẻ dành cho búp bê 1/8. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.

Kích thước mắt nên chọn theo hốc mắt của đầu (xem thông số của búp bê).', array[]::text[], true, '2026-08-23T00:00:00.000Z'),
  ('p53', 'vay-lolita-ren-no-size-1-3-pk0053', 'PK0053', 'Váy lolita ren nơ — size 1/3', 'trang-phuc', 'outfit', '1/3', null, null, 'unisex', 'co-san', 0, '{"hair":3,"eye":3,"outfit":3}'::jsonb, 1560000, null, array[]::text[], 10, 'lolita', array[]::text[], 4.9, 6, 32, 'Váy lolita ren nơ dành cho búp bê 1/3. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-04-05T00:00:00.000Z'),
  ('p54', 'vay-lolita-ren-no-size-1-4-pk0054', 'PK0054', 'Váy lolita ren nơ — size 1/4', 'trang-phuc', 'outfit', '1/4', null, null, 'unisex', 'order', 15, '{"hair":4,"eye":4,"outfit":4}'::jsonb, 990000, null, array[]::text[], 99, 'lolita', array['ban-chay']::text[], 4.5, 27, 75, 'Váy lolita ren nơ dành cho búp bê 1/4. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-07-28T00:00:00.000Z'),
  ('p55', 'vay-lolita-ren-no-size-1-6-pk0055', 'PK0055', 'Váy lolita ren nơ — size 1/6', 'trang-phuc', 'outfit', '1/6', null, null, 'unisex', 'order', 15, '{"hair":6,"eye":6,"outfit":6}'::jsonb, 540000, null, array[]::text[], 99, 'lolita', array['moi']::text[], 4.7, 47, 118, 'Váy lolita ren nơ dành cho búp bê 1/6. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-09-20T00:00:00.000Z'),
  ('p56', 'han-phuc-co-trang-size-1-3-pk0056', 'PK0056', 'Hán phục cổ trang — size 1/3', 'trang-phuc', 'outfit', '1/3', null, null, 'unisex', 'order', 15, '{"hair":7,"eye":0,"outfit":7}'::jsonb, 1570000, null, array[]::text[], 99, 'co-trang', array['moi']::text[], 4.3, 6, 193, 'Hán phục cổ trang dành cho búp bê 1/3. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-08-05T00:00:00.000Z'),
  ('p57', 'han-phuc-co-trang-size-1-4-pk0057', 'PK0057', 'Hán phục cổ trang — size 1/4', 'trang-phuc', 'outfit', '1/4', null, null, 'unisex', 'order', 15, '{"hair":3,"eye":3,"outfit":3}'::jsonb, 760000, 930000, array[]::text[], 99, 'co-trang', array['flash']::text[], 4.6, 11, 180, 'Hán phục cổ trang dành cho búp bê 1/4. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-04-30T00:00:00.000Z'),
  ('p58', 'han-phuc-co-trang-size-1-6-pk0058', 'PK0058', 'Hán phục cổ trang — size 1/6', 'trang-phuc', 'outfit', '1/6', null, null, 'unisex', 'co-san', 0, '{"hair":1,"eye":1,"outfit":1}'::jsonb, 680000, 790000, array[]::text[], 11, 'co-trang', array['ban-chay','flash']::text[], 4.5, 25, 183, 'Hán phục cổ trang dành cho búp bê 1/6. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-09-16T00:00:00.000Z'),
  ('p59', 'dong-phuc-jk-thuy-thu-size-1-3-pk0059', 'PK0059', 'Đồng phục JK thủy thủ — size 1/3', 'trang-phuc', 'outfit', '1/3', null, null, 'unisex', 'co-san', 0, '{"hair":7,"eye":0,"outfit":7}'::jsonb, 910000, 1130000, array[]::text[], 3, 'hoc-duong', array['ban-chay']::text[], 4.7, 30, 256, 'Đồng phục JK thủy thủ dành cho búp bê 1/3. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-06-06T00:00:00.000Z'),
  ('p60', 'dong-phuc-jk-thuy-thu-size-1-4-pk0060', 'PK0060', 'Đồng phục JK thủy thủ — size 1/4', 'trang-phuc', 'outfit', '1/4', null, null, 'unisex', 'co-san', 0, '{"hair":4,"eye":4,"outfit":4}'::jsonb, 720000, null, array[]::text[], 5, 'hoc-duong', array['moi']::text[], 4.3, 4, 275, 'Đồng phục JK thủy thủ dành cho búp bê 1/4. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-05-25T00:00:00.000Z'),
  ('p61', 'dong-phuc-jk-thuy-thu-size-1-6-pk0061', 'PK0061', 'Đồng phục JK thủy thủ — size 1/6', 'trang-phuc', 'outfit', '1/6', null, null, 'unisex', 'co-san', 0, '{"hair":2,"eye":2,"outfit":2}'::jsonb, 430000, null, array[]::text[], 10, 'hoc-duong', array[]::text[], 4.9, 58, 219, 'Đồng phục JK thủy thủ dành cho búp bê 1/6. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-07-14T00:00:00.000Z'),
  ('p62', 'bo-vest-nam-so-mi-size-1-3-pk0062', 'PK0062', 'Bộ vest nam sơ mi — size 1/3', 'trang-phuc', 'outfit', '1/3', null, null, 'nam', 'order', 15, '{"hair":0,"eye":0,"outfit":0}'::jsonb, 960000, null, array[]::text[], 99, 'dark', array[]::text[], 4.3, 47, 118, 'Bộ vest nam sơ mi dành cho búp bê 1/3. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-04-23T00:00:00.000Z'),
  ('p63', 'bo-vest-nam-so-mi-size-1-4-pk0063', 'PK0063', 'Bộ vest nam sơ mi — size 1/4', 'trang-phuc', 'outfit', '1/4', null, null, 'nam', 'co-san', 0, '{"hair":8,"eye":1,"outfit":0}'::jsonb, 670000, null, array[]::text[], 10, 'dark', array[]::text[], 4.4, 46, 146, 'Bộ vest nam sơ mi dành cho búp bê 1/4. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-06-29T00:00:00.000Z'),
  ('p64', 'vay-gothic-den-kem-gang-size-1-3-pk0064', 'PK0064', 'Váy gothic đen kèm găng — size 1/3', 'trang-phuc', 'outfit', '1/3', null, null, 'unisex', 'order', 15, '{"hair":6,"eye":6,"outfit":6}'::jsonb, 1320000, null, array[]::text[], 99, 'dark', array['moi']::text[], 4.5, 15, 93, 'Váy gothic đen kèm găng dành cho búp bê 1/3. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-08-03T00:00:00.000Z'),
  ('p65', 'vay-gothic-den-kem-gang-size-1-4-pk0065', 'PK0065', 'Váy gothic đen kèm găng — size 1/4', 'trang-phuc', 'outfit', '1/4', null, null, 'unisex', 'order', 15, '{"hair":6,"eye":6,"outfit":6}'::jsonb, 990000, 1210000, array[]::text[], 99, 'dark', array['flash']::text[], 4.9, 25, 100, 'Váy gothic đen kèm găng dành cho búp bê 1/4. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-05-17T00:00:00.000Z'),
  ('p66', 'vay-gothic-den-kem-gang-size-1-6-pk0066', 'PK0066', 'Váy gothic đen kèm găng — size 1/6', 'trang-phuc', 'outfit', '1/6', null, null, 'unisex', 'order', 15, '{"hair":1,"eye":1,"outfit":1}'::jsonb, 400000, 490000, array[]::text[], 99, 'dark', array['flash']::text[], 4.6, 9, 56, 'Váy gothic đen kèm găng dành cho búp bê 1/6. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-09-20T00:00:00.000Z'),
  ('p67', 'bo-do-ngu-pastel-size-1-4-pk0067', 'PK0067', 'Bộ đồ ngủ pastel — size 1/4', 'trang-phuc', 'outfit', '1/4', null, null, 'unisex', 'order', 15, '{"hair":1,"eye":1,"outfit":1}'::jsonb, 390000, null, array[]::text[], 99, 'lolita', array[]::text[], 4.7, 53, 286, 'Bộ đồ ngủ pastel dành cho búp bê 1/4. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-05-17T00:00:00.000Z'),
  ('p68', 'bo-do-ngu-pastel-size-1-6-pk0068', 'PK0068', 'Bộ đồ ngủ pastel — size 1/6', 'trang-phuc', 'outfit', '1/6', null, null, 'unisex', 'order', 15, '{"hair":4,"eye":4,"outfit":4}'::jsonb, 220000, null, array[]::text[], 99, 'lolita', array[]::text[], 5, 26, 167, 'Bộ đồ ngủ pastel dành cho búp bê 1/6. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-09-15T00:00:00.000Z'),
  ('p69', 'bo-do-ngu-pastel-size-1-8-pk0069', 'PK0069', 'Bộ đồ ngủ pastel — size 1/8', 'trang-phuc', 'outfit', '1/8', null, null, 'unisex', 'order', 15, '{"hair":6,"eye":6,"outfit":6}'::jsonb, 260000, 300000, array[]::text[], 99, 'lolita', array[]::text[], 4.7, 51, 188, 'Bộ đồ ngủ pastel dành cho búp bê 1/8. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-09-24T00:00:00.000Z'),
  ('p70', 'giay-bup-be-mary-jane-size-1-3-pk0070', 'PK0070', 'Giày búp bê Mary Jane — size 1/3', 'giay', 'shoes', '1/3', null, null, 'unisex', 'co-san', 0, '{"hair":6,"eye":6,"outfit":6}'::jsonb, 560000, null, array[]::text[], 3, 'lolita', array['ban-chay','moi']::text[], 4.7, 12, 38, 'Giày búp bê Mary Jane dành cho búp bê 1/3. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-05-31T00:00:00.000Z'),
  ('p71', 'giay-bup-be-mary-jane-size-1-4-pk0071', 'PK0071', 'Giày búp bê Mary Jane — size 1/4', 'giay', 'shoes', '1/4', null, null, 'unisex', 'co-san', 0, '{"hair":3,"eye":3,"outfit":3}'::jsonb, 270000, null, array[]::text[], 5, 'lolita', array['ban-chay','moi']::text[], 4.8, 49, 157, 'Giày búp bê Mary Jane dành cho búp bê 1/4. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-04-26T00:00:00.000Z'),
  ('p72', 'giay-bup-be-mary-jane-size-1-6-pk0072', 'PK0072', 'Giày búp bê Mary Jane — size 1/6', 'giay', 'shoes', '1/6', null, null, 'unisex', 'co-san', 0, '{"hair":4,"eye":4,"outfit":4}'::jsonb, 100000, null, array[]::text[], 4, 'lolita', array['moi']::text[], 5, 18, 7, 'Giày búp bê Mary Jane dành cho búp bê 1/6. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-05-29T00:00:00.000Z'),
  ('p73', 'bot-da-co-cao-size-1-3-pk0073', 'PK0073', 'Bốt da cổ cao — size 1/3', 'giay', 'shoes', '1/3', null, null, 'unisex', 'order', 15, '{"hair":5,"eye":5,"outfit":5}'::jsonb, 780000, null, array[]::text[], 99, 'dark', array[]::text[], 5, 59, 87, 'Bốt da cổ cao dành cho búp bê 1/3. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-04-12T00:00:00.000Z'),
  ('p74', 'bot-da-co-cao-size-1-4-pk0074', 'PK0074', 'Bốt da cổ cao — size 1/4', 'giay', 'shoes', '1/4', null, null, 'unisex', 'co-san', 0, '{"hair":5,"eye":5,"outfit":5}'::jsonb, 460000, null, array[]::text[], 9, 'dark', array[]::text[], 4.8, 36, 184, 'Bốt da cổ cao dành cho búp bê 1/4. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-09-29T00:00:00.000Z'),
  ('p75', 'giay-the-thao-trang-size-1-3-pk0075', 'PK0075', 'Giày thể thao trắng — size 1/3', 'giay', 'shoes', '1/3', null, null, 'unisex', 'co-san', 0, '{"hair":4,"eye":4,"outfit":4}'::jsonb, 500000, null, array[]::text[], 3, 'hoc-duong', array['moi']::text[], 4.8, 12, 215, 'Giày thể thao trắng dành cho búp bê 1/3. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-08-12T00:00:00.000Z'),
  ('p76', 'giay-the-thao-trang-size-1-4-pk0076', 'PK0076', 'Giày thể thao trắng — size 1/4', 'giay', 'shoes', '1/4', null, null, 'unisex', 'order', 15, '{"hair":2,"eye":2,"outfit":2}'::jsonb, 310000, 350000, array[]::text[], 99, 'hoc-duong', array['ban-chay']::text[], 4.8, 35, 172, 'Giày thể thao trắng dành cho búp bê 1/4. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-04-26T00:00:00.000Z'),
  ('p77', 'giay-the-thao-trang-size-1-6-pk0077', 'PK0077', 'Giày thể thao trắng — size 1/6', 'giay', 'shoes', '1/6', null, null, 'unisex', 'co-san', 0, '{"hair":8,"eye":1,"outfit":0}'::jsonb, 150000, null, array[]::text[], 7, 'hoc-duong', array[]::text[], 4.9, 22, 6, 'Giày thể thao trắng dành cho búp bê 1/6. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-09-03T00:00:00.000Z'),
  ('p78', 'hai-theu-co-trang-size-1-3-pk0078', 'PK0078', 'Hài thêu cổ trang — size 1/3', 'giay', 'shoes', '1/3', null, null, 'unisex', 'co-san', 0, '{"hair":4,"eye":4,"outfit":4}'::jsonb, 520000, 620000, array[]::text[], 11, 'co-trang', array[]::text[], 4.6, 50, 2, 'Hài thêu cổ trang dành cho búp bê 1/3. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-05-19T00:00:00.000Z'),
  ('p79', 'hai-theu-co-trang-size-1-4-pk0079', 'PK0079', 'Hài thêu cổ trang — size 1/4', 'giay', 'shoes', '1/4', null, null, 'unisex', 'co-san', 0, '{"hair":1,"eye":1,"outfit":1}'::jsonb, 350000, 400000, array[]::text[], 10, 'co-trang', array['ban-chay','moi','flash']::text[], 4.8, 47, 25, 'Hài thêu cổ trang dành cho búp bê 1/4. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-06-04T00:00:00.000Z'),
  ('p80', 'gia-do-bup-be-kim-loai-size-1-3-pk0080', 'PK0080', 'Giá đỡ búp bê kim loại — size 1/3', 'phu-kien-khac', 'other', '1/3', null, null, 'unisex', 'order', 15, '{"hair":8,"eye":1,"outfit":0}'::jsonb, 320000, 400000, array[]::text[], 99, null, array[]::text[], 4.7, 53, 20, 'Giá đỡ búp bê kim loại dành cho búp bê 1/3. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-05-27T00:00:00.000Z'),
  ('p81', 'gia-do-bup-be-kim-loai-size-1-4-pk0081', 'PK0081', 'Giá đỡ búp bê kim loại — size 1/4', 'phu-kien-khac', 'other', '1/4', null, null, 'unisex', 'order', 15, '{"hair":8,"eye":1,"outfit":0}'::jsonb, 260000, null, array[]::text[], 99, null, array[]::text[], 4.6, 48, 287, 'Giá đỡ búp bê kim loại dành cho búp bê 1/4. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-07-10T00:00:00.000Z'),
  ('p82', 'gia-do-bup-be-kim-loai-size-1-6-pk0082', 'PK0082', 'Giá đỡ búp bê kim loại — size 1/6', 'phu-kien-khac', 'other', '1/6', null, null, 'unisex', 'co-san', 0, '{"hair":7,"eye":0,"outfit":7}'::jsonb, 130000, null, array[]::text[], 5, null, array['moi']::text[], 4.6, 30, 163, 'Giá đỡ búp bê kim loại dành cho búp bê 1/6. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-08-28T00:00:00.000Z'),
  ('p83', 'tui-dung-bup-be-co-dem-size-1-3-pk0083', 'PK0083', 'Túi đựng búp bê có đệm — size 1/3', 'phu-kien-khac', 'other', '1/3', null, null, 'unisex', 'order', 15, '{"hair":4,"eye":4,"outfit":4}'::jsonb, 1550000, null, array[]::text[], 99, null, array['ban-chay']::text[], 4.7, 49, 167, 'Túi đựng búp bê có đệm dành cho búp bê 1/3. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-06-29T00:00:00.000Z'),
  ('p84', 'tui-dung-bup-be-co-dem-size-1-4-pk0084', 'PK0084', 'Túi đựng búp bê có đệm — size 1/4', 'phu-kien-khac', 'other', '1/4', null, null, 'unisex', 'co-san', 0, '{"hair":1,"eye":1,"outfit":1}'::jsonb, 1260000, null, array[]::text[], 6, null, array[]::text[], 4.5, 28, 296, 'Túi đựng búp bê có đệm dành cho búp bê 1/4. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-05-28T00:00:00.000Z'),
  ('p85', 'tui-dung-bup-be-co-dem-size-1-6-pk0085', 'PK0085', 'Túi đựng búp bê có đệm — size 1/6', 'phu-kien-khac', 'other', '1/6', null, null, 'unisex', 'co-san', 0, '{"hair":8,"eye":1,"outfit":0}'::jsonb, 680000, null, array[]::text[], 8, null, array['ban-chay']::text[], 4.8, 28, 235, 'Túi đựng búp bê có đệm dành cho búp bê 1/6. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-07-24T00:00:00.000Z'),
  ('p86', 'bo-dung-cu-ve-mat-face-up-pk0086', 'PK0086', 'Bộ dụng cụ vẽ mặt (face-up)', 'phu-kien-khac', 'other', 'all', null, null, 'unisex', 'co-san', 0, '{"hair":1,"eye":1,"outfit":1}'::jsonb, 940000, null, array[]::text[], 1, null, array['ban-chay']::text[], 4.6, 52, 278, 'Bộ dụng cụ vẽ mặt (face-up). Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-08-12T00:00:00.000Z'),
  ('p87', 'bo-day-thun-thay-khop-size-1-3-pk0087', 'PK0087', 'Bộ dây thun thay khớp — size 1/3', 'phu-kien-khac', 'other', '1/3', null, null, 'unisex', 'co-san', 0, '{"hair":1,"eye":1,"outfit":1}'::jsonb, 220000, null, array[]::text[], 2, null, array[]::text[], 5, 44, 279, 'Bộ dây thun thay khớp dành cho búp bê 1/3. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-08-17T00:00:00.000Z'),
  ('p88', 'bo-day-thun-thay-khop-size-1-4-pk0088', 'PK0088', 'Bộ dây thun thay khớp — size 1/4', 'phu-kien-khac', 'other', '1/4', null, null, 'unisex', 'order', 15, '{"hair":4,"eye":4,"outfit":4}'::jsonb, 130000, 160000, array[]::text[], 99, null, array[]::text[], 4.8, 54, 1, 'Bộ dây thun thay khớp dành cho búp bê 1/4. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-07-31T00:00:00.000Z'),
  ('p89', 'bo-day-thun-thay-khop-size-1-6-pk0089', 'PK0089', 'Bộ dây thun thay khớp — size 1/6', 'phu-kien-khac', 'other', '1/6', null, null, 'unisex', 'co-san', 0, '{"hair":0,"eye":0,"outfit":0}'::jsonb, 110000, 130000, array[]::text[], 8, null, array[]::text[], 4.7, 57, 256, 'Bộ dây thun thay khớp dành cho búp bê 1/6. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-07-21T00:00:00.000Z'),
  ('p90', 'hop-trung-bay-acrylic-co-den-size-1-4-pk0090', 'PK0090', 'Hộp trưng bày acrylic có đèn — size 1/4', 'phu-kien-khac', 'other', '1/4', null, null, 'unisex', 'order', 15, '{"hair":8,"eye":1,"outfit":0}'::jsonb, 1700000, null, array[]::text[], 99, null, array[]::text[], 5, 27, 59, 'Hộp trưng bày acrylic có đèn dành cho búp bê 1/4. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-07-24T00:00:00.000Z'),
  ('p91', 'hop-trung-bay-acrylic-co-den-size-1-6-pk0091', 'PK0091', 'Hộp trưng bày acrylic có đèn — size 1/6', 'phu-kien-khac', 'other', '1/6', null, null, 'unisex', 'co-san', 0, '{"hair":8,"eye":1,"outfit":0}'::jsonb, 830000, 930000, array[]::text[], 12, null, array[]::text[], 4.3, 59, 241, 'Hộp trưng bày acrylic có đèn dành cho búp bê 1/6. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.', array[]::text[], true, '2026-09-12T00:00:00.000Z')
on conflict (id) do update set slug = excluded.slug, sku = excluded.sku, name = excluded.name, category = excluded.category, kind = excluded.kind, scale = excluded.scale, skin = excluded.skin, set_type = excluded.set_type, gender = excluded.gender, stock_type = excluded.stock_type, lead_days = excluded.lead_days, look = excluded.look, price = excluded.price, compare_price = excluded.compare_price, sizes = excluded.sizes, stock = excluded.stock, collection = excluded.collection, tags = excluded.tags, rating = excluded.rating, review_count = excluded.review_count, sold = excluded.sold, description = excluded.description, images = excluded.images, active = excluded.active, created_at = excluded.created_at;

insert into public.stores (id, name, city, district, address, phone, hours) values
  (1, 'Showroom Hà Nội', 'Hà Nội', 'Cầu Giấy', '89 Xuân Thủy, P. Dịch Vọng Hậu', '024 3858 0001', '9:00 – 21:00 (hẹn trước)'),
  (2, 'Showroom TP.HCM', 'TP. Hồ Chí Minh', 'Quận 3', '120 Võ Văn Tần, P. 6', '028 3822 0002', '9:00 – 21:00 (hẹn trước)')
on conflict (id) do update set name = excluded.name, city = excluded.city, district = excluded.district, address = excluded.address, phone = excluded.phone, hours = excluded.hours;

select setval('public.stores_id_seq', (select max(id) from public.stores));

-- Giá nhập tham khảo (bảng chỉ quản trị đọc được)
insert into public.product_costs (product_id, yuan, weight_kg, cn_ship_yuan, source_url) values
  ('p1', 1056, 1.5, 0, ''),
  ('p2', 840, 1.5, 0, ''),
  ('p3', 1710, 1.5, 0, ''),
  ('p4', 740, 0.8, 0, ''),
  ('p5', 590, 0.8, 0, ''),
  ('p6', 3260, 2.8, 0, ''),
  ('p7', 1720, 1.5, 0, ''),
  ('p8', 1380, 1.5, 0, ''),
  ('p9', 1000, 0.8, 0, ''),
  ('p10', 560, 0.45, 0, ''),
  ('p11', 450, 0.45, 0, ''),
  ('p12', 1030, 1.5, 0, ''),
  ('p13', 3390, 2.8, 0, ''),
  ('p14', 2710, 2.8, 0, ''),
  ('p15', 1060, 0.8, 0, ''),
  ('p16', 1540, 1.5, 0, ''),
  ('p17', 1230, 1.5, 0, ''),
  ('p18', 970, 0.8, 0, ''),
  ('p19', 370, 0.45, 0, ''),
  ('p20', 300, 0.45, 0, ''),
  ('p21', 2460, 2.8, 0, ''),
  ('p22', 1270, 1.5, 0, ''),
  ('p23', 1020, 1.5, 0, ''),
  ('p24', 610, 0.8, 0, ''),
  ('p25', 330, 0.45, 0, ''),
  ('p26', 260, 0.45, 0, ''),
  ('p27', 490, 0.45, 0, ''),
  ('p28', 870, 0.8, 0, ''),
  ('p29', 700, 0.8, 0, ''),
  ('p30', 1150, 1.5, 0, ''),
  ('p31', 81, 0.15, 0, ''),
  ('p32', 50, 0.12, 0, ''),
  ('p33', 44, 0.08, 0, ''),
  ('p34', 87, 0.15, 0, ''),
  ('p35', 34, 0.12, 0, ''),
  ('p36', 29, 0.08, 0, ''),
  ('p37', 146, 0.18, 0, ''),
  ('p38', 96, 0.14, 0, ''),
  ('p39', 55, 0.12, 0, ''),
  ('p40', 35, 0.1, 0, ''),
  ('p41', 24, 0.07, 0, ''),
  ('p42', 40, 0.12, 0, ''),
  ('p43', 20, 0.08, 0, ''),
  ('p44', 21, 0.05, 0, ''),
  ('p45', 40, 0.03, 0, ''),
  ('p46', 36, 0.03, 0, ''),
  ('p47', 23, 0.03, 0, ''),
  ('p48', 88, 0.04, 0, ''),
  ('p49', 98, 0.04, 0, ''),
  ('p50', 20, 0.03, 0, ''),
  ('p51', 12, 0.03, 0, ''),
  ('p52', 12, 0.03, 0, ''),
  ('p53', 246, 0.25, 0, ''),
  ('p54', 155, 0.18, 0, ''),
  ('p55', 84, 0.12, 0, ''),
  ('p56', 247, 0.3, 0, ''),
  ('p57', 118, 0.2, 0, ''),
  ('p58', 106, 0.12, 0, ''),
  ('p59', 143, 0.22, 0, ''),
  ('p60', 113, 0.16, 0, ''),
  ('p61', 67, 0.1, 0, ''),
  ('p62', 150, 0.28, 0, ''),
  ('p63', 105, 0.18, 0, ''),
  ('p64', 207, 0.25, 0, ''),
  ('p65', 155, 0.18, 0, ''),
  ('p66', 62, 0.12, 0, ''),
  ('p67', 60, 0.12, 0, ''),
  ('p68', 28, 0.08, 0, ''),
  ('p69', 34, 0.05, 0, ''),
  ('p70', 87, 0.12, 0, ''),
  ('p71', 41, 0.1, 0, ''),
  ('p72', 12, 0.06, 0, ''),
  ('p73', 122, 0.15, 0, ''),
  ('p74', 71, 0.12, 0, ''),
  ('p75', 78, 0.12, 0, ''),
  ('p76', 47, 0.1, 0, ''),
  ('p77', 19, 0.06, 0, ''),
  ('p78', 82, 0.1, 0, ''),
  ('p79', 54, 0.08, 0, ''),
  ('p80', 47, 0.4, 0, ''),
  ('p81', 32, 0.3, 0, ''),
  ('p82', 15, 0.2, 0, ''),
  ('p83', 235, 1.3, 0, ''),
  ('p84', 192, 0.9, 0, ''),
  ('p85', 103, 0.5, 0, ''),
  ('p86', 145, 0.45, 0, ''),
  ('p87', 28, 0.05, 0, ''),
  ('p88', 16, 0.05, 0, ''),
  ('p89', 14, 0.04, 0, ''),
  ('p90', 250, 2.6, 0, ''),
  ('p91', 118, 1.6, 0, '')
on conflict (product_id) do update set yuan = excluded.yuan, weight_kg = excluded.weight_kg, cn_ship_yuan = excluded.cn_ship_yuan, source_url = excluded.source_url;

insert into public.coupons (code, kind, value, max_discount, min_order, description) values
  ('BJD10', 'percent', 10, 500000, 1000000, 'Giảm 10% (tối đa 500.000đ) cho đơn từ 1 triệu'),
  ('GIAM100K', 'amount', 100000, null, 800000, 'Giảm 100.000đ cho đơn từ 800.000đ'),
  ('FREESHIP', 'freeship', 0, null, 0, 'Miễn phí giao hàng')
on conflict (code) do update set kind = excluded.kind, value = excluded.value, max_discount = excluded.max_discount, min_order = excluded.min_order, description = excluded.description;

