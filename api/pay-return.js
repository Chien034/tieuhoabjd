// GET /api/pay-return?<tham số cổng gửi về>  → { code, ok }
// Trang /thanh-toan/ket-qua gọi API này. Kiểm tra chữ ký rồi ghi nhận (an toàn khi IPN cũng ghi: hàm record_payment không ghi trùng).
import { vnpayVerify, momoVerify, recordPayment } from './_lib.js'

export default async function handler(req, res) {
  try {
    const q = req.query || {}
    let v = null, gw = ''
    if (q.vnp_SecureHash) { v = vnpayVerify(q); gw = 'VNPay' }
    else if (q.partnerCode && q.signature) { v = momoVerify(q); gw = 'MoMo' }
    if (!v) return res.status(400).json({ error: 'Sai chữ ký' })
    await recordPayment(v.code, v.amount, v.ok, v.ref, gw)
    return res.json({ code: v.code, ok: v.ok })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Lỗi xác nhận thanh toán' })
  }
}
