import { useEffect, useState } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api, DEMO } from '../lib/api.js'
import { useShop } from '../lib/store.jsx'
import { vnd, date, ORDER_STATUS, PAYMENT_STATUS } from '../lib/format.js'
import { PROVINCES, formatAddress, validPhone } from '../lib/provinces.js'
import { Badge, Empty, Field, Grid, Icon, Modal, Spinner } from '../components/ui.jsx'
import { OrderView } from './Order.jsx'

function Profile() {
  const { user, toast } = useShop()
  const [f, setF] = useState({ full_name: user.full_name || '', phone: user.phone || '', birthday: user.birthday || '', gender: user.gender || '' })
  const [busy, setBusy] = useState(false)
  const save = async e => {
    e.preventDefault()
    if (!validPhone(f.phone)) return toast('Số điện thoại chưa đúng', 'bad')
    setBusy(true)
    try { await api.updateProfile(f); toast('Đã lưu thông tin') } catch (x) { toast(x.message, 'bad') } finally { setBusy(false) }
  }
  return (
    <form className="panel" onSubmit={save}>
      <h2>Thông tin cá nhân</h2>
      <div className="form-grid">
        <Field label="Họ và tên"><input className="input" value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} required /></Field>
        <Field label="Số điện thoại"><input className="input" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} inputMode="tel" /></Field>
        <Field label="Email"><input className="input" value={user.email} disabled /></Field>
        <Field label="Ngày sinh" hint="Nhận quà sinh nhật"><input className="input" type="date" value={f.birthday || ''} onChange={e => setF({ ...f, birthday: e.target.value })} /></Field>
        <Field label="Giới tính"><select className="input" value={f.gender || ''} onChange={e => setF({ ...f, gender: e.target.value })}><option value="">—</option><option value="nu">Nữ</option><option value="nam">Nam</option><option value="khac">Khác</option></select></Field>
      </div>
      <button className="btn" disabled={busy}>Lưu thay đổi</button>
    </form>
  )
}

