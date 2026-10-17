// Bộ não của trợ lý Ngân Nguyệt: trả lời tự động theo câu hỏi thường gặp + dữ liệu sản phẩm của web.
// Không cần khóa AI. Chỗ cắm AI sau này: hàm setAiFallback() — câu nào luật không hiểu sẽ chuyển cho AI.
//
// Trả về: { text, mood, links?: [{ label, to }], products?: [...], chips?: [...], action?: 'live' }
//   text: chữ thường, **đậm** và xuống dòng; mood: 'vui' | 'nghi' | 'chao' | 'ngai' (biểu cảm nhân vật)
import { CATEGORIES } from './data.js'
import { vnd } from './format.js'

export const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase()

export const DEFAULT_ASSISTANT = {
  name: 'Ngân Nguyệt',
  greeting: 'Chào bạn, mình là {ten} — trợ lý nhỏ của {shop}. Bạn cần tìm búp bê, hỏi size hay cách đặt hàng? Cứ hỏi mình nhé!',
  image: '',
}

export const QUICK_CHIPS = ['Cách đặt hàng', 'Phí giao hàng', 'Hàng đặt trước', 'Chọn size BJD', 'Thanh toán', 'Đổi trả', 'Búp bê có sẵn', 'Gặp nhân viên']

const SIZES = [
  ['1/3 (SD)', '58–65cm', 'tóc 8–9 inch, mắt 16–18mm', 'nhiều chi tiết, quần áo đa dạng; nặng ~3kg'],
  ['1/4 (MSD)', '40–45cm', 'tóc 7–8 inch, mắt 14mm', 'phổ biến nhất cho người mới'],
  ['1/6 (YOSD)', '26–30cm', 'tóc 6–7 inch, mắt 12mm', 'nhỏ gọn, phụ kiện rẻ'],
  ['1/8 (mini)', '16–20cm', 'tóc 5–6 inch, mắt 10mm', 'dễ thương, giá mềm'],
]

// Từ không mang nghĩa sản phẩm, bỏ khi tìm hàng
const STOP = new Set(('shop co khong ko k ban minh toi em anh chi ban oi a ah nhe nha vay the nao gi muon mua tim kiem cho xem hoi ' +
  'cai con chiec bo loai mau nao gia bao nhieu tien re dat dep hon nhat la duoc dc voi va hay hoac can thich di ' +
  'size ti le khoang tam tren duoi tu den trieu nghin ngan k va cua nhung cac mot hai ba').split(' '))

