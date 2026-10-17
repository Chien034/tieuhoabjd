// Biến thể sản phẩm (vd "Bản thường", "Kèm tóc + mắt", "Size 1/6") và video sản phẩm.
// Biến thể lưu trong products.variants: [{ id, name, price, compare_price, stock, image }].
// Sản phẩm có biến thể: price = giá thấp nhất ("Giá từ …"), stock = tổng tồn các biến thể.

export const hasVariants = p => Array.isArray(p?.variants) && p.variants.length > 0
export const variantOf = (p, vid) => (hasVariants(p) ? p.variants.find(v => v.id === vid) || null : null)
export const unitPrice = (p, vid) => variantOf(p, vid)?.price ?? p.price
export const unitStock = (p, vid) => {
  const v = variantOf(p, vid)
  return v && p.stock_type !== 'order' ? v.stock : p.stock
}

export function priceRange(p) {
  if (!hasVariants(p)) return { min: p.price, max: p.price }
  const a = p.variants.map(v => v.price)
  return { min: Math.min(...a), max: Math.max(...a) }
}

const newId = () => 'v' + Math.random().toString(36).slice(2, 8)
const int = v => (typeof v === 'number' ? Math.max(0, Math.round(v)) : Number(String(v ?? '').replace(/\D/g, '')) || 0) // giá, tồn: số nguyên, bỏ dấu chấm nghìn

// Làm sạch danh sách biến thể nhập từ trang quản trị / CSV; bỏ dòng trống tên
export function normalizeVariants(list) {
  const seen = new Set()
  return (Array.isArray(list) ? list : [])
    .map(v => ({
      id: String(v.id || '').trim() || newId(),
      name: String(v.name || '').trim().slice(0, 80),
      price: int(v.price),
      compare_price: int(v.compare_price) || null,
      stock: int(v.stock),
      image: /^(https:\/\/|data:image\/)/.test(v.image || '') ? v.image : '',
    }))
    .filter(v => v.name)
    .map(v => { while (seen.has(v.id)) v.id = newId(); seen.add(v.id); return v })
}

export function variantErrors(list) {
  const err = []
  const names = new Set()
  for (const v of list) {
    if (!(v.price > 0)) err.push(`Biến thể "${v.name}" cần giá bán > 0`)
    if (v.compare_price && v.compare_price <= v.price) err.push(`Biến thể "${v.name}": giá gốc phải lớn hơn giá bán (hoặc để trống)`)
    const k = v.name.toLowerCase()
    if (names.has(k)) err.push(`Biến thể "${v.name}" bị trùng tên`)
    names.add(k)
  }
  return err
}

// Gắn biến thể vào sản phẩm: giá đại diện = biến thể rẻ nhất, tồn = tổng tồn
export function applyVariants(p, list = p.variants) {
  const variants = normalizeVariants(list)
  if (!variants.length) return { ...p, variants: [] }
  const cheap = variants.reduce((a, b) => (b.price < a.price ? b : a))
  return {
    ...p, variants, price: cheap.price,
    compare_price: cheap.compare_price && cheap.compare_price > cheap.price ? cheap.compare_price : null,
    stock: p.stock_type === 'order' ? Math.max(p.stock || 0, 99) : variants.reduce((s, v) => s + v.stock, 0),
  }
}

// CSV cột bien_the: "Tên:giá[:tồn] | Tên 2:giá[:tồn]"  (giá theo đồng, vd 2.500.000)
export function parseVariantCell(cell, num) {
  const out = [], err = []
  for (const part of String(cell || '').split('|').map(s => s.trim()).filter(Boolean)) {
    const bits = part.split(':')
    // tên có thể chứa ':' → giá và tồn là 1–2 đoạn cuối là số
    const isNum = s => /^\s*[\d.,]+\s*$/.test(s)
    let stock = '', price = '', name
    if (bits.length >= 3 && isNum(bits.at(-1)) && isNum(bits.at(-2))) { stock = bits.pop(); price = bits.pop() }
    else if (bits.length >= 2 && isNum(bits.at(-1))) price = bits.pop()
    name = bits.join(':').trim()
    const pr = num(price, true)
    if (!name || !(pr > 0)) { err.push(`biến thể "${part}" cần dạng Tên:giá`); continue }
    out.push({ name, price: pr, stock: stock === '' ? null : num(stock) })
  }
  return { variants: out, errors: err }
}

// ---------------------------------------------------------------- VIDEO
export const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
export const VIDEO_MAX_MB = 50

export function youtubeId(url) {
  const m = String(url || '').match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/)
  return m ? m[1] : null
}
export const isVideoLink = url => /^https:\/\//.test(String(url || '').trim())

export function videoFileError(file) {
  if (!VIDEO_TYPES.includes(file.type) && !/\.(mp4|webm|mov)$/i.test(file.name)) return `${file.name}: chỉ nhận video MP4, WEBM, MOV`
  if (file.size > VIDEO_MAX_MB * 1024 * 1024) return `${file.name}: video tối đa ${VIDEO_MAX_MB} MB (file này ${(file.size / 1048576).toFixed(1)} MB)`
  return ''
}

// Ảnh đại diện cho dòng giỏ / đơn: ưu tiên ảnh riêng của biến thể
export const withVariantImage = (p, v) => (v?.image ? { ...p, images: [v.image] } : p)
export const lineLabel = l => [l.variantObj?.name || l.variant_name, l.size && `Size ${l.size}`].filter(Boolean).join(' · ')
// Dòng giỏ chưa chọn đủ size / biến thể
export const lineNeedsChoice = l => (hasVariants(l.product) && !l.variantObj) || (l.product.sizes?.length > 0 && !l.size)
