# Đưa web Tiểu Hoa BJD lên mạng — hướng dẫn từng bước (Windows)

Script `trien-khai\trien-khai-windows.ps1` làm gần hết việc: sao lưu vào `E:\Tiểu hoa kế toán`, kiểm thử, mở Supabase và chép sẵn SQL, đặt biến môi trường và đưa web lên Vercel. Anh chỉ cần dán vài thông tin khi nó hỏi. Cả lượt mất khoảng 20–30 phút.

## Chuẩn bị (làm một lần)

1. **Node.js 20 trở lên.** Mở PowerShell, gõ `node -v`. Nếu báo lỗi hoặc số nhỏ hơn 20:
   ```powershell
   winget install OpenJS.NodeJS.LTS
   ```
   Cài xong **đóng PowerShell, mở lại** rồi gõ `node -v` lần nữa.
2. **Tài khoản GitHub** (đã có). Dùng nó đăng nhập luôn Supabase và Vercel ở bước sau, khỏi tạo mật khẩu mới.
3. **Thông tin cần có sẵn:** số tài khoản ngân hàng nhận chuyển khoản, tên chủ tài khoản (viết hoa không dấu), hotline. VNPay, MoMo chưa có thì bỏ trống, thêm sau.

## Bước 1. Lấy mã nguồn về máy

1. Mở trang repo **tieuhoabjd** trên GitHub → nút xanh **Code** → **Download ZIP**.
2. Chuột phải file ZIP → **Extract All…** → giải nén vào `E:\tieuhoabjd` (thư mục này phải có file `package.json` ngay bên trong, không lồng thêm một thư mục nữa).

> Không mở file `.ps1` trên GitHub rồi copy‑paste vào Notepad: dễ mất mã hóa UTF‑8 có BOM, PowerShell sẽ đọc sai chữ tiếng Việt và báo lỗi cú pháp.

## Bước 2. Chạy script

1. Mở thư mục `E:\tieuhoabjd` trong File Explorer, bấm vào thanh địa chỉ, gõ `powershell`, Enter. Cửa sổ PowerShell mở sẵn ở đúng thư mục.
2. Dán lệnh:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\trien-khai\trien-khai-windows.ps1
   ```
   `-ExecutionPolicy Bypass` chỉ áp dụng cho lần chạy này, không đổi cài đặt bảo mật của máy.

Script lần lượt hỏi như sau. Câu có giá trị trong `[ ]` thì bấm Enter để giữ mặc định.

| Script hỏi | Anh làm gì |
|---|---|
| **Bước 1** Kiểm tra Node.js | Tự chạy. Báo "Chưa có Node.js" thì quay lại phần Chuẩn bị. |
| **Bước 2** Thư mục lưu trữ `[E:\Tiểu hoa kế toán]` | Enter. Máy không có ổ E thì gõ `D:\Tiểu hoa kế toán`. |
| **Bước 3** Cài thư viện, kiểm thử | Tự chạy, mất 1–3 phút. Kiểm thử lỗi thì script dừng, không đưa web lỗi lên mạng. |
| **4a** Trình duyệt mở Supabase | Đăng nhập bằng GitHub → **New project** → tên `tieu-hoa-bjd`, Region **Singapore**, đặt mật khẩu database (ghi lại) → đợi khoảng 2 phút. |
| **4b** Project URL | Supabase → **Project Settings → API** → copy **Project URL** (dạng `https://abcd.supabase.co`) → chuột phải dán vào PowerShell → Enter. |
| **4c** anon / publishable key | Cùng trang → copy khóa **anon public** (hoặc **publishable**). |
| **4d** service_role / secret key | Copy khóa **service_role** (hoặc **secret**). Dán vào sẽ không hiện chữ, đó là bình thường. |
| **4e** Tạo bảng | Script đã chép `schema.sql` và mở tab SQL Editor: **Ctrl+V → Run** → thấy *Success* → về PowerShell bấm Enter. |
| Nạp 91 sản phẩm mẫu? `[k]` | Bán hàng thật nhập từ Taobao thì Enter (k). Script chép danh mục, 2 showroom mẫu và 3 mã giảm giá; dán vào tab SQL mới → **Run** → Enter. |
| **Bước 5** Tên shop, hotline, ngân hàng, số tài khoản… | Gõ thông tin thật. VNPay / MoMo chưa có thì Enter bỏ trống. |
| **Bước 6** Tên project Vercel `[tieu-hoa-bjd]` | Enter. Trình duyệt mở trang đăng nhập Vercel: chọn **Continue with GitHub** → quay lại PowerShell. |
| (Vercel tự đặt biến và đưa web lên) | Mỗi biến hiện một dòng `đặt …`. Mất 2–4 phút. |
| Địa chỉ web (dòng Aliased/Production ở trên) | Nhìn dòng **Aliased** hoặc **Production** Vercel vừa in. Đúng `https://tieu-hoa-bjd.vercel.app` thì Enter; khác (tên đã có người dùng) thì dán địa chỉ đó. |

