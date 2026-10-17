export const vnd = n => (n == null ? '' : Math.round(n).toLocaleString('vi-VN') + ' ₫')

export const date = d => (d ? new Date(d).toLocaleDateString('vi-VN') : '')
export const dateTime = d => (d ? new Date(d).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '')

export const discountPct = p => (p.compare_price && p.compare_price > p.price ? Math.round((1 - p.price / p.compare_price) * 100) : 0)

export const ORDER_STATUS = {
  cho_xac_nhan: { label: 'Chờ xác nhận', tone: 'warn' },
  da_xac_nhan: { label: 'Đã xác nhận', tone: 'info' },
  dang_giao: { label: 'Đang giao', tone: 'info' },
  da_giao: { label: 'Đã giao', tone: 'ok' },
  da_huy: { label: 'Đã hủy', tone: 'bad' },
}
export const PAYMENT_STATUS = {
  chua_thanh_toan: { label: 'Chưa thanh toán', tone: 'warn' },
  da_coc: { label: 'Đã đặt cọc', tone: 'info' },
  da_thanh_toan: { label: 'Đã thanh toán', tone: 'ok' },
  that_bai: { label: 'Thanh toán lỗi', tone: 'bad' },
  hoan_tien: { label: 'Đã hoàn tiền', tone: 'info' },
}
export const PAYMENT_METHODS = [
  { key: 'cod', name: 'Thanh toán khi nhận hàng (COD)', note: 'Chỉ áp dụng đơn toàn hàng có sẵn' },
  { key: 'bank', name: 'Chuyển khoản ngân hàng (VietQR)', note: 'Quét mã QR bằng app ngân hàng' },
  { key: 'vnpay', name: 'Thẻ ATM / Visa / Master / QR qua VNPay', note: 'Thanh toán an toàn qua cổng VNPay' },
  { key: 'momo', name: 'Ví MoMo', note: 'Mở app MoMo để thanh toán' },
]
export const paymentName = k => PAYMENT_METHODS.find(m => m.key === k)?.name || k
