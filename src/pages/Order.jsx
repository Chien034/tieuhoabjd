import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import { api, DEMO } from '../lib/api.js'
import { useShop } from '../lib/store.jsx'
import { vnd, dateTime, ORDER_STATUS, PAYMENT_STATUS, paymentName } from '../lib/format.js'
import { amountDue } from '../lib/pricing.js'
import { Badge, Breadcrumb, Empty, Icon, Spinner, Field } from '../components/ui.jsx'
import { rememberOrderPhone } from './Checkout.jsx'

const STEPS = ['cho_xac_nhan', 'da_xac_nhan', 'dang_giao', 'da_giao']
const storedPhone = code => { try { return sessionStorage.getItem('hk_phone_' + code) || '' } catch { return '' } }

export function OrderView({ order, onChange }) {
  const { toast, user, info, byId } = useShop()
  const BANK = { id: info.bank_id, acc: info.bank_account, name: info.bank_account_name }
  const [stores, setStores] = useState([])
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (order.store_id) api.stores().then(setStores).catch(() => {}) }, [order.store_id])
  const st = ORDER_STATUS[order.status], ps = PAYMENT_STATUS[order.payment_status]
  const store = stores.find(s => s.id === order.store_id)
  const online = ['vnpay', 'momo'].includes(order.payment_method)
  const due = amountDue(order)
  const unpaid = due > 0
  const dueLabel = order.deposit > 0 ? (order.payment_status === 'da_coc' ? 'phần còn lại' : 'tiền cọc') : 'đơn hàng'
  const stepIdx = STEPS.indexOf(order.status)
  const label = order.delivery === 'pickup' ? { dang_giao: 'Sẵn sàng nhận', da_giao: 'Đã nhận hàng' } : {}

  const pay = async () => {
    setBusy(true)
    try { window.location.href = await api.startPayment(order) } catch (e) { toast(e.message, 'bad'); setBusy(false) }
  }
  const cancel = async () => {
    if (!confirm('Hủy đơn hàng ' + order.code + '?')) return
    try { await api.cancelOrder(order.code, 'Khách hủy đơn'); toast('Đã hủy đơn hàng'); onChange?.() } catch (e) { toast(e.message, 'bad') }
  }

  return (
    <div className="order-view">
      <div className="row-between wrap gap">
        <div><h2>Đơn hàng #{order.code}</h2><small className="muted">Đặt lúc {dateTime(order.created_at)}</small></div>
        <div className="row gap"><Badge tone={st?.tone}>{label[order.status] || st?.label}</Badge><Badge tone={ps?.tone}>{ps?.label}</Badge></div>
      </div>

      {order.status !== 'da_huy' && (
        <ol className="steps">
          {STEPS.map((s, i) => <li key={s} className={i <= stepIdx ? 'done' : ''}><span>{i + 1}</span>{label[s] || ORDER_STATUS[s].label}</li>)}
        </ol>
      )}

      {unpaid && order.payment_method === 'bank' && (
        <div className="panel qr-box">
          <img src={`https://img.vietqr.io/image/${BANK.id}-${BANK.acc}-compact2.png?amount=${due}&addInfo=${encodeURIComponent(order.code + (order.payment_status === 'da_coc' ? ' CON LAI' : order.deposit ? ' COC' : ''))}&accountName=${encodeURIComponent(BANK.name)}`} alt="Mã QR chuyển khoản" width="220" height="220" />
          <div>
            <h3>Quét mã để chuyển {dueLabel}</h3>
            <table className="table compact"><tbody>
              <tr><th>Ngân hàng</th><td>{BANK.id}</td></tr>
              <tr><th>Số tài khoản</th><td><b>{BANK.acc}</b> <button className="link-btn" onClick={() => { navigator.clipboard?.writeText(BANK.acc); toast('Đã sao chép') }}>Sao chép</button></td></tr>
              <tr><th>Chủ tài khoản</th><td>{BANK.name}</td></tr>
              <tr><th>Số tiền</th><td><b className="accent">{vnd(due)}</b></td></tr>
              <tr><th>Nội dung</th><td><b>{order.code + (order.payment_status === 'da_coc' ? ' CON LAI' : order.deposit ? ' COC' : '')}</b></td></tr>
            </tbody></table>
            <p className="muted small">Đơn sẽ được xác nhận ngay khi nhận được tiền. Giữ nguyên nội dung chuyển khoản để đối soát tự động.</p>
          </div>
        </div>
      )}
      {unpaid && online && <div className="notice warn row-between wrap gap"><span>Cần thanh toán {dueLabel} <b>{vnd(due)}</b> qua {order.payment_method === 'vnpay' ? 'VNPay' : 'MoMo'}.</span><button className="btn sm" onClick={pay} disabled={busy}>{busy ? 'Đang chuyển…' : 'Thanh toán ngay'}</button></div>}
      {order.deposit > 0 && order.payment_status === 'da_coc' && <div className="notice">Đã nhận cọc <b>{vnd(order.deposit)}</b>. Shop báo khi hàng về để thanh toán phần còn lại <b>{vnd(order.total - order.deposit)}</b>.</div>}

      <div className="order-cols">
        <div className="panel">
          <h4>Người nhận</h4>
          <p><b>{order.full_name}</b> · {order.phone}<br />{order.email}</p>
          <h4>{order.delivery === 'pickup' ? 'Nhận tại showroom' : 'Giao tới'}</h4>
          <p>{order.delivery === 'pickup' ? (store ? <>{store.name}<br /><small>{store.address}, {store.district}, {store.city} · {store.phone}</small></> : '…') : order.address}</p>
          {order.note && <><h4>Ghi chú</h4><p>{order.note}</p></>}
          {order.gift_wrap && <p><Icon name="gift" size={16} /> Gói quà + thiệp</p>}
          {order.invoice && <><h4>Hóa đơn</h4><p>{order.invoice.company} · MST {order.invoice.tax_code}<br /><small>{order.invoice.address}</small></p></>}
          <h4>Thanh toán</h4><p>{paymentName(order.payment_method)}</p>
        </div>
        <div className="panel">
          <h4>Sản phẩm</h4>
          {order.items.map((it, i) => (
            <div key={i} className="row-between item-row">
              <span>{it.name}{it.variant && <small className="muted"> · {it.variant}</small>}{it.size && <small className="muted"> · Size {it.size}</small>} <small className="muted">× {it.qty}</small></span>
              <span className="nowrap">{order.status === 'da_giao' && user && order.user_id === user.id && byId.get(it.product_id) && <Link className="small" to={`/san-pham/${byId.get(it.product_id).slug}#danh-gia`}>Đánh giá</Link>} <b>{vnd(it.line_total)}</b></span>
            </div>
          ))}
          <div className="row-between"><span>Tạm tính</span><span>{vnd(order.subtotal)}</span></div>
          {order.discount > 0 && <div className="row-between ok-text"><span>Giảm giá {order.coupon_code && `(${order.coupon_code})`}</span><span>−{vnd(order.discount)}</span></div>}
          <div className="row-between"><span>Phí giao hàng</span><span>{order.shipping_fee ? vnd(order.shipping_fee) : 'Miễn phí'}</span></div>
          <div className="row-between total"><span>Tổng cộng</span><b className="accent">{vnd(order.total)}</b></div>
          {order.deposit > 0 && <div className="row-between small muted"><span>Cọc 50% / còn lại</span><span>{vnd(order.deposit)} / {vnd(order.total - order.deposit)}</span></div>}
        </div>
      </div>

      {order.events?.length > 0 && (
        <div className="panel">
          <h4>Lịch sử đơn hàng</h4>
          <ul className="timeline">
            {[...order.events].reverse().map((e, i) => <li key={i}><b>{ORDER_STATUS[e.status]?.label || (e.status === 'thanh_toan' ? 'Thanh toán' : e.status)}</b>{e.note && ` — ${e.note}`}<small className="muted"> · {dateTime(e.created_at)}</small></li>)}
          </ul>
        </div>
      )}
      {order.status === 'cho_xac_nhan' && order.payment_status !== 'da_thanh_toan' && user && (user.id === order.user_id || user.role === 'admin') && (
        <button className="btn ghost danger" onClick={cancel}>Hủy đơn hàng</button>
      )}
    </div>
  )
}

