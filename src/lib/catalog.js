import { CATEGORIES } from './data.js'

export const PRICE_RANGES = [
  { key: '0-300', name: 'Dưới 300.000đ', min: 0, max: 300_000 },
  { key: '300-1000', name: '300.000đ – 1 triệu', min: 300_000, max: 1_000_000 },
  { key: '1-3', name: '1 – 3 triệu', min: 1_000_000, max: 3_000_000 },
  { key: '3-6', name: '3 – 6 triệu', min: 3_000_000, max: 6_000_000 },
  { key: '6-', name: 'Trên 6 triệu', min: 6_000_000, max: Infinity },
]

export const SORTS = [
  { key: 'pho-bien', name: 'Phổ biến' },
  { key: 'moi', name: 'Mới nhất' },
  { key: 'ban-chay', name: 'Bán chạy' },
  { key: 'gia-tang', name: 'Giá thấp → cao' },
  { key: 'gia-giam', name: 'Giá cao → thấp' },
  { key: 'giam-nhieu', name: 'Giảm nhiều nhất' },
]

const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase()

// Lọc + sắp xếp danh sách sản phẩm. f: { cat, grp, q, scale[], skin[], gender[], set[], stock[], price[], collection, tag, sort }
export function filterProducts(all, f = {}) {
  const has = (arr, v) => !arr || arr.length === 0 || arr.includes(v)
  const words = norm(f.q).split(/\s+/).filter(Boolean)
  let list = all.filter(p => p.active !== false)
  if (f.cat) list = list.filter(p => p.category === f.cat)
  if (f.grp) {
    const cats = CATEGORIES.filter(c => c.grp === f.grp).map(c => c.slug)
    list = list.filter(p => cats.includes(p.category))
  }
  if (f.collection) list = list.filter(p => p.collection === f.collection)
  if (f.tag === 'sale') list = list.filter(p => p.compare_price > p.price)
  else if (f.tag) list = list.filter(p => (p.tags || []).includes(f.tag))
  // phụ kiện 'all' (dùng mọi tỉ lệ) luôn khớp khi lọc theo tỉ lệ
  list = list.filter(p => (has(f.scale, p.scale) || p.scale === 'all') && has(f.skin, p.skin) && has(f.gender, p.gender) &&
    has(f.set, p.set_type) && has(f.stock, p.stock_type))
  if (f.price?.length) {
    const ranges = PRICE_RANGES.filter(r => f.price.includes(r.key))
    list = list.filter(p => ranges.some(r => p.price >= r.min && p.price < r.max))
  }
  if (words.length) {
    list = list.filter(p => {
      const hay = norm(`${p.name} ${p.sku} ${p.category} bjd ${p.scale}`)
      return words.every(w => hay.includes(w))
    })
  }
  const pct = p => (p.compare_price ? 1 - p.price / p.compare_price : 0)
  const sorters = {
    'pho-bien': (a, b) => b.sold * b.rating - a.sold * a.rating,
    moi: (a, b) => String(b.created_at).localeCompare(String(a.created_at)),
    'ban-chay': (a, b) => b.sold - a.sold,
    'gia-tang': (a, b) => a.price - b.price,
    'gia-giam': (a, b) => b.price - a.price,
    'giam-nhieu': (a, b) => pct(b) - pct(a),
  }
  return [...list].sort(sorters[f.sort] || sorters['pho-bien'])
}

export function relatedProducts(all, p, n = 8) {
  return all
    .filter(x => x.id !== p.id && x.active !== false)
    .map(x => ({ x, s: (x.category === p.category ? 2 : 0) + (x.scale === p.scale ? 3 : 0) + (x.collection && x.collection === p.collection ? 2 : 0) + (x.kind !== p.kind ? 1 : 0) }))
    .sort((a, b) => b.s - a.s || b.x.sold - a.x.sold)
    .slice(0, n)
    .map(o => o.x)
}
