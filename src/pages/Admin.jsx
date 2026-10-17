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
import AdminChat, { useChatUnread } from './AdminChat.jsx'
import { COUPON_KINDS, EMPTY_COUPON, couponStatus, couponStats, describeCoupon, normalizeCoupon, randomCode, toLocalInput } from '../lib/coupons.js'
import { applyVariants, normalizeVariants, variantErrors, videoFileError, isVideoLink, VIDEO_MAX_MB } from '../lib/variants.js'
import { VideoThumb } from '../components/ProductMedia.jsx'

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

const EMPTY = { name: '', sku: '', category: 'bjd-1-4', kind: 'doll', scale: '1/4', skin: 'trang-hong', gender: 'nu', set_type: 'fullset', stock_type: 'order', lead_days: 35, price: 0, compare_price: null, sizes: [], stock: 99, collection: null, tags: [], rating: 5, review_count: 0, sold: 0, description: '', images: [], videos: [], variants: [], active: true, look: { hair: 0, eye: 0, outfit: 0 } }
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

function VideoManager({ videos, onChange }) {
  const { toast } = useShop()
  const [busy, setBusy] = useState(0)
  const [url, setUrl] = useState('')
  const add = async files => {
    const list = [...files].filter(f => f.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(f.name))
    if (!list.length) return
    const bad = list.map(videoFileError).filter(Boolean)
    bad.forEach(m => toast(m, 'bad'))
    const ok = list.filter(f => !videoFileError(f))
    if (!ok.length) return
    setBusy(ok.length)
    const got = []
    for (const f of ok) {
      try { got.push(await api.admin.uploadVideo(f)) } catch (e) { toast(e.message, 'bad') }
      setBusy(n => n - 1)
    }
    if (got.length) { onChange([...videos, ...got]); toast(`Đã tải lên ${got.length} video`) }
  }
  const addLink = () => {
    const u = url.trim()
    if (!isVideoLink(u)) return toast('Link video phải bắt đầu bằng https://', 'bad')
    onChange([...videos, u]); setUrl('')
  }
  const move = (i, d) => { const a = [...videos]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; onChange(a) }
  return (
    <fieldset className="img-fs" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); add(e.dataTransfer.files) }}>
      <legend>Video sản phẩm ({videos.length})</legend>
      <div className="img-list">
        {videos.map((src, i) => (
          <div key={src.slice(-60) + i} className="img-item">
            <VideoThumb src={src} />
            <div className="img-tools">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Lên trước">◀</button>
              <button type="button" onClick={() => onChange(videos.filter((_, k) => k !== i))} aria-label="Xóa video">✕</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === videos.length - 1} aria-label="Ra sau">▶</button>
            </div>
          </div>
        ))}
        <label className="img-add">
          <input type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" multiple hidden onChange={e => { add(e.target.files); e.target.value = '' }} />
          {busy ? `Đang tải ${busy} video…` : <>+ Chọn video<small>MP4, WEBM, MOV · tối đa {VIDEO_MAX_MB} MB</small></>}
        </label>
      </div>
      <div className="row gap">
        <input className="input" value={url} onChange={e => setUrl(e.target.value)} placeholder="…hoặc dán link YouTube / link video https://…mp4" />
        <button type="button" className="btn ghost sm" onClick={addLink}>Thêm link</button>
      </div>
      <p className="muted small">Video hiện sau ảnh trong khung ảnh sản phẩm. Video dài nên đưa lên YouTube rồi dán link để trang tải nhanh.</p>
    </fieldset>
  )
}

