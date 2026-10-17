// Dữ liệu mẫu của cửa hàng búp bê BJD. Dùng cho chế độ demo (không có Supabase)
// và để sinh supabase/seed.sql (scripts/seed-sql.mjs) — một nguồn duy nhất.
//
// GIÁ NHẬP (yuan) LÀ GIÁ THAM KHẢO mặt bằng Taobao (10/2026), KHÔNG phải giá một link cụ thể:
//   - Mẫu tham khảo của shop: búp bê 1/4 full set ~1.056 tệ.
//   - Hướng dẫn mua BJD (Zhihu): 4 phân nude ~1.000–2.000 tệ (DZ ~1.090), full set > 2.000;
//     tóc 6 phân 10–50, giày 3–10, quần áo 20–100; mắt 20–100 tệ.
// Trước khi nhập hàng: dán link Taobao thật + giá + cân nặng trong Quản trị → Sản phẩm.

import { landedCost, DEFAULT_IMPORT } from './importCost.js'

export const CATEGORIES = [
  { slug: 'bjd-1-3', name: 'Búp bê 1/3 (60cm)', grp: 'bup-be', sort: 1 },
  { slug: 'bjd-1-4', name: 'Búp bê 1/4 (40–45cm)', grp: 'bup-be', sort: 2 },
  { slug: 'bjd-1-6', name: 'Búp bê 1/6 (26–30cm)', grp: 'bup-be', sort: 3 },
  { slug: 'bjd-mini', name: 'Búp bê mini 1/8', grp: 'bup-be', sort: 4 },
  { slug: 'toc-gia', name: 'Tóc giả (wig)', grp: 'phu-kien', sort: 5 },
  { slug: 'mat', name: 'Mắt (eyes)', grp: 'phu-kien', sort: 6 },
  { slug: 'trang-phuc', name: 'Trang phục', grp: 'phu-kien', sort: 7 },
  { slug: 'giay', name: 'Giày', grp: 'phu-kien', sort: 8 },
  { slug: 'phu-kien-khac', name: 'Giá đỡ, túi, dụng cụ', grp: 'phu-kien', sort: 9 },
]

export const GROUPS = [
  { key: 'bup-be', name: 'Búp bê BJD' },
  { key: 'phu-kien', name: 'Phụ kiện' },
]

export const SCALES = [
  { key: '1/3', name: '1/3 · SD (~60cm)' },
  { key: '1/4', name: '1/4 · MSD (~42cm)' },
  { key: '1/6', name: '1/6 · YOSD (~28cm)' },
  { key: '1/8', name: '1/8 · mini (~18cm)' },
]
export const SKINS = [
  { key: 'trang-hong', name: 'Trắng hồng', color: '#f6dcd3' },
  { key: 'trang-tu-nhien', name: 'Trắng tự nhiên', color: '#f1dfc8' },
  { key: 'ngam', name: 'Da ngăm', color: '#c99a76' },
  { key: 'trang-su', name: 'Trắng sứ', color: '#f7f2ee' },
]
export const GENDERS = [
  { key: 'nu', name: 'Nữ' },
  { key: 'nam', name: 'Nam' },
  { key: 'unisex', name: 'Unisex' },
]
export const SETS = [
  { key: 'fullset', name: 'Full set (đủ tóc, mắt, đồ, makeup)' },
  { key: 'nude', name: 'Nude (thân + đầu, có makeup)' },
]
export const STOCK_TYPES = [
  { key: 'co-san', name: 'Có sẵn tại VN' },
  { key: 'order', name: 'Đặt trước (order)' },
]
export const KINDS = { 'toc-gia': 'wig', mat: 'eyes', 'trang-phuc': 'outfit', giay: 'shoes', 'phu-kien-khac': 'other' }

export const COLLECTIONS = [
  { slug: 'co-trang', name: 'Cổ trang', tagline: 'Hán phục, tóc búi, trâm cài', hue: '#e9c6b8' },
  { slug: 'lolita', name: 'Lolita ngọt ngào', tagline: 'Váy bồng, nơ ren, tông pastel', hue: '#f4c9da' },
  { slug: 'hoc-duong', name: 'Học đường', tagline: 'Đồng phục JK, DK năng động', hue: '#c9d8f0' },
  { slug: 'dark', name: 'Gothic & Fantasy', tagline: 'Tông tối, cánh, sừng, tai elf', hue: '#b8b0d6' },
]

