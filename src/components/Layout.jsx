import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Icon } from './ui.jsx'
import { withVariantImage, lineLabel } from '../lib/variants.js'
import ProductArt from './ProductArt.jsx'
import ChatWidget from './ChatWidget.jsx'
import { useShop } from '../lib/store.jsx'
import { CATEGORIES, GROUPS, SCALES, COLLECTIONS } from '../lib/data.js'
import { filterProducts } from '../lib/catalog.js'
import { vnd } from '../lib/format.js'
import { DEMO } from '../lib/api.js'
import { telHref, zaloHref } from '../lib/shopInfo.js'
import { useTheme } from '../lib/theme.js'

function Logo() {
  const { info } = useShop()
  const SHOP_NAME = info.name
  return (
    <Link to="/" className="logo" aria-label={SHOP_NAME + ' — Trang chủ'}>
      {info.logo ? <img className="logo-img" src={info.logo} alt="" /> : <svg viewBox="0 0 64 64" width="34" height="34" aria-hidden="true"><circle cx="32" cy="28" r="16" fill="#f6dcd3" /><path d="M16 28Q16 8 32 8Q48 8 48 28Q42 18 32 21Q22 18 16 28Z" fill="#4a2c5e" /><circle cx="26" cy="29" r="2.6" fill="#d48aa8" /><circle cx="38" cy="29" r="2.6" fill="#d48aa8" /><path d="M18 58Q32 42 46 58Z" fill="#d48aa8" /></svg>}
      <span><b>{SHOP_NAME.split(' ').slice(0, 2).join(' ')}</b><small>{SHOP_NAME.split(' ').slice(2).join(' ') || 'Doll House'}</small></span>
    </Link>
  )
}

