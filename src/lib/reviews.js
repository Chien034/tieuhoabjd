// Lượt mua và đánh giá.
// Lượt mua hiển thị (products.sold) = số đã bán thật từ đơn "Đã giao" (sold_real) + số shop tự cộng thêm (sold_bonus).
// Đánh giá: khách chỉ viết được cho lần mua đã giao (mỗi đơn một đánh giá / sản phẩm); shop tự tạo được đánh giá (by_shop).
// Trên Supabase máy chủ tự tính các số này (supabase/danh-gia-luot-mua.sql); các hàm dưới đây dùng cho giao diện và bản demo.

export const SOLD_STATUS = 'da_giao'
export const MAX_REVIEW_IMAGES = { customer: 3, shop: 6 }

const int = v => Math.max(0, Math.round((typeof v === 'number' ? v : Number(String(v ?? '').replace(/\D/g, ''))) || 0)) // bỏ dấu chấm nghìn
export const soldBonus = v => Math.min(10_000_000, int(v))

// Số đã bán thật theo sản phẩm, từ danh sách đơn
export function soldFromOrders(orders) {
  const m = {}
  for (const o of orders || []) {
    if (o.status !== SOLD_STATUS) continue
    for (const i of o.items || []) if (i.product_id) m[i.product_id] = (m[i.product_id] || 0) + i.qty
  }
  return m
}

// Tóm tắt: số đánh giá, điểm trung bình (1 số lẻ, 0 khi chưa có), tỉ lệ % theo từng mức sao
export function reviewSummary(list) {
  const count = list?.length || 0
  const by = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  for (const r of list || []) if (by[r.rating] !== undefined) by[r.rating]++
  const avg = count ? Math.round((list.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0
  const pct = Object.fromEntries(Object.entries(by).map(([k, n]) => [k, count ? Math.round((n / count) * 100) : 0]))
  return { count, avg, by, pct }
}

// Gắn lượt mua + điểm đánh giá vào sản phẩm (bản demo; Supabase tự làm bằng trigger)
export function withCounters(p, soldReal, reviews) {
  const real = soldReal[p.id] || 0
  const bonus = soldBonus(p.sold_bonus)
  const s = reviewSummary(reviews.filter(r => r.product_id === p.id))
  return { ...p, sold_real: real, sold_bonus: bonus, sold: real + bonus, rating: s.avg, review_count: s.count }
}

// Các lần mua (đơn đã giao) của khách có sản phẩm này, kèm đánh giá đã viết nếu có
export function reviewSlots(orders, reviews, userId, productId) {
  return (orders || [])
    .filter(o => o.user_id === userId && o.status === SOLD_STATUS && (o.items || []).some(i => i.product_id === productId))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map(o => ({ order_id: o.id, code: o.code, delivered_at: o.updated_at, review_id: reviews.find(r => r.order_id === o.id && r.product_id === productId)?.id || null }))
}

export const EMPTY_REVIEW = { product_id: '', name: '', rating: 5, content: '', images: [], created_at: '' }

// Làm sạch + kiểm tra đánh giá. shop = true: đánh giá quản trị tự tạo (có nickname, ngày)
export function normalizeReview(r, { shop } = {}) {
  const out = {
    product_id: String(r.product_id || ''),
    rating: Math.min(5, Math.max(1, Math.round(Number(r.rating) || 0))),
    content: String(r.content || '').trim().slice(0, 1000),
    images: (Array.isArray(r.images) ? r.images : []).filter(Boolean).slice(0, MAX_REVIEW_IMAGES[shop ? 'shop' : 'customer']),
  }
  if (shop) {
    out.name = String(r.name || '').trim().slice(0, 60)
    if (r.created_at) out.created_at = new Date(r.created_at).toISOString()
  }
  return out
}

export function reviewError(r, { shop } = {}) {
  if (!r.product_id) return 'Chọn sản phẩm'
  if (!(r.rating >= 1 && r.rating <= 5)) return 'Vui lòng chọn từ 1 đến 5 sao'
  if (shop && !r.name) return 'Nhập nickname người đánh giá'
  if (r.content.length < (shop ? 1 : 5)) return shop ? 'Nhập nội dung đánh giá' : 'Vui lòng viết ít nhất vài chữ'
  if (r.created_at && Number.isNaN(Date.parse(r.created_at))) return 'Ngày đánh giá không hợp lệ'
  return ''
}

export const fmtSold = n => (n > 999 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(n))
