// Đọc file CSV sản phẩm từ Taobao (mẫu: docs/mau-nhap-taobao.csv) → danh sách sản phẩm + giá nhập.
import { CATEGORIES, KINDS, SKINS, slugify } from './data.js'

export const CSV_COLUMNS = ['sku', 'ten', 'danh_muc', 'ti_le', 'loai_bo', 'mau_da', 'gioi_tinh', 'tinh_trang', 'so_ngay_ve', 'gia_te', 'can_nang_kg', 'ship_noi_dia_te', 'link_taobao', 'mo_ta']

// Excel tiếng Việt "Lưu thành CSV" (không chọn UTF-8) ghi theo bảng mã Windows-1258 → đọc UTF-8 sẽ vỡ dấu
export function decodeCsv(buf) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf) } catch { return new TextDecoder('windows-1258').decode(buf) }
}

export function parseCsv(text) {
  const rows = []
  let row = [], cell = '', q = false
  text = text.replace(/^﻿/, '')
  // Dấu ngăn cột lấy theo dòng tiêu đề: Excel tiếng Việt dùng ';' (vì ',' là dấu thập phân)
  const head = text.split(/\r?\n/)[0]
  const sep = [',', ';', '\t'].sort((a, b) => head.split(b).length - head.split(a).length)[0]
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++ } else if (ch === '"') q = false; else cell += ch
    } else if (ch === '"') q = true
    else if (ch === sep) { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = '' }
    else cell += ch
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows.filter(r => r.some(c => c.trim()))
}

// Số kiểu Việt lẫn kiểu Anh: "0,15" "1.056,5" "1,056.5" "¥45". money: tiền tệ không có 3 số lẻ → "1,056" / "1.056" là nghìn
export function num(v, money = false) {
  let s = String(v ?? '').replace(/[^\d.,-]/g, '')
  const dot = s.lastIndexOf('.'), com = s.lastIndexOf(',')
  if (dot >= 0 && com >= 0) s = dot > com ? s.replace(/,/g, '') : s.replace(/\./g, '').replace(',', '.')
  else {
    const sep = dot >= 0 ? '.' : com >= 0 ? ',' : ''
    const parts = sep ? s.split(sep) : [s]
    if (parts.length > 2 || (money && parts.length === 2 && parts[1].length === 3)) s = parts.join('')
    else if (sep) s = parts.join('.')
  }
  return s === '' ? 0 : Number(s)
}

// Trả về { items: [{ product, cost, line }], errors: [chuỗi] }
export function rowsToProducts(rows) {
  if (!rows.length) return { items: [], errors: ['File trống'] }
  const head = rows[0].map(h => slugify(h).replace(/-/g, '_'))
  const miss = ['sku', 'ten', 'danh_muc', 'gia_te', 'can_nang_kg'].filter(c => !head.includes(c))
  if (miss.length) return { items: [], errors: ['Thiếu cột: ' + miss.join(', ')] }
  const items = [], errors = [], seen = new Map()
  rows.slice(1).forEach((r, k) => {
    const line = k + 2
    const g = c => (r[head.indexOf(c)] ?? '').trim()
    const cat = CATEGORIES.find(c => c.slug === g('danh_muc'))
    const err = []
    if (!g('sku')) err.push('thiếu SKU')
    if (!g('ten')) err.push('thiếu tên')
    if (!cat) err.push(`danh_muc "${g('danh_muc')}" không có (dùng: ${CATEGORIES.map(c => c.slug).join(', ')})`)
    const sku = g('sku').toUpperCase()
    if (sku && seen.has(sku)) err.push(`SKU ${sku} trùng với dòng ${seen.get(sku)}`)
    else if (sku) seen.set(sku, line)
    const yuan = num(g('gia_te'), true), kg = num(g('can_nang_kg'))
    if (!(yuan > 0)) err.push('gia_te phải > 0')
    if (!(kg > 0)) err.push('can_nang_kg phải > 0')
    const scale = g('ti_le') || '1/4'
    if (!['1/3', '1/4', '1/6', '1/8', 'all'].includes(scale)) err.push(`ti_le "${scale}" không hợp lệ`)
    const link = g('link_taobao')
    if (link && !/^https?:\/\//.test(link)) err.push('link_taobao phải bắt đầu bằng http')
    // Gõ sai (vd "co san") thì báo, không lặng lẽ lấy mặc định
    const pick = (c, ok) => { const v = g(c); if (v && !ok.includes(v)) err.push(`${c} "${v}" không hợp lệ (dùng: ${ok.join(', ')})`) }
    pick('tinh_trang', ['order', 'co-san'])
    pick('gioi_tinh', ['nu', 'nam', 'unisex'])
    if (cat?.grp === 'bup-be') { pick('loai_bo', ['fullset', 'nude']); pick('mau_da', SKINS.map(x => x.key)) }
    if (err.length) { errors.push(`Dòng ${line}: ${err.join('; ')}`); return }
    const kind = cat.grp === 'bup-be' ? 'doll' : KINDS[cat.slug]
    const order = (g('tinh_trang') || 'order') !== 'co-san'
    items.push({
      line,
      product: {
        sku, name: g('ten'), category: cat.slug, kind, scale,
        set_type: kind === 'doll' ? (g('loai_bo') === 'nude' ? 'nude' : 'fullset') : null,
        skin: kind === 'doll' ? (g('mau_da') || 'trang-hong') : null,
        gender: ['nu', 'nam', 'unisex'].includes(g('gioi_tinh')) ? g('gioi_tinh') : 'unisex',
        stock_type: order ? 'order' : 'co-san', lead_days: order ? (num(g('so_ngay_ve')) || (kind === 'doll' ? 35 : 15)) : 0,
        stock: order ? 99 : 1, description: g('mo_ta'), images: [], tags: ['moi'], active: true, sizes: [],
        rating: 5, review_count: 0, sold: 0, compare_price: null, collection: null,
      },
      cost: { yuan, weight_kg: kg, cn_ship_yuan: num(g('ship_noi_dia_te'), true) || 0, margin_pct: null, source_url: link },
    })
  })
  return { items, errors }
}
