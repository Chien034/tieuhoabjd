// SePay gọi URL này mỗi khi tài khoản ngân hàng của shop nhận tiền
// (cấu hình Webhook = https://<web>/api/sepay-webhook, xác thực "API Key" trong trang SePay).
// Tìm mã đơn trong nội dung chuyển khoản → cộng tiền vào đơn → đủ cọc / đủ tiền thì tự chuyển "Đã xác nhận" và báo shop.
import { sepayVerify, recordBankTransfer } from './_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' })
  if (!process.env.SEPAY_API_KEY) return res.status(500).json({ success: false, message: 'Chưa cấu hình SEPAY_API_KEY' })
  const v = sepayVerify(req.headers, req.body)
  if (!v) return res.status(401).json({ success: false, message: 'Sai API Key' })
  if (v.skip) return res.json({ success: true, message: 'Bỏ qua tiền ra' })
  try {
    const r = await recordBankTransfer(v)
    return res.json({ success: true, result: r })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ success: false, message: 'Lỗi ghi nhận thanh toán' }) // SePay sẽ gửi lại
  }
}
