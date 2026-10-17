// 34 tỉnh, thành phố (sau sắp xếp đơn vị hành chính từ 01/07/2025: bỏ cấp huyện, còn tỉnh – xã/phường)
export const PROVINCES = [
  'Hà Nội', 'TP. Hồ Chí Minh', 'Hải Phòng', 'Đà Nẵng', 'Huế', 'Cần Thơ',
  'An Giang', 'Bắc Ninh', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai',
  'Hà Tĩnh', 'Hưng Yên', 'Khánh Hòa', 'Lai Châu', 'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Nghệ An', 'Ninh Bình',
  'Phú Thọ', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị', 'Sơn La', 'Tây Ninh', 'Thái Nguyên', 'Thanh Hóa',
  'Tuyên Quang', 'Vĩnh Long',
]

export const formatAddress = a => [a.line, a.ward, a.province].filter(Boolean).join(', ')
export const validPhone = s => /^0\d{9}$/.test(String(s || '').replace(/[\s.-]/g, ''))
export const validEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim())
