# =====================================================================
#  Tiểu Hoa BJD — đưa web lên mạng + lưu dữ liệu về E:\Tiểu hoa kế toán
#  Chạy trong PowerShell, tại thư mục shop:
#     powershell -ExecutionPolicy Bypass -File .\trien-khai\trien-khai-windows.ps1
#  Cần: Node.js 20+ (https://nodejs.org), tài khoản Supabase và Vercel (đăng nhập bằng GitHub được).
#  Khóa bí mật chỉ nhập vào cửa sổ này, script không lưu chúng ra file.
# =====================================================================
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Shop = Split-Path -Parent $PSScriptRoot
Set-Location $Shop

function Buoc($n, $t) { Write-Host ""; Write-Host "== Bước $n. $t ==" -ForegroundColor Magenta }
function Hoi($t, $macDinh = '') {
  $v = Read-Host ($(if ($macDinh) { "$t [$macDinh]" } else { $t }))
  if ([string]::IsNullOrWhiteSpace($v)) { return $macDinh } else { return $v.Trim() }
}
function HoiBiMat($t) {
  $s = Read-Host $t -AsSecureString
  return [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
}

# ---------------------------------------------------------------- 1. Kiểm tra máy
Buoc 1 'Kiểm tra Node.js'
try { $node = (node -v) } catch { $node = $null }
if (-not $node) {
  Write-Host 'Chưa có Node.js. Cài bằng lệnh:  winget install OpenJS.NodeJS.LTS  rồi mở lại PowerShell.' -ForegroundColor Red
  exit 1
}
Write-Host "Node.js $node"

# ---------------------------------------------------------------- 2. Thư mục lưu trữ
Buoc 2 'Tạo thư mục lưu trữ và sao chép dữ liệu'
$Kho = Hoi 'Thư mục lưu trữ' 'E:\Tiểu hoa kế toán'
$Thu = @('ma-nguon', 'co-so-du-lieu', 'bang-gia', 'anh-san-pham', 'sao-luu', 'nhap-taobao')
foreach ($t in $Thu) { New-Item -ItemType Directory -Force -Path (Join-Path $Kho $t) | Out-Null }
Copy-Item -Force "$Shop\supabase\schema.sql", "$Shop\supabase\seed.sql" (Join-Path $Kho 'co-so-du-lieu')
Copy-Item -Force "$Shop\docs\bang-gia-nhap.md", "$Shop\docs\bang-gia-nhap.csv" (Join-Path $Kho 'bang-gia')
Copy-Item -Force "$Shop\docs\mau-nhap-taobao.csv", "$Shop\trien-khai\HUONG-DAN-TAOBAO.md" (Join-Path $Kho 'nhap-taobao')
# Mã nguồn (bỏ node_modules, dist, file khóa). robocopy trả mã 0–7 là thành công.
robocopy $Shop (Join-Path $Kho 'ma-nguon') /E /XD node_modules dist .vercel /XF .env .env.local /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "Sao chép mã nguồn lỗi (robocopy $LASTEXITCODE)" }
Write-Host "Đã lưu vào $Kho"

# ---------------------------------------------------------------- 3. Cài đặt + kiểm thử
Buoc 3 'Cài thư viện và chạy kiểm thử'
npm ci
if ($LASTEXITCODE -ne 0) { throw 'npm ci lỗi' }
npm test
if ($LASTEXITCODE -ne 0) { throw 'Kiểm thử lỗi — dừng, không đưa lên mạng' }

# ---------------------------------------------------------------- 4. Supabase
Buoc 4 'Cơ sở dữ liệu Supabase'
Write-Host '4a. Vào https://supabase.com → New project (Region: Singapore). Đặt tên vd: tieu-hoa-bjd. Đợi ~2 phút.'
Start-Process 'https://supabase.com/dashboard/projects'
$SupaUrl = Hoi '4b. Dán Project URL (Project Settings → API, dạng https://xxxx.supabase.co)'
if ($SupaUrl -notmatch '^https://([a-z0-9]+)\.supabase\.co/?$') { throw 'Project URL không đúng dạng https://xxxx.supabase.co' }
$Ref = $Matches[1]
$SupaUrl = $SupaUrl.TrimEnd('/')
$Anon = Hoi '4c. Dán anon / publishable key (khóa công khai)'
$Service = HoiBiMat '4d. Dán service_role / secret key (khóa bí mật — không hiện trên màn hình)'

Write-Host '4e. Tạo bảng: đã chép schema.sql vào clipboard. Trong SQL Editor vừa mở: Ctrl+V → Run.'
Get-Content "$Shop\supabase\schema.sql" -Raw -Encoding UTF8 | Set-Clipboard
Start-Process "https://supabase.com/dashboard/project/$Ref/sql/new"
Read-Host 'Chạy xong (thấy Success) thì bấm Enter'
$napMau = Hoi 'Nạp 91 sản phẩm mẫu? (c/k) — chọn k nếu chỉ bán hàng thật nhập từ Taobao' 'k'
if ($napMau -eq 'c') {
  Get-Content "$Shop\supabase\seed.sql" -Raw -Encoding UTF8 | Set-Clipboard
  Start-Process "https://supabase.com/dashboard/project/$Ref/sql/new"
  Read-Host 'Đã chép seed.sql — dán vào tab SQL mới → Run → bấm Enter'
} else {
  # Không nạp sản phẩm mẫu nhưng vẫn cần danh mục, showroom, mã giảm giá
  $seed = Get-Content "$Shop\supabase\seed.sql" -Raw -Encoding UTF8
  $phan = ($seed -split '(?=insert into public\.)') | Where-Object { $_ -notmatch '^insert into public\.(products|product_costs) ' }
  ($phan -join '') | Set-Clipboard
  Start-Process "https://supabase.com/dashboard/project/$Ref/sql/new"
  Read-Host 'Đã chép danh mục + showroom + mã giảm giá — dán vào tab SQL mới → Run → bấm Enter'
}
Write-Host '4f. Authentication → Sign In / Providers → Email: bật cho đăng ký. URL Configuration: điền địa chỉ web ở bước 6.'

