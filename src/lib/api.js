// Lớp dữ liệu chung. Có Supabase (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY) thì dùng Supabase,
// không thì chạy CHẾ ĐỘ DEMO: mọi thứ lưu trong localStorage của trình duyệt, thanh toán giả lập.
import { createClient } from '@supabase/supabase-js'
import { PRODUCTS, STORES, COUPONS } from './data.js'
import { computeTotals, amountDue, applyPayment } from './pricing.js'
import { DEFAULT_IMPORT } from './importCost.js'
import { resizeImage, blobToDataUrl } from './images.js'
import { normalizeInfo, normalizeStore, storeError } from './shopInfo.js'
import { EMPTY_COUPON, normalizeCoupon, couponError, couponStatus, customerUses, normCode } from './coupons.js'
import { variantOf, videoFileError } from './variants.js'
import { withCounters, soldFromOrders, reviewSlots, normalizeReview, reviewError, soldBonus } from './reviews.js'

const URL_ = import.meta.env.VITE_SUPABASE_URL
const KEY_ = import.meta.env.VITE_SUPABASE_ANON_KEY
export const DEMO = !(URL_ && KEY_)
export const supabase = DEMO ? null : createClient(URL_, KEY_)

const listeners = new Set()
export function onAuthChange(fn) { listeners.add(fn); return () => listeners.delete(fn) }
const emit = u => listeners.forEach(fn => fn(u))

// ---------------------------------------------------------------- DEMO
const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* bộ nhớ đầy / bị chặn */ } },
}
async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('')
}
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random())
const newCode = () => {
  const d = new Date()
  return 'HK' + String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') +
    String(Math.floor(Math.random() * 1e5)).padStart(5, '0')
}
const normEmail = e => String(e || '').trim().toLowerCase()

async function demoUsers() {
  let users = ls.get('hk_users', null)
  if (!users) {
    users = [{ id: 'admin', email: 'admin@tieuhoa.vn', full_name: 'Quản trị Tiểu Hoa', phone: '0900000000', role: 'admin', pw: await sha('admin123'), created_at: new Date().toISOString() }]
    ls.set('hk_users', users)
  }
  return users
}
const publicUser = u => (u ? { id: u.id, email: u.email, full_name: u.full_name, phone: u.phone, role: u.role, birthday: u.birthday || '', gender: u.gender || '' } : null)
const demoProducts = () => ls.get('hk_products', null) || PRODUCTS
// Khách không thấy giá nhập: bỏ trường cost khỏi dữ liệu công khai
const publicProduct = ({ cost, ...p }) => p
// Trừ (sign = -1) / hoàn (sign = 1) kho theo dòng đơn; hàng đặt trước không trừ kho.
// Lượt bán không lưu ở đây: tính từ đơn "Đã giao" + số shop cộng thêm (withCounters)
function demoStock(p, items, sign) {
  const mine = items.filter(i => i.product_id === p.id)
  const q = mine.reduce((s, i) => s + i.qty, 0)
  if (!q || p.stock_type === 'order') return p
  const variants = (p.variants || []).map(v => ({ ...v, stock: Math.max(0, v.stock + sign * mine.filter(i => i.variant_id === v.id).reduce((s, i) => s + i.qty, 0)) }))
  return { ...p, stock: Math.max(0, p.stock + sign * q), ...(p.variants ? { variants } : {}) }
}
const demoReviews = () => ls.get('hk_reviews', [])
// Hàng mẫu: số "đã bán" có sẵn coi như shop cộng thêm (giống lần đầu chạy danh-gia-luot-mua.sql)
const demoCounted = () => {
  const sold = soldFromOrders(ls.get('hk_orders', [])); const reviews = demoReviews()
  return demoProducts().map(p => withCounters({ sold_bonus: p.sold, ...p }, sold, reviews))
}
const demoStores = () => ls.get('hk_stores', null) || STORES
const demoCoupons = () => ls.get('hk_coupons', null) || COUPONS.map(c => ({ ...EMPTY_COUPON, ...c }))
const bumpCoupon = (code, d) => ls.set('hk_coupons', demoCoupons().map(c => (c.code === code ? { ...c, used: Math.max(0, c.used + d) } : c)))
const demoMe = async () => { const id = ls.get('hk_session', null); return id ? (await demoUsers()).find(u => u.id === id) || null : null }

