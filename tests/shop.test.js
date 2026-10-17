import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeTotals, couponDiscount, amountDue } from '../src/lib/pricing.js'
import { landedCost, DEFAULT_IMPORT } from '../src/lib/importCost.js'
import { filterProducts, relatedProducts } from '../src/lib/catalog.js'
import { PRODUCTS, COUPONS, CATEGORIES } from '../src/lib/data.js'
import { decodeCsv, num, parseCsv, rowsToProducts } from '../src/lib/csvImport.js'
import { readFileSync } from 'node:fs'
import { vnpayUrl, vnpayVerify, momoCreateBody, momoVerify, hmac, codeFromRef } from '../api/_lib.js'

const C = code => COUPONS.find(c => c.code === code)

test('phí giao hàng: miễn phí từ 1 triệu, nhận tại cửa hàng miễn phí', () => {
  assert.equal(computeTotals({ subtotal: 590_000, delivery: 'ship' }).total, 620_000)
  assert.equal(computeTotals({ subtotal: 1_000_000, delivery: 'ship' }).shipping, 0)
  assert.equal(computeTotals({ subtotal: 590_000, delivery: 'pickup' }).shipping, 0)
})

test('mã giảm giá: phần trăm có trần, số tiền, freeship, đơn tối thiểu', () => {
  assert.equal(couponDiscount(C('BJD10'), 6_000_000).discount, 500_000)
  assert.equal(couponDiscount(C('BJD10'), 2_000_000).discount, 200_000)
  assert.ok(couponDiscount(C('BJD10'), 500_000).error)
  assert.equal(couponDiscount(C('GIAM100K'), 800_000).discount, 100_000)
  assert.ok(couponDiscount(C('GIAM100K'), 799_999).error)
  const t = computeTotals({ subtotal: 500_000, delivery: 'ship', coupon: C('FREESHIP') })
  assert.deepEqual([t.discount, t.shipping, t.total], [0, 0, 500_000])
})

test('đặt cọc 50% với hàng đặt trước, khớp hàm place_order trong CSDL', () => {
  // cùng số liệu với kiểm thử PostgreSQL: 1.400.000 + 80.000, giao tận nơi → 1.480.000, cọc 740.000
  const t = computeTotals({ subtotal: 1_480_000, delivery: 'ship', preorder: true })
  assert.deepEqual([t.total, t.deposit], [1_480_000, 740_000])
  assert.equal(computeTotals({ subtotal: 1_480_001, delivery: 'pickup', preorder: true }).deposit, 741_000)
  assert.equal(computeTotals({ subtotal: 190_000, delivery: 'ship' }).deposit, 0)
  const o = { status: 'cho_xac_nhan', total: 1_480_000, deposit: 740_000 }
  assert.equal(amountDue({ ...o, payment_status: 'chua_thanh_toan' }), 740_000)
  assert.equal(amountDue({ ...o, payment_status: 'da_coc' }), 740_000)
  assert.equal(amountDue({ ...o, payment_status: 'da_thanh_toan' }), 0)
  assert.equal(amountDue({ ...o, deposit: 0, payment_status: 'that_bai' }), 1_480_000)
  assert.equal(amountDue({ ...o, status: 'da_huy', payment_status: 'chua_thanh_toan' }), 0)
})

test('giá nhập: mẫu BJD 1/4 full set 1.056 tệ', () => {
  const c = landedCost({ yuan: 1056, weight_kg: 1.5, kind: 'doll', scale: '1/4' }, DEFAULT_IMPORT)
  // 1056 × 3700 = 3.907.200; +3% phí mua hộ; 1,5kg × 30.000; đóng gói 50.000; bảo hiểm 2%; +3% chi phí khác
  assert.equal(c.goods, 3_907_200)
  assert.equal(c.service, 117_216)
  assert.equal(c.intl, 45_000)
  assert.equal(c.insurance, 78_144)
  assert.equal(c.cost, 4_323_487)
  assert.equal(c.price, 5_630_000) // lãi 30%, làm tròn lên 10.000đ
  // phụ kiện nhỏ: lãi cao hơn, không đóng gói/bảo hiểm
  const w = landedCost({ yuan: 20, weight_kg: 0.08, kind: 'wig', scale: '1/6' }, DEFAULT_IMPORT)
  assert.equal(w.packing + w.insurance, 0)
  assert.equal(w.margin, DEFAULT_IMPORT.marginSmall)
  // lãi riêng ghi đè cài đặt chung
  assert.equal(landedCost({ yuan: 1056, weight_kg: 1.5, kind: 'doll', scale: '1/4', margin_pct: 0 }).price, 4_330_000)
})

