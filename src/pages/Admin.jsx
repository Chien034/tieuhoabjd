import { useEffect, useMemo, useState } from 'react'
import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { api, DEMO } from '../lib/api.js'
import { useShop } from '../lib/store.jsx'
import { vnd, date, dateTime, ORDER_STATUS, PAYMENT_STATUS, paymentName } from '../lib/format.js'
import { CATEGORIES, SCALES, SKINS, GENDERS, SETS, STOCK_TYPES, KINDS, COLLECTIONS, slugify } from '../lib/data.js'
import { landedCost, DEFAULT_IMPORT } from '../lib/importCost.js'
import { download, toCsv } from '../lib/images.js'
import { decodeCsv, parseCsv, rowsToProducts, CSV_COLUMNS } from '../lib/csvImport.js'
import { Badge, Field, Modal, Spinner } from '../components/ui.jsx'
import ProductArt from '../components/ProductArt.jsx'
import { OrderView } from './Order.jsx'
import { INFO_FIELDS, BANK_FIELDS, normalizeInfo } from '../lib/shopInfo.js'

function useOrders() {
  const [list, setList] = useState(null)
  const load = () => api.admin.orders().then(setList).catch(() => setList([]))
  useEffect(() => { load() }, [])
  return [list, load, setList]
}