const demo = {
  async currentUser() { return publicUser(await demoMe()) },
  async signUp({ email, password, full_name, phone }) {
    const users = await demoUsers()
    email = normEmail(email)
    if (users.some(u => u.email === email)) throw new Error('Email này đã có tài khoản')
    const u = { id: uid(), email, full_name, phone, role: 'customer', pw: await sha(password), created_at: new Date().toISOString() }
    ls.set('hk_users', [...users, u]); ls.set('hk_session', u.id)
    emit(publicUser(u)); return publicUser(u)
  },
  async signIn({ email, password }) {
    const u = (await demoUsers()).find(x => x.email === normEmail(email))
    if (!u || u.pw !== await sha(password)) throw new Error('Email hoặc mật khẩu không đúng')
    ls.set('hk_session', u.id); emit(publicUser(u)); return publicUser(u)
  },
  async signOut() { ls.set('hk_session', null); emit(null) },
  async resetPassword(email) {
    if (!(await demoUsers()).some(u => u.email === normEmail(email))) throw new Error('Không tìm thấy tài khoản với email này')
    return 'Chế độ demo: không gửi email thật. Hãy đăng ký tài khoản mới hoặc dùng tài khoản demo.'
  },
  async updateProfile(patch) {
    const me = await demoMe(); if (!me) throw new Error('Chưa đăng nhập')
    const users = (await demoUsers()).map(u => (u.id === me.id ? { ...u, full_name: patch.full_name, phone: patch.phone, birthday: patch.birthday, gender: patch.gender } : u))
    ls.set('hk_users', users); const nu = publicUser(users.find(u => u.id === me.id)); emit(nu); return nu
  },
  async changePassword(oldPw, newPw) {
    const me = await demoMe(); if (!me) throw new Error('Chưa đăng nhập')
    if (me.pw !== await sha(oldPw)) throw new Error('Mật khẩu hiện tại không đúng')
    const pw = await sha(newPw)
    ls.set('hk_users', (await demoUsers()).map(u => (u.id === me.id ? { ...u, pw } : u)))
  },

  async products({ includeInactive } = {}) { return demoCounted().filter(p => includeInactive || p.active !== false).map(publicProduct) },
  async stores() { return demoStores() },
  async shopInfo() { return normalizeInfo(ls.get('hk_shop_info', {})) },
  async coupon(code) {
    const c = demoCoupons().find(x => x.code === normCode(code))
    if (!c || !couponStatus(c).ok) throw new Error('Mã giảm giá không hợp lệ hoặc đã hết hạn')
    const me = await demoMe()
    if (me && c.per_customer_limit && customerUses(ls.get('hk_orders', []), c.code, { user_id: me.id }) >= c.per_customer_limit) throw new Error('Mã giảm giá không hợp lệ hoặc đã hết hạn')
    return c
  },

  async placeOrder(input) {
    const me = await demoMe()
    const products = demoProducts()
    const items = input.items.map(it => {
      const p = products.find(x => x.id === it.product_id)
      if (!p || p.active === false) throw new Error('Có sản phẩm đã ngừng bán, vui lòng kiểm tra lại giỏ hàng')
      if (p.sizes?.length && !p.sizes.includes(it.size)) throw new Error(`Vui lòng chọn size cho ${p.name}`)
      if (it.qty < 1 || it.qty > 10) throw new Error('Số lượng không hợp lệ')
      const v = variantOf(p, it.variant_id)
      if (p.variants?.length && !v) throw new Error(`Vui lòng chọn loại cho ${p.name}`)
      const price = v ? v.price : p.price
      return { product_id: p.id, sku: p.sku, name: p.name, size: p.sizes?.length ? it.size || '' : '', variant_id: v?.id || '', variant: v?.name || '', price, qty: it.qty, line_total: price * it.qty, preorder: p.stock_type === 'order' }
    })
    if (!items.length) throw new Error('Giỏ hàng trống')
    for (const p of products) {
      if (p.stock_type === 'order') continue
      const mine = items.filter(i => i.product_id === p.id)
      const need = mine.reduce((s, i) => s + i.qty, 0)
      if (need > p.stock) throw new Error(`${p.name} chỉ còn ${p.stock} sản phẩm`)
      for (const v of p.variants || []) {
        const nv = mine.filter(i => i.variant_id === v.id).reduce((s, i) => s + i.qty, 0)
        if (nv > v.stock) throw new Error(`${p.name} (${v.name}) chỉ còn ${v.stock} sản phẩm`)
      }
    }
    const coupon = input.coupon_code ? await demo.coupon(input.coupon_code) : null
    const subtotal = items.reduce((s, i) => s + i.line_total, 0)
    const preorder = items.some(i => i.preorder)
    if (preorder && input.payment_method === 'cod') throw new Error('Đơn có hàng đặt trước cần đặt cọc — vui lòng chọn chuyển khoản, VNPay hoặc MoMo')
    const t = computeTotals({ subtotal, delivery: input.delivery, coupon, preorder, fees: await demo.shopInfo(), depositChoice: input.deposit != null ? { amount: input.deposit } : null })
    if (t.couponError) throw new Error(t.couponError)
    if (t.depositError) throw new Error(t.depositError)
    if (coupon?.per_customer_limit && customerUses(ls.get('hk_orders', []), coupon.code, { phone: input.phone, user_id: me?.id }) >= coupon.per_customer_limit) {
      throw new Error(`Bạn đã dùng hết lượt của mã ${coupon.code} (mỗi khách ${coupon.per_customer_limit} lần)`)
    }
    if (coupon) bumpCoupon(coupon.code, 1)
    ls.set('hk_products', products.map(p => demoStock(p, items, -1)))
    const now = new Date().toISOString()
    const order = {
      id: uid(), code: newCode(), user_id: me?.id || null,
      email: normEmail(input.email), full_name: input.full_name, phone: input.phone,
      delivery: input.delivery, address: input.address || '', store_id: input.store_id || null,
      note: input.note || '', gift_wrap: !!input.gift_wrap, invoice: input.invoice || null,
      subtotal, discount: t.discount, shipping_fee: t.shipping, total: t.total, deposit: t.deposit, paid_amount: 0,
      coupon_code: coupon?.code || null, payment_method: input.payment_method,
      payment_status: 'chua_thanh_toan', status: 'cho_xac_nhan', created_at: now, updated_at: now,
      items, events: [{ status: 'cho_xac_nhan', note: 'Đặt hàng thành công', created_at: now }],
    }
    ls.set('hk_orders', [order, ...ls.get('hk_orders', [])])
    return order
  },
  async order(code, phone) {
    const me = await demoMe()
    const o = ls.get('hk_orders', []).find(x => x.code === String(code).trim().toUpperCase())
    if (!o) return null
    const ok = (me && (me.role === 'admin' || o.user_id === me.id)) || (phone && o.phone.replace(/\D/g, '') === String(phone).replace(/\D/g, ''))
    return ok ? o : null
  },
  async myOrders() { const me = await demoMe(); return me ? ls.get('hk_orders', []).filter(o => o.user_id === me.id) : [] },
  async cancelOrder(code, reason) {
    const me = await demoMe(); const orders = ls.get('hk_orders', [])
    const o = orders.find(x => x.code === code)
    if (!o || !me || (o.user_id !== me.id && me.role !== 'admin')) throw new Error('Không tìm thấy đơn hàng')
    if (o.status !== 'cho_xac_nhan' || o.payment_status === 'da_thanh_toan') throw new Error('Đơn đã được xác nhận hoặc đã thanh toán, vui lòng gọi hotline để hủy')
    return demo._setStatus(o.id, { status: 'da_huy' }, reason || 'Khách hủy đơn')
  },
  async _setStatus(id, patch, note) {
    const orders = ls.get('hk_orders', [])
    const o = orders.find(x => x.id === id)
    const now = new Date().toISOString()
    const ev = []
    if (patch.status && patch.status !== o.status) {
      ev.push({ status: patch.status, note: note || '', created_at: now })
      if (patch.status === 'da_huy') {
        if (o.coupon_code) bumpCoupon(o.coupon_code, -1)
        ls.set('hk_products', demoProducts().map(p => demoStock(p, o.items, 1)))
      }
    }
    if (patch.payment_status && patch.payment_status !== o.payment_status) {
      // Quản trị bấm "Đã nhận cọc / Đã nhận đủ tiền": số đã trả cập nhật theo (giống trigger order_changed)
      if (patch.payment_status === 'da_coc') patch.paid_amount = Math.max(o.paid_amount || 0, o.deposit)
      if (patch.payment_status === 'da_thanh_toan') patch.paid_amount = Math.max(o.paid_amount || 0, o.total)
      ev.push({ status: 'thanh_toan', note: note || ({ da_coc: 'Đã nhận tiền cọc', da_thanh_toan: 'Đã nhận đủ tiền', hoan_tien: 'Đã hoàn tiền' }[patch.payment_status] || 'Cập nhật thanh toán'), created_at: now })
      if (patch.payment_status === 'da_thanh_toan') patch.paid_at = now
    }
    const n = { ...o, ...patch, updated_at: now, events: [...o.events, ...ev] }
    ls.set('hk_orders', orders.map(x => (x.id === id ? n : x)))
    return n
  },

  async addresses() { const me = await demoMe(); return me ? ls.get('hk_addr_' + me.id, []) : [] },
  async saveAddress(a) {
    const me = await demoMe(); if (!me) throw new Error('Chưa đăng nhập')
    let list = ls.get('hk_addr_' + me.id, [])
    const row = { ...a, id: a.id || uid() }
    if (row.is_default || list.length === 0) { list = list.map(x => ({ ...x, is_default: false })); row.is_default = true }
    list = list.some(x => x.id === row.id) ? list.map(x => (x.id === row.id ? row : x)) : [...list, row]
    ls.set('hk_addr_' + me.id, list); return row
  },
  async deleteAddress(id) { const me = await demoMe(); ls.set('hk_addr_' + me.id, ls.get('hk_addr_' + me.id, []).filter(x => x.id !== id)) },

  async wishlist() { const me = await demoMe(); return me ? ls.get('hk_wish_' + me.id, []) : [] },
  async toggleWish(pid) {
    const me = await demoMe(); if (!me) throw new Error('LOGIN')
    const cur = ls.get('hk_wish_' + me.id, [])
    const next = cur.includes(pid) ? cur.filter(x => x !== pid) : [...cur, pid]
    ls.set('hk_wish_' + me.id, next); return next
  },

  async reviews(pid) { return demoReviews().filter(r => r.product_id === pid).sort((a, b) => b.created_at.localeCompare(a.created_at)) },
  async reviewSlots(pid) { const me = await demoMe(); return me ? reviewSlots(ls.get('hk_orders', []), demoReviews(), me.id, pid) : [] },
  // Chỉ khách có đơn đã giao chứa sản phẩm mới đánh giá được; mỗi đơn một đánh giá (gửi lại = sửa)
  async submitReview(input) {
    const me = await demoMe(); if (!me) throw new Error('LOGIN')
    const r = normalizeReview(input); const err = reviewError(r); if (err) throw new Error(err)
    if (!(await demo.reviewSlots(r.product_id)).some(x => x.order_id === input.order_id)) throw new Error('Bạn chỉ đánh giá được sản phẩm trong đơn hàng đã nhận thành công')
    const all = demoReviews()
    const old = all.find(x => x.order_id === input.order_id && x.product_id === r.product_id)
    const row = { ...old, ...r, id: old?.id || uid(), order_id: input.order_id, user_id: me.id, name: me.full_name || 'Khách hàng', by_shop: false, created_at: old?.created_at || new Date().toISOString() }
    ls.set('hk_reviews', old ? all.map(x => (x.id === old.id ? row : x)) : [row, ...all]); return row
  },
  async uploadReviewImage(file) { return blobToDataUrl(await resizeImage(file, 600, 0.8)) },

  // Thanh toán giả lập: trang /thanh-toan/gia-lap đóng vai cổng thanh toán.
  async startPayment(order) { return `/thanh-toan/gia-lap?code=${order.code}&method=${order.payment_method}` },
  async demoPaymentResult(code, ok) {
    const o = ls.get('hk_orders', []).find(x => x.code === code)
    if (!o) throw new Error('Không tìm thấy đơn')
    if (ok) return demo._pay(o, amountDue(o), o.payment_method === 'momo' ? 'MoMo' : 'VNPay', 'DEMO' + Date.now())
    return demo._setStatus(o.id, { payment_status: o.payment_status === 'da_coc' ? 'da_coc' : 'that_bai' }, 'Thanh toán thất bại (giả lập)')
  },
  // Giả lập SePay báo tiền chuyển khoản về tài khoản shop
  async demoBankTransfer(code, amount) {
    const o = ls.get('hk_orders', []).find(x => x.code === code)
    if (!o) throw new Error('Không tìm thấy đơn')
    return demo._pay(o, amount, 'chuyển khoản', 'DEMO' + Date.now())
  },
  // Cộng tiền vào đơn, tự xác nhận khi đủ cọc / đủ tiền, báo shop (giống hàm apply_payment trong CSDL)
  async _pay(o, amount, gateway, ref) {
    const r = applyPayment(o, amount)
    const now = new Date().toISOString(), money = n => n.toLocaleString('vi-VN') + ' ₫'
    const note = `Nhận ${money(amount)} qua ${gateway} (mã GD ${ref}). Đã trả ${money(r.paid_amount)} / ${money(o.total)}`
    const events = [{ status: 'thanh_toan', note, created_at: now }]
    if (r.confirmed) events.push({ status: 'da_xac_nhan', note: 'Tự động xác nhận sau khi nhận ' + (r.payment_status === 'da_coc' ? 'tiền cọc' : 'đủ tiền'), created_at: now })
    const n = { ...o, paid_amount: r.paid_amount, payment_status: r.payment_status, status: r.status, payment_ref: ref, updated_at: now, events: [...o.events, ...events],
      ...(r.payment_status === 'da_thanh_toan' && o.payment_status !== 'da_thanh_toan' ? { paid_at: now } : {}) }
    ls.set('hk_orders', ls.get('hk_orders', []).map(x => (x.id === o.id ? n : x)))
    const title = r.confirmed ? `Đơn ${o.code} đã ${r.payment_status === 'da_coc' ? 'đặt cọc' : 'thanh toán đủ'}, tự chuyển Đã xác nhận` : `Đơn ${o.code} nhận thêm ${money(amount)}`
    ls.set('hk_notices', [{ id: uid(), kind: 'thanh_toan', order_code: o.code, title, body: `${o.full_name} · ${o.phone} — ${note}`, seen: false, created_at: now }, ...ls.get('hk_notices', [])].slice(0, 200))
    window.dispatchEvent(new Event('hk-notices'))
    return n
  },
  async verifyReturn() { return null },

  admin: {
    async orders() { return ls.get('hk_orders', []) },
    async notices() { return ls.get('hk_notices', []).slice(0, 50) },
    async markNoticesSeen() { ls.set('hk_notices', ls.get('hk_notices', []).map(x => ({ ...x, seen: true }))); window.dispatchEvent(new Event('hk-notices')) },
    subscribeNotices(cb) {
      const f = e => { if (!e.key || e.key === 'hk_notices') cb() }
      window.addEventListener('storage', f); window.addEventListener('hk-notices', f)
      return () => { window.removeEventListener('storage', f); window.removeEventListener('hk-notices', f) }
    },
    async updateOrder(id, patch, note) { return demo._setStatus(id, patch, note) },
    async importSettings() { return { ...DEFAULT_IMPORT, ...ls.get('hk_import', {}) } },
    async saveImportSettings(s) { ls.set('hk_import', s) },
    async saveShopInfo(info) { const n = normalizeInfo(info); ls.set('hk_shop_info', n); return n },
    async saveStore(s) {
      const row = normalizeStore(s); const err = storeError(row); if (err) throw new Error(err)
      const list = demoStores()
      if (!row.id) row.id = Math.max(0, ...list.map(x => x.id)) + 1
      ls.set('hk_stores', list.some(x => x.id === row.id) ? list.map(x => (x.id === row.id ? row : x)) : [...list, row])
      return row
    },
    async coupons() { return demoCoupons() },
    async saveCoupon(c, isNew) {
      const row = normalizeCoupon(c); const err = couponError(row); if (err) throw new Error(err)
      const list = demoCoupons()
      if (isNew && list.some(x => x.code === row.code)) throw new Error(`Mã ${row.code} đã có`)
      const old = list.find(x => x.code === row.code)
      const saved = { ...row, used: old?.used || 0, created_at: old?.created_at || new Date().toISOString() }
      ls.set('hk_coupons', old ? list.map(x => (x.code === row.code ? saved : x)) : [saved, ...list])
      return saved
    },
    async deleteCoupon(code) { ls.set('hk_coupons', demoCoupons().filter(x => x.code !== code)) },
    async deleteStore(id) {
      if (ls.get('hk_orders', []).some(o => o.store_id === id)) throw new Error('Showroom này đã có đơn nhận tại cửa hàng nên không xóa được. Hãy sửa thông tin thay vì xóa.')
      ls.set('hk_stores', demoStores().filter(x => x.id !== id))
    },
    async costs() { return Object.fromEntries(demoProducts().map(p => [p.id, p.cost || {}])) },
    async saveProduct(p) {
      const list = demoProducts()
      const row = { ...p, sold_bonus: soldBonus(p.sold_bonus ?? p.sold), id: p.id || 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }
      ls.set('hk_products', list.some(x => x.id === row.id) ? list.map(x => (x.id === row.id ? row : x)) : [row, ...list])
      return row
    },
    async deleteProduct(id) { ls.set('hk_products', demoProducts().map(p => (p.id === id ? { ...p, active: false } : p))) },
    async customers() { return (await demoUsers()).map(publicUser) },
    async reviews() { return demoReviews().sort((a, b) => b.created_at.localeCompare(a.created_at)) },
    async saveReview(input) {
      const r = normalizeReview(input, { shop: true }); const err = reviewError(r, { shop: true }); if (err) throw new Error(err)
      const all = demoReviews(); const old = input.id && all.find(x => x.id === input.id)
      if (old && !old.by_shop) throw new Error('Không sửa được đánh giá của khách, chỉ xóa được')
      const row = { ...r, id: old?.id || uid(), user_id: null, order_id: null, by_shop: true, created_at: r.created_at || old?.created_at || new Date().toISOString() }
      ls.set('hk_reviews', old ? all.map(x => (x.id === old.id ? row : x)) : [row, ...all]); return row
    },
    async deleteReview(id) { ls.set('hk_reviews', demoReviews().filter(x => x.id !== id)) },
    // Demo: ảnh lưu thẳng trong trình duyệt (nhỏ hơn để vừa bộ nhớ ~5 MB)
    async uploadImage(file) { return blobToDataUrl(await resizeImage(file, 700, 0.8)) },
    async uploadLogo(file) { return blobToDataUrl(await resizeImage(file, 300, 0.9, { png: true })) },
    async uploadVideo() { throw new Error('Chế độ demo không lưu được file video — hãy dán link video (YouTube hoặc https://…mp4)') },
    async backup() {
      return { exported_at: new Date().toISOString(), mode: 'demo', products: demoProducts(), orders: ls.get('hk_orders', []), customers: (await demoUsers()).map(publicUser), import_settings: { ...DEFAULT_IMPORT, ...ls.get('hk_import', {}) }, shop_info: await demo.shopInfo(), stores: demoStores(), coupons: demoCoupons() }
    },
    async resetDemo() { ['hk_products', 'hk_orders', 'hk_reviews', 'hk_import', 'hk_shop_info', 'hk_stores', 'hk_coupons', 'hk_notices'].forEach(k => localStorage.removeItem(k)) },
  },
}

