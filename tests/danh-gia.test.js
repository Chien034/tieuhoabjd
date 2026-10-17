import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { reviewSummary, withCounters, soldFromOrders, reviewSlots, normalizeReview, reviewError, soldBonus, fmtSold } from '../src/lib/reviews.js'

test('chưa có đánh giá: điểm 0, không phải 5.0', () => {
  const s = reviewSummary([])
  assert.equal(s.count, 0)
  assert.equal(s.avg, 0)
  assert.deepEqual(s.pct, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })
})

test('điểm trung bình và tỉ lệ % theo số sao', () => {
  const s = reviewSummary([{ rating: 5 }, { rating: 5 }, { rating: 4 }, { rating: 1 }])
  assert.equal(s.count, 4)
  assert.equal(s.avg, 3.8)
  assert.equal(s.pct[5], 50)
  assert.equal(s.pct[4], 25)
  assert.equal(s.pct[1], 25)
  assert.equal(s.pct[3], 0)
})

test('lượt mua = đơn đã giao + số shop cộng thêm', () => {
  const orders = [
    { id: 'o1', user_id: 'u1', status: 'da_giao', created_at: '2026-10-01', items: [{ product_id: 'p1', qty: 2 }] },
    { id: 'o2', user_id: 'u1', status: 'dang_giao', created_at: '2026-10-02', items: [{ product_id: 'p1', qty: 5 }] },
    { id: 'o3', user_id: 'u2', status: 'da_huy', created_at: '2026-10-03', items: [{ product_id: 'p1', qty: 1 }] },
    { id: 'o4', user_id: 'u1', status: 'da_giao', created_at: '2026-10-04', items: [{ product_id: 'p1', qty: 1 }, { product_id: 'p2', qty: 1 }] },
  ]
  const sold = soldFromOrders(orders)
  assert.deepEqual(sold, { p1: 3, p2: 1 })
  const reviews = [{ id: 'r1', product_id: 'p1', order_id: 'o1', rating: 4 }]
  const p = withCounters({ id: 'p1', sold_bonus: 10, rating: 5, review_count: 99 }, sold, reviews)
  assert.equal(p.sold, 13)
  assert.equal(p.sold_real, 3)
  assert.equal(p.rating, 4)
  assert.equal(p.review_count, 1)
  // mỗi đơn đã giao một lần đánh giá; đơn chưa giao không tính
  const slots = reviewSlots(orders, reviews, 'u1', 'p1')
  assert.deepEqual(slots.map(x => [x.order_id, x.review_id]), [['o1', 'r1'], ['o4', null]])
  assert.deepEqual(reviewSlots(orders, reviews, 'u2', 'p1'), [])
})

test('kiểm tra đánh giá của khách và của shop', () => {
  assert.equal(reviewError(normalizeReview({ product_id: 'p1', rating: 5, content: 'ok' })), 'Vui lòng viết ít nhất vài chữ')
  assert.equal(reviewError(normalizeReview({ product_id: 'p1', rating: 5, content: 'Đẹp lắm ạ' })), '')
  const shop = normalizeReview({ product_id: 'p1', rating: 9, name: '  Mây  ', content: 'Xinh', images: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], created_at: '2026-09-01' }, { shop: true })
  assert.equal(shop.rating, 5)
  assert.equal(shop.name, 'Mây')
  assert.equal(shop.images.length, 6)
  assert.equal(reviewError(shop, { shop: true }), '')
  assert.equal(reviewError({ ...shop, name: '' }, { shop: true }), 'Nhập nickname người đánh giá')
  assert.equal(normalizeReview({ images: ['a', 'b', 'c', 'd'] }).images.length, 3)
  assert.equal(soldBonus('1.200'), 1200)
  assert.equal(soldBonus(-5), 0)
  assert.equal(fmtSold(1500), '1.5k')
  assert.equal(fmtSold(2000), '2k')
})

test('SQL đánh giá: schema.sql chứa đúng khối của danh-gia-luot-mua.sql, khách không ghi thẳng bảng reviews', () => {
  const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8')
  const mig = readFileSync(new URL('../supabase/danh-gia-luot-mua.sql', import.meta.url), 'utf8')
  const block = mig.slice(mig.indexOf('-- ---------------------------------------------------------------- LƯỢT MUA'), mig.indexOf("\nselect 'Xong"))
  assert.ok(block.length > 1000)
  assert.ok(schema.includes(block))
  assert.ok(!/viết của tôi|sửa của tôi/.test(schema))
  assert.ok(!/unique \(product_id, user_id\)/.test(schema))
})
