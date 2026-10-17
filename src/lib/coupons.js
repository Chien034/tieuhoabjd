// Mã giảm giá: làm sạch dữ liệu form quản trị, kiểm tra hợp lệ, mô tả và trạng thái.
// Luật kiểm tra giống hệt supabase/ma-giam-gia.sql (máy chủ vẫn kiểm lại khi đặt hàng).

export const COUPON_KINDS = [
  { id: 'percent', name: 'Giảm theo %' },
  { id: 'amount', name: 'Giảm số tiền' },
  { id: 'freeship', name: 'Miễn phí giao hàng' },
]

export const EMPTY_COUPON = {
  code: '', kind: 'percent', value: 10, max_discount: null, min_order: 0, description: '', active: true,
  starts_at: null, expires_at: null, usage_limit: null, per_customer_limit: null, used: 0,
}

const vn = n => Number(n).toLocaleString('vi-VN')
const clean = s => String(s ?? '').replace(/[​-‍﻿]/g, '').trim()
const int = v => { const n = parseInt(String(v ?? '').replace(/\D/g, ''), 10); return Number.isFinite(n) ? n : null }
const ms = v => new Date(v).getTime()
const time = v => { if (!v) return null; const d = new Date(v); return isNaN(d) ? null : d.toISOString() }

export const normCode = s => clean(s).toUpperCase().replace(/\s+/g, '')

// Mô tả tự sinh khi quản trị để trống
export function describeCoupon(c) {
  const head = c.kind === 'freeship' ? 'Miễn phí giao hàng'
    : c.kind === 'percent' ? `Giảm ${c.value}%${c.max_discount ? ` (tối đa ${vn(c.max_discount)}đ)` : ''}`
    : `Giảm ${vn(c.value)}đ`
  return head + (c.min_order > 0 ? ` cho đơn từ ${vn(c.min_order)}đ` : '')
}

export function normalizeCoupon(f) {
  const kind = COUPON_KINDS.some(k => k.id === f.kind) ? f.kind : 'percent'
  const row = {
    code: normCode(f.code),
    kind,
    value: kind === 'freeship' ? 0 : int(f.value) ?? 0,
    max_discount: kind === 'percent' ? int(f.max_discount) || null : null,
    min_order: int(f.min_order) || 0,
    active: f.active !== false,
    starts_at: time(f.starts_at),
    expires_at: time(f.expires_at),
    usage_limit: int(f.usage_limit) || null,
    per_customer_limit: int(f.per_customer_limit) || null,
  }
  row.description = clean(f.description).slice(0, 200) || describeCoupon(row)
  return row
}

export function couponError(c) {
  if (!/^[A-Z0-9_-]{3,30}$/.test(c.code)) return 'Mã chỉ gồm chữ không dấu, số, gạch ngang; dài 3–30 ký tự'
  if (c.kind === 'percent' && !(c.value >= 1 && c.value <= 100)) return 'Phần trăm giảm phải từ 1 đến 100'
  if (c.kind === 'amount' && !(c.value > 0)) return 'Nhập số tiền giảm'
  if (c.starts_at && c.expires_at && ms(c.starts_at) >= ms(c.expires_at)) return 'Ngày hết hạn phải sau ngày bắt đầu'
  return null
}

// Trạng thái hiển thị trong quản trị; ok = khách đang dùng được
export function couponStatus(c, now = new Date()) {
  const t = now.getTime()
  if (!c.active) return { ok: false, label: 'Đã tắt', tone: '' }
  if (c.expires_at && ms(c.expires_at) <= t) return { ok: false, label: 'Hết hạn', tone: 'bad' }
  if (c.usage_limit != null && c.used >= c.usage_limit) return { ok: false, label: 'Hết lượt', tone: 'bad' }
  if (c.starts_at && ms(c.starts_at) > t) return { ok: false, label: 'Chưa bắt đầu', tone: 'warn' }
  return { ok: true, label: 'Đang chạy', tone: 'ok' }
}

// Số lần khách (theo SĐT hoặc tài khoản) đã dùng mã trong các đơn chưa hủy
export function customerUses(orders, code, { phone, user_id }) {
  const p = String(phone || '').replace(/\D/g, '')
  return orders.filter(o => o.coupon_code === code && o.status !== 'da_huy' &&
    ((p && String(o.phone || '').replace(/\D/g, '') === p) || (user_id && o.user_id === user_id))).length
}

// Thống kê từ danh sách đơn: số đơn và tổng tiền đã giảm theo từng mã
export function couponStats(orders) {
  const s = {}
  for (const o of orders || []) {
    if (!o.coupon_code || o.status === 'da_huy') continue
    const x = s[o.coupon_code] ||= { orders: 0, discount: 0 }
    x.orders++; x.discount += o.discount || 0
  }
  return s
}

// Mã ngẫu nhiên dễ đọc (bỏ 0/O, 1/I)
export function randomCode(prefix = 'TH') {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)]
  return prefix + s
}

// ISO ↔ giá trị ô <input type="datetime-local"> theo giờ máy
export function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