Xong script mở trang web và ghi file `E:\Tiểu hoa kế toán\cau-hinh-trien-khai.txt` (không chứa khóa bí mật).

## Bước 3. Việc làm tay sau khi script chạy xong

1. **Supabase → Authentication → URL Configuration:** *Site URL* = địa chỉ web; *Redirect URLs* thêm `<địa chỉ web>/**` → Save.
2. **Supabase → Authentication → Sign In / Providers → Email:** bật. Mặc định Supabase bắt xác nhận email, nên khi đăng ký anh phải bấm link trong hộp thư.
3. Mở web → **Đăng ký** bằng email của anh → xác nhận email.
4. Supabase → **SQL Editor** → chạy (thay bằng email vừa đăng ký):
   ```sql
   select public.make_admin('email-cua-anh@gmail.com');
   ```
5. Đăng xuất, đăng nhập lại → thấy mục **Quản trị** (`<địa chỉ web>/quan-tri`).
6. **Sửa 2 showroom mẫu:** địa chỉ Hà Nội / TP.HCM trong dữ liệu mẫu là địa chỉ giả. Supabase → **Table Editor → stores** → sửa thành địa chỉ thật hoặc xóa dòng.
7. Nhập hàng: làm theo [`HUONG-DAN-TAOBAO.md`](HUONG-DAN-TAOBAO.md) → **Quản trị → Sản phẩm → Nhập từ CSV**.
8. Hằng tuần: **Quản trị → Sao lưu** → chuyển file tải về vào `E:\Tiểu hoa kế toán\sao-luu`.

## Khi gặp lỗi

| Hiện tượng | Cách xử lý |
|---|---|
| Chữ đỏ *"cannot be loaded because running scripts is disabled"* | Anh đã chạy thẳng `.\trien-khai\...ps1`. Chạy lại đúng lệnh có `-ExecutionPolicy Bypass` ở Bước 2. |
| *"Project URL không đúng dạng"* | Dán URL dạng `https://abcd.supabase.co`, không dán link trang dashboard. |
| *"Không thấy ổ E:\\"* | Gõ ổ khác ở câu hỏi thư mục lưu trữ. |
| *"Không đặt được biến … trên Vercel"* | Đọc mấy dòng in ngay phía trên. Thường do chưa đăng nhập Vercel: chạy `npx vercel@latest login` rồi chạy lại script. |
| Web hiện chữ *DEMO* / dữ liệu giả | Biến Supabase chưa vào Vercel. Vào vercel.com → project → **Settings → Environment Variables** kiểm tra `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` → **Deployments → Redeploy**. |
| Tên shop trên web bị *Ti?u* | Bản script cũ. Lấy bản mới, chạy lại (chạy lại an toàn: script ghi đè biến cũ). |
| Thanh toán VNPay/MoMo quay về sai trang | Biến `SITE_URL` sai. Sửa trong Vercel → Environment Variables → Redeploy. |

Chạy lại script nhiều lần không hỏng gì: SQL viết kiểu "chạy lại được", biến Vercel được xóa rồi đặt lại. Lưu ý: câu VNPay/MoMo để trống thì giá trị cũ trên Vercel **vẫn giữ nguyên**, muốn xóa phải vào Vercel xóa tay.

## Khi có VNPay / MoMo thật

Script đặt địa chỉ **sandbox** (thử nghiệm). Khi ký hợp đồng thật, vào Vercel → Environment Variables sửa:

- `VNPAY_URL` = `https://pay.vnpay.vn/vpcpay.html`, cùng `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` thật. Khai IPN URL với VNPay: `<địa chỉ web>/api/vnpay-ipn`.
- `MOMO_ENDPOINT` = `https://payment.momo.vn/v2/gateway/api/create`, cùng 3 khóa MoMo thật.

Rồi **Deployments → Redeploy**.
