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

export const DEPOSIT_PCT = 50 // mức trả trước tối thiểu của hàng đặt trước
export const DEPOSIT_CHOICES = [50, 70, 100]
const roundUp1000 = n => Math.ceil(n / 1000) * 1000

// Số tiền trả trước tối thiểu: 50% tổng đơn, làm tròn lên nghìn đồng (không vượt tổng đơn)
export const minDeposit = total => Math.min(total, roundUp1000(total * DEPOSIT_PCT / 100))

// Khách chọn mức trả trước: { pct } (50, 70, 100) hoặc { amount } (tự nhập).
// Trả về { deposit, error }; deposit = 0 nghĩa là trả hết một lần.
// Cùng quy tắc với place_order (supabase/schema.sql).
export function depositFor(total, choice) {
  const min = minDeposit(total)
  let d = min
  if (choice?.amount != null && choice.amount !== '') {
    d = Math.round(Number(choice.amount))
    if (!Number.isFinite(d) || d < min || d > total) {
      return { deposit: min, error: `Số tiền trả trước từ ${min.toLocaleString('vi-VN')} ₫ (50%) đến ${total.toLocaleString('vi-VN')} ₫` }
    }
  } else if (choice?.pct) d = Math.min(total, Math.max(min, roundUp1000(total * choice.pct / 100)))
  return { deposit: d >= total ? 0 : d, error: null }
}

// preorder: đơn có hàng đặt trước → khách trả trước ít nhất 50% tổng đơn
// depositChoice: mức trả trước khách chọn (xem depositFor), mặc định 50%
// fees: phí giao hàng đang cài trong Quản trị (bảng settings), mặc định theo data.js
export function computeTotals({ subtotal, delivery, coupon, preorder = false, fees = {}, depositChoice = null }) {
  const fee = fees.shipping_fee ?? SHIPPING_FEE, freeFrom = fees.free_ship_from ?? FREE_SHIP_FROM
  const c = couponDiscount(coupon, subtotal)
  const shipping = delivery === 'pickup' || c.freeship || subtotal >= freeFrom || subtotal === 0 ? 0 : fee
  const total = subtotal - c.discount + shipping
  const dep = preorder ? depositFor(total, depositChoice) : { deposit: 0, error: null }
  return { subtotal, discount: c.discount, shipping, total, deposit: dep.deposit, depositError: dep.error, couponError: c.error }
}

// Số đã trả của đơn (đơn cũ chưa có cột paid_amount thì suy ra từ trạng thái)
export const paidOf = o => o.paid_amount ?? (o.payment_status === 'da_coc' ? o.deposit : o.payment_status === 'da_thanh_toan' ? o.total : 0)

// Số tiền khách cần trả ở lần thanh toán kế tiếp: phần cọc còn thiếu, hoặc phần còn lại của đơn.
// Cùng quy tắc với hàm amount_due trong CSDL.
export function amountDue(o) {
  if (o.status === 'da_huy' || ['da_thanh_toan', 'hoan_tien'].includes(o.payment_status)) return 0
  const target = o.deposit > 0 && ['chua_thanh_toan', 'that_bai'].includes(o.payment_status) ? o.deposit : o.total
  return Math.max(0, target - paidOf(o))
}

// Ghi nhận một khoản tiền vào đơn (dùng cho bản demo; CSDL làm trong hàm apply_payment).
// Đủ cọc → "Đã đặt cọc", đủ tổng → "Đã thanh toán"; đơn đang chờ thì tự chuyển "Đã xác nhận".
export function applyPayment(o, amount) {
  const paid = paidOf(o) + amount
  const payment_status = paid >= o.total ? 'da_thanh_toan' : o.deposit > 0 && paid >= o.deposit ? 'da_coc' : o.payment_status === 'that_bai' ? 'chua_thanh_toan' : o.payment_status
  const confirm = o.status === 'cho_xac_nhan' && ['da_coc', 'da_thanh_toan'].includes(payment_status)
  return { paid_amount: paid, payment_status, status: confirm ? 'da_xac_nhan' : o.status, confirmed: confirm }
}

// Tìm mã đơn (HK + 11 số) trong nội dung chuyển khoản. Ngân hàng có thể bỏ dấu cách / đổi chữ hoa.
export function orderCodeIn(text) {
  const m = String(text || '').toUpperCase().match(/HK\s?(\d{11})(?!\d)/)
  return m ? 'HK' + m[1] : null
}
