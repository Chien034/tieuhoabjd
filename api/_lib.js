// Hàm dùng chung cho các API thanh toán (Vercel bỏ qua file bắt đầu bằng "_" khi tạo route).
import crypto from 'node:crypto'

const env = k => process.env[k] || ''

// ------------------------------------------------------------ Supabase (khóa service_role, chỉ ở máy chủ)
async function rest(path, init = {}) {
  const r = await fetch(env('SUPABASE_URL') + '/rest/v1/' + path, {
    ...init,
    headers: { apikey: env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: 'Bearer ' + env('SUPABASE_SERVICE_ROLE_KEY'), 'Content-Type': 'application/json', ...(init.headers || {}) },
  })
  const text = await r.text()
  if (!r.ok) throw new Error('Supabase ' + r.status + ': ' + text)
  return text ? JSON.parse(text) : null
}
export async function getOrder(code) {
  const rows = await rest('orders?select=code,total,deposit,phone,payment_method,payment_status,status&code=eq.' + encodeURIComponent(code))
  return rows?.[0] || null
}
export async function recordPayment(code, amount, ok, ref, gateway) {
  return rest('rpc/record_payment', { method: 'POST', body: JSON.stringify({ p_code: code, p_amount: amount, p_ok: ok, p_ref: ref, p_gateway: gateway }) })
}

// ------------------------------------------------------------ VNPay (API v2.1.0)
// Mã tham chiếu mỗi lần thanh toán: <mã đơn>-<thời gian>, để khách thanh toán lại được.
export const txnRef = code => `${code}-${Date.now().toString(36)}`
export const codeFromRef = ref => String(ref || '').split('-')[0]

function vnpEncode(params) {
  return Object.keys(params).sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k]).replace(/%20/g, '+')}`)
    .join('&')
}
export const hmac = (alg, secret, data) => crypto.createHmac(alg, secret).update(Buffer.from(data, 'utf-8')).digest('hex')

function vnTime(d) {
  const t = new Date(d.getTime() + 7 * 3600 * 1000) // giờ Việt Nam
  const p = n => String(n).padStart(2, '0')
  return `${t.getUTCFullYear()}${p(t.getUTCMonth() + 1)}${p(t.getUTCDate())}${p(t.getUTCHours())}${p(t.getUTCMinutes())}${p(t.getUTCSeconds())}`
}

export function vnpayUrl({ code, amount, ip, returnUrl, tmnCode = env('VNPAY_TMN_CODE'), secret = env('VNPAY_HASH_SECRET'), baseUrl = env('VNPAY_URL') || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html', now = new Date() }) {
  const params = {
    vnp_Version: '2.1.0', vnp_Command: 'pay', vnp_TmnCode: tmnCode, vnp_Locale: 'vn', vnp_CurrCode: 'VND',
    vnp_TxnRef: txnRef(code), vnp_OrderInfo: `Thanh toan don hang ${code}`, vnp_OrderType: 'other',
    vnp_Amount: String(Math.round(amount) * 100), vnp_ReturnUrl: returnUrl, vnp_IpAddr: ip || '127.0.0.1',
    vnp_CreateDate: vnTime(now), vnp_ExpireDate: vnTime(new Date(now.getTime() + 15 * 60 * 1000)),
  }
  const data = vnpEncode(params)
  return `${baseUrl}?${data}&vnp_SecureHash=${hmac('sha512', secret, data)}`
}

// Kiểm tra chữ ký dữ liệu VNPay gửi về (return URL và IPN). Trả về null nếu sai chữ ký.
export function vnpayVerify(query, secret = env('VNPAY_HASH_SECRET')) {
  const params = {}
  for (const [k, v] of Object.entries(query)) if (k.startsWith('vnp_') && k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType') params[k] = v
  const sig = String(query.vnp_SecureHash || '').toLowerCase()
  const expect = hmac('sha512', secret, vnpEncode(params))
  if (!sig || sig.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null
  return {
    code: codeFromRef(params.vnp_TxnRef),
    amount: Math.round(Number(params.vnp_Amount) / 100),
    ok: params.vnp_ResponseCode === '00' && (params.vnp_TransactionStatus ?? '00') === '00',
    ref: params.vnp_TransactionNo || '',
  }
}

// ------------------------------------------------------------ MoMo (API v2, captureWallet)
export function momoCreateBody({ code, amount, redirectUrl, ipnUrl, partnerCode = env('MOMO_PARTNER_CODE'), accessKey = env('MOMO_ACCESS_KEY'), secret = env('MOMO_SECRET_KEY') }) {
  const orderId = txnRef(code)
  const b = { partnerCode, requestId: orderId, amount: Math.round(amount), orderId, orderInfo: `Thanh toan don hang ${code}`, redirectUrl, ipnUrl, requestType: 'captureWallet', extraData: '', lang: 'vi' }
  const raw = `accessKey=${accessKey}&amount=${b.amount}&extraData=${b.extraData}&ipnUrl=${b.ipnUrl}&orderId=${b.orderId}&orderInfo=${b.orderInfo}&partnerCode=${b.partnerCode}&redirectUrl=${b.redirectUrl}&requestId=${b.requestId}&requestType=${b.requestType}`
  return { ...b, signature: hmac('sha256', secret, raw) }
}

export function momoVerify(d, accessKey = env('MOMO_ACCESS_KEY'), secret = env('MOMO_SECRET_KEY')) {
  const raw = `accessKey=${accessKey}&amount=${d.amount}&extraData=${d.extraData ?? ''}&message=${d.message}&orderId=${d.orderId}&orderInfo=${d.orderInfo}&orderType=${d.orderType}&partnerCode=${d.partnerCode}&payType=${d.payType}&requestId=${d.requestId}&responseTime=${d.responseTime}&resultCode=${d.resultCode}&transId=${d.transId}`
  const expect = hmac('sha256', secret, raw)
  const sig = String(d.signature || '')
  if (sig.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null
  return { code: codeFromRef(d.orderId), amount: Math.round(Number(d.amount)), ok: String(d.resultCode) === '0', ref: String(d.transId || '') }
}

export function siteUrl(req) {
  if (env('SITE_URL')) return env('SITE_URL').replace(/\/$/, '')
  return `https://${req.headers['x-forwarded-host'] || req.headers.host}`
}
export function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || '127.0.0.1'
}
