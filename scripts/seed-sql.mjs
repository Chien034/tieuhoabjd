// Sinh supabase/seed.sql từ src/lib/data.js:  node scripts/seed-sql.mjs
import { writeFileSync } from 'node:fs'
import { CATEGORIES, PRODUCTS, STORES, COUPONS } from '../src/lib/data.js'

const q = v => (v === null || v === undefined ? 'null'
  : typeof v === 'object' && !Array.isArray(v) ? `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`
  : Array.isArray(v) ? `array[${v.map(q).join(',')}]::text[]`
    : typeof v === 'number' || typeof v === 'boolean' ? String(v)
      : `'${String(v).replace(/'/g, "''")}'`)
const rows = (table, cols, list, conflict) =>
  `insert into public.${table} (${cols.join(', ')}) values\n` +
  list.map(r => '  (' + cols.map(c => q(r[c])).join(', ') + ')').join(',\n') +
  `\non conflict (${conflict}) do update set ${cols.filter(c => c !== conflict).map(c => `${c} = excluded.${c}`).join(', ')};\n\n`

const P_COLS = ['id', 'slug', 'sku', 'name', 'category', 'kind', 'scale', 'skin', 'set_type', 'gender', 'stock_type', 'lead_days', 'look', 'price', 'compare_price', 'sizes', 'stock', 'collection', 'tags', 'rating', 'review_count', 'sold', 'description', 'images', 'active', 'created_at']

let sql = '-- Dữ liệu mẫu. Sinh tự động bởi scripts/seed-sql.mjs — chạy sau schema.sql. Chạy lại được.\n\n'
sql += rows('categories', ['slug', 'name', 'grp', 'sort'], CATEGORIES, 'slug')
sql += rows('products', P_COLS, PRODUCTS, 'id')
sql += rows('stores', ['id', 'name', 'city', 'district', 'address', 'phone', 'hours'], STORES, 'id')
sql += "select setval('public.stores_id_seq', (select max(id) from public.stores));\n\n"
sql += '-- Giá nhập tham khảo (bảng chỉ quản trị đọc được)\n'
sql += rows('product_costs', ['product_id', 'yuan', 'weight_kg', 'cn_ship_yuan', 'source_url'], PRODUCTS.map(p => ({ product_id: p.id, ...p.cost })), 'product_id')
sql += rows('coupons', ['code', 'kind', 'value', 'max_discount', 'min_order', 'description'], COUPONS, 'code')
writeFileSync(new URL('../supabase/seed.sql', import.meta.url), sql)
console.log(`seed.sql: ${CATEGORIES.length} danh mục, ${PRODUCTS.length} sản phẩm, ${STORES.length} showroom`)