test('dữ liệu mẫu hợp lệ', () => {
  const ids = new Set(), slugs = new Set(), skus = new Set()
  for (const p of PRODUCTS) {
    assert.ok(!ids.has(p.id) && !slugs.has(p.slug) && !skus.has(p.sku), 'trùng ' + p.id)
    ids.add(p.id); slugs.add(p.slug); skus.add(p.sku)
    assert.ok(p.price > 0 && p.cost.yuan > 0 && p.cost.weight_kg > 0)
    if (p.compare_price) assert.ok(p.compare_price > p.price)
    assert.ok(CATEGORIES.some(c => c.slug === p.category))
    // giá bán luôn cao hơn giá vốn
    const c = landedCost({ ...p.cost, kind: p.kind, scale: p.scale === 'all' ? '1/4' : p.scale })
    assert.ok(p.price > c.cost, p.name)
    if (p.kind === 'doll') assert.ok(['fullset', 'nude'].includes(p.set_type) && p.skin)
    if (p.stock_type === 'order') assert.ok(p.lead_days > 0)
  }
  assert.equal(PRODUCTS[0].cost.yuan, 1056)
})

test('lọc, tìm kiếm không dấu, sắp xếp', () => {
  const q4 = filterProducts(PRODUCTS, { grp: 'bup-be', scale: ['1/4'] })
  assert.ok(q4.length > 0 && q4.every(p => p.kind === 'doll' && p.scale === '1/4'))
  const wigs = filterProducts(PRODUCTS, { q: 'toc gia 1/6' })
  assert.ok(wigs.length > 0 && wigs.every(p => p.kind === 'wig' && p.scale === '1/6'))
  const ready = filterProducts(PRODUCTS, { stock: ['co-san'] })
  assert.ok(ready.length > 0 && ready.every(p => p.stock_type === 'co-san'))
  const nude = filterProducts(PRODUCTS, { set: ['nude'] })
  assert.ok(nude.length > 0 && nude.every(p => p.set_type === 'nude'))
  const kit = filterProducts(PRODUCTS, { grp: 'phu-kien', scale: ['1/8'] })
  assert.ok(kit.some(p => p.scale === 'all'), 'phụ kiện dùng mọi size hiện khi lọc theo size')
  const asc = filterProducts(PRODUCTS, { sort: 'gia-tang' })
  assert.ok(asc.every((p, i) => i === 0 || asc[i - 1].price <= p.price))
  const cheap = filterProducts(PRODUCTS, { price: ['0-300'] })
  assert.ok(cheap.length && cheap.every(p => p.price < 300_000))
  const rel = relatedProducts(PRODUCTS, PRODUCTS[0])
  assert.ok(rel.length === 8 && !rel.includes(PRODUCTS[0]))
})