const EMPTY_VARIANT = { name: '', price: '', compare_price: '', stock: '', image: '' }
function VariantEditor({ variants, images, order, onChange }) {
  const { toast } = useShop()
  const [busy, setBusy] = useState(-1)
  const set = (i, k, v) => onChange(variants.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
  const money = v => (v === '' || v == null ? '' : Number(String(v).replace(/\D/g, '')).toLocaleString('vi-VN'))
  const upload = async (i, file) => {
    if (!file) return
    setBusy(i)
    try { set(i, 'image', await api.admin.uploadImage(file)) } catch (e) { toast(e.message, 'bad') } finally { setBusy(-1) }
  }
  return (
    <fieldset className="img-fs">
      <legend>Biến thể ({variants.length}) — bản khác kích thước, kèm phụ kiện…</legend>
      {variants.length > 0 && (
        <table className="var-table">
          <thead><tr><th>Tên biến thể</th><th>Giá bán (₫)</th><th>Giá gốc (₫)</th>{!order && <th>Tồn</th>}<th>Ảnh</th><th></th></tr></thead>
          <tbody>{variants.map((v, i) => (
            <tr key={v.id || i}>
              <td><input className="input" value={v.name} onChange={e => set(i, 'name', e.target.value)} placeholder="vd Kèm tóc + mắt" /></td>
              <td><input className="input" value={money(v.price)} onChange={e => set(i, 'price', e.target.value.replace(/\D/g, ''))} inputMode="numeric" /></td>
              <td><input className="input" value={money(v.compare_price)} onChange={e => set(i, 'compare_price', e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="—" /></td>
              {!order && <td><input className="input" type="number" min="0" value={v.stock} onChange={e => set(i, 'stock', e.target.value)} /></td>}
              <td>
                <div className="var-img">
                  {v.image && <img src={v.image} alt="" />}
                  <select className="input" value={images.includes(v.image) ? v.image : v.image ? '__own' : ''} onChange={e => e.target.value !== '__own' && set(i, 'image', e.target.value)} aria-label="Ảnh biến thể">
                    <option value="">Không</option>
                    {images.map((src, k) => <option key={k} value={src}>Ảnh {k + 1}</option>)}
                    {v.image && !images.includes(v.image) && <option value="__own">Ảnh riêng</option>}
                  </select>
                  <label className="btn ghost sm" title="Tải ảnh riêng">{busy === i ? '…' : '↑'}<input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => { upload(i, e.target.files[0]); e.target.value = '' }} /></label>
                </div>
              </td>
              <td><button type="button" className="link-btn" onClick={() => onChange(variants.filter((_, j) => j !== i))} aria-label="Xóa biến thể">✕</button></td>
            </tr>
          ))}</tbody>
        </table>
      )}
      <button type="button" className="btn ghost sm" onClick={() => onChange([...variants, { ...EMPTY_VARIANT }])}>+ Thêm biến thể</button>
      <p className="muted small">{variants.length
        ? <>Khách phải chọn một biến thể trước khi mua. Trang sản phẩm hiện <b>Giá từ</b> giá thấp nhất{order ? '' : '; tồn kho sản phẩm = tổng tồn các biến thể'}.</>
        : 'Không có biến thể: bán một giá như bình thường. Thêm biến thể khi có nhiều bản (vd nude / full set, kèm phụ kiện, khác kích thước).'}</p>
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
          .concat(b.orders.map(o => [o.code, dateTime(o.created_at), o.full_name, o.phone, o.email, o.delivery === 'pickup' ? 'Showroom' : o.address, paymentName(o.payment_method), PAYMENT_STATUS[o.payment_status]?.label, ORDER_STATUS[o.status]?.label, o.subtotal, o.discount, o.shipping_fee, o.total, o.deposit || 0, o.items.map(i => `${i.name}${i.variant ? ` (${i.variant})` : ''}${i.size ? ` size ${i.size}` : ''} x${i.qty}`).join('; ')]))), 'text/csv')
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
  const hasVar = (p.variants || []).length > 0
  const save = async e => {
    e.preventDefault()
    const vars = normalizeVariants(p.variants)
    if ((p.variants || []).some(v => !String(v.name || '').trim() && (v.price || v.stock))) return toast('Có biến thể chưa đặt tên', 'bad')
    const vErr = variantErrors(vars)
    if (vErr.length) return toast(vErr[0], 'bad')
    const priced = applyVariants(p, vars)
    if (!p.name.trim() || !p.sku.trim() || !(priced.price > 0)) return toast('Cần tên, mã SKU và giá bán > 0', 'bad')
    if (!vars.length && p.compare_price && p.compare_price <= p.price) return toast('Giá gốc phải lớn hơn giá bán (hoặc để trống)', 'bad')
    if (!vars.length && calc && p.price < calc.cost) return toast('Giá bán đang thấp hơn giá vốn ' + vnd(calc.cost), 'bad')
    setBusy(true)
    try {
      const row = { ...priced, kind, set_type: kind === 'doll' ? p.set_type : null, skin: kind === 'doll' ? p.skin : null, slug: p.slug || slugify(p.name + ' ' + p.sku), compare_price: priced.compare_price || null, collection: p.collection || null, lead_days: p.stock_type === 'order' ? Number(p.lead_days) || 30 : 0,
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
          {calc && <div className="row gap wrap"><CostBreakdown c={calc} />{!hasVar && <button type="button" className="btn sm" onClick={() => set('price', calc.price)}>Dùng giá đề xuất {vnd(calc.price)}</button>}</div>}
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
          {!hasVar && <Field label="Giá bán (₫)"><input className="input" value={p.price ? p.price.toLocaleString('vi-VN') : ''} onChange={e => set('price', num(e.target.value) || 0)} inputMode="numeric" /></Field>}
          {!hasVar && <Field label="Giá gốc trước giảm (₫)" hint="Để trống nếu không giảm giá"><input className="input" value={p.compare_price ? p.compare_price.toLocaleString('vi-VN') : ''} onChange={e => set('compare_price', num(e.target.value))} inputMode="numeric" /></Field>}
          {(!hasVar || p.stock_type === 'order') && <Field label="Tồn kho" hint="Hàng order: để số lớn (vd 99)"><input className="input" type="number" min="0" value={p.stock} onChange={e => set('stock', Math.max(0, parseInt(e.target.value) || 0))} /></Field>}
          <Field label="Phong cách"><select className="input" value={p.collection || ''} onChange={e => set('collection', e.target.value || null)}><option value="">—</option>{COLLECTIONS.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></Field>
        </div>
        <ImageManager images={p.images || []} onChange={v => set('images', v)} />
        <VideoManager videos={p.videos || []} onChange={v => set('videos', v)} />
        <VariantEditor variants={p.variants || []} images={p.images || []} order={p.stock_type === 'order'} onChange={v => set('variants', v)} />
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
        if (r.old && r.has.videos) base.videos = r.product.videos
        // biến thể trùng tên giữ mã cũ để giỏ hàng của khách không bị mất lựa chọn
        const vars = r.old && !r.has.variants ? r.old.variants || [] : r.product.variants.map(v => ({ ...v, id: (r.old?.variants || []).find(o => o.name.toLowerCase() === v.name.toLowerCase())?.id || v.id }))
        await api.admin.saveProduct(applyVariants({ ...base, price: r.c.price, cost: r.cost }, vars)); n++
      }
      toast(`Đã nhập ${n} sản phẩm`); onDone()
    } catch (e) { toast(`Lỗi sau ${n} sản phẩm: ${e.message}`, 'bad') } finally { setBusy(false) }
  }
  return (
    <Modal title="Nhập sản phẩm từ file CSV" onClose={onClose} wide>
      <p>File CSV (Excel → Lưu thành CSV UTF-8) gồm các cột: <code>{CSV_COLUMNS.join(', ')}</code>. <button className="link-btn" onClick={() => download('mau-nhap-taobao.csv', toCsv([CSV_COLUMNS, ['TB0001', 'Búp bê BJD 1/4 (tên mẫu) — Full set', 'bjd-1-4', '1/4', 'fullset', 'trang-hong', 'nu', 'order', 35, 1056, 1.5, 0, 'https://item.taobao.com/item.htm?id=...', '', 'Nude:5.200.000 | Full set:5.630.000', '']]), 'text/csv')}>Tải file mẫu</button></p>
      <p className="muted small">Cột không bắt buộc: <code>bien_the</code> dạng <code>Tên:giá[:tồn] | Tên 2:giá[:tồn]</code> (giá theo đồng, vd <code>Nude:5.200.000 | Full set:5.630.000</code>) và <code>video</code> (link https, nhiều link cách nhau bằng |). Để trống thì giữ nguyên biến thể / video đang có.</p>
      <input type="file" accept=".csv,text/csv" onChange={e => e.target.files[0] && read(e.target.files[0])} />
      {res?.errors.length > 0 && <div className="notice warn small mt">{res.errors.map(e => <div key={e}>{e}</div>)}</div>}
      {rows.length > 0 && <>
        <div className="table-wrap mt">
          <table className="table compact">
            <thead><tr><th>SKU</th><th>Tên</th><th className="r">¥</th><th className="r">kg</th><th className="r">Giá vốn</th><th className="r">Giá bán</th><th></th></tr></thead>
            <tbody>{rows.map(r => <tr key={r.line}><td>{r.product.sku}</td><td>{r.product.name}</td><td className="r">{r.cost.yuan}</td><td className="r">{r.cost.weight_kg}</td><td className="r">{vnd(r.c.cost)}</td><td className="r"><b>{r.product.variants.length ? `${r.product.variants.length} loại, từ ${vnd(Math.min(...r.product.variants.map(v => v.price)))}` : vnd(r.c.price)}</b></td><td>{r.old ? <Badge tone="info">Cập nhật</Badge> : <Badge tone="ok">Mới</Badge>}</td></tr>)}</tbody>
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
  // sản phẩm có biến thể: giá đặt riêng từng biến thể, không cập nhật hàng loạt theo giá nhập
  const rows = all.filter(p => costs[p.id]?.yuan && !p.variants?.length).map(p => ({ p, c: calcFor(p, costs[p.id], settings) }))
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

// Mã giảm giá: tạo / sửa / tắt; máy chủ kiểm tra và trừ lượt khi khách đặt hàng
function Coupons() {
  const { toast } = useShop()
  const [list, setList] = useState(null)
  const [orders] = useOrders()
  const [edit, setEdit] = useState(null)
  const load = () => api.admin.coupons().then(setList).catch(x => { toast(x.message, 'bad'); setList([]) })
  useEffect(() => { load() }, [])
  const stats = useMemo(() => couponStats(orders), [orders])
  const toggle = async c => {
    try { await api.admin.saveCoupon({ ...c, active: !c.active }); toast(c.active ? `Đã tắt mã ${c.code}` : `Đã bật mã ${c.code}`); load() } catch (x) { toast(x.message, 'bad') }
  }
  const del = async c => {
    if (!confirm(`Xóa hẳn mã ${c.code}?`)) return
    try { await api.admin.deleteCoupon(c.code); toast('Đã xóa mã'); load() } catch (x) { toast(x.message, 'bad') }
  }
  const copy = c => navigator.clipboard?.writeText(c.code).then(() => toast('Đã chép mã ' + c.code), () => {})
  const when = c => [c.starts_at && 'từ ' + dateTime(c.starts_at), c.expires_at && 'đến ' + dateTime(c.expires_at)].filter(Boolean).join(' ') || 'Không giới hạn'
  return (
    <div className="panel">
      <div className="row-between wrap gap"><h3>Mã giảm giá</h3><button className="btn sm" onClick={() => setEdit({ ...EMPTY_COUPON, code: randomCode(), _new: true })}>+ Tạo mã</button></div>
      <p className="muted small">Khách nhập mã ở bước thanh toán. Máy chủ tự kiểm tra hạn dùng, đơn tối thiểu, số lượt và trừ lượt khi đặt hàng; đơn bị hủy thì trả lại lượt.</p>
      {!list ? <Spinner /> : !list.length ? <p className="muted">Chưa có mã nào.</p> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Mã</th><th>Ưu đãi</th><th>Thời gian</th><th className="r">Đã dùng</th><th className="r">Đã giảm</th><th>Trạng thái</th><th /></tr></thead>
            <tbody>{list.map(c => {
              const st = couponStatus(c)
              return (
                <tr key={c.code} className={c.active ? '' : 'dim'}>
                  <td className="nowrap"><b>{c.code}</b> <button className="link-btn small" onClick={() => copy(c)}>chép</button></td>
                  <td>{c.description || describeCoupon(c)}{c.per_customer_limit && <><br /><small className="muted">Mỗi khách {c.per_customer_limit} lần</small></>}</td>
                  <td className="small">{when(c)}</td>
                  <td className="r nowrap">{c.used}{c.usage_limit ? ` / ${c.usage_limit}` : ''}</td>
                  <td className="r nowrap">{stats[c.code] ? <>{vnd(stats[c.code].discount)}<br /><small className="muted">{stats[c.code].orders} đơn</small></> : '—'}</td>
                  <td><Badge tone={st.tone}>{st.label}</Badge></td>
                  <td className="r nowrap">
                    <button className="link-btn" onClick={() => setEdit(c)}>Sửa</button> · <button className="link-btn" onClick={() => toggle(c)}>{c.active ? 'Tắt' : 'Bật'}</button>
                    {!c.used && !stats[c.code] && <> · <button className="link-btn danger" onClick={() => del(c)}>Xóa</button></>}
                  </td>
                </tr>
              )
            })}</tbody>
          </table>
        </div>
      )}
      {edit && <CouponForm value={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load() }} />}
    </div>
  )
}

function CouponForm({ value, onClose, onSaved }) {
  const { toast } = useShop()
  const isNew = !!value._new
  const [c, setC] = useState({ ...EMPTY_COUPON, ...value, starts_at: toLocalInput(value.starts_at), expires_at: toLocalInput(value.expires_at) })
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setC(x => ({ ...x, [k]: v }))
  const num = (k, ph) => <input className="input" value={c[k] == null || c[k] === '' ? '' : Number(c[k]).toLocaleString('vi-VN')} placeholder={ph} inputMode="numeric" onChange={e => { const v = e.target.value.replace(/\D/g, ''); set(k, v === '' ? null : Number(v)) }} />
  const preview = normalizeCoupon({ ...c, description: '' }).description
  const save = async e => {
    e.preventDefault(); setBusy(true)
    try { const r = await api.admin.saveCoupon(c, isNew); toast(`Đã lưu mã ${r.code}`); onSaved() } catch (x) { toast(x.message, 'bad') } finally { setBusy(false) }
  }
  return (
    <Modal title={isNew ? 'Tạo mã giảm giá' : 'Sửa mã ' + c.code} onClose={onClose}>
      <form onSubmit={save}>
        <div className="form-grid">
          <Field label="Mã *" hint={isNew ? 'Chữ không dấu, số, gạch ngang' : 'Không đổi được mã đã tạo'}>
            <div className="row gap">
              <input className="input" value={c.code} disabled={!isNew} onChange={e => set('code', e.target.value.toUpperCase().replace(/\s/g, ''))} maxLength={30} required />
              {isNew && <button type="button" className="btn ghost sm" onClick={() => set('code', randomCode())}>Ngẫu nhiên</button>}
            </div>
          </Field>
          <Field label="Loại giảm"><select className="input" value={c.kind} onChange={e => set('kind', e.target.value)}>{COUPON_KINDS.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}</select></Field>
          {c.kind === 'percent' && <Field label="Giảm (%) *"><input className="input" value={c.value ?? ''} inputMode="numeric" onChange={e => set('value', e.target.value.replace(/\D/g, '').slice(0, 3))} /></Field>}
          {c.kind === 'percent' && <Field label="Giảm tối đa (₫)" hint="Để trống = không giới hạn">{num('max_discount', 'Không giới hạn')}</Field>}
          {c.kind === 'amount' && <Field label="Số tiền giảm (₫) *">{num('value')}</Field>}
          <Field label="Đơn tối thiểu (₫)" hint="Tính trên tiền hàng, chưa gồm ship">{num('min_order', '0')}</Field>
          <Field label="Tổng số lượt" hint="Để trống = không giới hạn">{num('usage_limit', 'Không giới hạn')}</Field>
          <Field label="Mỗi khách dùng tối đa" hint="Đếm theo SĐT / tài khoản">{num('per_customer_limit', 'Không giới hạn')}</Field>
          <Field label="Bắt đầu" hint="Để trống = dùng ngay"><input className="input" type="datetime-local" value={c.starts_at || ''} onChange={e => set('starts_at', e.target.value)} /></Field>
          <Field label="Hết hạn" hint="Để trống = không hết hạn"><input className="input" type="datetime-local" value={c.expires_at || ''} onChange={e => set('expires_at', e.target.value)} /></Field>
        </div>
        <Field label="Mô tả cho khách" hint={'Để trống sẽ hiện: ' + preview}><input className="input" value={c.description} maxLength={200} placeholder={preview} onChange={e => set('description', e.target.value)} /></Field>
        <label className="check mb"><input type="checkbox" checked={c.active} onChange={e => set('active', e.target.checked)} /> <span>Đang bật (khách dùng được)</span></label>
        {!isNew && c.used > 0 && <p className="muted small">Mã đã dùng {c.used} lần. Sửa mức giảm chỉ áp dụng cho đơn đặt sau.</p>}
        <div className="row gap"><button className="btn" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</button><button type="button" className="btn ghost" onClick={onClose}>Hủy</button></div>
      </form>
    </Modal>
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

function ChatTab() {
  const n = useChatUnread()
  return <NavLink to="/quan-tri/tin-nhan">Tin nhắn{n > 0 && <span className="pill bad">{n}</span>}</NavLink>
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
        <NavLink to="/quan-tri/ma-giam-gia">Mã giảm giá</NavLink>
        <NavLink to="/quan-tri/gia-nhap">Tính giá nhập</NavLink>
        <NavLink to="/quan-tri/khach-hang">Khách hàng</NavLink>
        <ChatTab />
        <NavLink to="/quan-tri/cai-dat">Cài đặt cửa hàng</NavLink>
        <NavLink to="/quan-tri/sao-luu">Sao lưu</NavLink>
      </nav>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="don-hang" element={<Orders />} />
        <Route path="san-pham" element={<Products />} />
        <Route path="ma-giam-gia" element={<Coupons />} />
        <Route path="gia-nhap" element={<ImportCalc />} />
        <Route path="khach-hang" element={<Customers />} />
        <Route path="tin-nhan" element={<AdminChat />} />
        <Route path="cai-dat" element={<ShopSettings />} />
        <Route path="sao-luu" element={<Backup />} />
      </Routes>
    </div>
  )
}
