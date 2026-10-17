import { test } from 'node:test'
import assert from 'node:assert/strict'
import { answer, readFilters, findProducts, norm, greeting } from '../src/lib/assistant.js'
import { groupThreads, normalizeAssistant } from '../src/lib/chatData.js'
import { PRODUCTS, STORES } from '../src/lib/data.js'

const ctx = { products: PRODUCTS, stores: STORES, info: { name: 'Tiểu Hoa BJD', hotline: '0900 000 000', shipping_fee: 25_000, free_ship_from: 800_000, bank_id: 'VCB', bank_account: '0123456789', bank_account_name: 'TIEU HOA' } }

test('trợ lý: câu hỏi thường gặp lấy số liệu từ cài đặt cửa hàng', () => {
  const ship = answer('Phí ship bao nhiêu vậy shop?', ctx)
  assert.match(ship.text, /25\.000/); assert.match(ship.text, /800\.000/)
  assert.match(answer('chuyển khoản số tài khoản nào', ctx).text, /VCB 0123456789/)
  assert.match(answer('hotline shop', ctx).text, /0900 000 000/)
  assert.match(answer('Cách đặt hàng', ctx).text, /Thêm vào giỏ/)
  assert.match(answer('hàng order bao lâu về, cọc bao nhiêu', ctx).text, /50%/)
  assert.match(answer('bị lỗi đúc thì đổi trả sao', ctx).text, /48 giờ/)
  assert.match(answer('Chọn size BJD', ctx).text, /1\/4/)
  assert.match(answer('shop ở đâu', ctx).text, /Showroom Hà Nội/)
  assert.equal(answer('cho mình gặp nhân viên', ctx).action, 'live')
  assert.equal(greeting(ctx).mood, 'chao')
})

test('trợ lý: tìm sản phẩm theo tỉ lệ, loại, giá, có sẵn', () => {
  assert.deepEqual(readFilters(norm('tóc giả 1/4 từ 300k')), { scale: '1/4', cat: 'toc-gia', min: 300_000 })
  assert.deepEqual(readFilters(norm('búp bê nhỏ hơn 2 triệu')), { kind: 'doll', max: 2_000_000 })
  const a = answer('tóc giả 1/6', ctx)
  assert.ok(a.products.length > 0 && a.products.every(p => p.category === 'toc-gia' && (p.scale === '1/6' || p.scale === 'all')))
  const s = answer('Búp bê có sẵn', ctx)
  assert.ok(s.products.every(p => p.kind === 'doll' && p.stock_type === 'co-san'))
  const cheap = findProducts(PRODUCTS, 'búp bê dưới 2 triệu')
  assert.ok(cheap.items.every(p => p.price <= 2_000_000))
  assert.match(answer('Lam Nguyệt', ctx).products[0].name, /Lam Nguyệt/)
  // không có mẫu trong khoảng giá thì gợi ý mẫu gần nhất
  const near = answer('búp bê 1/3 dưới 100k', ctx)
  assert.ok(near.products?.length && /gần nhất/.test(near.text))
})

test('trợ lý: mã đơn và câu không hiểu', () => {
  assert.equal(answer('kiểm tra đơn HK2610170001 giúp mình', ctx).links[0].to, '/tra-cuu-don-hang?ma=HK2610170001')
  const u = answer('qwerty zxcv', ctx)
  assert.ok(u.unknown); assert.ok(u.chips.includes('Gặp nhân viên'))
})

test('chat: gom tin nhắn theo khách, đếm chưa đọc', () => {
  const m = (c, s, t, seen = false) => ({ id: c + t, customer_id: c, sender: s, body: 'x', seen, created_at: '2026-10-17T0' + t + ':00:00Z' })
  const th = groupThreads([m('a', 'khach', 1), m('a', 'shop', 2), m('b', 'khach', 3), m('b', 'khach', 4), m('a', 'khach', 5, true)], { a: { full_name: 'An' } })
  assert.deepEqual(th.map(t => [t.customer_id, t.unread, t.name]), [['a', 1, 'An'], ['b', 2, 'Khách']])
  assert.deepEqual(normalizeAssistant({ name: ' Nguyệt ', image: 'javascript:alert(1)' }, true), { name: 'Nguyệt' })
})