// [khóa, từ khóa (đã bỏ dấu), trọng số]
const INTENTS = [
  ['chao', ['xin chao', 'chao', 'hello', 'hi ', 'alo', 'hey'], 1],
  ['cam_on', ['cam on', 'thank', 'thanks', 'tks'], 2],
  ['nhan_vien', ['nhan vien', 'nguoi that', 'tu van vien', 'chat voi shop', 'gap shop', 'noi chuyen voi shop', 'admin', 'chu shop'], 3],
  ['dat_hang', ['dat hang', 'cach mua', 'mua nhu the nao', 'mua the nao', 'dat mua', 'order the nao', 'dat the nao', 'huong dan mua', 'cach dat'], 3],
  ['giao_hang', ['ship', 'giao hang', 'van chuyen', 'phi giao', 'free ship', 'freeship', 'mien phi giao', 'chuyen phat', 'giao toi', 'giao den', 'bao lau', 'may ngay'], 2],
  ['dat_truoc', ['dat truoc', 'hang order', 'order', 'coc', 'bao lau', 'may ngay', 'khi nao ve', 'bao gio ve', 'thoi gian ve', 'pre order', 'preorder'], 2],
  ['thanh_toan', ['thanh toan', 'chuyen khoan', 'cod', 'momo', 'vnpay', 'tai khoan ngan hang', 'stk', 'so tai khoan', 'tra tien', 'quet ma', 'vietqr'], 2],
  ['doi_tra', ['doi tra', 'tra hang', 'hoan tien', 'bao hanh', 'bi loi', 'loi duc', 'bi vo', 'hu hong', 'doi hang', 'giao sai'], 2],
  ['size', ['chon size', 'size nao', 'ti le', 'cao bao nhieu', 'kich thuoc', 'bang size', 'msd', 'yosd', 'chu vi dau', 'nguoi moi'], 2],
  ['fullset', ['full set', 'fullset', 'nude', 'tron bo'], 2],
  ['bao_quan', ['bao quan', 've sinh', 'ngai vang', 'ngả vàng', 'giu gin', 'lem mau', 'cat giu'], 2],
  ['tra_don', ['tra cuu', 'don hang cua', 'don cua toi', 'kiem tra don', 'ma don', 'tinh trang don', 'don toi', 'theo doi don', 'huy don'], 3],
  ['showroom', ['showroom', 'cua hang o dau', 'dia chi', 'xem truc tiep', 'o dau', 'cho nao', 'ghe shop', 'den shop', 'chi nhanh'], 2],
  ['lien_he', ['hotline', 'so dien thoai', 'sdt', 'lien he', 'zalo', 'facebook', 'fanpage', 'email', 'goi dien', 'gio lam viec', 'mo cua'], 2],
  ['khuyen_mai', ['khuyen mai', 'giam gia', 'ma giam', 'voucher', 'coupon', 'sale', 'uu dai'], 2],
  ['ai', ['ban la ai', 'ten gi', 'ban ten', 'la ai vay', 'robot', 'bot a'], 3],
]

function scoreIntents(q) {
  const t = ' ' + q + ' '
  let best = null
  for (const [key, words, w] of INTENTS) {
    let s = 0
    for (const k of words) if (t.includes(k.length <= 3 ? ' ' + k.trim() + ' ' : k)) s += w * (k.includes(' ') ? 1.5 : 1)
    if (s > 0 && (!best || s > best.s)) best = { key, s }
  }
  return best
}

// Các bộ lọc đọc được từ câu hỏi: tỉ lệ, loại hàng, có sẵn, khoảng giá
export function readFilters(q) {
  const f = {}
  const m = q.match(/\b1\s*\/\s*([3468])\b/)
  if (m) f.scale = '1/' + m[1]
  else if (/\bmsd\b/.test(q)) f.scale = '1/4'
  else if (/\byosd\b/.test(q)) f.scale = '1/6'
  else if (/\bsd\b/.test(q)) f.scale = '1/3'
  else if (/\bmini\b/.test(q)) f.scale = '1/8'
  if (/toc( gia)?|\bwig\b/.test(q)) f.cat = 'toc-gia'
  else if (/\bmat\b|\beyes?\b|tron mat/.test(q)) f.cat = 'mat'
  else if (/\bgiay\b|\bboot/.test(q)) f.cat = 'giay'
  else if (/quan ao|\bvay\b|\bao\b|trang phuc|han phuc|dong phuc|outfit/.test(q)) f.cat = 'trang-phuc'
  else if (/gia do|\btui\b|dung cu/.test(q)) f.cat = 'phu-kien-khac'
  else if (/bup be|\bbjd\b|\bdoll\b/.test(q)) f.kind = 'doll'
  if (/co san|san hang|giao ngay|hang san/.test(q)) f.stock = 'co-san'
  // không ghi đơn vị: số nhỏ hiểu là triệu, số vừa hiểu là nghìn (VD "dưới 2" = 2 triệu, "dưới 500" = 500k)
  const money = s => { const [, n, u] = s.match(/(\d+(?:[.,]\d+)?)\s*(trieu|tr|k|nghin|ngan)?/) || []; if (!n) return null; const v = Number(n.replace(',', '.')); return u === 'k' || u === 'nghin' || u === 'ngan' ? v * 1000 : u === 'trieu' || u === 'tr' || v < 100 ? v * 1e6 : v < 10000 ? v * 1000 : v }
  const qp = q.replace(/\b1\s*\/\s*\d\b/g, ' ')
  const lo = qp.match(/(?:duoi|nho hon|khong qua|toi da|<)\s*(\d+(?:[.,]\d+)?\s*(?:trieu|tr|k|nghin|ngan)?)/)
  const hi = qp.match(/(?:\btren|(?<!nho )\bhon|\btu|>)\s*(\d+(?:[.,]\d+)?\s*(?:trieu|tr|k|nghin|ngan)?)/)
  if (lo) f.max = money(lo[1])
  if (hi) f.min = money(hi[1])
  return f
}

