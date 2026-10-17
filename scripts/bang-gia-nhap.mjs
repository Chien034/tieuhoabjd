// Sinh docs/bang-gia-nhap.md và docs/bang-gia-nhap.csv từ dữ liệu sản phẩm:  node scripts/bang-gia-nhap.mjs
import { writeFileSync } from 'node:fs'
import { PRODUCTS, CATEGORIES } from '../src/lib/data.js'
import { landedCost, DEFAULT_IMPORT as S } from '../src/lib/importCost.js'

const v = n => Math.round(n).toLocaleString('vi-VN')
const rows = PRODUCTS.map(p => ({ p, c: landedCost({ ...p.cost, kind: p.kind, scale: p.scale === 'all' ? '1/4' : p.scale }, S) }))
let md = `# Bảng tính chi phí nhập BJD (Taobao → Việt Nam)\n\n`
md += `> Giá tệ là **giá tham khảo mặt bằng Taobao (10/2026)**, chưa phải giá của một link cụ thể. Trước khi nhập: dán link thật + giá + cân nặng trong Quản trị → Sản phẩm, web tự tính lại.\n\n`
md += `**Thông số:** tỷ giá ${v(S.rate)} đ/tệ · phí mua hộ ${S.servicePct}% · cước Trung → Việt ${v(S.shipPerKg)} đ/kg · bảo hiểm búp bê ${S.insurancePct}% · chi phí khác ${S.overheadPct}% · đóng gói 1/3 80k, 1/4 50k, 1/6 30k, 1/8 20k · lãi: búp bê ${S.marginDoll}%, phụ kiện ${S.marginAcc}%, món nhỏ (vốn < ${v(S.smallUnder)} đ) ${S.marginSmall}%.\n\n`
for (const cat of CATEGORIES) {
  const list = rows.filter(r => r.p.category === cat.slug)
  if (!list.length) continue
  md += `## ${cat.name}\n\n| Sản phẩm | Giá Taobao (¥) | kg | Giá vốn về VN | Giá bán | Lãi/món |\n|---|--:|--:|--:|--:|--:|\n`
  for (const { p, c } of list) md += `| ${p.name} | ${p.cost.yuan} | ${p.cost.weight_kg} | ${v(c.cost)} | **${v(p.price)}** | ${v(p.price - c.cost)} |\n`
  md += '\n'
}
const sumCost = rows.reduce((s, r) => s + r.c.cost, 0), sumPrice = rows.reduce((s, r) => s + r.p.price, 0)
md += `**Nhập mỗi mẫu 1 cái (${rows.length} mẫu):** vốn ${v(sumCost)} đ → doanh thu ${v(sumPrice)} đ → lãi gộp ${v(sumPrice - sumCost)} đ (chưa trừ mặt bằng, quảng cáo, nhân sự).\n`
writeFileSync(new URL('../docs/bang-gia-nhap.md', import.meta.url), md)
const csv = '﻿Danh mục,Sản phẩm,SKU,Giá Taobao (tệ),Cân nặng (kg),Tiền hàng,Phí mua hộ,Cước về VN,Đóng gói,Bảo hiểm,Chi phí khác,Giá vốn,Giá bán,Lãi\n' +
  rows.map(({ p, c }) => [CATEGORIES.find(x => x.slug === p.category).name, p.name, p.sku, p.cost.yuan, p.cost.weight_kg, c.goods, c.service, c.intl, c.packing, c.insurance, c.overhead, c.cost, p.price, p.price - c.cost].map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n')
writeFileSync(new URL('../docs/bang-gia-nhap.csv', import.meta.url), csv)
console.log('docs/bang-gia-nhap.md + .csv', rows.length, 'mẫu', v(sumCost), '→', v(sumPrice))