# ---------------------------------------------------------------- 5. Thông tin shop
Buoc 5 'Thông tin cửa hàng'
$Ten = Hoi 'Tên shop' 'Tiểu Hoa BJD'
$Hotline = Hoi 'Hotline' '1800 0000'
$NH = Hoi 'Mã ngân hàng nhận chuyển khoản (VCB, TCB, MB, ACB…)' 'VCB'
$STK = Hoi 'Số tài khoản'
$ChuTK = Hoi 'Tên chủ tài khoản (viết hoa không dấu)' 'TIEU HOA BJD'
$VnTmn = Hoi 'VNPay TMN code (bỏ trống nếu chưa có)'
$VnSecret = if ($VnTmn) { HoiBiMat 'VNPay hash secret' } else { '' }
$MoMoPartner = Hoi 'MoMo partner code (bỏ trống nếu chưa có)'
$MoMoAccess = if ($MoMoPartner) { Hoi 'MoMo access key' } else { '' }
$MoMoSecret = if ($MoMoPartner) { HoiBiMat 'MoMo secret key' } else { '' }

# ---------------------------------------------------------------- 6. Vercel
Buoc 6 'Đưa web lên Vercel'
$Du = Hoi 'Tên project trên Vercel (thành địa chỉ <tên>.vercel.app)' 'tieu-hoa-bjd'
npx --yes vercel@latest login
npx --yes vercel@latest link --yes --project $Du
if ($LASTEXITCODE -ne 0) { throw 'vercel link lỗi' }

function DatBien($ten, $giaTri) {
  if ([string]::IsNullOrEmpty($giaTri)) { return }
  npx --yes vercel@latest env rm $ten production --yes 2>$null | Out-Null
  $giaTri | npx --yes vercel@latest env add $ten production | Out-Null
  Write-Host "  đặt $ten"
}
$bien = [ordered]@{
  VITE_SUPABASE_URL = $SupaUrl; VITE_SUPABASE_ANON_KEY = $Anon; VITE_SHOP_NAME = $Ten; VITE_HOTLINE = $Hotline
  VITE_BANK_ID = $NH; VITE_BANK_ACCOUNT = $STK; VITE_BANK_ACCOUNT_NAME = $ChuTK
  SUPABASE_URL = $SupaUrl; SUPABASE_SERVICE_ROLE_KEY = $Service
  VNPAY_TMN_CODE = $VnTmn; VNPAY_HASH_SECRET = $VnSecret; VNPAY_URL = $(if ($VnTmn) { 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html' } else { '' })
  MOMO_PARTNER_CODE = $MoMoPartner; MOMO_ACCESS_KEY = $MoMoAccess; MOMO_SECRET_KEY = $MoMoSecret
  MOMO_ENDPOINT = $(if ($MoMoPartner) { 'https://test-payment.momo.vn/v2/gateway/api/create' } else { '' })
}
foreach ($k in $bien.Keys) { DatBien $k $bien[$k] }

$out = npx --yes vercel@latest deploy --prod --yes
if ($LASTEXITCODE -ne 0) { throw 'Deploy lỗi' }
$Site = "https://$Du.vercel.app"
DatBien 'SITE_URL' $Site
npx --yes vercel@latest deploy --prod --yes | Out-Null
Write-Host "Web đã chạy: $Site" -ForegroundColor Green

# ---------------------------------------------------------------- 7. Ghi chú cấu hình (không chứa khóa bí mật)
@"
Tiểu Hoa BJD — cấu hình triển khai ($(Get-Date -Format 'dd/MM/yyyy HH:mm'))
Web:             $Site
Quản trị:        $Site/quan-tri
Supabase:        https://supabase.com/dashboard/project/$Ref
Vercel project:  $Du
Ngân hàng:       $NH - $STK - $ChuTK
VNPay:           $(if ($VnTmn) { "có (sandbox), IPN URL: $Site/api/vnpay-ipn" } else { 'chưa cấu hình' })
MoMo:            $(if ($MoMoPartner) { 'có (sandbox)' } else { 'chưa cấu hình' })
Khóa bí mật (service_role, VNPay, MoMo) KHÔNG lưu ở đây — xem lại trong Supabase / Vercel khi cần.
"@ | Set-Content -Encoding UTF8 (Join-Path $Kho 'cau-hinh-trien-khai.txt')

Buoc 7 'Việc còn lại'
Write-Host "1. Supabase → Authentication → URL Configuration: Site URL = $Site ; Redirect URLs thêm $Site/**"
Write-Host "2. Mở $Site → Đăng ký tài khoản bằng email của anh."
Write-Host "3. Supabase SQL Editor chạy:  select public.make_admin('email-cua-anh@gmail.com');"
Write-Host "4. Đăng nhập lại → Quản trị → Sản phẩm → Nhập từ CSV (file trong $Kho\nhap-taobao) → tải ảnh cho từng sản phẩm."
Write-Host "5. Hằng tuần: Quản trị → Sao lưu → lưu file vào $Kho\sao-luu"
Start-Process $Site