function SearchBox({ onDone }) {
  const { products } = useShop()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const nav = useNavigate()
  const box = useRef(null)
  const hits = useMemo(() => (q.trim().length > 1 && products ? filterProducts(products, { q, sort: 'ban-chay' }).slice(0, 6) : []), [q, products])
  useEffect(() => {
    const f = e => { if (!box.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', f); return () => document.removeEventListener('mousedown', f)
  }, [])
  const go = e => { e.preventDefault(); if (!q.trim()) return; setOpen(false); nav('/tim-kiem?q=' + encodeURIComponent(q.trim())); onDone?.() }
  return (
    <form className="search" onSubmit={go} ref={box} role="search">
      <input value={q} onChange={e => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} placeholder="Tìm búp bê 1/4, tóc giả, mắt 14mm…" aria-label="Tìm kiếm sản phẩm" />
      <button aria-label="Tìm"><Icon name="search" size={18} /></button>
      {open && q.trim().length > 1 && (
        <div className="suggest">
          {hits.length === 0 ? <div className="suggest-empty">Không tìm thấy “{q}”</div> : hits.map(p => (
            <Link key={p.id} to={`/san-pham/${p.slug}`} onClick={() => { setOpen(false); setQ(''); onDone?.() }} className="suggest-row">
              <ProductArt product={p} /><span><span className="s-name">{p.name}</span><b>{vnd(p.price)}</b></span>
            </Link>
          ))}
          {hits.length > 0 && <button className="suggest-all" onClick={go}>Xem tất cả kết quả cho “{q}”</button>}
        </div>
      )}
    </form>
  )
}

function MegaMenu() {
  return (
    <nav className="mainnav" aria-label="Danh mục">
      <ul>
        {GROUPS.map(g => (
          <li key={g.key} className="has-mega">
            <NavLink to={`/danh-muc/${g.key}`}>{g.name}</NavLink>
            <div className="mega">
              <div>
                <h4>Loại sản phẩm</h4>
                {CATEGORIES.filter(c => c.grp === g.key).map(c => <Link key={c.slug} to={`/danh-muc/${c.slug}`}>{c.name}</Link>)}
              </div>
              <div>
                <h4>Theo tỉ lệ</h4>
                {SCALES.map(s => <Link key={s.key} to={`/danh-muc/${g.key}?ti-le=${encodeURIComponent(s.key)}`}>{s.name}</Link>)}
              </div>
              <div>
                <h4>Mức giá</h4>
                <Link to={`/danh-muc/${g.key}?gia=0-300`}>Dưới 300.000đ</Link>
                <Link to={`/danh-muc/${g.key}?gia=300-1000`}>300.000đ – 1 triệu</Link>
                <Link to={`/danh-muc/${g.key}?gia=1-3`}>1 – 3 triệu</Link>
                <Link to={`/danh-muc/${g.key}?gia=3-6,6-`}>Trên 3 triệu</Link>
              </div>
              <div>
                <h4>Bộ sưu tập</h4>
                {COLLECTIONS.map(c => <Link key={c.slug} to={`/bo-suu-tap/${c.slug}`}>{c.name}</Link>)}
              </div>
            </div>
          </li>
        ))}
        <li><NavLink to="/danh-muc/tat-ca?hang=co-san">Có sẵn</NavLink></li>
        <li><NavLink to="/danh-muc/tat-ca?the=moi">Hàng mới</NavLink></li>
        <li><NavLink to="/khuyen-mai" className="hot">Khuyến mãi</NavLink></li>
        <li><NavLink to="/huong-dan">Chọn size BJD</NavLink></li>
        <li><NavLink to="/cua-hang">Showroom</NavLink></li>
      </ul>
    </nav>
  )
}

function MobileMenu({ onClose }) {
  const { user } = useShop()
  return (
    <div className="drawer-bg" onClick={onClose}>
      <aside className="drawer left" onClick={e => e.stopPropagation()} aria-label="Menu">
        <div className="drawer-head"><Logo /><button className="icon-btn" onClick={onClose} aria-label="Đóng"><Icon name="close" /></button></div>
        <SearchBox onDone={onClose} />
        <div className="m-menu" onClick={e => e.target.closest('a') && onClose()}>
          {GROUPS.map(g => (
            <details key={g.key} open={g.key === 'trang-suc'}>
              <summary>{g.name}</summary>
              <Link to={`/danh-muc/${g.key}`}>Tất cả {g.name.toLowerCase()}</Link>
              {CATEGORIES.filter(c => c.grp === g.key).map(c => <Link key={c.slug} to={`/danh-muc/${c.slug}`}>{c.name}</Link>)}
            </details>
          ))}
          <Link to="/danh-muc/tat-ca?hang=co-san">Hàng có sẵn</Link>
          <Link to="/danh-muc/tat-ca?the=moi">Hàng mới</Link>
          <Link to="/khuyen-mai">Khuyến mãi</Link>
          <Link to="/huong-dan">Hướng dẫn chọn size BJD</Link>
          <Link to="/cua-hang">Showroom</Link>
          <Link to="/tra-cuu-don-hang">Tra cứu đơn hàng</Link>
          {user ? <Link to="/tai-khoan">Tài khoản của tôi</Link> : <Link to="/dang-nhap">Đăng nhập / Đăng ký</Link>}
          {user?.role === 'admin' && <Link to="/quan-tri">Quản trị</Link>}
        </div>
      </aside>
    </div>
  )
}

function MiniCart() {
  const { cart, subtotal, setMiniCart, removeLine, info } = useShop()
  const FREE_SHIP_FROM = info.free_ship_from
  const left = FREE_SHIP_FROM - subtotal
  return (
    <div className="drawer-bg" onClick={() => setMiniCart(false)}>
      <aside className="drawer right" onClick={e => e.stopPropagation()} aria-label="Giỏ hàng">
        <div className="drawer-head"><h3>Giỏ hàng ({cart.length})</h3><button className="icon-btn" onClick={() => setMiniCart(false)} aria-label="Đóng"><Icon name="close" /></button></div>
        {cart.length === 0 ? <p className="muted pad">Giỏ hàng đang trống.</p> : (
          <>
            <div className={'ship-bar' + (left <= 0 ? ' done' : '')}>
              {left > 0 ? <>Mua thêm <b>{vnd(left)}</b> để được <b>miễn phí giao hàng</b></> : <>Đơn của bạn được <b>miễn phí giao hàng</b></>}
              <div className="bar"><i style={{ width: Math.min(100, (subtotal / FREE_SHIP_FROM) * 100) + '%' }} /></div>
            </div>
            <div className="mini-lines">
              {cart.map(l => (
                <div key={l.key} className="mini-line">
                  <ProductArt product={withVariantImage(l.product, l.variantObj)} />
                  <div>
                    <Link to={`/san-pham/${l.product.slug}`} onClick={() => setMiniCart(false)}>{l.product.name}</Link>
                    <small className="muted">{lineLabel(l) && `${lineLabel(l)} · `}SL {l.qty}</small>
                    <b>{vnd(l.unit * l.qty)}</b>
                  </div>
                  <button className="link-btn" onClick={() => removeLine(l.key)} aria-label="Xóa">✕</button>
                </div>
              ))}
            </div>
            <div className="drawer-foot">
              <div className="row-between"><span>Tạm tính</span><b className="accent">{vnd(subtotal)}</b></div>
              <Link to="/gio-hang" className="btn ghost block" onClick={() => setMiniCart(false)}>Xem giỏ hàng</Link>
              <Link to="/thanh-toan" className="btn block" onClick={() => setMiniCart(false)}>Thanh toán</Link>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}

function Footer() {
  const { info } = useShop()
  return (
    <footer className="footer">
      <div className="perks">
        <div><Icon name="truck" size={28} /><span><b>Hàng có sẵn giao 1–3 ngày</b><small>Hàng order 25–60 ngày</small></span></div>
        <div><Icon name="refresh" size={28} /><span><b>Đổi trả 48 giờ</b><small>Với lỗi đúc, vỡ khi vận chuyển</small></span></div>
        <div><Icon name="shield" size={28} /><span><b>Đóng gói chống sốc</b><small>Đệm khí, hộp cứng</small></span></div>
        <div><Icon name="card" size={28} /><span><b>Đặt cọc từ 50%</b><small>Hàng order, phần còn lại khi hàng về</small></span></div>
      </div>
      <div className="foot-cols container">
        <div>
          <Logo />
          {info.tagline && <p className="muted">{info.tagline}</p>}
          <p><Icon name="phone" size={16} /> Hotline <a href={telHref(info.hotline)}><b>{info.hotline}</b></a>{info.hours && ` (${info.hours})`}</p>
          {info.address && <p className="pre-line"><Icon name="pin" size={16} /> {info.address}</p>}
          {info.email && <p>Email: <a href={'mailto:' + info.email}>{info.email}</a></p>}
          {(info.zalo || info.facebook) && <p>{info.zalo && <a href={zaloHref(info.zalo)} target="_blank" rel="noreferrer">Zalo{info.zalo_name && `: ${info.zalo_name}`}</a>}{info.zalo && info.facebook && ' · '}{info.facebook && <a href={info.facebook} target="_blank" rel="noreferrer">Facebook</a>}</p>}
        </div>
        <div>
          <h4>Về chúng tôi</h4>
          <Link to="/cua-hang">Showroom</Link>
          <Link to="/huong-dan">Hướng dẫn chọn size</Link>
          <Link to="/khuyen-mai">Khuyến mãi</Link>
        </div>
        <div>
          <h4>Hỗ trợ khách hàng</h4>
          <Link to="/tra-cuu-don-hang">Tra cứu đơn hàng</Link>
          <Link to="/chinh-sach/doi-tra">Chính sách đổi trả</Link>
          <Link to="/chinh-sach/dat-truoc">Chính sách đặt trước</Link>
          <Link to="/chinh-sach/giao-hang">Giao hàng & thanh toán</Link>
        </div>
        <div>
          <h4>Thanh toán</h4>
          <div className="paylogos"><span>VietQR</span><span>VNPay</span><span>MoMo</span><span>Visa</span><span>Master</span><span>COD</span></div>
          <h4>Đăng ký nhận ưu đãi</h4>
          <Newsletter />
        </div>
      </div>
      <div className="copyright">© {new Date().getFullYear()} {info.name}. Bản quyền thuộc về chủ cửa hàng.</div>
    </footer>
  )
}

function Newsletter() {
  const { toast } = useShop()
  const [e, setE] = useState('')
  return (
    <form className="newsletter" onSubmit={ev => { ev.preventDefault(); if (/^\S+@\S+\.\S+$/.test(e)) { toast('Cảm ơn bạn! Ưu đãi sẽ được gửi tới ' + e); setE('') } else toast('Email chưa đúng', 'bad') }}>
      <input type="email" value={e} onChange={x => setE(x.target.value)} placeholder="Email của bạn" aria-label="Email nhận ưu đãi" />
      <button className="btn sm">Đăng ký</button>
    </form>
  )
}

function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'
  const label = dark ? 'Chuyển sang chế độ Nhật (sáng)' : 'Chuyển sang chế độ Nguyệt (tối)'
  return (
    <button className="h-act theme-btn" onClick={toggle} aria-label={label} title={label}>
      <Icon name={dark ? 'sun' : 'moon'} /><span className="only-d">{dark ? 'Nhật' : 'Nguyệt'}</span>
    </button>
  )
}

export default function Layout() {
  const { user, cartCount, wish, miniCart, setMiniCart, info } = useShop()
  const [menu, setMenu] = useState(false)
  const loc = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [loc.pathname])
  return (
    <>
      {DEMO && <div className="demo-bar">Chế độ DEMO — dữ liệu lưu trong trình duyệt, thanh toán giả lập. Tài khoản quản trị: <b>admin@tieuhoa.vn</b> / <b>admin123</b></div>}
      <div className="topbar">
        <div className="container row-between">
          <span><Icon name="phone" size={14} /> {info.hotline} · Miễn phí giao hàng đơn từ {vnd(info.free_ship_from)}</span>
          <span className="topbar-links"><Link to="/cua-hang"><Icon name="pin" size={14} /> Showroom</Link><Link to="/tra-cuu-don-hang"><Icon name="truck" size={14} /> Tra cứu đơn</Link><Link to="/huong-dan"><Icon name="user" size={14} /> Chọn size BJD</Link></span>
        </div>
      </div>
      <header className="header">
        <div className="container header-row">
          <button className="icon-btn only-m" onClick={() => setMenu(true)} aria-label="Mở menu"><Icon name="menu" /></button>
          <Logo />
          <div className="only-d grow"><SearchBox /></div>
          <div className="header-actions">
            {user?.role === 'admin' && <Link to="/quan-tri" className="admin-link only-d">Quản trị</Link>}
            <ThemeToggle />
            <Link to={user ? '/tai-khoan' : '/dang-nhap'} className="h-act" aria-label="Tài khoản">
              <Icon name="user" /><span className="only-d">{user ? (user.full_name || 'Tài khoản').split(' ').slice(-1)[0] : 'Đăng nhập'}</span>
            </Link>
            <Link to="/tai-khoan/yeu-thich" className="h-act only-d" aria-label="Yêu thích"><Icon name="heart" />{wish.length > 0 && <i className="dot">{wish.length}</i>}</Link>
            <button className="h-act" onClick={() => setMiniCart(true)} aria-label="Giỏ hàng"><Icon name="cart" />{cartCount > 0 && <i className="dot">{cartCount}</i>}<span className="only-d">Giỏ hàng</span></button>
          </div>
        </div>
        <div className="container only-d"><MegaMenu /></div>
        <div className="container only-m m-search"><SearchBox /></div>
      </header>
      <main><Outlet /></main>
      <Footer />
      <a className="float-call" href={telHref(info.hotline)} aria-label="Gọi hotline"><Icon name="phone" /></a>
      <ChatWidget />
      {menu && <MobileMenu onClose={() => setMenu(false)} />}
      {miniCart && <MiniCart />}
    </>
  )
}
