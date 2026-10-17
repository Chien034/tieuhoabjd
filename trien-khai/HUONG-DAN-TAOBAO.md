# Tìm hàng Taobao + lấy ảnh thật → đưa lên web Tiểu Hoa BJD

Việc này cần trình duyệt trên **máy tính của anh** (Taobao bắt đăng nhập), nên làm trong một phiên Claude chạy trên máy:
**Claude Desktop** (bật *Claude in Chrome* hoặc *Computer use*), hoặc mở PowerShell tại thư mục `shop` và chạy `claude`.

## Cách làm

1. Mở Chrome, **anh tự đăng nhập Taobao** (quét mã bằng app Taobao). Claude không nhập mật khẩu hộ.
2. Dán nguyên đoạn "Lời nhắn cho Claude" bên dưới vào phiên Claude trên máy.
3. Claude ghi kết quả vào `E:\Tiểu hoa kế toán\nhap-taobao\nhap-taobao.csv` và lưu ảnh vào `E:\Tiểu hoa kế toán\anh-san-pham\<SKU>\`.
4. Anh duyệt file CSV (bỏ dòng không ưng, sửa tên cho hay).
5. Trên web: **Quản trị → Sản phẩm → Nhập từ CSV** → kiểm tra giá vốn / giá bán → *Nhập*.
6. Lọc **"Chưa có ảnh thật"** → mở từng sản phẩm → kéo thả ảnh trong thư mục `anh-san-pham\<SKU>` vào ô ảnh → *Lưu*.

## Lời nhắn cho Claude (dán vào phiên trên máy)

```
Em giúp anh tìm hàng BJD trên Taobao (anh đã đăng nhập sẵn trong Chrome) để nhập về bán tại Việt Nam.

Mẫu tham khảo: https://item.taobao.com/item.htm?id=800487066732 (búp bê 1/4 full set ~1.056 tệ).

Tìm theo các từ khóa, mỗi nhóm chọn 3–6 mẫu: bán chạy (销量 cao), đánh giá tốt, shop lâu năm,
ưu tiên shop chính hãng / xưởng, BỎ hàng nhái (盗版 / recast) và shop có nhiều đánh giá xấu:
  - bjd 四分 全套 (1/4 full set), bjd 六分 全套 (1/6), bjd 三分 全套 (1/3), bjd 八分 (1/8)
  - bjd 四分 素体 (1/4 nude)
  - bjd 假发 四分 / 六分 / 三分 (tóc giả)
  - bjd 眼珠 14mm / 12mm / 16mm (mắt)
  - bjd 娃衣 四分 / 六分 (quần áo: lolita, 汉服 cổ trang, JK, 西装 vest)
  - bjd 娃鞋 (giày), bjd 支架 (giá đỡ), bjd 娃包 (túi đựng)

Với mỗi mẫu ghi lại: link, giá tệ của đúng phân loại (SKU) sẽ nhập, cân nặng đóng gói ước tính
(1/3 ~2,8kg; 1/4 ~1,5kg; 1/6 ~0,8kg; 1/8 ~0,45kg; tóc 0,1kg; mắt 0,03kg; quần áo 0,1–0,3kg;
giày 0,1kg; giá đỡ 0,3kg; túi 0,5–1,3kg), ship nội địa nếu có (包邮 = 0),
thời gian làm hàng nếu shop ghi (预售 / 定制 bao nhiêu ngày → cộng thêm ~10 ngày vận chuyển về VN).

Ghi vào E:\Tiểu hoa kế toán\nhap-taobao\nhap-taobao.csv (UTF-8 có BOM, dấu phẩy) đúng cột theo file mẫu
E:\Tiểu hoa kế toán\nhap-taobao\mau-nhap-taobao.csv:
sku,ten,danh_muc,ti_le,loai_bo,mau_da,gioi_tinh,tinh_trang,so_ngay_ve,gia_te,can_nang_kg,ship_noi_dia_te,link_taobao,mo_ta
  - sku: TB0001, TB0002… (tăng dần, không trùng)
  - ten: tên tiếng Việt dễ hiểu, vd "Búp bê BJD 1/4 Lam Nguyệt — Full set"
  - danh_muc: bjd-1-3 | bjd-1-4 | bjd-1-6 | bjd-mini | toc-gia | mat | trang-phuc | giay | phu-kien-khac
  - ti_le: 1/3 | 1/4 | 1/6 | 1/8 | all
  - loai_bo (búp bê): fullset | nude ; mau_da: trang-hong | trang-tu-nhien | trang-su | ngam
  - gioi_tinh: nu | nam | unisex ; tinh_trang: order (mặc định) | co-san
  - mo_ta: mô tả ngắn tiếng Việt (chất liệu, gồm những gì, kích thước), KHÔNG chép nguyên văn của shop

Ảnh: tải 3–6 ảnh sản phẩm của mỗi mẫu (ảnh chính + ảnh chi tiết, bỏ ảnh quảng cáo có chữ to)
vào E:\Tiểu hoa kế toán\anh-san-pham\<SKU>\1.jpg, 2.jpg…

Xong thì tóm tắt: số mẫu theo nhóm, khoảng giá tệ, các mẫu em thấy đáng nhập nhất và lý do.
Không đặt hàng, không thanh toán, không nhắn tin cho shop khi chưa hỏi anh.
```

## Lưu ý

- **Ảnh và bản quyền:** ảnh trên Taobao thuộc shop / hãng. Nên nhắn shop xin phép dùng ảnh khi bán lại (đa số xưởng đồng ý cho đại lý), hoặc tự chụp khi hàng về. Hãng BJD lớn (Doll Chateau, Ringdoll, Dollzone…) thường chỉ cho đại lý chính thức dùng ảnh.
- **Hàng nhái (recast):** cộng đồng BJD tẩy chay hàng nhái, bán phải dễ mất uy tín — chỉ nhập từ shop chính hãng / xưởng có thiết kế riêng.
- **Giá:** giá Taobao đổi theo phân loại (đầu, thân, makeup, full set) — ghi đúng giá của phân loại sẽ nhập.