// ---------------------------------------------------------------- SUPABASE
const must = ({ data, error }) => { if (error) throw new Error(viError(error.message)); return data }
function viError(m) {
  if (/Invalid login credentials/i.test(m)) return 'Email hoặc mật khẩu không đúng'
  if (/already registered|already been registered/i.test(m)) return 'Email này đã có tài khoản'
  if (/Email not confirmed/i.test(m)) return 'Email chưa được xác nhận — vui lòng mở hộp thư để kích hoạt tài khoản'
  if (/Password should be/i.test(m)) return 'Mật khẩu tối thiểu 6 ký tự'
  return m
}
async function sbProfile(user) {
  if (!user) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  return { id: user.id, email: user.email, full_name: data?.full_name || user.user_metadata?.full_name || '', phone: data?.phone || '', role: data?.role || 'customer', birthday: data?.birthday || '', gender: data?.gender || '' }
}
if (!DEMO) {
  supabase.auth.onAuthStateChange((_e, s) => { setTimeout(async () => emit(await sbProfile(s?.user)), 0) })
}
const ORDER_SELECT = '*, items:order_items(*), events:order_events(status, note, created_at)'
const SQL_REVIEWS = 'CSDL chưa bật lượt mua / đánh giá mới — hãy chạy file supabase/danh-gia-luot-mua.sql trong Supabase SQL Editor'
const sqlMissing = r => (r.error && /review_slots|submit_review|sold_bonus|by_shop|danh-gia|schema cache/i.test(r.error.message) ? { error: { message: SQL_REVIEWS } } : r)
const sortEvents = o => (o ? { ...o, events: [...(o.events || [])].sort((a, b) => a.created_at.localeCompare(b.created_at)) } : o)
async function postJSON(url, body) {
  const { data: s } = await supabase.auth.getSession()
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(s.session ? { Authorization: 'Bearer ' + s.session.access_token } : {}) }, body: JSON.stringify(body) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'Không kết nối được cổng thanh toán')
  return j
}

