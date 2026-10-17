import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useShop } from '../lib/store.jsx'
import { api } from '../lib/api.js'
import { computeTotals } from '../lib/pricing.js'
import { vnd, PAYMENT_METHODS } from '../lib/format.js'
import { PROVINCES, formatAddress, validPhone, validEmail } from '../lib/provinces.js'
import ProductArt from '../components/ProductArt.jsx'
import { Breadcrumb, Empty, Field } from '../components/ui.jsx'

export function rememberOrderPhone(code, phone) { try { sessionStorage.setItem('hk_phone_' + code, phone) } catch { /* bỏ qua */ } }

export default function Checkout() {
  const { cart, subtotal, user, clearCart, toast, reloadProducts } = useShop()
  const nav = useNavigate()
  const [stores, setStores] = useState([])
  const [addrs, setAddrs] = useState([])
  const [addrId, setAddrId] = useState('new')
  const [f, setF] = useState({ full_name: '', phone: '', email: '', delivery: 'ship', province: 'Hà Nội', ward: '', line: '', store_id: '', note: '', gift_wrap: false, want_invoice: false, inv_company: '', inv_tax: '', inv_address: '', payment_method: 'cod' })
  const [couponText, setCouponText] = useState('')
  const [coupon, setCoupon] = useState(null)
  const [errs, setErrs] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k, v) => { setF(x => ({ ...x, [k]: v })); setErrs(e => ({ ...e, [k]: undefined })) }

  useEffect(() => { api.stores().then(s => { setStores(s); setF(x => ({ ...x, store_id: x.store_id || String(s[0]?.id || '') })) }).catch(() => {}) }, [])
  useEffect(() => {
    if (!user) return
    setF(x => ({ ...x, full_name: x.full_name || user.full_name || '', phone: x.phone || user.phone || '', email: x.email || user.email || '' }))
    api.addresses().then(list => {
      setAddrs(list)
      const d = list.find(a => a.is_default) || list[0]
      if (d) setAddrId(d.id)
    }).catch(() => {})
  }, [user])

  const preorder = cart.some(l => l.product.stock_type === 'order')
  const totals = useMemo(() => computeTotals({ subtotal, delivery: f.delivery, coupon, preorder }), [subtotal, f.delivery, coupon, preorder])
  useEffect(() => { if (preorder && f.payment_method === 'cod') setF(x => ({ ...x, payment_method: 'bank' })) }, [preorder, f.payment_method])
  const savedAddr = addrs.find(a => a.id === addrId)

  const applyCoupon = async () => {
    if (!couponText.trim()) return
    try { const c = await api.coupon(couponText); setCoupon(c); toast('Đã áp dụng mã ' + c.code) }
    catch (e) { setCoupon(null); toast(e.message, 'bad') }
  }

  const validate = () => {
    const e = {}
    if (!f.full_name.trim()) e.full_name = 'Nhập họ tên người nhận'
    if (!validPhone(f.phone)) e.phone = 'Số điện thoại gồm 10 số, bắt đầu bằng 0'
    if (f.email && !validEmail(f.email)) e.email = 'Email chưa đúng'
    if (!user && !f.email) e.email = 'Nhập email để nhận xác nhận đơn hàng'
    if (f.delivery === 'ship' && !savedAddr) {
      if (!f.ward.trim()) e.ward = 'Nhập phường / xã'
      if (!f.line.trim()) e.line = 'Nhập số nhà, tên đường'
    }
    if (f.delivery === 'pickup' && !f.store_id) e.store_id = 'Chọn cửa hàng'
    if (f.want_invoice && (!f.inv_company.trim() || !/^\d{10}(-\d{3})?$/.test(f.inv_tax.trim()))) e.inv_tax = 'Nhập tên công ty và mã số thuế (10 hoặc 13 số)'
    if (totals.couponError) e.coupon = totals.couponError
    setErrs(e)
    return Object.keys(e).length === 0
  }

  const submit = async ev => {
    ev.preventDefault()
    if (!validate()) { toast('Vui lòng kiểm tra lại thông tin', 'bad'); document.querySelector('.has-err')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return }
    setBusy(true)
    try {
      const address = f.delivery === 'ship' ? (savedAddr ? formatAddress(savedAddr) : formatAddress(f)) : ''
      const order = await api.placeOrder({
        items: cart.map(l => ({ product_id: l.product_id, size: l.size, qty: l.qty })),
        full_name: f.full_name.trim(), phone: f.phone.replace(/[\s.-]/g, ''), email: (f.email || user?.email || '').trim(),
        delivery: f.delivery, address, store_id: f.delivery === 'pickup' ? Number(f.store_id) : null,
        note: f.note.trim(), gift_wrap: f.gift_wrap,
        invoice: f.want_invoice ? { company: f.inv_company.trim(), tax_code: f.inv_tax.trim(), address: f.inv_address.trim() } : null,
        coupon_code: coupon?.code || null, payment_method: f.payment_method,
      })
      if (user && f.delivery === 'ship' && !savedAddr && addrs.length === 0) {
        api.saveAddress({ full_name: f.full_name, phone: f.phone, province: f.province, ward: f.ward, line: f.line, is_default: true }).catch(() => {})
      }
      rememberOrderPhone(order.code, order.phone)
      clearCart(); reloadProducts()
      if (['vnpay', 'momo'].includes(order.payment_method)) {
        try { const url = await api.startPayment(order); window.location.href = url; return }
        catch (e) { toast(e.message + ' — bạn có thể thanh toán lại trong trang đơn hàng', 'bad') }
      }
      nav('/dat-hang/' + order.code, { replace: true })
    } catch (e) {
      toast(e.message, 'bad'); reloadProducts()
    } finally { setBusy(false) }
  }

  if (!cart.length) return <div className="container"><Empty text="Giỏ hàng trống, chưa có gì để thanh toán"><Link to="/" className="btn">Mua sắm ngay</Link></Empty></div>

  return (
    <div className="container">
      <Breadcrumb items={[{ label: 'Giỏ hàng', to: '/gio-hang' }, { label: 'Thanh toán' }]} />
      <form className="checkout-grid" onSubmit={submit} noValidate>
        <div>
          {!user && <div className="notice">Đã có tài khoản? <Link to="/dang-nhap?tiep=/thanh-toan">Đăng nhập</Link> để dùng địa chỉ đã lưu và theo dõi đơn dễ hơn. Hoặc tiếp tục mua không cần tài khoản.</div>}

          <section className="panel">
            <h3>1. Thông tin người nhận</h3>
            <div className="form-grid">
              <Field label="Họ và tên *" error={errs.full_name}><input className="input" value={f.full_name} onChange={e => set('full_name', e.target.value)} autoComplete="name" /></Field>
              <Field label="Số điện thoại *" error={errs.phone}><input className="input" value={f.phone} onChange={e => set('phone', e.target.value)} inputMode="tel" autoComplete="tel" /></Field>
              <Field label={user ? 'Email' : 'Email *'} error={errs.email} hint="Để liên hệ về đơn hàng"><input className="input" value={f.email} onChange={e => set('email', e.target.value)} type="email" autoComplete="email" /></Field>
            </div>
          </section>

          <section className="panel">
            <h3>2. Hình thức nhận hàng</h3>
            <div className="seg">
              <label className={f.delivery === 'ship' ? 'on' : ''}><input type="radio" name="dl" checked={f.delivery === 'ship'} onChange={() => set('delivery', 'ship')} /> Giao tận nơi</label>
              <label className={f.delivery === 'pickup' ? 'on' : ''}><input type="radio" name="dl" checked={f.delivery === 'pickup'} onChange={() => set('delivery', 'pickup')} /> Nhận tại showroom</label>
            </div>
            {f.delivery === 'ship' ? (
              <>
                {addrs.length > 0 && (
                  <div className="addr-pick">
                    {addrs.map(a => (
                      <label key={a.id} className={'addr-opt' + (addrId === a.id ? ' on' : '')}>
                        <input type="radio" checked={addrId === a.id} onChange={() => setAddrId(a.id)} />
                        <span><b>{a.full_name}</b> · {a.phone}{a.is_default && <em className="pill info">Mặc định</em>}<br /><small>{formatAddress(a)}</small></span>
                      </label>
                    ))}
                    <label className={'addr-opt' + (addrId === 'new' ? ' on' : '')}><input type="radio" checked={addrId === 'new'} onChange={() => setAddrId('new')} /> Giao tới địa chỉ khác</label>
                  </div>
                )}
                {!savedAddr && (
                  <div className="form-grid">
                    <Field label="Tỉnh / Thành phố *"><select className="input" value={f.province} onChange={e => set('province', e.target.value)}>{PROVINCES.map(p => <option key={p}>{p}</option>)}</select></Field>
                    <Field label="Phường / Xã *" error={errs.ward}><input className="input" value={f.ward} onChange={e => set('ward', e.target.value)} placeholder="Vd: Phường Bến Thành" /></Field>
                    <Field label="Số nhà, tên đường *" error={errs.line}><input className="input" value={f.line} onChange={e => set('line', e.target.value)} autoComplete="street-address" /></Field>
                  </div>
                )}
              </>
            ) : (
              <Field label="Chọn showroom *" error={errs.store_id}>
                <select className="input" value={f.store_id} onChange={e => set('store_id', e.target.value)}>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name} — {s.address}, {s.district}, {s.city}</option>)}
                </select>
              </Field>
            )}
            <Field label="Ghi chú"><textarea className="input" rows={2} value={f.note} onChange={e => set('note', e.target.value)} placeholder="Vd: giao giờ hành chính, muốn đổi màu mắt…" maxLength={500} /></Field>
            <label className="check"><input type="checkbox" checked={f.gift_wrap} onChange={e => set('gift_wrap', e.target.checked)} /> <span>Gói quà + thiệp (miễn phí)</span></label>
            <label className="check"><input type="checkbox" checked={f.want_invoice} onChange={e => set('want_invoice', e.target.checked)} /> <span>Xuất hóa đơn công ty</span></label>
            {f.want_invoice && (
              <div className="form-grid">
                <Field label="Tên công ty"><input className="input" value={f.inv_company} onChange={e => set('inv_company', e.target.value)} /></Field>
                <Field label="Mã số thuế" error={errs.inv_tax}><input className="input" value={f.inv_tax} onChange={e => set('inv_tax', e.target.value)} inputMode="numeric" /></Field>
                <Field label="Địa chỉ công ty"><input className="input" value={f.inv_address} onChange={e => set('inv_address', e.target.value)} /></Field>
              </div>
            )}
          </section>

          <section className="panel">
            <h3>3. Phương thức thanh toán</h3>
            <div className="pay-methods">
              {preorder && <div className="notice warn small">Đơn có hàng <b>đặt trước</b>: thanh toán cọc 50% bây giờ, phần còn lại khi hàng về. Không áp dụng COD.</div>}
              {PAYMENT_METHODS.filter(m => !(preorder && m.key === 'cod')).map(m => (
                <label key={m.key} className={'pay-opt' + (f.payment_method === m.key ? ' on' : '')}>
                  <input type="radio" name="pm" checked={f.payment_method === m.key} onChange={() => set('payment_method', m.key)} />
                  <span className={'pay-logo ' + m.key}>{{ cod: 'COD', bank: 'QR', vnpay: 'VNPAY', momo: 'MoMo' }[m.key]}</span>
                  <span><b>{m.name}</b><small className="muted">{m.note}</small></span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <aside className="panel summary sticky">
          <h3>Đơn hàng ({cart.reduce((s, l) => s + l.qty, 0)} sản phẩm)</h3>
          <div className="sum-lines">
            {cart.map(l => (
              <div key={l.product_id + l.size} className="sum-line">
                <span className="sum-img"><ProductArt product={l.product} /><i>{l.qty}</i></span>
                <span className="sum-name">{l.product.name}{l.size && <small className="muted"> · Size {l.size}</small>}</span>
                <b>{vnd(l.product.price * l.qty)}</b>
              </div>
            ))}
          </div>
          <div className={'coupon' + (errs.coupon ? ' has-err' : '')}>
            <input className="input" value={couponText} onChange={e => setCouponText(e.target.value.toUpperCase())} placeholder="Mã giảm giá" aria-label="Mã giảm giá" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon() } }} />
            <button type="button" className="btn ghost sm" onClick={applyCoupon}>Áp dụng</button>
          </div>
          {coupon && <div className="row-between small"><span className="ok-text">Mã {coupon.code}: {coupon.description}</span><button type="button" className="link-btn" onClick={() => { setCoupon(null); setCouponText('') }}>Bỏ</button></div>}
          {(errs.coupon || totals.couponError) && <p className="bad-text small">{errs.coupon || totals.couponError}</p>}
          <div className="row-between"><span>Tạm tính</span><span>{vnd(totals.subtotal)}</span></div>
          {totals.discount > 0 && <div className="row-between ok-text"><span>Giảm giá</span><span>−{vnd(totals.discount)}</span></div>}
          <div className="row-between"><span>Phí giao hàng</span><span>{totals.shipping ? vnd(totals.shipping) : 'Miễn phí'}</span></div>
          <div className="row-between total"><span>Tổng đơn hàng</span><b className="accent">{vnd(totals.total)}</b></div>
          {totals.deposit > 0 && <>
            <div className="row-between deposit"><span>Cọc trước (50%)</span><b>{vnd(totals.deposit)}</b></div>
            <div className="row-between muted small"><span>Còn lại khi hàng về</span><span>{vnd(totals.total - totals.deposit)}</span></div>
          </>}
          <p className="muted small">Giá đã gồm phí vận chuyển quốc tế và thuế. Hàng đặt trước giữ nguyên giá khi đã cọc.</p>
          <button className="btn block big" disabled={busy}>{busy ? 'Đang đặt hàng…' : ['vnpay', 'momo'].includes(f.payment_method) ? (totals.deposit ? 'Đặt hàng & thanh toán cọc' : 'Đặt hàng & thanh toán') : 'Đặt hàng'}</button>
          <p className="muted small center">Bấm đặt hàng là bạn đồng ý với <Link to="/chinh-sach/giao-hang">điều khoản mua hàng</Link>.</p>
        </aside>
      </form>
    </div>
  )
}
