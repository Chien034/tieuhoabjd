import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { api, DEMO } from '../lib/api.js'
import { useShop } from '../lib/store.jsx'
import { validEmail, validPhone } from '../lib/provinces.js'
import { Field, Spinner } from '../components/ui.jsx'

const safeNext = s => (s && s.startsWith('/') && !s.startsWith('//') ? s : '/tai-khoan')

function AuthShell({ children, title }) {
  return (
    <div className="container auth-wrap">
      <div className="auth-card panel">
        <h1>{title}</h1>
        {children}
      </div>
      <div className="auth-side">
        <h2>Thành viên được gì?</h2>
        <ul>
          <li>Theo dõi đơn hàng, lịch sử mua</li>
          <li>Lưu địa chỉ, thanh toán nhanh hơn</li>
          <li>Lưu sản phẩm yêu thích</li>
          <li>Ưu đãi sinh nhật & tích điểm thành viên</li>
        </ul>
      </div>
    </div>
  )
}

export function Login() {
  const { user, toast } = useShop()
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const [f, setF] = useState({ email: '', password: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  if (user === undefined) return <Spinner />
  if (user) return <Navigate to={safeNext(sp.get('tiep'))} replace />
  const submit = async e => {
    e.preventDefault(); setErr(''); setBusy(true)
    try { const u = await api.signIn(f); toast('Xin chào ' + (u.full_name || u.email)); nav(safeNext(sp.get('tiep')), { replace: true }) }
    catch (er) { setErr(er.message) } finally { setBusy(false) }
  }
  return (
    <AuthShell title="Đăng nhập">
      <form onSubmit={submit}>
        <Field label="Email"><input className="input" type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} autoComplete="email" required autoFocus /></Field>
        <Field label="Mật khẩu"><input className="input" type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} autoComplete="current-password" required /></Field>
        {err && <p className="bad-text">{err}</p>}
        <button className="btn block big" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
      </form>
      <div className="row-between mt"><Link to="/quen-mat-khau">Quên mật khẩu?</Link><Link to={'/dang-ky' + (sp.get('tiep') ? '?tiep=' + encodeURIComponent(sp.get('tiep')) : '')}>Tạo tài khoản mới</Link></div>
      {DEMO && <p className="notice small mt">Demo: quản trị <b>admin@tieuhoa.vn</b> / <b>admin123</b>, hoặc tự đăng ký tài khoản khách.</p>}
    </AuthShell>
  )
}

export function Register() {
  const { user, toast } = useShop()
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const [f, setF] = useState({ full_name: '', phone: '', email: '', password: '', password2: '', agree: false })
  const [errs, setErrs] = useState({})
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  if (user) return <Navigate to={safeNext(sp.get('tiep'))} replace />
  const set = (k, v) => { setF(x => ({ ...x, [k]: v })); setErrs(e => ({ ...e, [k]: undefined })) }
  const submit = async e => {
    e.preventDefault()
    const er = {}
    if (f.full_name.trim().length < 2) er.full_name = 'Nhập họ tên'
    if (!validPhone(f.phone)) er.phone = 'Số điện thoại 10 số, bắt đầu bằng 0'
    if (!validEmail(f.email)) er.email = 'Email chưa đúng'
    if (f.password.length < 8 || !/\d/.test(f.password) || !/[a-zA-Z]/.test(f.password)) er.password = 'Tối thiểu 8 ký tự, gồm cả chữ và số'
    if (f.password2 !== f.password) er.password2 = 'Mật khẩu nhập lại không khớp'
    if (!f.agree) er.agree = 'Vui lòng đồng ý điều khoản'
    setErrs(er)
    if (Object.keys(er).length) return
    setBusy(true)
    try {
      const r = await api.signUp({ email: f.email, password: f.password, full_name: f.full_name.trim(), phone: f.phone.replace(/[\s.-]/g, '') })
      if (r?.needConfirm) setSent(true)
      else { toast('Tạo tài khoản thành công!'); nav(safeNext(sp.get('tiep')), { replace: true }) }
    } catch (x) { setErrs({ email: x.message }) } finally { setBusy(false) }
  }
  if (sent) return <AuthShell title="Kiểm tra email"><p>Chúng tôi đã gửi link kích hoạt tới <b>{f.email}</b>. Mở email và bấm link để hoàn tất đăng ký.</p><Link to="/dang-nhap" className="btn">Về trang đăng nhập</Link></AuthShell>
  return (
    <AuthShell title="Tạo tài khoản">
      <form onSubmit={submit} noValidate>
        <Field label="Họ và tên" error={errs.full_name}><input className="input" value={f.full_name} onChange={e => set('full_name', e.target.value)} autoComplete="name" /></Field>
        <Field label="Số điện thoại" error={errs.phone}><input className="input" value={f.phone} onChange={e => set('phone', e.target.value)} inputMode="tel" autoComplete="tel" /></Field>
        <Field label="Email" error={errs.email}><input className="input" type="email" value={f.email} onChange={e => set('email', e.target.value)} autoComplete="email" /></Field>
        <Field label="Mật khẩu" error={errs.password} hint="Tối thiểu 8 ký tự, gồm chữ và số"><input className="input" type="password" value={f.password} onChange={e => set('password', e.target.value)} autoComplete="new-password" /></Field>
        <Field label="Nhập lại mật khẩu" error={errs.password2}><input className="input" type="password" value={f.password2} onChange={e => set('password2', e.target.value)} autoComplete="new-password" /></Field>
        <label className="check"><input type="checkbox" checked={f.agree} onChange={e => set('agree', e.target.checked)} /> <span>Tôi đồng ý với <Link to="/chinh-sach/bao-mat">chính sách bảo mật</Link></span></label>
        {errs.agree && <p className="bad-text small">{errs.agree}</p>}
        <button className="btn block big" disabled={busy}>{busy ? 'Đang tạo…' : 'Đăng ký'}</button>
      </form>
      <p className="mt">Đã có tài khoản? <Link to="/dang-nhap">Đăng nhập</Link></p>
    </AuthShell>
  )
}

export function Forgot() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const submit = async e => {
    e.preventDefault(); setErr(''); setMsg('')
    try { setMsg(await api.resetPassword(email)) } catch (x) { setErr(x.message) }
  }
  return (
    <AuthShell title="Quên mật khẩu">
      <form onSubmit={submit}>
        <p className="muted">Nhập email đã đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu.</p>
        <Field label="Email"><input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus /></Field>
        {err && <p className="bad-text">{err}</p>}
        {msg && <p className="ok-text">{msg}</p>}
        <button className="btn block">Gửi link đặt lại</button>
      </form>
      <p className="mt"><Link to="/dang-nhap">← Quay lại đăng nhập</Link></p>
    </AuthShell>
  )
}