export function OrderPage() {
  const { code } = useParams()
  const [order, setOrder] = useState(undefined)
  const load = () => api.order(code, storedPhone(code)).then(setOrder).catch(() => setOrder(null))
  useEffect(() => { load() }, [code]) // eslint-disable-line
  if (order === undefined) return <div className="container pad-l"><Spinner /></div>
  if (!order) return <div className="container"><Empty text="Không xem được đơn hàng này. Hãy tra cứu bằng mã đơn và số điện thoại."><Link to={'/tra-cuu-don-hang?ma=' + code} className="btn">Tra cứu đơn hàng</Link></Empty></div>
  const fresh = Date.now() - new Date(order.created_at).getTime() < 30 * 60 * 1000
  return (
    <div className="container narrow">
      {fresh && order.status !== 'da_huy' && (
        <div className="success-head">
          <div className="success-ico"><Icon name="check" size={36} /></div>
          <h1>Đặt hàng thành công!</h1>
          <p>Cảm ơn <b>{order.full_name}</b>. Chúng tôi sẽ gọi xác nhận tới <b>{order.phone}</b> trong ít phút. Lưu lại mã đơn <b>{order.code}</b> để tra cứu khi cần.</p>
        </div>
      )}
      <OrderView order={order} onChange={load} />
      <div className="center mt"><Link to="/" className="btn ghost">Tiếp tục mua sắm</Link></div>
    </div>
  )
}