function Orders() {
  const [list, setList] = useState(null)
  const [tab, setTab] = useState('all')
  useEffect(() => { api.myOrders().then(setList).catch(() => setList([])) }, [])
  if (!list) return <Spinner />
  const tabs = [['all', 'Tất cả'], ...Object.entries(ORDER_STATUS).map(([k, v]) => [k, v.label])]
  const shown = tab === 'all' ? list : list.filter(o => o.status === tab)
  return (
    <div className="panel">
      <h2>Đơn hàng của tôi</h2>
      <div className="chips scroll">{tabs.map(([k, l]) => <button key={k} className={'chip' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{l} ({k === 'all' ? list.length : list.filter(o => o.status === k).length})</button>)}</div>
      {shown.length === 0 ? <Empty text="Chưa có đơn hàng nào"><Link to="/" className="btn">Mua sắm ngay</Link></Empty> : shown.map(o => (
        <Link key={o.id} to={'/tai-khoan/don-hang/' + o.code} className="order-row">
          <div><b>#{o.code}</b><small className="muted"> · {date(o.created_at)}</small><div className="muted small">{o.items.map(i => i.name).join(', ')}</div></div>
          <div className="r"><b className="accent">{vnd(o.total)}</b><div className="row gap"><Badge tone={ORDER_STATUS[o.status]?.tone}>{ORDER_STATUS[o.status]?.label}</Badge><Badge tone={PAYMENT_STATUS[o.payment_status]?.tone}>{PAYMENT_STATUS[o.payment_status]?.label}</Badge></div></div>
        </Link>
      ))}
    </div>
  )
}

function OrderDetail() {
  const { code } = useParams()
  const [o, setO] = useState(undefined)
  const load = () => api.order(code).then(setO).catch(() => setO(null))
  useEffect(() => { load() }, [code]) // eslint-disable-line
  if (o === undefined) return <Spinner />
  if (!o) return <Empty text="Không tìm thấy đơn hàng" />
  return <div><Link to="/tai-khoan/don-hang" className="link-btn">← Tất cả đơn hàng</Link><OrderView order={o} onChange={load} /></div>
}

function Addresses() {
  const { toast } = useShop()
  const [list, setList] = useState(null)
  const [edit, setEdit] = useState(null)
  const load = () => api.addresses().then(setList)
  useEffect(() => { load() }, [])
  const save = async e => {
    e.preventDefault()
    if (!edit.full_name || !validPhone(edit.phone) || !edit.ward || !edit.line) return toast('Vui lòng điền đủ thông tin, số điện thoại 10 số', 'bad')
    try { await api.saveAddress(edit); setEdit(null); load(); toast('Đã lưu địa chỉ') } catch (x) { toast(x.message, 'bad') }
  }
  if (!list) return <Spinner />
  return (
    <div className="panel">
      <div className="row-between"><h2>Sổ địa chỉ</h2><button className="btn sm" onClick={() => setEdit({ full_name: '', phone: '', province: 'Hà Nội', ward: '', line: '', is_default: list.length === 0 })}>+ Thêm địa chỉ</button></div>
      {list.length === 0 ? <p className="muted">Chưa có địa chỉ nào.</p> : list.map(a => (
        <div key={a.id} className="addr-row">
          <div><b>{a.full_name}</b> · {a.phone} {a.is_default && <Badge tone="info">Mặc định</Badge>}<br /><small>{formatAddress(a)}</small></div>
          <div className="row gap">
            {!a.is_default && <button className="link-btn" onClick={async () => { await api.saveAddress({ ...a, is_default: true }); load() }}>Đặt mặc định</button>}
            <button className="link-btn" onClick={() => setEdit(a)}>Sửa</button>
            <button className="link-btn danger" onClick={async () => { if (confirm('Xóa địa chỉ này?')) { await api.deleteAddress(a.id); load() } }}>Xóa</button>
          </div>
        </div>
      ))}
      {edit && (
        <Modal title={edit.id ? 'Sửa địa chỉ' : 'Thêm địa chỉ'} onClose={() => setEdit(null)}>
          <form onSubmit={save}>
            <Field label="Họ tên người nhận"><input className="input" value={edit.full_name} onChange={e => setEdit({ ...edit, full_name: e.target.value })} /></Field>
            <Field label="Số điện thoại"><input className="input" value={edit.phone} onChange={e => setEdit({ ...edit, phone: e.target.value })} inputMode="tel" /></Field>
            <Field label="Tỉnh / Thành phố"><select className="input" value={edit.province} onChange={e => setEdit({ ...edit, province: e.target.value })}>{PROVINCES.map(p => <option key={p}>{p}</option>)}</select></Field>
            <Field label="Phường / Xã"><input className="input" value={edit.ward} onChange={e => setEdit({ ...edit, ward: e.target.value })} /></Field>
            <Field label="Số nhà, tên đường"><input className="input" value={edit.line} onChange={e => setEdit({ ...edit, line: e.target.value })} /></Field>
            <label className="check"><input type="checkbox" checked={!!edit.is_default} onChange={e => setEdit({ ...edit, is_default: e.target.checked })} /> <span>Đặt làm mặc định</span></label>
            <button className="btn block">Lưu địa chỉ</button>
          </form>
        </Modal>
      )}
    </div>
  )
}

function Wishlist() {
  const { wish, byId } = useShop()
  const items = wish.map(id => byId.get(id)).filter(Boolean)
  return <div className="panel"><h2>Sản phẩm yêu thích ({items.length})</h2><Grid items={items} empty="Bấm ♡ trên sản phẩm để lưu vào đây" /></div>
}

function Password() {
  const { toast } = useShop()
  const [f, setF] = useState({ old: '', pw: '', pw2: '' })
  const save = async e => {
    e.preventDefault()
    if (f.pw.length < 8 || !/\d/.test(f.pw) || !/[a-zA-Z]/.test(f.pw)) return toast('Mật khẩu mới tối thiểu 8 ký tự, gồm chữ và số', 'bad')
    if (f.pw !== f.pw2) return toast('Mật khẩu nhập lại không khớp', 'bad')
    try { await api.changePassword(f.old, f.pw); toast('Đã đổi mật khẩu'); setF({ old: '', pw: '', pw2: '' }) } catch (x) { toast(x.message, 'bad') }
  }
  return (
    <form className="panel narrow-form" onSubmit={save}>
      <h2>Đổi mật khẩu</h2>
      {DEMO && <Field label="Mật khẩu hiện tại"><input className="input" type="password" value={f.old} onChange={e => setF({ ...f, old: e.target.value })} autoComplete="current-password" /></Field>}
      <Field label="Mật khẩu mới"><input className="input" type="password" value={f.pw} onChange={e => setF({ ...f, pw: e.target.value })} autoComplete="new-password" /></Field>
      <Field label="Nhập lại mật khẩu mới"><input className="input" type="password" value={f.pw2} onChange={e => setF({ ...f, pw2: e.target.value })} autoComplete="new-password" /></Field>
      <button className="btn">Đổi mật khẩu</button>
    </form>
  )
}

export default function Account() {
  const { user } = useShop()
  const loc = useLocation()
  const nav = useNavigate()
  if (user === undefined) return <div className="container pad-l"><Spinner /></div>
  if (!user) return <Navigate to={'/dang-nhap?tiep=' + encodeURIComponent(loc.pathname)} replace />
  const out = async () => { await api.signOut(); nav('/') }
  return (
    <div className="container account">
      <aside className="acc-nav panel">
        <div className="acc-hello"><div className="avatar">{(user.full_name || user.email)[0].toUpperCase()}</div><div><small className="muted">Xin chào</small><b>{user.full_name || user.email}</b></div></div>
        <NavLink end to="/tai-khoan"><Icon name="user" size={18} /> Thông tin cá nhân</NavLink>
        <NavLink to="/tai-khoan/don-hang"><Icon name="box" size={18} /> Đơn hàng</NavLink>
        <NavLink to="/tai-khoan/dia-chi"><Icon name="pin" size={18} /> Sổ địa chỉ</NavLink>
        <NavLink to="/tai-khoan/yeu-thich"><Icon name="heart" size={18} /> Yêu thích</NavLink>
        <NavLink to="/tai-khoan/doi-mat-khau"><Icon name="shield" size={18} /> Đổi mật khẩu</NavLink>
        {user.role === 'admin' && <NavLink to="/quan-tri"><Icon name="gold" size={18} /> Trang quản trị</NavLink>}
        <button onClick={out}><Icon name="logout" size={18} /> Đăng xuất</button>
      </aside>
      <div className="acc-main">
        <Routes>
          <Route index element={<Profile />} />
          <Route path="don-hang" element={<Orders />} />
          <Route path="don-hang/:code" element={<OrderDetail />} />
          <Route path="dia-chi" element={<Addresses />} />
          <Route path="yeu-thich" element={<Wishlist />} />
          <Route path="doi-mat-khau" element={<Password />} />
        </Routes>
      </div>
    </div>
  )
}
