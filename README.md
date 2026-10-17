# Tiểu Hoa BJD — Web bán búp bê khớp cầu & phụ kiện

Web bán búp bê BJD (1/3, 1/4, 1/6, 1/8) và phụ kiện (tóc giả, mắt, trang phục, giày, giá đỡ, túi…) nhập từ Taobao. Có **hàng có sẵn** và **hàng đặt trước (cọc 50%)**, đăng nhập, giỏ hàng, thanh toán VNPay / MoMo / VietQR / COD, và **bảng tính giá nhập Taobao → Việt Nam** trong trang quản trị.

- **Giao diện**: React (Vite) → **Vercel**
- **Dữ liệu + đăng nhập**: **Supabase** (PostgreSQL)
- **Chạy thử không cần cấu hình**: bỏ trống khóa Supabase → **chế độ DEMO** (lưu trong trình duyệt, cổng thanh toán giả lập)

---

## 1. Giá nhập & giá bán

**Giá tệ trong dữ liệu mẫu là giá tham khảo mặt bằng Taobao (10/2026), không phải giá của link cụ thể** — Taobao chặn truy cập tự động nên chưa lấy được giá thật từng link. Nguồn tham khảo: mẫu shop gửi (1/4 full set **1.056 tệ**), hướng dẫn mua BJD trên Zhihu (4 phân nude ~1.000–2.000 tệ; tóc 6 phân 10–50, giày 3–10, quần áo 20–100, mắt 20–100 tệ).

**Công thức (Quản trị → Tính giá nhập, sửa được):**

```
Giá vốn = [ tệ × tỷ giá × (1 + phí mua hộ 3%) + ship nội địa TQ + kg × cước 30.000đ
            + đóng gói chống sốc (búp bê) + bảo hiểm 2% (búp bê) ] × (1 + chi phí khác 3%)
Giá bán = Giá vốn × (1 + lãi)   — búp bê 30%, phụ kiện 60%, món nhỏ (vốn < 150k) 90% — làm tròn lên 10.000đ
```

Ví dụ mẫu shop gửi: **1.056 tệ, 1,5kg → giá vốn 4.323.487đ → bán 5.630.000đ** (lãi ~1,3 triệu).
Bảng đầy đủ 91 mẫu: [`docs/bang-gia-nhap.md`](docs/bang-gia-nhap.md) (và `.csv` mở bằng Excel).

**Quy trình nhập một mẫu thật:** Quản trị → Sản phẩm → *Thêm* → dán **link Taobao**, nhập **giá tệ**, **cân nặng đóng gói** → web hiện giá vốn chi tiết → bấm *Dùng giá đề xuất*. Đổi tỷ giá / cước → *Tính giá nhập* → **Áp giá đề xuất** cho cả cửa hàng.
Giá nhập chỉ quản trị xem được (bảng `product_costs` có RLS chỉ cho admin).

**Lưu ý pháp lý / vận hành** (nên hỏi đơn vị khai hải quan):
- Búp bê thuộc nhóm HS 9503, thuộc diện QCVN 3:2019/BKHCN về an toàn đồ chơi; nhập kinh doanh số lượng lớn (chính ngạch) cần chứng nhận hợp quy, ghi nhãn. Các nguồn tham khảo cho mức thuế khác nhau (thuế NK ACFTA 0–5% với C/O form E; VAT 5–10%) — cần tra biểu thuế hiện hành.
- Cước "tiểu ngạch / bao thuế" của đơn vị order đã gồm thông quan; khi chuyển sang chính ngạch, chỉnh lại cước/kg và thêm thuế vào "chi phí khác".
- Ảnh sản phẩm: chỉ dùng ảnh shop tự chụp hoặc được xưởng cho phép; web hiện ảnh minh họa vẽ tự động khi chưa có ảnh.

---

## 2. Tính năng