export function findProducts(products, raw, limit = 4) {
  const q = norm(raw)
  const f = readFilters(q)
  const words = q.replace(/\b1\s*\/\s*\d\b/g, ' ').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
    .filter(w => w.length > 1 && !STOP.has(w) && !/^\d+$/.test(w))
  let list = (products || []).filter(p => p.active !== false)
  if (f.scale) list = list.filter(p => p.scale === f.scale || p.scale === 'all')
  if (f.cat) list = list.filter(p => p.category === f.cat)
  if (f.kind) list = list.filter(p => p.kind === f.kind)
  if (f.stock) list = list.filter(p => p.stock_type === f.stock && p.stock > 0)
  if (f.max) list = list.filter(p => p.price <= f.max)
  if (f.min) list = list.filter(p => p.price >= f.min)
  const hasFilter = Object.keys(f).length > 0
  // bỏ các từ đã dùng làm bộ lọc để chấm điểm theo tên
  const filterWords = new Set(['toc', 'gia', 'wig', 'mat', 'eye', 'eyes', 'giay', 'quan', 'ao', 'vay', 'trang', 'phuc', 'bup', 'be', 'bjd', 'doll', 'san', 'hang', 'mini', 'msd', 'yosd', 'sd', 'duoi', 'tren'])
  const keys = words.filter(w => !filterWords.has(w))
  const scored = list.map(p => {
    const hay = norm(`${p.name} ${p.sku} ${p.collection || ''} ${(p.tags || []).join(' ')}`)
    return { p, s: keys.reduce((s, w) => s + (hay.includes(w) ? 1 : 0), 0) }
  })
  const top = Math.max(0, ...scored.map(x => x.s))
  if (!hasFilter && top === 0) return { items: [], filters: f, matched: false }
  const items = scored.filter(x => x.s === top).sort((a, b) => b.p.sold - a.p.sold).map(x => x.p)
  return { items: items.slice(0, limit), total: items.length, filters: f, matched: true }
}

function listLink(f) {
  const cat = f.cat || (f.kind === 'doll' ? 'bup-be' : 'tat-ca')
  const qs = new URLSearchParams()
  if (f.scale) qs.set('ti-le', f.scale)
  if (f.stock) qs.set('hang', f.stock)
  const s = qs.toString()
  return '/danh-muc/' + cat + (s ? '?' + s : '')
}

const fill = (s, ctx) => s.replace(/\{ten\}/g, ctx.assistant?.name || DEFAULT_ASSISTANT.name).replace(/\{shop\}/g, ctx.info?.name || 'shop')

export function greeting(ctx) {
  return { text: fill(ctx.assistant?.greeting || DEFAULT_ASSISTANT.greeting, ctx), mood: 'chao', chips: QUICK_CHIPS }
}