const sb = {
  async currentUser() { const { data } = await supabase.auth.getUser(); return sbProfile(data.user) },
  async signUp({ email, password, full_name, phone }) {
    const data = must(await supabase.auth.signUp({ email: normEmail(email), password, options: { data: { full_name, phone }, emailRedirectTo: location.origin + '/tai-khoan' } }))
    if (!data.session) return { needConfirm: true }
    return sbProfile(data.user)
  },
  async signIn({ email, password }) { const d = must(await supabase.auth.signInWithPassword({ email: normEmail(email), password })); return sbProfile(d.user) },
  async signOut() { await supabase.auth.signOut() },
  async resetPassword(email) {
    must(await supabase.auth.resetPasswordForEmail(normEmail(email), { redirectTo: location.origin + '/tai-khoan/doi-mat-khau' }))
    return 'Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư (cả mục Spam).'
  },
  async updateProfile(patch) {
    const { data } = await supabase.auth.getUser()
    must(await supabase.from('profiles').update({ full_name: patch.full_name, phone: patch.phone, birthday: patch.birthday || null, gender: patch.gender || null }).eq('id', data.user.id))
    const u = await sbProfile(data.user); emit(u); return u
  },
  async changePassword(_old, newPw) { must(await supabase.auth.updateUser({ password: newPw })) },

  async products({ includeInactive } = {}) {
    let q = supabase.from('products').select('*').order('created_at', { ascending: false })
    if (!includeInactive) q = q.eq('active', true)
    return must(await q)
  },
  async stores() { return must(await supabase.from('stores').select('*').order('id')) },
  // Bảng shop_info chưa tạo (chưa chạy SQL cài đặt) thì dùng giá trị dự phòng, web vẫn chạy
  async shopInfo() {
    const [a, b] = await Promise.all([
      supabase.from('shop_info').select('data').eq('id', 1).maybeSingle(),
      supabase.from('settings').select('shipping_fee, free_ship_from').eq('id', 1).maybeSingle(),
    ])
    return normalizeInfo({ ...(a.data?.data || {}), ...(b.data || {}) })
  },
  async coupon(code) {
    const rows = must(await supabase.rpc('check_coupon', { p_code: String(code || '').trim().toUpperCase() }))
    if (!rows?.length) throw new Error('Mã giảm giá không hợp lệ hoặc đã hết hạn')
    return rows[0]
  },
  async placeOrder(input) {
    const code = must(await supabase.rpc('place_order', { p: input }))
    return { ...(await sb.order(code, input.phone)), _phone: input.phone }
  },
  async order(code, phone) {
    const o = must(await supabase.rpc('track_order', { p_code: String(code).trim().toUpperCase(), p_phone: phone || '' }))
    return sortEvents(o)
  },
  async myOrders() { return must(await supabase.from('orders').select(ORDER_SELECT).order('created_at', { ascending: false })).map(sortEvents) },
  async cancelOrder(code, reason) { must(await supabase.rpc('cancel_my_order', { p_code: code, p_reason: reason || 'Khách hủy đơn' })) },

  async addresses() { return must(await supabase.from('addresses').select('*').order('created_at')) },
  async saveAddress(a) {
    const { data: u } = await supabase.auth.getUser()
    const row = { ...a, user_id: u.user.id }
    if (!row.id) delete row.id
    if (row.is_default) must(await supabase.from('addresses').update({ is_default: false }).eq('user_id', u.user.id))
    return must(await supabase.from('addresses').upsert(row).select().single())
  },
  async deleteAddress(id) { must(await supabase.from('addresses').delete().eq('id', id)) },

  async wishlist() { return must(await supabase.from('wishlist').select('product_id')).map(r => r.product_id) },
  async toggleWish(pid) {
    const { data: u } = await supabase.auth.getUser(); if (!u.user) throw new Error('LOGIN')
    const cur = await sb.wishlist()
    if (cur.includes(pid)) must(await supabase.from('wishlist').delete().eq('product_id', pid))
    else must(await supabase.from('wishlist').insert({ product_id: pid, user_id: u.user.id }))
    return sb.wishlist()
  },

  async reviews(pid) { return must(await supabase.from('reviews').select('*').eq('product_id', pid).order('created_at', { ascending: false })) },
  async reviewSlots(pid) {
    const { data: u } = await supabase.auth.getUser(); if (!u.user) return []
    return must(await supabase.rpc('review_slots', { p_product: pid }).then(sqlMissing))
  },
  // Máy chủ (submit_review) kiểm tra khách đã nhận đơn có sản phẩm này; mỗi đơn một đánh giá, gửi lại = sửa
  async submitReview(input) {
    const r = normalizeReview(input); const err = reviewError(r); if (err) throw new Error(err)
    return must(await supabase.rpc('submit_review', { p_product: r.product_id, p_order: input.order_id, p_rating: r.rating, p_content: r.content, p_images: r.images }).then(sqlMissing))
  },
  // Ảnh đánh giá: bucket 'danh-gia', khách lưu trong thư mục <mã tài khoản>/, quản trị trong shop/
  async uploadReviewImage(file) {
    const { data: u } = await supabase.auth.getUser(); if (!u.user) throw new Error('LOGIN')
    const me = await sbProfile(u.user)
    const blob = await resizeImage(file, 1000, 0.82)
    const path = `${me.role === 'admin' ? 'shop' : u.user.id}/${uid()}.jpg`
    const r = await supabase.storage.from('danh-gia').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
    if (r.error && /bucket not found/i.test(r.error.message)) throw new Error(SQL_REVIEWS)
    must(r)
    return supabase.storage.from('danh-gia').getPublicUrl(path).data.publicUrl
  },

  async startPayment(order) {
    const j = await postJSON('/api/pay', { code: order.code, phone: order.phone })
    return j.url
  },
  async verifyReturn(search) {
    const r = await fetch('/api/pay-return' + search)
    return r.ok ? r.json() : null
  },

  admin: {
    async orders({ all } = {}) {
      if (!all) return must(await supabase.from('orders').select(ORDER_SELECT).order('created_at', { ascending: false }).limit(500)).map(sortEvents)
      const out = [] // sao lưu: lấy hết theo trang 1000 đơn
      for (let from = 0; ; from += 1000) {
        const page = must(await supabase.from('orders').select(ORDER_SELECT).order('created_at').range(from, from + 999))
        out.push(...page.map(sortEvents))
        if (page.length < 1000) return out
      }
    },
    // Thông báo tiền về / đơn tự xác nhận (bảng shop_notices, tạo bằng supabase/coc-tu-xac-nhan.sql)
    async notices() {
      const r = await supabase.from('shop_notices').select('*').order('created_at', { ascending: false }).limit(50)
      return r.error ? [] : r.data
    },
    async markNoticesSeen() { await supabase.from('shop_notices').update({ seen: true }).eq('seen', false) },
    subscribeNotices(cb) {
      const ch = supabase.channel('notices-' + Math.random().toString(36).slice(2))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'shop_notices' }, () => cb(true))
        .subscribe()
      return () => { supabase.removeChannel(ch) }
    },
    async updateOrder(id, patch, note) {
      must(await supabase.rpc('admin_update_order', { p_id: id, p_status: patch.status || null, p_payment_status: patch.payment_status || null, p_note: note || '' }))
      return sortEvents(must(await supabase.from('orders').select(ORDER_SELECT).eq('id', id).single()))
    },
    async importSettings() {
      const { data } = await supabase.from('import_settings').select('data').eq('id', 1).maybeSingle()
      return { ...DEFAULT_IMPORT, ...(data?.data || {}) }
    },
    async saveImportSettings(s) { must(await supabase.from('import_settings').upsert({ id: 1, data: s })) },
    async saveShopInfo(info) {
      const { shipping_fee, free_ship_from, ...data } = normalizeInfo(info)
      const r = await supabase.from('shop_info').upsert({ id: 1, data, updated_at: new Date().toISOString() })
      if (r.error && /shop_info/.test(r.error.message)) throw new Error('Chưa có bảng shop_info — hãy chạy file supabase/cai-dat-cua-hang.sql trong Supabase SQL Editor')
      must(r)
      must(await supabase.from('settings').upsert({ id: 1, shipping_fee, free_ship_from }))
      return { ...data, shipping_fee, free_ship_from }
    },
    async saveStore(s) {
      const row = normalizeStore(s); const err = storeError(row); if (err) throw new Error(err)
      return must(await supabase.from('stores').upsert(row).select().single())
    },
    async coupons() {
      const r = await supabase.from('coupons').select('*').order('code')
      return must(r)
    },
    async saveCoupon(c, isNew) {
      const row = normalizeCoupon(c); const err = couponError(row); if (err) throw new Error(err)
      const r = isNew ? await supabase.from('coupons').insert(row).select().single()
        : await supabase.from('coupons').update(row).eq('code', row.code).select().single()
      if (r.error && /starts_at|per_customer_limit/.test(r.error.message)) throw new Error('CSDL chưa cập nhật mã giảm giá — hãy chạy file supabase/ma-giam-gia.sql trong Supabase SQL Editor')
      if (r.error && /duplicate key|coupons_pkey/.test(r.error.message)) throw new Error(`Mã ${row.code} đã có`)
      return must(r)
    },
    async deleteCoupon(code) { must(await supabase.from('coupons').delete().eq('code', code)) },
    async deleteStore(id) {
      const r = await supabase.from('stores').delete().eq('id', id)
      if (r.error && /foreign key|violates/i.test(r.error.message)) throw new Error('Showroom này đã có đơn nhận tại cửa hàng nên không xóa được. Hãy sửa thông tin thay vì xóa.')
      must(r)
    },
    async costs() {
      const rows = must(await supabase.from('product_costs').select('*'))
      return Object.fromEntries(rows.map(({ product_id, ...c }) => [product_id, c]))
    },
    async saveProduct(p) {
      // sold / sold_real / rating / review_count do máy chủ tự tính; chỉ gửi số shop cộng thêm
      const { cost, sold, sold_real, rating, review_count, ...row } = p
      if (!row.id || String(row.id).startsWith('new')) delete row.id
      if ('sold_bonus' in row) row.sold_bonus = soldBonus(row.sold_bonus)
      let r = await supabase.from('products').upsert(row).select().single()
      if (r.error && /sold_bonus/.test(r.error.message)) {
        if (row.sold_bonus) throw new Error(SQL_REVIEWS)
        delete row.sold_bonus
        r = await supabase.from('products').upsert(row).select().single()
      }
      // CSDL chưa chạy video-bien-the.sql: sản phẩm không có biến thể / video vẫn lưu được
      if (r.error && /variants|videos/.test(r.error.message) && !row.variants?.length && !row.videos?.length) {
        const { variants, videos, ...rest } = row
        r = await supabase.from('products').upsert(rest).select().single()
      }
      if (r.error && /variants|videos/.test(r.error.message)) throw new Error('CSDL chưa có cột biến thể / video — hãy chạy file supabase/video-bien-the.sql trong Supabase SQL Editor')
      const saved = must(r)
      if (cost) must(await supabase.from('product_costs').upsert({ product_id: saved.id, yuan: cost.yuan || 0, weight_kg: cost.weight_kg || 0, cn_ship_yuan: cost.cn_ship_yuan || 0, margin_pct: cost.margin_pct ?? null, source_url: cost.source_url || '' }))
      return saved
    },
    async deleteProduct(id) { must(await supabase.from('products').update({ active: false }).eq('id', id)) },
    async customers() { return must(await supabase.from('profiles').select('*').order('created_at', { ascending: false })) },
    async reviews() { return must(await supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(2000)) },
    async saveReview(input) {
      const r = normalizeReview(input, { shop: true }); const err = reviewError(r, { shop: true }); if (err) throw new Error(err)
      const q = input.id ? supabase.from('reviews').update(r).eq('id', input.id) : supabase.from('reviews').insert(r)
      return must(await q.select().single().then(sqlMissing))
    },
    async deleteReview(id) { must(await supabase.from('reviews').delete().eq('id', id)) },
    async uploadImage(file) {
      const blob = await resizeImage(file)
      const d = new Date()
      const path = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${uid()}.jpg`
      must(await supabase.storage.from('san-pham').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' }))
      return supabase.storage.from('san-pham').getPublicUrl(path).data.publicUrl
    },
    // Video lưu ở bucket riêng 'video-san-pham' (tối đa 50 MB), không nén
    async uploadVideo(file) {
      const err = videoFileError(file); if (err) throw new Error(err)
      const ext = (file.name.match(/\.(mp4|webm|mov)$/i)?.[1] || 'mp4').toLowerCase()
      const type = file.type || { mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' }[ext]
      const d = new Date()
      const path = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${uid()}.${ext}`
      const r = await supabase.storage.from('video-san-pham').upload(path, file, { contentType: type, cacheControl: '31536000' })
      if (r.error && /bucket not found/i.test(r.error.message)) throw new Error('Chưa có kho video — hãy chạy file supabase/video-bien-the.sql trong Supabase SQL Editor')
      if (r.error && /exceeded|too large|payload/i.test(r.error.message)) throw new Error(`${file.name}: video quá lớn (tối đa 50 MB)`)
      must(r)
      return supabase.storage.from('video-san-pham').getPublicUrl(path).data.publicUrl
    },
    async uploadLogo(file) {
      const blob = await resizeImage(file, 400, 0.9, { png: true })
      const path = `logo/${uid()}.png`
      must(await supabase.storage.from('san-pham').upload(path, blob, { contentType: 'image/png', cacheControl: '31536000' }))
      return supabase.storage.from('san-pham').getPublicUrl(path).data.publicUrl
    },
    async backup() {
      const [products, costs, orders, customers, settings, shop_info, stores, coupons] = await Promise.all([
        sb.products({ includeInactive: true }), sb.admin.costs(), sb.admin.orders({ all: true }), sb.admin.customers(), sb.admin.importSettings(), sb.shopInfo(), sb.stores(), sb.admin.coupons()])
      return { exported_at: new Date().toISOString(), mode: 'supabase', products: products.map(p => ({ ...p, cost: costs[p.id] || null })), orders, customers, import_settings: settings, shop_info, stores, coupons }
    },
  },
}

export const api = DEMO ? demo : sb