export function slugify(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const HAIR = ['#2b2321', '#5a3a2a', '#c8a27a', '#e9dccb', '#9aa7b8', '#d98fa6', '#6b4f8f', '#a33a2e', '#f2efe9']
const HAIR_NAMES = ['đen', 'nâu', 'vàng mật ong', 'kem sữa', 'xám bạc', 'hồng phấn', 'tím khói', 'đỏ rượu', 'trắng']
const EYES = ['#5a3a22', '#2f6fb0', '#3b8f6a', '#8c5bc4', '#c0392b', '#c99a2e', '#7aa6c2']
const EYE_NAMES = ['nâu', 'xanh dương', 'xanh lá', 'tím', 'đỏ', 'hổ phách', 'xám xanh']
const OUTFIT = ['#f2b8c6', '#2d3e5e', '#f7f2e8', '#8e2f3b', '#3f5f4a', '#c9b6e4', '#1f1f24', '#e6c27a']

// [tên, giới tính, bộ sưu tập]
const DOLLS = [
  ['Hạ Vy', 'nu', 'lolita'], ['Lam Nguyệt', 'nu', 'co-trang'], ['Khải Minh', 'nam', 'hoc-duong'], ['Tử Đằng', 'nu', 'dark'],
  ['An Nhiên', 'nu', 'hoc-duong'], ['Mộc Lan', 'nu', 'co-trang'], ['Thiên Ân', 'nam', 'dark'], ['Bạch Vân', 'nu', 'lolita'],
  ['Minh Khang', 'nam', 'co-trang'], ['Lạc Anh', 'nu', 'lolita'], ['Tiểu Mai', 'nu', 'hoc-duong'], ['Dạ Lam', 'nam', 'dark'],
  ['Ánh Dương', 'nu', 'lolita'], ['Hàn Phong', 'nam', 'co-trang'], ['Nguyệt Cầm', 'nu', 'dark'], ['Tinh Tú', 'unisex', 'hoc-duong'],
  ['Bông', 'nu', 'lolita'], ['Gạo', 'unisex', 'hoc-duong'], ['Mochi', 'nu', 'lolita'], ['Nấm', 'unisex', 'dark'],
]

// Thông số tham khảo theo tỉ lệ: giá tệ full set [min,max], cân nặng đóng gói (kg), thời gian order (ngày)
const DOLL_SPEC = {
  '1/3': { cat: 'bjd-1-3', full: [2200, 3400], kg: 2.8, lead: 45, height: '58–65cm' },
  '1/4': { cat: 'bjd-1-4', full: [1000, 1900], kg: 1.5, lead: 35, height: '40–45cm' },
  '1/6': { cat: 'bjd-1-6', full: [600, 1100], kg: 0.8, lead: 30, height: '26–30cm' },
  '1/8': { cat: 'bjd-mini', full: [320, 600], kg: 0.45, lead: 25, height: '16–20cm' },
}

// Phụ kiện: [loại, tên, tỉ lệ, giá tệ min-max, kg, bộ sưu tập]
const ACC = [
  ['toc-gia', 'Tóc giả dài xoăn sóng', ['1/3', '1/4', '1/6'], { '1/3': [60, 110], '1/4': [38, 75], '1/6': [18, 45] }, { '1/3': 0.15, '1/4': 0.12, '1/6': 0.08 }, 'lolita'],
  ['toc-gia', 'Tóc giả bob ngang vai', ['1/3', '1/4', '1/6'], { '1/3': [50, 90], '1/4': [32, 60], '1/6': [15, 35] }, { '1/3': 0.15, '1/4': 0.12, '1/6': 0.08 }, 'hoc-duong'],
  ['toc-gia', 'Tóc giả búi cổ trang kèm trâm', ['1/3', '1/4'], { '1/3': [90, 160], '1/4': [60, 110] }, { '1/3': 0.18, '1/4': 0.14 }, 'co-trang'],
  ['toc-gia', 'Tóc giả ngắn layer nam', ['1/3', '1/4', '1/6'], { '1/3': [45, 85], '1/4': [30, 55], '1/6': [15, 30] }, { '1/3': 0.12, '1/4': 0.1, '1/6': 0.07 }, 'dark'],
  ['toc-gia', 'Tóc giả hai bím', ['1/4', '1/6', '1/8'], { '1/4': [35, 65], '1/6': [18, 40], '1/8': [12, 25] }, { '1/4': 0.12, '1/6': 0.08, '1/8': 0.05 }, 'lolita'],
  ['mat', 'Mắt resin trong veo', ['1/3', '1/4', '1/6'], { '1/3': [35, 60], '1/4': [28, 50], '1/6': [22, 40] }, { '1/3': 0.03, '1/4': 0.03, '1/6': 0.03 }, null],
  ['mat', 'Mắt thủy tinh thủ công', ['1/3', '1/4'], { '1/3': [80, 140], '1/4': [65, 110] }, { '1/3': 0.04, '1/4': 0.04 }, null],
  ['mat', 'Mắt acrylic giá rẻ', ['1/4', '1/6', '1/8'], { '1/4': [12, 22], '1/6': [10, 18], '1/8': [8, 15] }, { '1/4': 0.03, '1/6': 0.03, '1/8': 0.03 }, null],
  ['trang-phuc', 'Váy lolita ren nơ', ['1/3', '1/4', '1/6'], { '1/3': [150, 260], '1/4': [90, 170], '1/6': [45, 95] }, { '1/3': 0.25, '1/4': 0.18, '1/6': 0.12 }, 'lolita'],
  ['trang-phuc', 'Hán phục cổ trang', ['1/3', '1/4', '1/6'], { '1/3': [160, 280], '1/4': [100, 190], '1/6': [50, 110] }, { '1/3': 0.3, '1/4': 0.2, '1/6': 0.12 }, 'co-trang'],
  ['trang-phuc', 'Đồng phục JK thủy thủ', ['1/3', '1/4', '1/6'], { '1/3': [110, 180], '1/4': [65, 120], '1/6': [30, 70] }, { '1/3': 0.22, '1/4': 0.16, '1/6': 0.1 }, 'hoc-duong'],
  ['trang-phuc', 'Bộ vest nam sơ mi', ['1/3', '1/4'], { '1/3': [140, 240], '1/4': [85, 160] }, { '1/3': 0.28, '1/4': 0.18 }, 'dark'],
  ['trang-phuc', 'Váy gothic đen kèm găng', ['1/3', '1/4', '1/6'], { '1/3': [150, 250], '1/4': [90, 160], '1/6': [45, 90] }, { '1/3': 0.25, '1/4': 0.18, '1/6': 0.12 }, 'dark'],
  ['trang-phuc', 'Bộ đồ ngủ pastel', ['1/4', '1/6', '1/8'], { '1/4': [45, 80], '1/6': [25, 50], '1/8': [18, 35] }, { '1/4': 0.12, '1/6': 0.08, '1/8': 0.05 }, 'lolita'],
  ['giay', 'Giày búp bê Mary Jane', ['1/3', '1/4', '1/6'], { '1/3': [55, 110], '1/4': [35, 75], '1/6': [12, 40] }, { '1/3': 0.12, '1/4': 0.1, '1/6': 0.06 }, 'lolita'],
  ['giay', 'Bốt da cổ cao', ['1/3', '1/4'], { '1/3': [70, 130], '1/4': [45, 90] }, { '1/3': 0.15, '1/4': 0.12 }, 'dark'],
  ['giay', 'Giày thể thao trắng', ['1/3', '1/4', '1/6'], { '1/3': [50, 95], '1/4': [32, 65], '1/6': [12, 35] }, { '1/3': 0.12, '1/4': 0.1, '1/6': 0.06 }, 'hoc-duong'],
  ['giay', 'Hài thêu cổ trang', ['1/3', '1/4'], { '1/3': [50, 90], '1/4': [35, 65] }, { '1/3': 0.1, '1/4': 0.08 }, 'co-trang'],
  ['phu-kien-khac', 'Giá đỡ búp bê kim loại', ['1/3', '1/4', '1/6'], { '1/3': [35, 55], '1/4': [25, 40], '1/6': [15, 28] }, { '1/3': 0.4, '1/4': 0.3, '1/6': 0.2 }, null],
  ['phu-kien-khac', 'Túi đựng búp bê có đệm', ['1/3', '1/4', '1/6'], { '1/3': [180, 280], '1/4': [120, 200], '1/6': [70, 120] }, { '1/3': 1.3, '1/4': 0.9, '1/6': 0.5 }, null],
  ['phu-kien-khac', 'Bộ dụng cụ vẽ mặt (face-up)', ['1/3', '1/4', '1/6', '1/8'], { '1/4': [90, 160] }, { '1/4': 0.45 }, null],
  ['phu-kien-khac', 'Bộ dây thun thay khớp', ['1/3', '1/4', '1/6'], { '1/3': [15, 28], '1/4': [12, 22], '1/6': [8, 15] }, { '1/3': 0.05, '1/4': 0.05, '1/6': 0.04 }, null],
  ['phu-kien-khac', 'Hộp trưng bày acrylic có đèn', ['1/4', '1/6'], { '1/4': [160, 260], '1/6': [95, 160] }, { '1/4': 2.6, '1/6': 1.6 }, null],
]

function describeDoll(name, scale, set, spec, gender) {
  const who = gender === 'nam' ? 'chàng trai' : gender === 'nu' ? 'cô gái' : 'nhân vật'
  return `Búp bê khớp cầu (BJD) ${scale} "${name}" — ${who} cao ${spec.height}, đúc nhựa resin (polyurethane) mịn, khớp linh hoạt, tạo dáng được.` +
    ` ${set === 'fullset' ? 'Bản full set gồm thân, đầu đã makeup, tóc giả, mắt, trang phục và giày như ảnh.' : 'Bản nude gồm thân + đầu đã makeup và mắt mặc định; tóc, quần áo mua riêng.'}` +
    `\n\nHàng sản xuất theo đơn tại xưởng Trung Quốc: thời gian về Việt Nam khoảng ${spec.lead}–${spec.lead + 20} ngày (đặt cọc 50%). Màu resin có thể chênh nhẹ giữa các đợt đúc.` +
    `\n\nKhuyến cáo: sản phẩm sưu tầm dành cho người từ 15 tuổi, có chi tiết nhỏ, không phù hợp trẻ nhỏ.`
}

function buildProducts() {
  const r = rng(20261017)
  const out = []
  let n = 1
  const scales = ['1/4', '1/4', '1/6', '1/3', '1/4', '1/6', '1/8', '1/4', '1/3', '1/6', '1/4', '1/6', '1/8', '1/3', '1/4', '1/6', '1/8', '1/8', '1/6', '1/4']
  DOLLS.forEach(([name, gender, collection], i) => {
    const scale = scales[i]
    const spec = DOLL_SPEC[scale]
    // Mỗi nhân vật có bản full set; 1 nửa có thêm bản nude
    const sets = i % 2 === 0 ? ['fullset', 'nude'] : ['fullset']
    const skin = ['trang-hong', 'trang-tu-nhien', 'trang-su', 'ngam'][i % 4 === 3 && r() < 0.7 ? 3 : Math.floor(r() * 3)]
    const look = { hair: Math.floor(r() * HAIR.length), eye: Math.floor(r() * EYES.length), outfit: Math.floor(r() * OUTFIT.length) }
    const [lo, hi] = spec.full
    const fullYuan = Math.round((lo + r() * (hi - lo)) / 10) * 10
    for (const set of sets) {
      // Bản nude = thân + đầu, bỏ tóc/mắt/đồ: ~80% giá full set cùng nhân vật
      const yuan = set === 'fullset' ? fullYuan : Math.round(fullYuan * 0.8 / 10) * 10
      const stock_type = r() < 0.35 ? 'co-san' : 'order'
      const sku = `BJ${String(n).padStart(4, '0')}`
      const p = {
        id: `p${n}`, sku, category: spec.cat, kind: 'doll', scale, skin, gender, set_type: set,
        name: `Búp bê BJD ${scale} ${name} — ${set === 'fullset' ? 'Full set' : 'Nude'}`,
        collection, look, stock_type, lead_days: stock_type === 'co-san' ? 0 : spec.lead,
        cost: { yuan, weight_kg: spec.kg, cn_ship_yuan: 0, source_url: '' },
        description: describeDoll(name, scale, set, spec, gender),
      }
      out.push(p); n++
    }
  })
  // Mẫu đúng như link tham khảo của shop: 1/4 full set 1.056 tệ
  out[0].cost.yuan = 1056
  out[1].cost.yuan = Math.round(1056 * 0.8 / 10) * 10 // bản nude cùng nhân vật

  for (const [cat, title, scales2, prices, kgs, collection] of ACC) {
    const avail = scales2.filter(s => prices[s]) // một số món chỉ có 1 biến thể giá (vd bộ dụng cụ)
    const list = avail.length ? avail : ['1/4']
    for (const scale of list) {
      const [lo, hi] = prices[scale]
      const yuan = Math.round(lo + r() * (hi - lo))
      const ci = Math.floor(r() * 9)
      const color = cat === 'toc-gia' ? HAIR_NAMES[ci] : cat === 'mat' ? EYE_NAMES[ci % EYE_NAMES.length] : ''
      const allScales = cat === 'phu-kien-khac' && title.startsWith('Bộ dụng cụ')
      const sku = `PK${String(n).padStart(4, '0')}`
      const size = cat === 'mat' ? { '1/3': ' 16mm', '1/4': ' 14mm', '1/6': ' 12mm', '1/8': ' 10mm' }[scale] : ''
      out.push({
        id: `p${n}`, sku, category: cat, kind: KINDS[cat], scale: allScales ? 'all' : scale, skin: null,
        gender: title.includes('nam') || title.includes('vest') ? 'nam' : 'unisex', set_type: null,
        name: `${title}${color ? ' màu ' + color : ''}${size}${allScales ? '' : ' — size ' + scale}`,
        collection, look: { hair: ci, eye: ci % EYES.length, outfit: ci % OUTFIT.length },
        stock_type: r() < 0.6 ? 'co-san' : 'order', lead_days: 0,
        cost: { yuan, weight_kg: kgs[scale], cn_ship_yuan: 0, source_url: '' },
        description: `${title}${allScales ? '' : ` dành cho búp bê ${scale}`}. Hàng nhập từ xưởng phụ kiện BJD Trung Quốc, đã kiểm tra trước khi giao.` +
          (cat === 'toc-gia' ? `\n\nChu vi đầu tham khảo: 1/3 ≈ 8–9 inch, 1/4 ≈ 7–8 inch, 1/6 ≈ 6–7 inch. Đo đầu búp bê trước khi chọn.` : '') +
          (cat === 'mat' ? '\n\nKích thước mắt nên chọn theo hốc mắt của đầu (xem thông số của búp bê).' : ''),
      })
      n++
    }
  }
  for (const p of out) {
    if (p.lead_days === 0 && p.stock_type === 'order') p.lead_days = p.kind === 'doll' ? DOLL_SPEC[p.scale].lead : 15
    const c = landedCost({ ...p.cost, kind: p.kind, scale: p.scale === 'all' ? '1/4' : p.scale }, DEFAULT_IMPORT)
    p.price = c.price
    const onSale = r() < 0.25
    p.compare_price = onSale ? Math.ceil(p.price * (1.1 + r() * 0.15) / 10000) * 10000 : null
    p.slug = slugify(`${p.name} ${p.sku}`)
    p.stock = p.stock_type === 'co-san' ? 1 + Math.floor(r() * (p.kind === 'doll' ? 3 : 12)) : 99
    p.tags = []
    if (r() < 0.3) p.tags.push('ban-chay')
    if (r() < 0.25) p.tags.push('moi')
    if (onSale && r() < 0.6) p.tags.push('flash')
    p.rating = Math.round((4.3 + r() * 0.7) * 10) / 10
    p.review_count = Math.floor(r() * 60)
    p.sold = Math.floor(r() * (p.kind === 'doll' ? 40 : 300))
    p.images = []
    p.active = true
    p.created_at = new Date(Date.UTC(2026, 3, 1) + Math.floor(r() * 190) * 86400000).toISOString()
    p.sizes = []
  }
  return out
}

export const PRODUCTS = buildProducts()

export const STORES = [
  { id: 1, name: 'Showroom Hà Nội', city: 'Hà Nội', district: 'Cầu Giấy', address: '89 Xuân Thủy, P. Dịch Vọng Hậu', phone: '024 3858 0001', hours: '9:00 – 21:00 (hẹn trước)' },
  { id: 2, name: 'Showroom TP.HCM', city: 'TP. Hồ Chí Minh', district: 'Quận 3', address: '120 Võ Văn Tần, P. 6', phone: '028 3822 0002', hours: '9:00 – 21:00 (hẹn trước)' },
]

export const COUPONS = [
  { code: 'BJD10', kind: 'percent', value: 10, max_discount: 500_000, min_order: 1_000_000, description: 'Giảm 10% (tối đa 500.000đ) cho đơn từ 1 triệu' },
  { code: 'GIAM100K', kind: 'amount', value: 100_000, max_discount: null, min_order: 800_000, description: 'Giảm 100.000đ cho đơn từ 800.000đ' },
  { code: 'FREESHIP', kind: 'freeship', value: 0, max_discount: null, min_order: 0, description: 'Miễn phí giao hàng' },
]

export const SHIPPING_FEE = 30_000
export const FREE_SHIP_FROM = 1_000_000
