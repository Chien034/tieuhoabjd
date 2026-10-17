import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ProductArt from './ProductArt.jsx'
import { vnd, discountPct } from '../lib/format.js'
import { useShop } from '../lib/store.jsx'
import { hasVariants, priceRange } from '../lib/variants.js'

export function Icon({ name, size = 20 }) {
  const p = {
    search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4.3-4.3',
    cart: 'M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2M10 20.5a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1zm8 0a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1z',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0',
    heart: 'M12 20s-7-4.4-9.2-9A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5c-2.2 4.6-9.2 9-9.2 9z',
    pin: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
    phone: 'M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z',
    truck: 'M3 6h11v10H3zM14 9h4l3 3v4h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    shield: 'M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z M9 12l2 2 4-4',
    refresh: 'M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4',
    card: 'M3 6h18v12H3zM3 10h18',
    menu: 'M4 6h16M4 12h16M4 18h16',
    close: 'M6 6l12 12M18 6 6 18',
    chevron: 'M9 6l6 6-6 6',
    filter: 'M4 5h16l-6 8v6l-4-2v-4z',
    gift: 'M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-2-4-6-3-5 0M12 7c2-4 6-3 5 0',
    gold: 'M4 18l2-6h5l2 6zM11 18l2-6h5l2 6zM7.5 12l2-6h5l2 6z',
    star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z',
    check: 'M5 12l5 5 9-10',
    logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
    box: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
    sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
    moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  }[name]
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={p} />
    </svg>
  )
}

export function Stars({ value = 0, size = 14 }) {
  return (
    <span className="stars" style={{ '--s': size + 'px' }} aria-label={`${value} sao`}>
      <span className="stars-fill" style={{ width: `${(value / 5) * 100}%` }}>★★★★★</span>★★★★★
    </span>
  )
}

export function Price({ p, big, from }) {
  const pct = discountPct(p)
  const r = priceRange(p)
  const isFrom = from ?? r.min < r.max // nhiều biến thể khác giá: "Giá từ …"
  return (
    <div className={'price' + (big ? ' big' : '')}>
      <span className="now">{isFrom && <small className="from">{big ? 'Giá từ ' : 'Từ '}</small>}{vnd(p.price)}</span>
      {pct > 0 && <><span className="was">{vnd(p.compare_price)}</span><span className="pct">-{pct}%</span></>}
    </div>
  )
}

export function ProductCard({ p }) {
  const { wish, toggleWish, addToCart, toast } = useShop()
  const liked = wish.includes(p.id)
  const meta = p.kind === 'doll' ? `BJD ${p.scale}` : p.scale === 'all' ? 'Mọi size' : `Size ${p.scale}`
  return (
    <article className="card">
      <Link to={`/san-pham/${p.slug}`} className="card-img">
        <ProductArt product={p} />
        <div className="card-badges">
          {p.tags?.includes('moi') && <span className="badge new">Mới</span>}
          {p.tags?.includes('flash') && <span className="badge flash">Flash sale</span>}
          {p.stock === 0 && <span className="badge out">Hết hàng</span>}
        </div>
      </Link>
      <button className={'wish' + (liked ? ' on' : '')} onClick={() => toggleWish(p.id)} aria-label={liked ? 'Bỏ yêu thích' : 'Yêu thích'} aria-pressed={liked}>
        <Icon name="heart" size={18} />
      </button>
      <div className="card-body">
        <div className="card-meta">{meta} · {p.stock_type === 'order' ? <span className="order-tag">Order ~{p.lead_days} ngày</span> : <span className="ok-text">Có sẵn</span>}{p.sold > 0 && <span> · Đã bán {p.sold > 999 ? (p.sold / 1000).toFixed(1) + 'k' : p.sold}</span>}</div>
        <Link to={`/san-pham/${p.slug}`} className="card-name">{p.name}</Link>
        <Price p={p} />
        <div className="card-foot">
          <span><Stars value={p.rating} size={12} /> <small>({p.review_count})</small></span>
          {p.stock > 0 && p.kind !== 'doll' && !hasVariants(p) && (
            <button className="mini-add" onClick={() => { addToCart(p, '', 1, { silent: true }); toast('Đã thêm vào giỏ hàng') }} aria-label="Thêm vào giỏ">
              <Icon name="cart" size={16} />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export function Grid({ items, empty = 'Không có sản phẩm phù hợp' }) {
  if (!items) return <div className="grid">{[...Array(8)].map((_, i) => <div key={i} className="card skeleton" />)}</div>
  if (!items.length) return <Empty text={empty} />
  return <div className="grid">{items.map(p => <ProductCard key={p.id} p={p} />)}</div>
}

export function Rail({ title, link, items }) {
  const ref = useRef(null)
  const scroll = d => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.8, behavior: 'smooth' })
  if (items && !items.length) return null
  return (
    <section className="section">
      <div className="section-head">
        <h2>{title}</h2>
        <div className="rail-nav">
          {link && <Link to={link} className="more">Xem tất cả</Link>}
          <button onClick={() => scroll(-1)} aria-label="Trước" className="round"><span style={{ display: 'inline-flex', transform: 'scaleX(-1)' }}><Icon name="chevron" size={16} /></span></button>
          <button onClick={() => scroll(1)} aria-label="Sau" className="round"><Icon name="chevron" size={16} /></button>
        </div>
      </div>
      <div className="rail" ref={ref}>
        {(items || [...Array(6)].map((_, i) => ({ id: 'sk' + i }))).map(p => (items ? <ProductCard key={p.id} p={p} /> : <div key={p.id} className="card skeleton" />))}
      </div>
    </section>
  )
}

export function Countdown({ to }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  const s = Math.max(0, Math.floor((to - now) / 1000))
  const parts = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(n => String(n).padStart(2, '0'))
  return <span className="countdown">{parts.map((x, i) => <b key={i}>{x}</b>)}</span>
}

export function Breadcrumb({ items }) {
  return (
    <nav className="crumb" aria-label="Đường dẫn">
      <Link to="/">Trang chủ</Link>
      {items.map((it, i) => <span key={i}> / {it.to ? <Link to={it.to}>{it.label}</Link> : <span>{it.label}</span>}</span>)}
    </nav>
  )
}

export function Empty({ text, children }) {
  return <div className="empty"><div className="empty-ico"><Icon name="box" size={40} /></div><p>{text}</p>{children}</div>
}

export function Spinner() { return <div className="spinner" aria-label="Đang tải" /> }

export function Badge({ tone, children }) { return <span className={'pill ' + (tone || '')}>{children}</span> }

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const f = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', f); document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', f); document.body.style.overflow = '' }
  }, [onClose])
  return (
    <div className="modal-bg" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose} aria-label="Đóng"><Icon name="close" /></button></div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

export function Qty({ value, onChange, max = 10 }) {
  return (
    <div className="qty">
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} aria-label="Giảm">−</button>
      <input value={value} inputMode="numeric" aria-label="Số lượng" onChange={e => { const n = parseInt(e.target.value.replace(/\D/g, '')) || 1; onChange(Math.min(max, Math.max(1, n))) }} />
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Tăng">+</button>
    </div>
  )
}

export function Field({ label, error, children, hint }) {
  return (
    <label className={'field' + (error ? ' has-err' : '')}>
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="field-err">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  )
}
