// VNPay gọi URL này (cấu hình IPN URL = https://<web>/api/vnpay-ipn trong trang quản lý merchant VNPay)
import { vnpayVerify, recordPayment } from './_lib.js'

export default async function handler(req, res) {
  try {
    const v = vnpayVerify(req.query || {})
    if (!v) return res.json({ RspCode: '97', Message: 'Invalid signature' })
    const r = await recordPayment(v.code, v.amount, v.ok, v.ref, 'VNPay')
    if (r === 'not_found') return res.json({ RspCode: '01', Message: 'Order not found' })
    if (r === 'bad_amount') return res.json({ RspCode: '04', Message: 'Invalid amount' })
    if (r === 'already') return res.json({ RspCode: '02', Message: 'Order already confirmed' })
    return res.json({ RspCode: '00', Message: 'Confirm Success' })
  } catch (e) {
    console.error(e)
    return res.json({ RspCode: '99', Message: 'Unknown error' })
  }
}
