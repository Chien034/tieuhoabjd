// MoMo gọi URL này sau khi khách thanh toán (ipnUrl gửi kèm lúc tạo giao dịch)
import { momoVerify, recordPayment } from './_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  try {
    const v = momoVerify(req.body || {})
    if (!v) return res.status(400).json({ message: 'Invalid signature' })
    await recordPayment(v.code, v.amount, v.ok, v.ref, 'MoMo')
    return res.status(204).end()
  } catch (e) {
    console.error(e)
    return res.status(500).end()
  }
}