// Trả lời một câu hỏi. ctx: { info, products, stores, user, assistant }
export function answer(raw, ctx = {}) {
  const info = ctx.info || {}
  const q = norm(raw).replace(/\s+/g, ' ').trim()
  const name = ctx.assistant?.name || DEFAULT_ASSISTANT.name
  if (!q) return greeting(ctx)
  const code = String(raw).toUpperCase().match(/\bHK\d{6,}\b/)
  if (code) return { text: `Mình thấy mã đơn **${code[0]}**. Bạn bấm nút dưới, nhập thêm số điện thoại đặt hàng để xem tình trạng đơn nhé.`, mood: 'vui', links: [{ label: 'Tra cứu đơn ' + code[0], to: '/tra-cuu-don-hang?ma=' + code[0] }] }

  const intent = scoreIntents(q)
  const R = {
    chao: () => ({ ...greeting(ctx), text: `Chào bạn! Mình là ${name} đây. Bạn muốn hỏi gì về búp bê hay đơn hàng nào?` }),
    cam_on: () => ({ text: 'Không có gì đâu ạ! Cần gì bạn cứ gọi mình nha. ✨', mood: 'vui' }),
    ai: () => ({ text: `Mình là **${name}**, trợ lý tự động của ${info.name || 'shop'}. Mình trả lời được về cách đặt hàng, size, giao hàng, thanh toán và tìm sản phẩm. Câu khó quá thì bạn chọn **Chat với shop** để gặp nhân viên nhé.`, mood: 'chao' }),
    nhan_vien: () => ({ text: 'Bạn muốn nói chuyện trực tiếp với nhân viên shop? Mình chuyển sang mục **Chat với shop** nhé (cần đăng nhập tài khoản web để shop trả lời lại được).', mood: 'vui', action: 'live' }),
    dat_hang: () => ({
      text: 'Đặt hàng trên web chỉ 4 bước:\n1. Chọn sản phẩm, chọn **size** (nếu có) rồi bấm **Thêm vào giỏ**.\n2. Mở **Giỏ hàng**, nhập mã giảm giá nếu có, bấm **Thanh toán**.\n3. Điền tên, số điện thoại, địa chỉ (hoặc chọn nhận tại showroom).\n4. Chọn cách thanh toán: chuyển khoản VietQR, VNPay, MoMo hoặc COD (chỉ với đơn toàn hàng có sẵn).\nĐặt xong bạn nhận **mã đơn** để tra cứu. Đăng nhập trước thì đơn được lưu vào tài khoản luôn.',
      mood: 'vui', links: [{ label: 'Xem giỏ hàng', to: '/gio-hang' }, { label: 'Tra cứu đơn', to: '/tra-cuu-don-hang' }],
    }),
    dat_truoc: () => ({
      text: 'Hàng **đặt trước (order)** do xưởng đúc theo đơn, về Việt Nam khoảng **25–60 ngày** (thời gian riêng ghi trên từng sản phẩm).\n• Trả trước **từ 50%** khi chốt đơn (chọn 50%, 70%, trả hết hoặc tự nhập số tiền), phần còn lại trả khi hàng về; chuyển khoản xong đơn tự xác nhận; shop gửi ảnh thật trước khi giao.\n• Xưởng không giao được hoặc trễ quá 30 ngày so với hẹn: hoàn 100% cọc.\n• Đơn có hàng order không dùng COD.',
      mood: 'vui', links: [{ label: 'Chính sách đặt trước', to: '/chinh-sach/dat-truoc' }],
    }),
    giao_hang: () => ({
      text: `Phí giao hàng **${vnd(info.shipping_fee ?? 30000)}**, **miễn phí** cho đơn từ **${vnd(info.free_ship_from ?? 1000000)}**. Nhận tại showroom thì không mất phí.\nHàng có sẵn giao 1–3 ngày, hàng đặt trước về khoảng 25–60 ngày; búp bê được bọc đệm khí nhiều lớp, đóng hộp cứng.`,
      mood: 'vui', links: [{ label: 'Giao hàng & thanh toán', to: '/chinh-sach/giao-hang' }],
    }),
    thanh_toan: () => ({
      text: 'Shop nhận: **chuyển khoản VietQR**, thẻ ATM/Visa/Master qua **VNPay**, ví **MoMo**, và **COD** cho đơn toàn hàng có sẵn.' +
        (info.bank_account ? `\nTài khoản: **${info.bank_id} ${info.bank_account}** — ${info.bank_account_name}. Khi đặt hàng, web hiện sẵn mã QR đúng số tiền và nội dung là mã đơn, bạn chỉ cần quét.` : ''),
      mood: 'vui',
    }),
    doi_tra: () => ({
      text: 'Bạn nhớ **quay video khi mở hàng** nha.\n• Lỗi đúc, vỡ khi vận chuyển, giao sai mẫu: báo trong **48 giờ** để đổi mới hoặc hoàn tiền 100%.\n• Phụ kiện còn tem, chưa dùng: đổi mẫu/size trong 7 ngày (bạn chịu phí ship).\n• Chênh nhẹ màu resin, vết khuôn mờ là đặc điểm của BJD, không tính là lỗi.',
      mood: 'ngai', links: [{ label: 'Chính sách đổi trả', to: '/chinh-sach/doi-tra' }],
    }),
    size: () => ({
      text: 'Các tỉ lệ BJD phổ biến:\n' + SIZES.map(s => `• **${s[0]}**: cao ${s[1]}, ${s[2]} — ${s[3]}`).join('\n') +
        '\nNgười mới thường chọn **1/4**. Mua tóc, mắt, quần áo rời thì chọn đúng tỉ lệ của búp bê nhé.',
      mood: 'nghi', links: [{ label: 'Hướng dẫn chọn size', to: '/huong-dan' }],
    }),
    fullset: () => ({ text: '**Full set** có sẵn tóc, mắt, trang phục, giày và makeup như ảnh — hợp người mới.\n**Nude** chỉ gồm thân + đầu đã makeup và mắt mặc định, rẻ hơn, để bạn tự phối đồ.', mood: 'vui', links: [{ label: 'Hướng dẫn cho người mới', to: '/huong-dan' }] }),
    bao_quan: () => ({ text: 'Giữ resin đẹp lâu:\n• Tránh nắng trực tiếp và chỗ nóng (resin dễ ngả vàng).\n• Không để quần áo màu đậm ép lâu lên da (dễ lem màu).\n• Cất trong túi hoặc hộp có đệm, lau bằng khăn mềm.', mood: 'nghi' }),
    tra_don: () => ({
      text: ctx.user ? 'Đơn của bạn nằm trong **Tài khoản > Đơn hàng**. Hoặc tra theo mã đơn + số điện thoại.' : 'Bạn tra đơn bằng **mã đơn** (bắt đầu bằng HK) và **số điện thoại** lúc đặt. Đăng nhập thì xem được tất cả đơn của mình.',
      mood: 'vui', links: [ctx.user ? { label: 'Đơn hàng của tôi', to: '/tai-khoan' } : { label: 'Đăng nhập', to: '/dang-nhap' }, { label: 'Tra cứu đơn', to: '/tra-cuu-don-hang' }],
    }),
    showroom: () => ({
      text: (ctx.stores?.length ? 'Bạn ghé xem búp bê trực tiếp tại:\n' + ctx.stores.slice(0, 4).map(s => `• **${s.name}**: ${[s.address, s.district, s.city].filter(Boolean).join(', ')}${s.hours ? ` (${s.hours})` : ''}`).join('\n') : 'Danh sách showroom ở trang Showroom nhé.') +
        (info.address ? `\nĐịa chỉ liên hệ: ${info.address}` : ''),
      mood: 'vui', links: [{ label: 'Xem showroom', to: '/cua-hang' }],
    }),
    lien_he: () => ({
      text: [`Hotline: **${info.hotline}**${info.hours ? ` (${info.hours})` : ''}`, info.zalo && `Zalo: **${info.zalo}**`, info.email && `Email: ${info.email}`, info.facebook && 'Facebook: bấm nút dưới'].filter(Boolean).join('\n') + '\nHoặc chat trực tiếp với shop ngay tại đây.',
      mood: 'vui', chips: ['Gặp nhân viên'], links: info.facebook ? [{ label: 'Facebook shop', to: info.facebook }] : [],
    }),
    khuyen_mai: () => ({ text: 'Các sản phẩm đang giảm giá nằm ở trang **Khuyến mãi**. Có mã giảm giá thì nhập ở bước Giỏ hàng / Thanh toán nhé.', mood: 'vui', links: [{ label: 'Xem khuyến mãi', to: '/khuyen-mai' }] }),
  }

  // Câu hỏi về sản phẩm (có tên, tỉ lệ, loại hàng, giá) ưu tiên tìm hàng
  const found = findProducts(ctx.products, raw)
  const strongIntent = intent && intent.s >= 2
  if (found.matched && found.items.length && !strongIntent) {
    const f = found.filters
    const what = [f.cat ? CATEGORIES.find(c => c.slug === f.cat)?.name.toLowerCase() : f.kind === 'doll' ? 'búp bê' : 'sản phẩm', f.scale && 'tỉ lệ ' + f.scale, f.stock && 'có sẵn', f.max && 'dưới ' + vnd(f.max), f.min && 'từ ' + vnd(f.min)].filter(Boolean).join(' ')
    return {
      text: `Mình tìm được ${found.total > found.items.length ? found.total + ' ' : ''}${what} hợp với bạn, đây là vài mẫu nổi bật:`,
      mood: 'vui', products: found.items,
      links: [{ label: 'Xem tất cả', to: Object.keys(f).length ? listLink(f) : '/tim-kiem?q=' + encodeURIComponent(raw.trim()) }],
    }
  }
  if (intent && R[intent.key]) return R[intent.key]()
  // không có mẫu trong khoảng giá: gợi ý mẫu gần nhất
  const f = found.filters
  if (found.matched && (f.max || f.min)) {
    const near = findProducts(ctx.products, raw, 99)
    const alt = findProducts(ctx.products, raw.replace(/(dưới|duoi|trên|tren|từ|tu|hơn|hon|nhỏ hơn|không quá|tối đa)\s*[\d.,]+\s*(triệu|trieu|tr|k|nghìn|nghin|ngàn|ngan)?/gi, ' '), 99).items
    if (!near.items.length && alt.length) {
      const sorted = [...alt].sort((a, b) => (f.max ? a.price - b.price : b.price - a.price)).slice(0, 4)
      return { text: `Chưa có mẫu ${f.max ? 'dưới ' + vnd(f.max) : 'từ ' + vnd(f.min)} như bạn tìm. Đây là các mẫu có giá gần nhất:`, mood: 'nghi', products: sorted, chips: ['Gặp nhân viên'] }
    }
  }
  if (found.matched) return { text: 'Hiện chưa có mẫu khớp đúng yêu cầu này. Bạn thử bỏ bớt điều kiện, hoặc nhắn shop để được tìm hàng theo yêu cầu (shop nhận order từ xưởng).', mood: 'ngai', chips: ['Gặp nhân viên', 'Búp bê có sẵn'] }
  return {
    text: 'Câu này khó quá, mình chưa hiểu hết. 🥺 Bạn thử hỏi ngắn hơn (VD: "búp bê 1/4 dưới 2 triệu", "phí ship"), hoặc chọn **Gặp nhân viên** để shop trả lời trực tiếp nhé.',
    mood: 'nghi', chips: QUICK_CHIPS, unknown: true,
  }
}

// ---- Chỗ cắm AI sau này -------------------------------------------------
// Ví dụ: setAiFallback(async (question, ctx, history) => ({ text: '...', mood: 'vui' }))
// Khi đã cắm, câu nào luật không hiểu sẽ hỏi AI; AI lỗi thì vẫn dùng câu trả lời mặc định.
let aiFallback = null
export const setAiFallback = fn => { aiFallback = fn }
export async function ask(raw, ctx, history = []) {
  const a = answer(raw, ctx)
  if (!a.unknown || !aiFallback) return a
  try { return { mood: 'vui', ...(await aiFallback(raw, ctx, history)) } } catch { return a }
}
