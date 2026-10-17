// Thông tin chung của cửa hàng (tên, hotline, liên hệ, tài khoản nhận tiền, phí giao hàng).
// Quản trị sửa ở trang Quản trị > Cài đặt cửa hàng, lưu trong bảng shop_info + settings của Supabase.
// Biến môi trường VITE_* chỉ còn là giá trị dự phòng khi CSDL chưa có.
import { SHIPPING_FEE, FREE_SHIP_FROM } from './data.js'

const env = import.meta.env || {}

// Bỏ BOM, ký tự ẩn (zero-width) và khoảng trắng thừa — hay dính vào khi dán từ Windows / Excel
export const cleanText = v => String(v ?? '').replace(/[﻿​-‍⁠­]/g, '').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim()
const cleanMulti = v => String(v ?? '').replace(/[﻿​-‍⁠­]/g, '').replace(/\r\n?/g, '\n').split('\n').map(l => l.replace(/[ \t]+/g, ' ').trim()).join('\n').trim()
// Chỉ nhận ảnh https:// hoặc ảnh nhúng (bản demo), tránh link lạ như javascript:
const safeImage = v => { const u = cleanText(v); return /^(https:\/\/|data:image\/(png|jpeg|webp);)/.test(u) ? u : '' }
const digits = v => cleanText(v).replace(/\D/g, '')
const money = (v, d) => { const n = Number(String(v ?? '').replace(/\D/g, '')); return String(v ?? '').trim() === '' || !Number.isFinite(n) ? d : n }

// [khóa, nhãn, gợi ý] — dùng chung cho form quản trị
export const INFO_FIELDS = [
  ['name', 'Tên cửa hàng', 'Hiện ở logo, chân trang'],
  ['tagline', 'Giới thiệu ngắn', 'Đoạn mô tả dưới logo ở chân trang'],
  ['hotline', 'Hotline', 'Số khách bấm gọi'],
  ['hours', 'Giờ hỗ trợ', 'VD: 8:00 – 21:30'],
  ['email', 'Email liên hệ', ''],
  ['zalo', 'Zalo', 'Số điện thoại Zalo hoặc link zalo.me'],
  ['zalo_name', 'Tên hiển thị Zalo', 'VD: Minh Nguyệt'],
  ['facebook', 'Facebook', 'Link trang Facebook'],
  ['address', 'Địa chỉ liên hệ', 'Hiện ở chân trang (showroom quản lý riêng bên dưới)'],
]
export const BANK_FIELDS = [
  ['bank_id', 'Ngân hàng', 'Mã VietQR, VD: VCB, TCB, MB, ACB, BIDV, VPB'],
  ['bank_account', 'Số tài khoản', 'Chỉ chữ số'],
  ['bank_account_name', 'Chủ tài khoản', 'Viết hoa không dấu, đúng như trên ngân hàng'],
]

export const DEFAULT_INFO = normalizeInfo({
  name: env.VITE_SHOP_NAME || 'Tiểu Hoa BJD',
  tagline: 'Búp bê khớp cầu BJD và phụ kiện nhập trực tiếp từ xưởng. Có sẵn tại Việt Nam hoặc order theo yêu cầu.',
  hotline: env.VITE_HOTLINE || '1800 0000',
  hours: '8:00 – 21:30',
  logo: '', email: '', zalo: '', zalo_name: '', facebook: '', address: '',
  bank_id: env.VITE_BANK_ID || 'VCB',
  bank_account: env.VITE_BANK_ACCOUNT || '0123456789',
  bank_account_name: env.VITE_BANK_ACCOUNT_NAME || 'TIEU HOA BJD',
  shipping_fee: SHIPPING_FEE,
  free_ship_from: FREE_SHIP_FROM,
}, null)

// Chuẩn hóa dữ liệu (từ CSDL hoặc form). Trường trống thì lấy giá trị dự phòng.
export function normalizeInfo(raw = {}, fallback = DEFAULT_INFO) {
  const fb = fallback || {}
  const pick = (k, f = cleanText) => { const v = f(raw[k]); return v === '' && fb[k] !== undefined ? fb[k] : v }
  return {
    name: pick('name'),
    tagline: pick('tagline', cleanMulti),
    logo: safeImage(raw.logo ?? fb.logo),
    hotline: pick('hotline'),
    hours: pick('hours'),
    email: cleanText(raw.email ?? fb.email ?? ''),
    zalo: cleanText(raw.zalo ?? fb.zalo ?? ''),
    zalo_name: cleanText(raw.zalo_name ?? fb.zalo_name ?? ''),
    facebook: cleanText(raw.facebook ?? fb.facebook ?? ''),
    address: cleanMulti(raw.address ?? fb.address ?? ''),
    bank_id: pick('bank_id', v => cleanText(v).toUpperCase().replace(/\s/g, '')),
    bank_account: pick('bank_account', digits),
    bank_account_name: pick('bank_account_name', v => cleanText(v).toUpperCase()),
    shipping_fee: money(raw.shipping_fee, fb.shipping_fee ?? SHIPPING_FEE),
    free_ship_from: money(raw.free_ship_from, fb.free_ship_from ?? FREE_SHIP_FROM),
  }
}

export const telHref = phone => 'tel:' + String(phone || '').replace(/[^\d+]/g, '')
export const zaloHref = z => (/^https?:\/\//i.test(z) ? z : 'https://zalo.me/' + String(z).replace(/\D/g, ''))

// Showroom: làm sạch trước khi lưu
export function normalizeStore(s) {
  const out = { name: cleanText(s.name), city: cleanText(s.city), district: cleanText(s.district), address: cleanText(s.address), phone: cleanText(s.phone), hours: cleanText(s.hours) }
  if (s.id) out.id = s.id
  return out
}
export function storeError(s) {
  if (!s.name) return 'Nhập tên showroom'
  if (!s.city) return 'Nhập tỉnh / thành'
  if (!s.address) return 'Nhập địa chỉ'
  return ''
}
