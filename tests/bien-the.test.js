import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { applyVariants, normalizeVariants, variantErrors, parseVariantCell, priceRange, unitPrice, unitStock, youtubeId, videoFileError } from '../src/lib/variants.js'
import { num, parseCsv, rowsToProducts, CSV_COLUMNS } from '../src/lib/csvImport.js'

const base = { id: 'p1', price: 1, stock: 0, stock_type: 'co-san' }

test('biến thể: giá từ = giá thấp nhất, tồn = tổng, giá gốc theo biến thể rẻ nhất', () => {
  const p = applyVariants(base, [
    { name: 'Kèm tóc + mắt', price: '2.900.000', stock: 2 },
    { name: 'Bản thường', price: 2_500_000, compare_price: 2_800_000, stock: 3 },
    { name: '   ', price: 1 }, // dòng trống bị bỏ
  ])
  assert.equal(p.variants.length, 2)
  assert.equal(p.price, 2_500_000)
  assert.equal(p.compare_price, 2_800_000)
  assert.equal(p.stock, 5)
  assert.deepEqual(priceRange(p), { min: 2_500_000, max: 2_900_000 })
  const v = p.variants[0]
  assert.equal(unitPrice(p, v.id), 2_900_000)
  assert.equal(unitStock(p, v.id), 2)
  assert.equal(unitPrice(p, 'khong-co'), 2_500_000)
  // hàng đặt trước: tồn không theo biến thể
  const o = applyVariants({ ...base, stock_type: 'order', stock: 99 }, [{ name: 'A', price: 5, stock: 0 }])
  assert.equal(o.stock, 99)
  assert.equal(unitStock(o, o.variants[0].id), 99)
  // bỏ hết biến thể → về sản phẩm thường
  assert.deepEqual(applyVariants({ ...base, price: 7 }, []).variants, [])
  assert.equal(applyVariants({ ...base, price: 7 }, []).price, 7)
})

test('biến thể: giữ mã cũ, mã trùng thì cấp mã mới, báo lỗi giá / tên trùng', () => {
  const list = normalizeVariants([{ id: 'a', name: 'X', price: 1 }, { id: 'a', name: 'Y', price: 2 }])
  assert.equal(list[0].id, 'a')
  assert.notEqual(list[1].id, 'a')
  assert.deepEqual(variantErrors(normalizeVariants([{ name: 'X', price: 0 }])), ['Biến thể "X" cần giá bán > 0'])
  assert.equal(variantErrors(normalizeVariants([{ name: 'X', price: 5 }, { name: 'x', price: 6 }])).length, 1)
  assert.equal(variantErrors(normalizeVariants([{ name: 'X', price: 5, compare_price: 5 }])).length, 1)
  assert.equal(normalizeVariants([{ name: 'X', price: 5, image: 'javascript:alert(1)' }])[0].image, '')
})

test('CSV: cột bien_the và video không bắt buộc', () => {
  assert.deepEqual(parseVariantCell('Nude:5.200.000 | Full set: 5.630.000 : 2 | Bản "A:B":100.000', num).variants,
    [{ name: 'Nude', price: 5_200_000, stock: null }, { name: 'Full set', price: 5_630_000, stock: 2 }, { name: 'Bản "A:B"', price: 100_000, stock: null }])
  assert.equal(parseVariantCell('Không giá', num).errors.length, 1)
  assert.ok(CSV_COLUMNS.includes('bien_the') && CSV_COLUMNS.includes('video'))
  const head = 'sku,ten,danh_muc,gia_te,can_nang_kg,tinh_trang,bien_the,video'
  const r = rowsToProducts(parseCsv(`${head}\nTB1,Búp,bjd-1-4,1056,1.5,co-san,"Nude:5.200.000 | Full set:5.630.000:3",https://youtu.be/dQw4w9WgXcQ\nTB2,Tóc,toc-gia,30,0.1,,,\nTB3,Mắt,mat,20,0.03,,Lỗi,ftp://x`))
  assert.equal(r.errors.length, 1)
  assert.match(r.errors[0], /Dòng 4: .*biến thể "Lỗi".*video/)
  const [a, b] = r.items
  assert.deepEqual(a.product.variants.map(v => [v.name, v.price, v.stock]), [['Nude', 5_200_000, 1], ['Full set', 5_630_000, 3]])
  assert.deepEqual(a.product.videos, ['https://youtu.be/dQw4w9WgXcQ'])
  assert.deepEqual(a.has, { variants: true, videos: true })
  assert.deepEqual([b.product.variants, b.product.videos, b.has.variants], [[], [], false])
  // file mẫu cũ (không có cột mới) vẫn đọc được
  const old = rowsToProducts(parseCsv(readFileSync(new URL('../docs/mau-nhap-taobao.csv', import.meta.url), 'utf8')))
  assert.ok(old.items.length > 0 && old.items.every(i => i.product.variants.length === 0))
})

test('video: nhận link YouTube, chặn file sai loại / quá 50 MB', () => {
  assert.equal(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3'), 'dQw4w9WgXcQ')
  assert.equal(youtubeId('https://youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ')
  assert.equal(youtubeId('https://cdn.x.vn/a.mp4'), null)
  assert.equal(videoFileError({ name: 'a.mp4', type: 'video/mp4', size: 10 * 1048576 }), '')
  assert.equal(videoFileError({ name: 'a.MOV', type: '', size: 1 }), '')
  assert.match(videoFileError({ name: 'a.avi', type: 'video/x-msvideo', size: 1 }), /MP4, WEBM, MOV/)
  assert.match(videoFileError({ name: 'b.mp4', type: 'video/mp4', size: 51 * 1048576 }), /tối đa 50 MB/)
})

test('SQL chạy một lần khớp schema.sql', () => {
  const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8')
  const mig = readFileSync(new URL('../supabase/video-bien-the.sql', import.meta.url), 'utf8')
  const fn = (sql, name) => sql.slice(sql.indexOf(`create or replace function public.${name}`), sql.indexOf('$$;', sql.indexOf(`create or replace function public.${name}`)))
  for (const name of ['variant_stock_add', 'place_order', 'order_changed']) {
    assert.ok(fn(mig, name).length > 50, name)
    assert.equal(fn(mig, name), fn(schema, name), name)
  }
  assert.match(mig, /video-san-pham/)
  assert.match(mig, /add column if not exists variants/)
})