export function TrackOrder() {
  const [sp] = useSearchParams()
  const [code, setCode] = useState(sp.get('ma') || '')
  const [phone, setPhone] = useState('')
  const [order, setOrder] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const find = async e => {
    e?.preventDefault(); setErr(''); setBusy(true)
    try {
      const o = await api.order(code, phone)
      if (!o) setErr('Không tìm thấy đơn hàng khớp mã và số điện thoại'); else { setOrder(o); rememberOrderPhone(o.code, phone) }
    } catch (er) { setErr(er.message) } finally { setBusy(false) }
  }
  return (
    <div className="container narrow">
      <Breadcrumb items={[{ label: 'Tra cứu đơn hàng' }]} />
      <h1>Tra cứu đơn hàng</h1>
      <form className="panel form-grid" onSubmit={find}>
        <Field label="Mã đơn hàng"><input className="input" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="HK2610160001" required /></Field>
        <Field label="Số điện thoại đặt hàng"><input className="input" value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" required /></Field>
        <div className="field"><span className="field-label">&nbsp;</span><button className="btn" disabled={busy}>{busy ? 'Đang tìm…' : 'Tra cứu'}</button></div>
      </form>
      {err && <p className="bad-text">{err}</p>}
      {order && <OrderView order={order} onChange={find} />}
    </div>
  )
}

// Cổng thanh toán giả lập (chỉ chế độ demo)
export function DemoGateway() {
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const code = sp.get('code'), method = sp.get('method')
  const [order, setOrder] = useState(null)
  useEffect(() => { api.order(code, storedPhone(code)).then(setOrder) }, [code])
  if (!DEMO) return <div className="container"><Empty text="Trang này chỉ dùng trong chế độ demo" /></div>
  const done = async ok => { await api.demoPaymentResult(code, ok); nav('/dat-hang/' + code, { replace: true }) }
  return (
    <div className="gateway">
      <div className={'gw-card ' + method}>
        <div className="gw-brand">{method === 'momo' ? 'MoMo' : 'VNPAY'} <small>(giả lập)</small></div>
        {order ? <>
          <p>Thanh toán đơn hàng <b>{code}</b></p>
          <div className="gw-amount">{vnd(amountDue(order))}</div>
          <div className="gw-qr" aria-hidden="true">{[...Array(49)].map((_, i) => <i key={i} className={(i * 7 + (i % 5)) % 3 ? 'b' : ''} />)}</div>
          <button className="btn block" onClick={() => done(true)}>Thanh toán thành công</button>
          <button className="btn ghost block" onClick={() => done(false)}>Hủy / thất bại</button>
        </> : <Spinner />}
      </div>
    </div>
  )
}

// Cổng thật (VNPay / MoMo) quay về đây: máy chủ kiểm tra chữ ký rồi chuyển tới trang đơn
export function PaymentReturn() {
  const { search } = useLocation()
  const nav = useNavigate()
  const [msg, setMsg] = useState('Đang xác nhận kết quả thanh toán…')
  useEffect(() => {
    api.verifyReturn(search).then(r => {
      if (r?.code) nav('/dat-hang/' + r.code + (r.ok ? '' : '?tt=loi'), { replace: true })
      else setMsg('Không xác nhận được kết quả thanh toán. Vui lòng kiểm tra đơn trong mục Tra cứu đơn hàng.')
    }).catch(() => setMsg('Có lỗi khi xác nhận thanh toán.'))
  }, [search, nav])
  return <div className="container pad-l center"><p>{msg}</p>{msg.startsWith('Đang') ? <Spinner /> : <Link className="btn" to="/tra-cuu-don-hang">Tra cứu đơn hàng</Link>}</div>
}