| Phần | Nội dung |
|---|---|
| **Danh mục** | Búp bê 1/3, 1/4, 1/6, mini 1/8; Phụ kiện: tóc giả, mắt, trang phục, giày, giá đỡ / túi / dụng cụ. Phong cách: Cổ trang, Lolita, Học đường, Gothic. |
| **Lọc / tìm** | Tỉ lệ, có sẵn / đặt trước, full set / nude, giới tính, màu da, mức giá; tìm không dấu ("toc gia 1/6"). |
| **Chi tiết** | Ảnh nhiều góc, bảng size BJD (chiều cao, chu vi đầu, size mắt), thời gian về hàng, tiền cọc, đánh giá. |
| **Đặt trước** | Đơn có hàng order: **cọc 50%** (không cho COD), trả phần còn lại khi hàng về; VNPay/MoMo/VietQR tự thu đúng số tiền cọc / còn lại; không ghi trùng giao dịch. |
| **Tài khoản** | Đăng ký, đăng nhập, quên mật khẩu, đơn hàng, sổ địa chỉ, yêu thích. Tra cứu đơn bằng mã + SĐT. |
| **Quản trị** | Doanh thu, đơn hàng (xác nhận cọc / đủ tiền, đổi trạng thái, CSV), sản phẩm (kèm giá nhập, giá vốn, % lãi), **Tính giá nhập**, khách hàng. |
| **Trợ lý Ngân Nguyệt** | Nhân vật 2D ở góc màn hình (chớp mắt, vẫy tay, vui, suy nghĩ, ngại). Tab **Hỏi Ngân Nguyệt**: bot tự trả lời cách đặt hàng, đặt cọc, phí ship, thanh toán, đổi trả, size, tìm sản phẩm theo tỉ lệ / loại / giá — không cần khóa AI (chỗ cắm AI: `setAiFallback` trong `src/lib/assistant.js`). Tab **Chat với shop**: khách đăng nhập nhắn trực tiếp, shop trả lời ở **Quản trị > Tin nhắn** (realtime). Cần chạy `supabase/tro-ly-chat.sql` một lần. |

---

## 3. Chạy thử

```bash
npm install && npm run dev     # http://localhost:5173
npm test                                  # kiểm thử tính giá, cọc, lọc, chữ ký VNPay/MoMo
node scripts/bang-gia-nhap.mjs            # xuất lại bảng giá nhập
```
Quản trị demo: **admin@tieuhoa.vn / admin123**. Mã giảm giá: `BJD10`, `GIAM100K`, `FREESHIP`.

## 4. Triển khai thật (trên máy Windows)

Chạy script — tự sao lưu mã nguồn + dữ liệu vào **E:\\Tiểu hoa kế toán**, hướng dẫn tạo Supabase (tự chép SQL vào clipboard), đặt biến môi trường và đưa web lên Vercel:

```powershell
cd <thư mục tieuhoabjd>
powershell -ExecutionPolicy Bypass -File .\trien-khai\trien-khai-windows.ps1
```

Hướng dẫn từng bước (kể cả cách lấy mã nguồn, xử lý lỗi): [`trien-khai/HUONG-DAN-TRIEN-KHAI.md`](trien-khai/HUONG-DAN-TRIEN-KHAI.md).

Thư mục lưu trữ sau khi chạy:

```
E:\Tiểu hoa kế toán\
├── ma-nguon\          mã nguồn web (không kèm khóa bí mật)
├── co-so-du-lieu\     schema.sql, seed.sql
├── bang-gia\          bảng giá nhập / giá bán
├── nhap-taobao\       mẫu CSV + hướng dẫn tìm hàng Taobao
├── anh-san-pham\      ảnh thật theo SKU
├── sao-luu\           file sao lưu hằng tuần (Quản trị → Sao lưu)
└── cau-hinh-trien-khai.txt
```

Làm tay (nếu không dùng script): Supabase SQL Editor chạy `supabase/schema.sql`, `supabase/seed.sql`, rồi `supabase/cai-dat-cua-hang.sql` và `supabase/tro-ly-chat.sql`; Vercel import repo với **Root Directory = `shop`**, biến môi trường theo `.env.example`; đăng ký tài khoản rồi `select public.make_admin('email');`. VNPay: IPN URL = `https://<web>/api/vnpay-ipn`.

## 5. Đưa hàng Taobao thật lên web

Xem [`trien-khai/HUONG-DAN-TAOBAO.md`](trien-khai/HUONG-DAN-TAOBAO.md): anh đăng nhập Taobao trên Chrome, phiên Claude trên máy tìm hàng → ghi `nhap-taobao.csv` + tải ảnh vào `anh-san-pham\<SKU>` → **Quản trị → Sản phẩm → Nhập từ CSV** → lọc *Chưa có ảnh thật* → kéo thả ảnh vào từng sản phẩm (ảnh tự thu nhỏ còn 1200px, lưu ở Supabase Storage).
