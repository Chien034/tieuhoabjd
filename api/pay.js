// POST /api/pay  { code, phone }  → { url }  — tạo link thanh toán VNPay / MoMo cho đơn đã đặt.
// Số tiền lấy từ CSDL, không lấy từ trình duyệt.
import { getOrder, vnpayUrl, momoCreateBody, siteUrl, clientIp } from './_lib.js'
import { amountDue } from '../src/lib/pricing.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { code, phone } = req.body || {}
    const order = code ? await getOrder(String(code).toUpperCase()) : null
    if (!order || String(phone || '').replace(/\D/g, '') !== order.phone) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' })
    if (order.status === 'da_huy') return res.status(400).json({ error: 'Đơn đã hủy' })
    // Thu đúng số cần trả lúc này: tiền cọc, phần còn lại, hoặc cả đơn
    const amount = amountDue(order)
    if (!amount) return res.status(400).json({ error: 'Đơn đã được thanh toán' })
    const site = siteUrl(req)
    const returnUrl = site + '/thanh-toan/ket-qua'

    if (order.payment_method === 'vnpay') {
      if (!process.env.VNPAY_TMN_CODE) return res.status(500).json({ error: 'Chưa cấu hình VNPay' })
      return res.json({ url: vnpayUrl({ code: order.code, amount, ip: clientIp(req), returnUrl }) })
    }
    if (order.payment_method === 'momo') {
      if (!process.env.MOMO_PARTNER_CODE) return res.status(500).json({ error: 'Chưa cấu hình MoMo' })
      const body = momoCreateBody({ code: order.code, amount, redirectUrl: returnUrl, ipnUrl: site + '/api/momo-ipn' })
      const r = await fetch(process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const j = await r.json()
      if (j.resultCode !== 0 || !j.payUrl) return res.status(502).json({ error: 'MoMo: ' + (j.message || 'không tạo được giao dịch') })
      return res.json({ url: j.payUrl })
    }
    return res.status(400).json({ error: 'Đơn này không thanh toán online' })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Lỗi máy chủ thanh toán' })
  }
}