function Dashboard() {
  const [orders] = useOrders()
  const { products } = useShop()
  const s = useMemo(() => {
    if (!orders) return null
    const valid = orders.filter(o => o.status !== 'da_huy')
    const today = new Date().toDateString()
    const month = new Date().toISOString().slice(0, 7)
    const sum = arr => arr.reduce((t, o) => t + o.total, 0)
    const top = new Map()
    valid.forEach(o => o.items.forEach(i => top.set(i.name, (top.get(i.name) || 0) + i.qty)))
    const days = [...Array(14)].map((_, k) => { const d = new Date(); d.setDate(d.getDate() - 13 + k); return d })
    return {
      today: sum(valid.filter(o => new Date(o.created_at).toDateString() === today)),
      month: sum(valid.filter(o => o.created_at.slice(0, 7) === month)),
      count: valid.length,
      pending: orders.filter(o => o.status === 'cho_xac_nhan').length,
      unpaid: valid.filter(o => ['chua_thanh_toan', 'that_bai'].includes(o.payment_status) && o.payment_method !== 'cod').length,
      deposits: valid.filter(o => o.payment_status === 'da_coc').length,
      top: [...top.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
      chart: days.map(d => ({ d, v: sum(valid.filter(o => new Date(o.created_at).toDateString() === d.toDateString())) })),
    }
  }, [orders])
  if (!s) return <Spinner />
  const low = (products || []).filter(p => p.stock_type === 'co-san' && p.stock <= 2).slice(0, 10)
  const max = Math.max(1, ...s.chart.map(c => c.v))
  return (
    <div>
      <div className="stats">
        <div className="stat"><small>Doanh thu hôm nay</small><b>{vnd(s.today)}</b></div>
        <div className="stat"><small>Doanh thu tháng này</small><b>{vnd(s.month)}</b></div>
        <div className="stat"><small>Tổng đơn (không tính hủy)</small><b>{s.count}</b></div>
        <div className="stat warn"><small>Chờ xác nhận</small><b>{s.pending}</b></div>
        <div className="stat"><small>Chờ thanh toán</small><b>{s.unpaid}</b></div>
        <div className="stat"><small>Đã cọc, chờ hàng về</small><b>{s.deposits}</b></div>
      </div>
      <div className="panel">
        <h3>Doanh thu 14 ngày</h3>
        <div className="bars" role="img" aria-label="Biểu đồ doanh thu 14 ngày">
          {s.chart.map(c => <div key={c.d.toISOString()} className="bar-col" title={`${c.d.toLocaleDateString('vi-VN')}: ${vnd(c.v)}`}><i style={{ height: (c.v / max) * 100 + '%' }} /><small>{c.d.getDate()}</small></div>)}
        </div>
      </div>
      <div className="order-cols">
        <div className="panel"><h3>Bán chạy</h3>{s.top.length ? <table className="table compact"><tbody>{s.top.map(([n, q]) => <tr key={n}><td>{n}</td><td className="r">{q}</td></tr>)}</tbody></table> : <p className="muted">Chưa có đơn.</p>}</div>
        <div className="panel"><h3>Sắp hết hàng</h3>{low.length ? <table className="table compact"><tbody>{low.map(p => <tr key={p.id}><td>{p.name}</td><td className="r bad-text">{p.stock}</td></tr>)}</tbody></table> : <p className="muted">Không có.</p>}</div>
      </div>
    </div>
  )
}

function Orders() {
  const [list, load, setList] = useOrders()
  const { toast, reloadProducts } = useShop()
  const [q, setQ] = useState('')
  const [st, setSt] = useState('')
  const [open, setOpen] = useState(null)
  if (!list) return <Spinner />
  const shown = list.filter(o => (!st || o.status === st) && (!q || `${o.code} ${o.full_name} ${o.phone} ${o.email}`.toLowerCase().includes(q.toLowerCase())))
  const update = async (o, patch, note) => {
    try {
      const n = await api.admin.updateOrder(o.id, patch, note)
      setList(l => l.map(x => (x.id === o.id ? n : x))); if (open?.id === o.id) setOpen(n)
      if (patch.status === 'da_huy') reloadProducts()
      toast('Đã cập nhật đơn ' + o.code)
    } catch (e) { toast(e.message, 'bad') }
  }
  const exportCsv = () => {
    const rows = [['Mã', 'Ngày', 'Khách', 'SĐT', 'Email', 'Nhận hàng', 'Thanh toán', 'TT thanh toán', 'Trạng thái', 'Tổng']]
      .concat(shown.map(o => [o.code, dateTime(o.created_at), o.full_name, o.phone, o.email, o.delivery === 'pickup' ? 'Tại cửa hàng' : o.address, paymentName(o.payment_method), PAYMENT_STATUS[o.payment_status]?.label, ORDER_STATUS[o.status]?.label, o.total]))
    const csv = '﻿' + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'don-hang.csv'; a.click()
  }
  return (
    <div className="panel">
      <div className="row gap wrap mb">
        <input className="input auto grow" placeholder="Tìm mã đơn, tên, SĐT, email…" value={q} onChange={e => setQ(e.target.value)} />
        <select className="input auto" value={st} onChange={e => setSt(e.target.value)}><option value="">Mọi trạng thái</option>{Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
        <button className="btn ghost sm" onClick={load}>Tải lại</button>
        <button className="btn ghost sm" onClick={exportCsv}>Xuất CSV</button>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Mã đơn</th><th>Ngày</th><th>Khách hàng</th><th>Thanh toán</th><th className="r">Tổng</th><th>Trạng thái</th></tr></thead>
          <tbody>
            {shown.map(o => (
              <tr key={o.id}>
                <td><button className="link-btn" onClick={() => setOpen(o)}><b>{o.code}</b></button></td>
                <td>{date(o.created_at)}</td>
                <td>{o.full_name}<br /><small className="muted">{o.phone}</small></td>
                <td><small>{o.payment_method.toUpperCase()}</small><br /><Badge tone={PAYMENT_STATUS[o.payment_status]?.tone}>{PAYMENT_STATUS[o.payment_status]?.label}</Badge></td>
                <td className="r"><b>{vnd(o.total)}</b></td>
                <td>
                  <select className="input sm" value={o.status} onChange={e => update(o, { status: e.target.value })} disabled={o.status === 'da_huy'}>
                    {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shown.length === 0 && <p className="muted center">Không có đơn hàng.</p>}
      {open && (
        <Modal title={'Đơn ' + open.code} onClose={() => setOpen(null)} wide>
          <div className="row gap wrap mb">
            {open.deposit > 0 && ['chua_thanh_toan', 'that_bai'].includes(open.payment_status) && open.status !== 'da_huy' && <button className="btn sm" onClick={() => update(open, { payment_status: 'da_coc' }, 'Xác nhận đã nhận cọc ' + vnd(open.deposit))}>Đã nhận cọc {vnd(open.deposit)}</button>}
            {!['da_thanh_toan', 'hoan_tien'].includes(open.payment_status) && open.status !== 'da_huy' && <button className="btn sm" onClick={() => update(open, { payment_status: 'da_thanh_toan' }, 'Xác nhận đã nhận đủ tiền')}>Đã nhận đủ tiền</button>}
            {['da_thanh_toan', 'da_coc'].includes(open.payment_status) && open.status === 'da_huy' && <button className="btn ghost sm" onClick={() => update(open, { payment_status: 'hoan_tien' }, 'Đã hoàn tiền cho khách')}>Đánh dấu đã hoàn tiền</button>}
            {open.status === 'cho_xac_nhan' && <button className="btn sm" onClick={() => update(open, { status: 'da_xac_nhan' })}>Xác nhận đơn</button>}
            {open.status === 'da_xac_nhan' && <button className="btn sm" onClick={() => update(open, { status: 'dang_giao' })}>{open.delivery === 'pickup' ? 'Báo sẵn sàng nhận' : 'Giao cho vận chuyển'}</button>}
            {open.status === 'dang_giao' && <button className="btn sm" onClick={() => update(open, { status: 'da_giao' })}>Đã giao</button>}
            {open.status !== 'da_huy' && open.status !== 'da_giao' && <button className="btn ghost sm danger" onClick={() => { const r = prompt('Lý do hủy?'); if (r !== null) update(open, { status: 'da_huy' }, r) }}>Hủy đơn</button>}
          </div>
          <OrderView order={open} />
        </Modal>
      )}
    </div>
  )
}

const EMPTY = { name: '', sku: '', category: 'bjd-1-4', kind: 'doll', scale: '1/4', skin: 'trang-hong', gender: 'nu', set_type: 'fullset', stock_type: 'order', lead_days: 35, price: 0, compare_price: null, sizes: [], stock: 99, collection: null, tags: [], rating: 5, review_count: 0, sold: 0, description: '', images: [], active: true, look: { hair: 0, eye: 0, outfit: 0 } }
function ImageManager({ images, onChange }) {
  const { toast } = useShop()
  const [busy, setBusy] = useState(0)
  const [url, setUrl] = useState('')
  const add = async files => {
    const list = [...files].filter(f => f.type.startsWith('image/'))
    if (!list.length) return
    setBusy(list.length)
    const got = []
    for (const f of list) {
      try { got.push(await api.admin.uploadImage(f)) } catch (e) { toast(e.message, 'bad') }
      setBusy(n => n - 1)
    }
    if (got.length) { onChange([...images, ...got]); toast(`Đã tải lên ${got.length} ảnh`) }
  }
  const move = (i, d) => { const a = [...images]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; onChange(a) }
  return (
    <fieldset className="img-fs" onPaste={e => add(e.clipboardData.files)}
      onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); add(e.dataTransfer.files) }}>
      <legend>Ảnh sản phẩm ({images.length}) — ảnh đầu tiên là ảnh đại diện</legend>
      <div className="img-list">
        {images.map((src, i) => (
          <div key={src.slice(-60) + i} className="img-item">
            <img src={src} alt={'Ảnh ' + (i + 1)} />
            <div className="img-tools">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Lên trước">◀</button>
              <button type="button" onClick={() => onChange(images.filter((_, k) => k !== i))} aria-label="Xóa ảnh">✕</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label="Ra sau">▶</button>
            </div>
          </div>
        ))}
        <label className="img-add">
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={e => { add(e.target.files); e.target.value = '' }} />
          {busy ? `Đang tải ${busy} ảnh…` : <>+ Chọn ảnh<small>hoặc kéo thả / dán (Ctrl+V)</small></>}
        </label>
      </div>
      <div className="row gap">
        <input className="input" value={url} onChange={e => setUrl(e.target.value)} placeholder="…hoặc dán đường link ảnh (https://…)" />
        <button type="button" className="btn ghost sm" onClick={() => { if (/^https:\/\//.test(url.trim())) { onChange([...images, url.trim()]); setUrl('') } else toast('Link ảnh phải bắt đầu bằng https://', 'bad') }}>Thêm link</button>
      </div>
      <p className="muted small">Ảnh tự thu nhỏ còn tối đa 1200px trước khi tải lên. Chưa có ảnh thì web dùng hình minh họa.</p>
    </fieldset>
  )
}

function Backup() {
  const { toast } = useShop()
  const [busy, setBusy] = useState(false)
  const [last, setLast] = useState(null)
  const stamp = () => new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')
  const run = async kind => {
    setBusy(true)
    try {
      const b = await api.admin.backup()
      if (kind === 'json') download(`tieu-hoa-sao-luu-${stamp()}.json`, JSON.stringify(b, null, 1), 'application/json')
      if (kind === 'orders') {
        download(`don-hang-${stamp()}.csv`, toCsv([['Mã đơn', 'Ngày', 'Khách', 'SĐT', 'Email', 'Nhận hàng', 'Thanh toán', 'TT thanh toán', 'Trạng thái', 'Tạm tính', 'Giảm giá', 'Phí ship', 'Tổng', 'Tiền cọc', 'Sản phẩm']]
          .concat(b.orders.map(o => [o.code, dateTime(o.created_at), o.full_name, o.phone, o.email, o.delivery === 'pickup' ? 'Showroom' : o.address, paymentName(o.payment_method), PAYMENT_STATUS[o.payment_status]?.label, ORDER_STATUS[o.status]?.label, o.subtotal, o.discount, o.shipping_fee, o.total, o.deposit || 0, o.items.map(i => `${i.name} x${i.qty}`).join('; ')]))), 'text/csv')
      }
      if (kind === 'products') {
        download(`san-pham-gia-von-${stamp()}.csv`, toCsv([['SKU', 'Tên', 'Danh mục', 'Tỉ lệ', 'Tình trạng', 'Giá bán', 'Giá gốc', 'Tồn', 'Đã bán', 'Giá nhập (tệ)', 'Cân nặng (kg)', 'Giá vốn', 'Link nguồn', 'Đang bán']]
          .concat(b.products.map(p => { const c = p.cost?.yuan ? landedCost({ ...p.cost, kind: p.kind, scale: p.scale === 'all' ? '1/4' : p.scale }, b.import_settings) : null
            return [p.sku, p.name, p.category, p.scale, p.stock_type === 'order' ? 'Đặt trước' : 'Có sẵn', p.price, p.compare_price || '', p.stock, p.sold, p.cost?.yuan || '', p.cost?.weight_kg || '', c ? c.cost : '', p.cost?.source_url || '', p.active ? 'Có' : 'Ẩn'] }))), 'text/csv')
      }
      setLast(b); toast('Đã tải file về máy')
    } catch (e) { toast(e.message, 'bad') } finally { setBusy(false) }
  }
  return (
    <div className="panel">
      <h3>Sao lưu dữ liệu về máy</h3>
      <p>Bấm tải, trình duyệt lưu file vào thư mục <i>Tải xuống</i> — chuyển sang thư mục lưu trữ của shop (vd <b>{"E:\\Tiểu hoa kế toán"}</b>). Nên sao lưu hằng tuần.</p>
      <div className="row gap wrap">
        <button className="btn" disabled={busy} onClick={() => run('json')}>Toàn bộ dữ liệu (.json)</button>
        <button className="btn ghost" disabled={busy} onClick={() => run('orders')}>Đơn hàng (.csv, mở bằng Excel)</button>
        <button className="btn ghost" disabled={busy} onClick={() => run('products')}>Sản phẩm + giá vốn (.csv)</button>
      </div>
      {last && <p className="muted small mt">Lần tải gần nhất: {last.products.length} sản phẩm, {last.orders.length} đơn hàng, {last.customers.length} khách hàng.</p>}
      <p className="muted small">File .json chứa thông tin khách hàng và giá vốn — cất ở nơi an toàn, không gửi công khai.</p>
    </div>
  )
}

const EMPTY_COST = { yuan: '', weight_kg: '', cn_ship_yuan: 0, margin_pct: '', source_url: '' }

function CostBreakdown({ c }) {
  const rows = [['Tiền hàng', c.goods], ['Phí mua hộ', c.service], ['Ship nội địa TQ', c.cnShip], ['Cước về VN', c.intl], ['Đóng gói chống sốc', c.packing], ['Bảo hiểm', c.insurance], ['Chi phí khác (cổng TT, hao hụt)', c.overhead]]
  return (
    <div className="cost-box">
      <table className="table compact"><tbody>
        {rows.filter(r => r[1]).map(([k, v]) => <tr key={k}><td>{k}</td><td className="r">{vnd(v)}</td></tr>)}
        <tr className="strong"><td>Giá vốn về tới kho</td><td className="r">{vnd(c.cost)}</td></tr>
        <tr><td>Lãi {c.margin}%</td><td className="r ok-text">+{vnd(c.profit)}</td></tr>
        <tr className="strong"><td>Giá bán đề xuất</td><td className="r accent">{vnd(c.price)}</td></tr>
      </tbody></table>
    </div>
  )
}

function ProductForm({ value, cost: cost0, settings, onClose, onSaved }) {
  const { toast } = useShop()
  const [p, setP] = useState({ ...EMPTY, ...value })
  const [cost, setCost] = useState({ ...EMPTY_COST, ...(cost0 || {}) })
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setP(x => ({ ...x, [k]: v }))
  const setC = (k, v) => setCost(x => ({ ...x, [k]: v }))
  const kind = p.category.startsWith('bjd') ? 'doll' : KINDS[p.category]
  const calc = cost.yuan ? landedCost({ ...cost, kind, scale: p.scale === 'all' ? '1/4' : p.scale }, settings) : null
  const save = async e => {
    e.preventDefault()
    if (!p.name.trim() || !p.sku.trim() || !(p.price > 0)) return toast('Cần tên, mã SKU và giá bán > 0', 'bad')
    if (p.compare_price && p.compare_price <= p.price) return toast('Giá gốc phải lớn hơn giá bán (hoặc để trống)', 'bad')
    if (calc && p.price < calc.cost) return toast('Giá bán đang thấp hơn giá vốn ' + vnd(calc.cost), 'bad')
    setBusy(true)
    try {
      const row = { ...p, kind, set_type: kind === 'doll' ? p.set_type : null, skin: kind === 'doll' ? p.skin : null, slug: p.slug || slugify(p.name + ' ' + p.sku), compare_price: p.compare_price || null, collection: p.collection || null, lead_days: p.stock_type === 'order' ? Number(p.lead_days) || 30 : 0,
        cost: { yuan: Number(cost.yuan) || 0, weight_kg: Number(String(cost.weight_kg).replace(',', '.')) || 0, cn_ship_yuan: Number(cost.cn_ship_yuan) || 0, margin_pct: cost.margin_pct === '' ? null : Number(cost.margin_pct), source_url: cost.source_url.trim() } }
      await api.admin.saveProduct(row); toast('Đã lưu sản phẩm'); onSaved()
    } catch (x) { toast(x.message, 'bad') } finally { setBusy(false) }
  }
  const num = v => (v === '' ? null : Number(String(v).replace(/\D/g, '')))
  return (
    <Modal title={p.id ? 'Sửa sản phẩm' : 'Thêm sản phẩm'} onClose={onClose} wide>
      <form onSubmit={save} className="product-form">
        <fieldset className="cost-fs">
          <legend>Nguồn hàng & giá nhập (chỉ quản trị thấy)</legend>
          <div className="form-grid">
            <Field label="Link Taobao / 1688 / xưởng"><input className="input" value={cost.source_url} onChange={e => setC('source_url', e.target.value)} placeholder="https://item.taobao.com/item.htm?id=…" /></Field>
            <Field label="Giá nhập (tệ ¥)"><input className="input" value={cost.yuan} onChange={e => setC('yuan', e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" /></Field>
            <Field label="Cân nặng đóng gói (kg)" hint="Búp bê 1/4 ~1,5kg; 1/6 ~0,8kg"><input className="input" value={cost.weight_kg} onChange={e => setC('weight_kg', e.target.value)} inputMode="decimal" /></Field>
            <Field label="Ship nội địa TQ (¥)" hint="0 nếu shop free ship (包邮)"><input className="input" value={cost.cn_ship_yuan} onChange={e => setC('cn_ship_yuan', e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" /></Field>
            <Field label="Lãi riêng (%)" hint="Bỏ trống: theo cài đặt chung"><input className="input" value={cost.margin_pct ?? ''} onChange={e => setC('margin_pct', e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" /></Field>
          </div>
          {cost.source_url && /^https?:\/\//.test(cost.source_url) && <a href={cost.source_url} target="_blank" rel="noreferrer" className="small">Mở link nguồn ↗</a>}
          {calc && <div className="row gap wrap"><CostBreakdown c={calc} /><button type="button" className="btn sm" onClick={() => set('price', calc.price)}>Dùng giá đề xuất {vnd(calc.price)}</button></div>}
        </fieldset>
        <div className="pf-preview"><ProductArt product={{ ...p, kind, id: p.id || p.sku }} /></div>
        <div className="form-grid">
          <Field label="Tên sản phẩm"><input className="input" value={p.name} onChange={e => set('name', e.target.value)} /></Field>
          <Field label="Mã SKU"><input className="input" value={p.sku} onChange={e => set('sku', e.target.value.toUpperCase())} /></Field>
          <Field label="Danh mục"><select className="input" value={p.category} onChange={e => set('category', e.target.value)}>{CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></Field>
          <Field label="Tỉ lệ"><select className="input" value={p.scale} onChange={e => set('scale', e.target.value)}>{SCALES.map(c => <option key={c.key} value={c.key}>{c.name}</option>)}<option value="all">Mọi size</option></select></Field>
          {kind === 'doll' && <Field label="Bộ"><select className="input" value={p.set_type || 'fullset'} onChange={e => set('set_type', e.target.value)}>{SETS.map(c => <option key={c.key} value={c.key}>{c.name}</option>)}</select></Field>}
          {kind === 'doll' && <Field label="Màu da"><select className="input" value={p.skin || 'trang-hong'} onChange={e => set('skin', e.target.value)}>{SKINS.map(c => <option key={c.key} value={c.key}>{c.name}</option>)}</select></Field>}
          <Field label="Giới tính"><select className="input" value={p.gender} onChange={e => set('gender', e.target.value)}>{GENDERS.map(c => <option key={c.key} value={c.key}>{c.name}</option>)}</select></Field>
          <Field label="Tình trạng hàng"><select className="input" value={p.stock_type} onChange={e => set('stock_type', e.target.value)}>{STOCK_TYPES.map(c => <option key={c.key} value={c.key}>{c.name}</option>)}</select></Field>
          {p.stock_type === 'order' && <Field label="Thời gian về (ngày)"><input className="input" type="number" min="1" value={p.lead_days} onChange={e => set('lead_days', e.target.value)} /></Field>}
          <Field label="Giá bán (₫)"><input className="input" value={p.price ? p.price.toLocaleString('vi-VN') : ''} onChange={e => set('price', num(e.target.value) || 0)} inputMode="numeric" /></Field>
          <Field label="Giá gốc trước giảm (₫)" hint="Để trống nếu không giảm giá"><input className="input" value={p.compare_price ? p.compare_price.toLocaleString('vi-VN') : ''} onChange={e => set('compare_price', num(e.target.value))} inputMode="numeric" /></Field>
          <Field label="Tồn kho" hint="Hàng order: để số lớn (vd 99)"><input className="input" type="number" min="0" value={p.stock} onChange={e => set('stock', Math.max(0, parseInt(e.target.value) || 0))} /></Field>
          <Field label="Phong cách"><select className="input" value={p.collection || ''} onChange={e => set('collection', e.target.value || null)}><option value="">—</option>{COLLECTIONS.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></Field>
        </div>
        <ImageManager images={p.images || []} onChange={v => set('images', v)} />
        <div className="row gap wrap">
          {[['moi', 'Hàng mới'], ['ban-chay', 'Bán chạy'], ['flash', 'Flash sale']].map(([k, l]) => (
            <label key={k} className="check"><input type="checkbox" checked={(p.tags || []).includes(k)} onChange={e => set('tags', e.target.checked ? [...(p.tags || []), k] : (p.tags || []).filter(t => t !== k))} /> <span>{l}</span></label>
          ))}
          <label className="check"><input type="checkbox" checked={p.active} onChange={e => set('active', e.target.checked)} /> <span>Đang bán</span></label>
        </div>
        <Field label="Mô tả"><textarea className="input" rows={4} value={p.description} onChange={e => set('description', e.target.value)} /></Field>
        <button className="btn" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu sản phẩm'}</button>
      </form>
    </Modal>
  )
}

function useAdminCatalog() {
  const [all, setAll] = useState(null)
  const [costs, setCosts] = useState({})
  const [settings, setSettings] = useState(DEFAULT_IMPORT)
  const load = async () => {
    const [ps, cs, st] = await Promise.all([api.products({ includeInactive: true }), api.admin.costs(), api.admin.importSettings()])
    setAll(ps); setCosts(cs); setSettings(st)
  }
  useEffect(() => { load() }, [])
  return { all, costs, settings, setSettings, load }
}
const calcFor = (p, c, s) => (c?.yuan ? landedCost({ ...c, kind: p.kind, scale: p.scale === 'all' ? '1/4' : p.scale }, s) : null)

function CsvImport({ all, settings, onClose, onDone }) {
  const { toast } = useShop()
  const [res, setRes] = useState(null)
  const [busy, setBusy] = useState(false)
  const read = async file => {
    try { setRes(rowsToProducts(parseCsv(decodeCsv(await file.arrayBuffer())))) } catch (e) { toast('Không đọc được file: ' + e.message, 'bad') }
  }
  const bySku = new Map(all.map(p => [String(p.sku).toUpperCase(), p]))
  const rows = (res?.items || []).map(it => {
    const c = landedCost({ ...it.cost, kind: it.product.kind, scale: it.product.scale === 'all' ? '1/4' : it.product.scale }, settings)
    return { ...it, c, old: bySku.get(it.product.sku) }
  })
  const run = async () => {
    setBusy(true)
    let n = 0
    try {
      for (const r of rows) {
        // SKU đã có: cập nhật giá nhập + giá bán, giữ nguyên ảnh, mô tả, lượt bán
        const base = r.old ? { ...r.old, name: r.product.name, stock_type: r.product.stock_type, lead_days: r.product.lead_days } : { ...r.product, slug: slugify(r.product.name + ' ' + r.product.sku) }
        await api.admin.saveProduct({ ...base, price: r.c.price, cost: r.cost }); n++
      }
      toast(`Đã nhập ${n} sản phẩm`); onDone()
    } catch (e) { toast(`Lỗi sau ${n} sản phẩm: ${e.message}`, 'bad') } finally { setBusy(false) }
  }
  return (
    <Modal title="Nhập sản phẩm từ file CSV" onClose={onClose} wide>
      <p>File CSV (Excel → Lưu thành CSV UTF-8) gồm các cột: <code>{CSV_COLUMNS.join(', ')}</code>. <button className="link-btn" onClick={() => download('mau-nhap-taobao.csv', toCsv([CSV_COLUMNS, ['TB0001', 'Búp bê BJD 1/4 (tên mẫu) — Full set', 'bjd-1-4', '1/4', 'fullset', 'trang-hong', 'nu', 'order', 35, 1056, 1.5, 0, 'https://item.taobao.com/item.htm?id=...', '']]), 'text/csv')}>Tải file mẫu</button></p>
      <input type="file" accept=".csv,text/csv" onChange={e => e.target.files[0] && read(e.target.files[0])} />
      {res?.errors.length > 0 && <div className="notice warn small mt">{res.errors.map(e => <div key={e}>{e}</div>)}</div>}
      {rows.length > 0 && <>
        <div className="table-wrap mt">
          <table className="table compact">
            <thead><tr><th>SKU</th><th>Tên</th><th className="r">¥</th><th className="r">kg</th><th className="r">Giá vốn</th><th className="r">Giá bán</th><th></th></tr></thead>
            <tbody>{rows.map(r => <tr key={r.line}><td>{r.product.sku}</td><td>{r.product.name}</td><td className="r">{r.cost.yuan}</td><td className="r">{r.cost.weight_kg}</td><td className="r">{vnd(r.c.cost)}</td><td className="r"><b>{vnd(r.c.price)}</b></td><td>{r.old ? <Badge tone="info">Cập nhật</Badge> : <Badge tone="ok">Mới</Badge>}</td></tr>)}</tbody>
          </table>
        </div>
        <button className="btn mt" disabled={busy} onClick={run}>{busy ? 'Đang nhập…' : `Nhập ${rows.length} sản phẩm`}</button>
        <p className="muted small">Sau khi nhập, mở từng sản phẩm để tải ảnh thật lên.</p>
      </>}
    </Modal>
  )
}

function Products() {
  const { reloadProducts, toast } = useShop()
  const { all, costs, settings, load } = useAdminCatalog()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [edit, setEdit] = useState(null)
  const [csv, setCsv] = useState(false)
  const [noImg, setNoImg] = useState(false)
  if (!all) return <Spinner />
  const shown = all.filter(p => (!cat || p.category === cat) && (!noImg || !p.images?.length) && (!q || `${p.name} ${p.sku}`.toLowerCase().includes(q.toLowerCase())))
  return (
    <div className="panel">
      <div className="row gap wrap mb">
        <input className="input auto grow" placeholder="Tìm tên, SKU…" value={q} onChange={e => setQ(e.target.value)} />
        <select className="input auto" value={cat} onChange={e => setCat(e.target.value)}><option value="">Mọi danh mục</option>{CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>
        <label className="check"><input type="checkbox" checked={noImg} onChange={e => setNoImg(e.target.checked)} /> <span>Chưa có ảnh thật ({all.filter(p => !p.images?.length).length})</span></label>
        <button className="btn ghost sm" onClick={() => setCsv(true)}>Nhập từ CSV</button>
        <button className="btn sm" onClick={() => setEdit({})}>+ Thêm sản phẩm</button>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th></th><th>Sản phẩm</th><th className="r">Nhập (¥)</th><th className="r">Giá vốn</th><th className="r">Giá bán</th><th className="r">Lãi</th><th className="r">Tồn</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            {shown.map(p => {
              const c = calcFor(p, costs[p.id], settings)
              const profit = c ? p.price - c.cost : null
              return (
                <tr key={p.id} className={p.active ? '' : 'dim'}>
                  <td className="thumb-cell"><ProductArt product={p} /></td>
                  <td>{p.name}<br /><small className="muted">{p.sku} · {p.stock_type === 'order' ? `order ${p.lead_days} ngày` : 'có sẵn'}</small>{costs[p.id]?.source_url && <> · <a className="small" href={costs[p.id].source_url} target="_blank" rel="noreferrer">nguồn ↗</a></>}</td>
                  <td className="r">{costs[p.id]?.yuan ? '¥' + costs[p.id].yuan : '—'}</td>
                  <td className="r">{c ? vnd(c.cost) : '—'}</td>
                  <td className="r">{vnd(p.price)}</td>
                  <td className={'r ' + (profit == null ? '' : profit < 0 ? 'bad-text' : 'ok-text')}>{profit == null ? '—' : `${Math.round(profit / c.cost * 100)}%`}</td>
                  <td className={'r' + (p.stock <= 2 ? ' bad-text' : '')}>{p.stock_type === 'order' ? '∞' : p.stock}</td>
                  <td>{p.active ? <Badge tone="ok">Đang bán</Badge> : <Badge>Ẩn</Badge>}</td>
                  <td className="nowrap">
                    <button className="link-btn" onClick={() => setEdit(p)}>Sửa</button>
                    {p.active && <button className="link-btn danger" onClick={async () => { if (confirm('Ẩn sản phẩm khỏi cửa hàng?')) { await api.admin.deleteProduct(p.id); load(); reloadProducts(); toast('Đã ẩn sản phẩm') } }}>Ẩn</button>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {edit && <ProductForm value={edit} cost={costs[edit.id]} settings={settings} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); reloadProducts() }} />}
      {csv && <CsvImport all={all} settings={settings} onClose={() => setCsv(false)} onDone={() => { setCsv(false); load(); reloadProducts() }} />}
    </div>
  )
}

// Thông số tính giá nhập + áp giá đề xuất hàng loạt
function ImportCalc() {
  const { toast, reloadProducts } = useShop()
  const { all, costs, settings, setSettings, load } = useAdminCatalog()
  const [busy, setBusy] = useState(false)
  const [quick, setQuick] = useState({ yuan: 1056, weight_kg: 1.5, kind: 'doll', scale: '1/4' })
  if (!all) return <Spinner />
  const F = [['rate', 'Tỷ giá (VND / 1 tệ)'], ['servicePct', 'Phí mua hộ (%)'], ['shipPerKg', 'Cước Trung → Việt (VND/kg)'], ['insurancePct', 'Bảo hiểm búp bê (%)'], ['overheadPct', 'Chi phí khác (%)'], ['marginDoll', 'Lãi búp bê (%)'], ['marginAcc', 'Lãi phụ kiện (%)'], ['marginSmall', 'Lãi món nhỏ (%)'], ['smallUnder', 'Món nhỏ: giá vốn dưới (VND)']]
  const rows = all.filter(p => costs[p.id]?.yuan).map(p => ({ p, c: calcFor(p, costs[p.id], settings) }))
  const changed = rows.filter(r => r.c.price !== r.p.price)
  const sumCost = rows.reduce((s, r) => s + r.c.cost, 0), sumNew = rows.reduce((s, r) => s + r.c.price, 0)
  const apply = async () => {
    if (!confirm(`Cập nhật giá bán của ${changed.length} sản phẩm theo giá đề xuất?`)) return
    setBusy(true)
    try {
      for (const { p, c } of changed) {
        const ratio = p.compare_price ? p.compare_price / p.price : null
        await api.admin.saveProduct({ ...p, price: c.price, compare_price: ratio ? Math.ceil(c.price * ratio / 10000) * 10000 : null, cost: costs[p.id] })
      }
      toast('Đã cập nhật giá'); load(); reloadProducts()
    } catch (e) { toast(e.message, 'bad') } finally { setBusy(false) }
  }
  const qc = landedCost(quick, settings)
  return (
    <div>
      <div className="order-cols">
        <form className="panel" onSubmit={async e => { e.preventDefault(); await api.admin.saveImportSettings(settings); toast('Đã lưu thông số') }}>
          <h3>Thông số chi phí nhập</h3>
          <div className="form-grid">
            {F.map(([k, l]) => <Field key={k} label={l}><input className="input" value={settings[k]} inputMode="decimal" onChange={e => setSettings({ ...settings, [k]: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })} /></Field>)}
          </div>
          <p className="muted small">Đóng gói chống sốc cố định: 1/3 80.000đ, 1/4 50.000đ, 1/6 30.000đ, 1/8 20.000đ. Kiểm tra lại tỷ giá và bảng cước của đơn vị order trước mỗi đợt nhập.</p>
          <div className="row gap"><button className="btn sm">Lưu thông số</button><button type="button" className="btn ghost sm" onClick={() => setSettings(DEFAULT_IMPORT)}>Về mặc định</button></div>
        </form>
        <div className="panel">
          <h3>Tính nhanh một món</h3>
          <div className="form-grid">
            <Field label="Giá Taobao (¥)"><input className="input" value={quick.yuan} onChange={e => setQuick({ ...quick, yuan: e.target.value.replace(/[^\d.]/g, '') })} inputMode="decimal" /></Field>
            <Field label="Cân nặng (kg)"><input className="input" value={quick.weight_kg} onChange={e => setQuick({ ...quick, weight_kg: e.target.value })} inputMode="decimal" /></Field>
            <Field label="Loại"><select className="input" value={quick.kind} onChange={e => setQuick({ ...quick, kind: e.target.value })}><option value="doll">Búp bê</option><option value="acc">Phụ kiện</option></select></Field>
            {quick.kind === 'doll' && <Field label="Tỉ lệ"><select className="input" value={quick.scale} onChange={e => setQuick({ ...quick, scale: e.target.value })}>{SCALES.map(s => <option key={s.key} value={s.key}>{s.key}</option>)}</select></Field>}
          </div>
          <CostBreakdown c={qc} />
        </div>
      </div>
      <div className="panel">
        <div className="row-between wrap gap">
          <h3>Giá bán theo thông số hiện tại ({rows.length} sản phẩm có giá nhập)</h3>
          <button className="btn sm" disabled={busy || !changed.length} onClick={apply}>{busy ? 'Đang cập nhật…' : `Áp giá đề xuất cho ${changed.length} sản phẩm`}</button>
        </div>
        <p className="muted small">Tổng giá vốn nếu nhập mỗi mẫu 1 cái: <b>{vnd(sumCost)}</b> · tổng giá bán đề xuất: <b>{vnd(sumNew)}</b> · lãi gộp: <b className="ok-text">{vnd(sumNew - sumCost)}</b></p>
        <div className="table-wrap">
          <table className="table compact">
            <thead><tr><th>Sản phẩm</th><th className="r">¥</th><th className="r">kg</th><th className="r">Giá vốn</th><th className="r">Đề xuất</th><th className="r">Đang bán</th></tr></thead>
            <tbody>{rows.map(({ p, c }) => <tr key={p.id}><td>{p.name}</td><td className="r">{costs[p.id].yuan}</td><td className="r">{costs[p.id].weight_kg}</td><td className="r">{vnd(c.cost)}</td><td className="r"><b>{vnd(c.price)}</b></td><td className={'r' + (c.price !== p.price ? ' warn-text' : '')}>{vnd(p.price)}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Customers() {
  const [list, setList] = useState(null)
  useEffect(() => { api.admin.customers().then(setList).catch(() => setList([])) }, [])
  if (!list) return <Spinner />
  return (
    <div className="panel table-wrap">
      <table className="table">
        <thead><tr><th>Họ tên</th><th>Email</th><th>Điện thoại</th><th>Vai trò</th></tr></thead>
        <tbody>{list.map(c => <tr key={c.id}><td>{c.full_name}</td><td>{c.email || '—'}</td><td>{c.phone}</td><td>{c.role === 'admin' ? <Badge tone="info">Quản trị</Badge> : 'Khách hàng'}</td></tr>)}</tbody>
      </table>
    </div>
  )
}

// Cài đặt cửa hàng: thông tin chung, tài khoản nhận tiền, phí giao hàng, showroom
const MULTI = ['tagline', 'address']
function ShopSettings() {
  const { info, setInfo, toast } = useShop()
  const [f, setF] = useState(info)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setF(info) }, [info])
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const input = ([k, l, hint]) => (
    <Field key={k} label={l} hint={hint}>
      {MULTI.includes(k)
        ? <textarea className="input" rows={3} value={f[k]} onChange={e => set(k, e.target.value)} />
        : <input className="input" value={f[k]} onChange={e => set(k, e.target.value)} inputMode={k === 'bank_account' ? 'numeric' : undefined} />}
    </Field>
  )
  const save = async e => {
    e.preventDefault()
    setBusy(true)
    try { setInfo(normalizeInfo(await api.admin.saveShopInfo(f))); toast('Đã lưu cài đặt cửa hàng') }
    catch (x) { toast(x.message, 'bad') } finally { setBusy(false) }
  }
  const preview = normalizeInfo(f, info)
  const money = k => <input className="input" value={f[k] === '' ? '' : Number(f[k]).toLocaleString('vi-VN')} inputMode="numeric" onChange={e => set(k, e.target.value.replace(/\D/g, ''))} />
  return (
    <div>
      <form onSubmit={save}>
        <div className="order-cols">
          <div className="panel">
            <h3>Thông tin chung</h3>
            <LogoPicker value={f.logo} onChange={v => set('logo', v)} />
            <div className="form-grid">{INFO_FIELDS.map(input)}</div>
          </div>
          <div>
            <div className="panel">
              <h3>Tài khoản nhận chuyển khoản</h3>
              <div className="form-grid">{BANK_FIELDS.map(input)}</div>
              <p className="muted small">Mã QR trên trang đơn hàng tạo theo tài khoản này. Quét thử mã bên dưới bằng app ngân hàng để chắc tên chủ tài khoản đúng.</p>
              {preview.bank_id && preview.bank_account && <img src={`https://img.vietqr.io/image/${preview.bank_id}-${preview.bank_account}-compact2.png?amount=10000&addInfo=THU&accountName=${encodeURIComponent(preview.bank_account_name)}`} alt="QR thử" width="180" height="180" />}
            </div>
            <div className="panel">
              <h3>Phí giao hàng</h3>
              <div className="form-grid">
                <Field label="Phí giao hàng (₫)">{money('shipping_fee')}</Field>
                <Field label="Miễn phí giao cho đơn từ (₫)">{money('free_ship_from')}</Field>
              </div>
            </div>
          </div>
        </div>
        <div className="row gap mb"><button className="btn" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu cài đặt'}</button><button type="button" className="btn ghost" onClick={() => setF(info)}>Hoàn tác</button></div>
      </form>
      <StoreList />
    </div>
  )
}

// Logo: tải ảnh lên (PNG giữ nền trong suốt), bỏ trống thì dùng logo vẽ sẵn
function LogoPicker({ value, onChange }) {
  const { toast } = useShop()
  const [busy, setBusy] = useState(false)
  const pick = async e => {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    setBusy(true)
    try { onChange(await api.admin.uploadLogo(file)); toast('Đã tải logo, bấm Lưu cài đặt để áp dụng') } catch (x) { toast(x.message, 'bad') } finally { setBusy(false) }
  }
  return (
    <div className="row gap wrap mb">
      <div className="logo-preview">{value ? <img src={value} alt="Logo cửa hàng" /> : <span className="muted small">Logo mặc định</span>}</div>
      <label className="btn ghost sm">{busy ? 'Đang tải…' : value ? 'Đổi logo' : 'Chọn logo'}<input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pick} disabled={busy} /></label>
      {value && <button type="button" className="btn ghost sm" onClick={() => onChange('')}>Dùng logo mặc định</button>}
      <span className="muted small grow">Nên dùng ảnh PNG nền trong suốt, ngang hoặc vuông.</span>
    </div>
  )
}

const EMPTY_STORE = { name: '', city: '', district: '', address: '', phone: '', hours: '' }
function StoreList() {
  const { toast } = useShop()
  const [list, setList] = useState(null)
  const [edit, setEdit] = useState(null)
  const load = () => api.stores().then(setList).catch(() => setList([]))
  useEffect(() => { load() }, [])
  const del = async s => {
    if (!confirm(`Xóa ${s.name}?`)) return
    try { await api.admin.deleteStore(s.id); toast('Đã xóa showroom'); load() } catch (x) { toast(x.message, 'bad') }
  }
  return (
    <div className="panel">
      <div className="row-between wrap gap"><h3>Showroom / địa điểm nhận hàng</h3><button className="btn sm" onClick={() => setEdit(EMPTY_STORE)}>+ Thêm showroom</button></div>
      <p className="muted small">Hiện ở trang Showroom và mục "Nhận tại cửa hàng" khi đặt hàng. Chưa có showroom nào thì khách chỉ chọn được giao tận nơi.</p>
      {!list ? <Spinner /> : !list.length ? <p className="muted">Chưa có showroom.</p> : (
        <div className="table-wrap">
          <table className="table compact">
            <thead><tr><th>Tên</th><th>Địa chỉ</th><th>Điện thoại</th><th>Giờ mở cửa</th><th /></tr></thead>
            <tbody>{list.map(s => <tr key={s.id}><td>{s.name}</td><td>{[s.address, s.district, s.city].filter(Boolean).join(', ')}</td><td>{s.phone}</td><td>{s.hours}</td><td className="r nowrap"><button className="link-btn" onClick={() => setEdit(s)}>Sửa</button> · <button className="link-btn" onClick={() => del(s)}>Xóa</button></td></tr>)}</tbody>
          </table>
        </div>
      )}
      {edit && <StoreForm value={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load() }} />}
    </div>
  )
}

function StoreForm({ value, onClose, onSaved }) {
  const { toast } = useShop()
  const [s, setS] = useState({ ...EMPTY_STORE, ...value })
  const [busy, setBusy] = useState(false)
  const F = [['name', 'Tên showroom *'], ['city', 'Tỉnh / thành *'], ['district', 'Quận / huyện'], ['address', 'Địa chỉ (số nhà, đường, phường) *'], ['phone', 'Điện thoại'], ['hours', 'Giờ mở cửa']]
  const save = async e => {
    e.preventDefault(); setBusy(true)
    try { await api.admin.saveStore(s); toast('Đã lưu showroom'); onSaved() } catch (x) { toast(x.message, 'bad') } finally { setBusy(false) }
  }
  return (
    <Modal title={s.id ? 'Sửa showroom' : 'Thêm showroom'} onClose={onClose}>
      <form onSubmit={save}>
        <div className="form-grid">{F.map(([k, l]) => <Field key={k} label={l}><input className="input" value={s[k]} onChange={e => setS({ ...s, [k]: e.target.value })} /></Field>)}</div>
        <div className="row gap"><button className="btn" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</button><button type="button" className="btn ghost" onClick={onClose}>Hủy</button></div>
      </form>
    </Modal>
  )
}

export default function Admin() {
  const { user, toast, reloadProducts } = useShop()
  if (user === undefined) return <div className="container pad-l"><Spinner /></div>
  if (!user) return <Navigate to="/dang-nhap?tiep=/quan-tri" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return (
    <div className="container admin">
      <div className="row-between wrap gap">
        <h1>Quản trị cửa hàng</h1>
        {DEMO && <button className="btn ghost sm" onClick={async () => { if (confirm('Xóa toàn bộ đơn hàng, đánh giá và sửa đổi sản phẩm của bản demo?')) { await api.admin.resetDemo(); reloadProducts(); toast('Đã khôi phục dữ liệu demo'); location.reload() } }}>Khôi phục dữ liệu demo</button>}
      </div>
      <nav className="admin-tabs">
        <NavLink end to="/quan-tri">Tổng quan</NavLink>
        <NavLink to="/quan-tri/don-hang">Đơn hàng</NavLink>
        <NavLink to="/quan-tri/san-pham">Sản phẩm</NavLink>
        <NavLink to="/quan-tri/gia-nhap">Tính giá nhập</NavLink>
        <NavLink to="/quan-tri/khach-hang">Khách hàng</NavLink>
        <NavLink to="/quan-tri/cai-dat">Cài đặt cửa hàng</NavLink>
        <NavLink to="/quan-tri/sao-luu">Sao lưu</NavLink>
      </nav>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="don-hang" element={<Orders />} />
        <Route path="san-pham" element={<Products />} />
        <Route path="gia-nhap" element={<ImportCalc />} />
        <Route path="khach-hang" element={<Customers />} />
        <Route path="cai-dat" element={<ShopSettings />} />
        <Route path="sao-luu" element={<Backup />} />
      </Routes>
    </div>
  )
}
