import { Link, useNavigate } from 'react-router-dom'
import { useShop } from '../lib/store.jsx'
import { vnd } from '../lib/format.js'
import ProductArt from '../components/ProductArt.jsx'
import { Breadcrumb, Empty, Qty, Rail } from '../components/ui.jsx'
import { filterProducts } from '../lib/catalog.js'

export default function Cart() {
  const { cart, subtotal, setQty, removeLine, changeSize, products, info } = useShop()
  const FREE_SHIP_FROM = info.free_ship_from
  const nav = useNavigate()
  const left = FREE_SHIP_FROM - subtotal
  const problems = cart.filter(l => l.product.stock < l.qty || (l.product.sizes?.length && !l.size))
  const suggest = products ? filterProducts(products, { grp: 'phu-kien', sort: 'ban-chay', scale: [...new Set(cart.map(l => l.product.scale))] }).filter(p => !cart.some(l => l.product_id === p.id)).slice(0, 10) : null

  if (!cart.length) {
    return (
      <div className="container">
        <Breadcrumb items={[{ label: 'Giỏ hàng' }]} />
        <Empty text="Giỏ hàng của bạn đang trống"><Link to="/" className="btn">Tiếp tục mua sắm</Link></Empty>
        <Rail title="Có thể bạn thích" items={suggest} />
      </div>
    )
  }
  return (
    <div className="container">
      <Breadcrumb items={[{ label: 'Giỏ hàng' }]} />
      <h1>Giỏ hàng ({cart.reduce((s, l) => s + l.qty, 0)} sản phẩm)</h1>
      <div className="checkout-grid">
        <div className="panel">
          <div className={'ship-bar' + (left <= 0 ? ' done' : '')}>
            {left > 0 ? <>Mua thêm <b>{vnd(left)}</b> để được miễn phí giao hàng</> : <>Đơn hàng được <b>miễn phí giao hàng</b></>}
            <div className="bar"><i style={{ width: Math.min(100, (subtotal / FREE_SHIP_FROM) * 100) + '%' }} /></div>
          </div>
          {cart.map(l => {
            const p = l.product
            return (
              <div key={p.id + l.size} className="cart-line">
                <Link to={`/san-pham/${p.slug}`} className="cart-img"><ProductArt product={p} /></Link>
                <div className="cart-info">
                  <Link to={`/san-pham/${p.slug}`} className="cart-name">{p.name}</Link>
                  <small className="muted">Mã {p.sku}</small>
                  {p.sizes?.length > 0 && (
                    <label className="inline-sel">Size
                      <select value={l.size} onChange={e => changeSize(p.id, l.size, e.target.value)} className={!l.size ? 'err' : ''}>
                        {!l.size && <option value="">Chọn size</option>}
                        {p.sizes.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </label>
                  )}
                  {p.stock < l.qty && <small className="bad-text">{p.stock === 0 ? 'Sản phẩm tạm hết hàng' : `Chỉ còn ${p.stock} sản phẩm`}</small>}
                  <div className="row gap wrap">
                    <Qty value={l.qty} onChange={q => setQty(p.id, l.size, q)} max={Math.max(1, Math.min(10, p.stock))} />
                    <button className="link-btn" onClick={() => removeLine(p.id, l.size)}>Xóa</button>
                  </div>
                </div>
                <div className="cart-price"><b>{vnd(p.price * l.qty)}</b>{l.qty > 1 && <small className="muted">{vnd(p.price)} / sp</small>}</div>
              </div>
            )
          })}
        </div>
        <aside className="panel summary">
          <h3>Tóm tắt đơn hàng</h3>
          <div className="row-between"><span>Tạm tính</span><b>{vnd(subtotal)}</b></div>
          <div className="row-between muted"><span>Phí giao hàng</span><span>{left <= 0 ? 'Miễn phí' : 'Tính ở bước sau'}</span></div>
          <p className="muted small">Nhập mã giảm giá ở bước thanh toán.</p>
          <div className="row-between total"><span>Tổng cộng</span><b className="accent">{vnd(subtotal)}</b></div>
          {problems.length > 0 && <p className="bad-text small">Vui lòng chọn size / chỉnh số lượng cho sản phẩm được đánh dấu.</p>}
          <button className="btn block big" disabled={problems.length > 0} onClick={() => nav('/thanh-toan')}>Tiến hành đặt hàng</button>
          <Link to="/" className="btn ghost block">Tiếp tục mua sắm</Link>
        </aside>
      </div>
      <Rail title="Mua kèm giá tốt" items={suggest} />
    </div>
  )
}