const VN = { tmnCode: 'TESTCODE', secret: 'SECRETKEY123', baseUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html' }

test('VNPay: tạo link có chữ ký đúng và kiểm tra được kết quả trả về', () => {
  const url = new URL(vnpayUrl({ ...VN, code: 'HK2610170001', amount: 620_000, ip: '1.2.3.4', returnUrl: 'https://shop.vn/thanh-toan/ket-qua', now: new Date('2026-10-17T03:00:00Z') }))
  const q = Object.fromEntries(url.searchParams)
  assert.equal(q.vnp_Amount, '62000000')
  assert.equal(q.vnp_CreateDate, '20261017100000')
  // chữ ký tính trên chuỗi tham số đã mã hóa, sắp xếp theo tên
  const raw = url.search.slice(1).split('&vnp_SecureHash=')[0]
  assert.equal(q.vnp_SecureHash, hmac('sha512', VN.secret, raw))
  // giả lập VNPay gửi về
  const back = { vnp_Amount: '62000000', vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_TxnRef: q.vnp_TxnRef, vnp_TransactionNo: '14000001', vnp_OrderInfo: q.vnp_OrderInfo, vnp_TmnCode: VN.tmnCode }
  const enc = Object.keys(back).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(back[k]).replace(/%20/g, '+')}`).join('&')
  back.vnp_SecureHash = hmac('sha512', VN.secret, enc)
  assert.deepEqual(vnpayVerify(back, VN.secret), { code: 'HK2610170001', amount: 620_000, ok: true, ref: '14000001' })
  // sửa số tiền -> sai chữ ký
  assert.equal(vnpayVerify({ ...back, vnp_Amount: '100' }, VN.secret), null)
  assert.equal(vnpayVerify({ ...back, vnp_ResponseCode: '24' }, VN.secret), null)
  assert.equal(codeFromRef(q.vnp_TxnRef), 'HK2610170001')
})

test('MoMo: ký yêu cầu và kiểm IPN', () => {
  const keys = { partnerCode: 'MOMO', accessKey: 'AK', secret: 'SK' }
  const b = momoCreateBody({ ...keys, code: 'HK2610170002', amount: 1_500_000, redirectUrl: 'https://shop.vn/r', ipnUrl: 'https://shop.vn/api/momo-ipn' })
  assert.equal(b.amount, 1_500_000)
  assert.match(b.signature, /^[0-9a-f]{64}$/)
  const ipn = { partnerCode: 'MOMO', orderId: b.orderId, requestId: b.requestId, amount: 1_500_000, orderInfo: b.orderInfo, orderType: 'momo_wallet', transId: 999, resultCode: 0, message: 'Thành công.', payType: 'qr', responseTime: 1760000000000, extraData: '' }
  const raw = `accessKey=AK&amount=${ipn.amount}&extraData=&message=${ipn.message}&orderId=${ipn.orderId}&orderInfo=${ipn.orderInfo}&orderType=${ipn.orderType}&partnerCode=MOMO&payType=qr&requestId=${ipn.requestId}&responseTime=${ipn.responseTime}&resultCode=0&transId=999`
  ipn.signature = hmac('sha256', 'SK', raw)
  assert.deepEqual(momoVerify(ipn, 'AK', 'SK'), { code: 'HK2610170002', amount: 1_500_000, ok: true, ref: '999' })
  assert.equal(momoVerify({ ...ipn, amount: 1 }, 'AK', 'SK'), null)
})

test('nhập CSV Taobao: đọc file mẫu, báo lỗi dòng sai', () => {
  const sample = readFileSync(new URL('../docs/mau-nhap-taobao.csv', import.meta.url), 'utf8')
  const { items, errors } = rowsToProducts(parseCsv(sample))
  assert.deepEqual(errors, [])
  assert.equal(items.length, 2)
  assert.equal(items[0].product.kind, 'doll')
  assert.equal(items[0].cost.yuan, 1056)
  assert.equal(items[0].product.stock_type, 'order')
  assert.equal(items[1].product.kind, 'wig')
  assert.equal(items[1].product.stock_type, 'co-san')
  // dấu phẩy thập phân kiểu Việt, ngoặc kép có dấu phẩy, cột sai
  const bad = rowsToProducts(parseCsv('sku;ten;danh_muc;gia_te;can_nang_kg\nA1;"Váy, ren";trang-phuc;45;0,15\nA2;X;khong-co;0;1\n'))
  assert.equal(bad.items[0].product.name, 'Váy, ren')
  assert.equal(bad.items[0].cost.weight_kg, 0.15)
  assert.equal(bad.errors.length, 1)
  assert.match(bad.errors[0], /Dòng 3/)
  assert.ok(rowsToProducts(parseCsv('ten,gia\nx,1')).errors[0].startsWith('Thiếu cột'))
})

test('nhập CSV: số kiểu Việt/Anh, trùng SKU, gõ sai, file trống, bảng mã Excel', () => {
  assert.equal(num('0,15'), 0.15)
  assert.equal(num('1.056,5', true), 1056.5)
  assert.equal(num('1,056.5', true), 1056.5)
  assert.equal(num('1,056', true), 1056)
  assert.equal(num('1.056', true), 1056)
  assert.equal(num('0,150'), 0.15)
  assert.equal(num('¥45'), 45)
  assert.equal(num('12,5', true), 12.5)
  const r = rowsToProducts(parseCsv('sku,ten,danh_muc,gia_te,can_nang_kg,tinh_trang,mau_da\na1,X,toc-gia,"1,056",0.1,,\nA1,Y,toc-gia,45,0.1,,\nB1,Z,toc-gia,45,0.1,co san,\nC1,W,bjd-1-4,900,1.5,order,hong\n'))
  assert.equal(r.items.length, 1)
  assert.equal(r.items[0].cost.yuan, 1056)
  assert.match(r.errors[0], /Dòng 3: SKU A1 trùng với dòng 2/)
  assert.match(r.errors[1], /tinh_trang "co san"/)
  assert.match(r.errors[2], /mau_da "hong"/)
  assert.deepEqual(rowsToProducts(parseCsv('')).errors, ['File trống'])
  // "Búp bê" lưu bằng Windows-1258
  assert.equal(decodeCsv(new Uint8Array([0x42, 0xfa, 0x70, 0x20, 0x62, 0xea])), 'Búp bê')
  assert.equal(decodeCsv(new TextEncoder().encode('Búp bê')), 'Búp bê')
})
