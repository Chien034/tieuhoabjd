import { SHIPPING_FEE, FREE_SHIP_FROM } from './data.js'

// Tính tiền đơn hàng. Cùng quy tắc với hàm place_order trong supabase/schema.sql
// (máy chủ tính lại, không tin số từ trình duyệt).
export function couponDiscount(coupon, subtotal) {
  if (!coupon) return { discount: 0, freeship: false, error: null }
  if (subtotal < (coupon.min_order || 0)) {
    return { discount: 0, freeship: false, error: `Mã ${coupon.code} áp dụng cho đơn từ ${coupon.min_order.toLocaleString('vi-VN')} ₫` }
  }
  if (coupon.kind === 'freeship') return { discount: 0, freeship: true, error: null }
  let d = coupon.kind === 'percent' ? Math.floor(subtotal * coupon.value / 100) : coupon.value
  if (coupon.max_discount) d = Math.min(d, coupon.max_discount)
  return { discount: Math.min(d, subtotal), freeship: false, error: null }
}

export const DEPOSIT_PCT = 50

// preorder: đơn có hàng đặt trước → khách cọc 50% tổng đơn (làm tròn lên nghìn đồng)
// fees: phí giao hàng đang cài trong Quản trị (bảng settings), mặc định theo data.js
export function computeTotals({ subtotal, delivery, coupon, preorder = false, fees = {} }) {
  const fee = fees.shipping_fee ?? SHIPPING_FEE, freeFrom = fees.free_ship_from ?? FREE_SHIP_FROM
  const c = couponDiscount(coupon, subtotal)
  const shipping = delivery === 'pickup' || c.freeship || subtotal >= freeFrom || subtotal === 0 ? 0 : fee
  const total = subtotal - c.discount + shipping
  const deposit = preorder ? Math.ceil(total * DEPOSIT_PCT / 100 / 1000) * 1000 : 0
  return { subtotal, discount: c.discount, shipping, total, deposit, couponError: c.error }
}

// Số tiền khách cần trả ở lần thanh toán kế tiếp
export function amountDue(o) {
  if (o.status === 'da_huy') return 0
  if (o.payment_status === 'chua_thanh_toan' || o.payment_status === 'that_bai') return o.deposit > 0 ? o.deposit : o.total
  if (o.payment_status === 'da_coc') return o.total - o.deposit
  return 0
}
