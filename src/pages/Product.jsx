import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useShop, rememberViewed } from '../lib/store.jsx'
import { api } from '../lib/api.js'
import { CATEGORIES, GROUPS, SKINS, GENDERS, SETS, COLLECTIONS } from '../lib/data.js'
import { relatedProducts } from '../lib/catalog.js'
import { vnd, date } from '../lib/format.js'
import ProductArt from '../components/ProductArt.jsx'
import { Breadcrumb, Icon, Modal, Price, Qty, Rail, Stars, Empty, Spinner } from '../components/ui.jsx'
import { telHref } from '../lib/shopInfo.js'

export const BJD_SIZES = [
  ['1/3 · SD', '58–65cm', '8–9 inch', '16–18mm', '~2,5–3,5kg', 'Nhiều chi tiết, chụp ảnh đẹp, quần áo đa dạng nhất; nặng, cần túi riêng'],
  ['1/4 · MSD', '40–45cm', '7–8 inch', '14mm', '~1–1,5kg', 'Cân bằng giá – kích thước, phổ biến nhất cho người mới'],
  ['1/6 · YOSD', '26–30cm', '6–7 inch', '12mm', '~0,5kg', 'Nhỏ gọn, dễ mang theo, phụ kiện rẻ'],
  ['1/8 · mini', '16–20cm', '5–6 inch', '10mm', '~0,2kg', 'Dễ thương, giá mềm, hợp để trưng bàn làm việc'],
]

export function SizeTable() {
  return (
    <div className="table-wrap">
      <table className="table compact">
        <thead><tr><th>Tỉ lệ</th><th>Chiều cao</th><th>Tóc giả (chu vi đầu)</th><th>Mắt</th><th>Cân nặng</th><th>Phù hợp</th></tr></thead>
        <tbody>{BJD_SIZES.map(r => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{i === 0 ? <b>{c}</b> : c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

export function SizeGuide({ onClose }) {
  return (
    <Modal title="Bảng size búp bê BJD" onClose={onClose} wide>
      <SizeTable />
      <p className="muted">Số đo có thể khác nhau giữa các hãng. Trước khi mua tóc, mắt, quần áo rời, hãy xem số đo của búp bê ở mục Thông số hoặc hỏi shop.</p>
    </Modal>
  )
}

function Reviews({ product }) {
  const { user, toast } = useShop()
  const [list, setList] = useState(null)
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  useEffect(() => { api.reviews(product.id).then(setList).catch(() => setList([])) }, [product.id])
  const submit = async e => {
    e.preventDefault()
    if (content.trim().length < 5) return toast('Vui lòng viết ít nhất vài chữ', 'bad')
    try {
      const r = await api.addReview(product.id, rating, content.trim())
      setList(l => [r, ...l.filter(x => x.user_id !== r.user_id)]); setContent(''); toast('Cảm ơn bạn đã đánh giá!')
    } catch (er) { toast(er.message === 'LOGIN' ? 'Vui lòng đăng nhập' : er.message, 'bad') }
  }
  const avg = list?.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : product.rating
  return (
    <div>
      <div className="review-sum"><b>{avg.toFixed(1)}</b><Stars value={avg} size={18} /><span className="muted">{(list?.length || 0) + product.review_count} đánh giá</span></div>
      {user ? (
        <form className="review-form" onSubmit={submit}>
          <div className="star-pick" role="radiogroup" aria-label="Số sao">
            {[1, 2, 3, 4, 5].map(n => <button type="button" key={n} className={n <= rating ? 'on' : ''} onClick={() => setRating(n)} aria-label={n + ' sao'} aria-checked={n === rating} role="radio">★</button>)}
          </div>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Chia sẻ cảm nhận của bạn về sản phẩm…" rows={3} maxLength={1000} />
          <button className="btn sm">Gửi đánh giá</button>
        </form>
      ) : <p className="muted"><Link to="/dang-nhap">Đăng nhập</Link> để viết đánh giá.</p>}
      {list === null ? <Spinner /> : list.length === 0 ? <p className="muted">Chưa có đánh giá chi tiết nào.</p> : list.map(r => (
        <div key={r.id} className="review">
          <div className="row gap"><b>{r.name || 'Khách hàng'}</b><Stars value={r.rating} /><small className="muted">{date(r.created_at)}</small></div>
          <p>{r.content}</p>
        </div>
      ))}
    </div>
  )
}

export default function Product() {
  const { slug } = useParams()
  const { products, addToCart, wish, toggleWish, toast, info } = useShop()
  const nav = useNavigate()
  const p = useMemo(() => products?.find(x => x.slug === slug), [products, slug])
  const [img, setImg] = useState(0)
  const [size, setSize] = useState('')
  const [qty, setQty] = useState(1)
  const [sizeErr, setSizeErr] = useState(false)
  const [guide, setGuide] = useState(false)
  const [tab, setTab] = useState('mo-ta')
  const [zoom, setZoom] = useState(null)
  const [callback, setCallback] = useState(false)

  useEffect(() => { if (p) { rememberViewed(p.id); document.title = p.name } setImg(0); setSize(''); setQty(1); setSizeErr(false) }, [p])

  if (!products) return <div className="container pad-l"><Spinner /></div>
  if (!p) return <div className="container"><Empty text="Sản phẩm không tồn tại hoặc đã ngừng bán"><Link className="btn" to="/">Về trang chủ</Link></Empty></div>

  const cat = CATEGORIES.find(c => c.slug === p.category)
  const grp = GROUPS.find(g => g.key === cat?.grp)
  const col = COLLECTIONS.find(c => c.slug === p.collection)
  const liked = wish.includes(p.id)
  const related = relatedProducts(products, p)
  const out = p.stock <= 0

  const add = buyNow => {
    if (p.sizes?.length && !size) { setSizeErr(true); toast('Vui lòng chọn size', 'bad'); return }
    addToCart(p, size, qty, { silent: buyNow })
    if (buyNow) nav('/thanh-toan')
  }

  const specs = [
    ['Mã sản phẩm', p.sku], ['Loại', cat?.name], ['Tỉ lệ', p.scale === 'all' ? 'Dùng cho mọi size' : p.scale],
    ...(p.kind === 'doll' ? [['Bộ', SETS.find(x => x.key === p.set_type)?.name], ['Màu da', SKINS.find(x => x.key === p.skin)?.name], ['Chất liệu', 'Nhựa resin (polyurethane)']] : []),
    ['Giới tính', GENDERS.find(g => g.key === p.gender)?.name], ['Phong cách', col?.name || '—'],
    ['Tình trạng', p.stock_type === 'order' ? `Đặt trước, về khoảng ${p.lead_days}–${p.lead_days + 20} ngày` : 'Có sẵn tại Việt Nam'],
  ]

  return (
    <div className="container">
      <Breadcrumb items={[{ label: grp?.name, to: '/danh-muc/' + grp?.key }, { label: cat?.name, to: '/danh-muc/' + cat?.slug }, { label: p.name }]} />
      <div className="pdp">
        <div className="gallery">
          <div className="thumbs">
            {(p.images?.length ? p.images.map((_, i) => i) : [0, 1, 2, 3]).map(v => <button key={v} className={v === img ? 'on' : ''} onClick={() => setImg(v)} aria-label={'Ảnh ' + (v + 1)}><ProductArt product={p} variant={v} /></button>)}
          </div>
          <div className="main-img"
            onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }) }}
            onMouseLeave={() => setZoom(null)}>
            <div style={zoom ? { transform: 'scale(1.8)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined} className="zoomer"><ProductArt product={p} variant={img} /></div>
            {p.compare_price > p.price && <span className="badge sale-tag">-{Math.round((1 - p.price / p.compare_price) * 100)}%</span>}
          </div>
        </div>

        <div className="pdp-info">
          <h1>{p.name}</h1>
          <div className="row gap wrap muted small">
            <span>Mã: <b>{p.sku}</b></span><span><Stars value={p.rating} /> {p.rating}</span><span>{p.review_count} đánh giá</span><span>Đã bán {p.sold}</span>
          </div>
          <Price p={p} big />
          {p.stock_type === 'order' && p.kind === 'doll' ? <div className="install">Đặt cọc 50%: <b>{vnd(Math.ceil(p.price / 2 / 1000) * 1000)}</b></div> : <div className="install">&nbsp;</div>}

          {p.stock_type === 'order' ? (
            <div className="notice warn small">Hàng <b>đặt trước</b>: xưởng làm theo đơn, về Việt Nam khoảng <b>{p.lead_days}–{p.lead_days + 20} ngày</b>. {p.kind === 'doll' ? 'Đặt cọc 50% khi chốt đơn, thanh toán phần còn lại khi hàng về.' : ''}</div>
          ) : <div className="notice small">Hàng <b>có sẵn</b> tại Việt Nam, giao 1–3 ngày.</div>}
          <button className="link-btn small" onClick={() => setGuide(true)}>Bảng size BJD (chiều cao, size tóc, size mắt)</button>
          {p.sizes?.length > 0 && (
            <div className={'sizes' + (sizeErr ? ' err' : '')}>
              <div className="row-between"><b>Chọn size</b><button className="link-btn" onClick={() => setGuide(true)}>Hướng dẫn đo size</button></div>
              <div className="size-list" role="radiogroup" aria-label="Size">
                {p.sizes.map(s => <button key={s} role="radio" aria-checked={size === s} className={size === s ? 'on' : ''} onClick={() => { setSize(s); setSizeErr(false) }}>{s}</button>)}
              </div>
              {sizeErr && <small className="field-err">Bạn chưa chọn size</small>}
            </div>
          )}

          <div className="row gap buy-row">
            <Qty value={qty} onChange={setQty} max={Math.max(1, Math.min(10, p.stock))} />
            <span className={out ? 'bad-text' : p.stock < 5 ? 'warn-text' : 'ok-text'}>{out ? 'Tạm hết hàng' : p.stock_type === 'order' ? 'Nhận đặt trước' : p.stock < 5 ? `Chỉ còn ${p.stock} sản phẩm` : 'Còn hàng'}</span>
          </div>

          <div className="buy-btns">
            <button className="btn big buy" disabled={out} onClick={() => add(true)}>{p.stock_type === 'order' ? 'ĐẶT TRƯỚC NGAY' : 'MUA NGAY'}<small>{p.stock_type === 'order' ? (p.kind === 'doll' ? 'Cọc 50%, trả phần còn lại khi hàng về' : 'Hàng về khoảng ' + p.lead_days + ' ngày') : 'Giao tận nơi hoặc nhận tại showroom'}</small></button>
            <button className="btn big ghost" disabled={out} onClick={() => add(false)}><Icon name="cart" /> Thêm vào giỏ</button>
            <button className={'btn big ghost wish-btn' + (liked ? ' on' : '')} onClick={() => toggleWish(p.id)} aria-label="Yêu thích" aria-pressed={liked}><Icon name="heart" /></button>
          </div>
          {out && <button className="btn ghost block" onClick={() => setCallback(true)}>Báo tôi khi có hàng / Gọi tư vấn</button>}

          <ul className="perk-list">
            <li><Icon name="truck" size={18} /> Miễn phí giao hàng đơn từ 1 triệu</li>
            <li><Icon name="box" size={18} /> Đóng gói chống sốc nhiều lớp, quay video khi đóng hàng</li>
            <li><Icon name="refresh" size={18} /> Đổi / hoàn tiền nếu lỗi đúc, nứt vỡ khi vận chuyển (báo trong 48 giờ)</li>
            <li><Icon name="gift" size={18} /> Tặng túi zip bảo quản + phiếu hướng dẫn chăm sóc resin</li>
          </ul>
          <div className="advice">Cần tư vấn? Gọi <a href={telHref(info.hotline)}><b>{info.hotline}</b></a> hoặc <button className="link-btn" onClick={() => setCallback(true)}>để lại số, chúng tôi gọi lại</button></div>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {[['mo-ta', 'Mô tả'], ['thong-so', 'Thông số'], ['danh-gia', 'Đánh giá'], ['chinh-sach', 'Chính sách']].map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      <div className="tab-body">
        {tab === 'mo-ta' && p.description.split('\n\n').map((t, i) => <p key={i}>{t}</p>)}
        {tab === 'thong-so' && <table className="table specs"><tbody>{specs.map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody></table>}
        {tab === 'danh-gia' && <Reviews product={p} />}
        {tab === 'chinh-sach' && <ul><li>Quay video khi mở hàng; báo lỗi đúc, nứt vỡ trong 48 giờ để được đổi hoặc hoàn tiền.</li><li>Hàng đặt trước: cọc 50%, hoàn cọc 100% nếu xưởng không giao được hoặc trễ quá 30 ngày so với hẹn.</li><li>Resin có thể ngả vàng theo thời gian khi gặp nắng — tránh ánh nắng trực tiếp, bảo quản trong túi/hộp.</li><li>Sản phẩm sưu tầm cho người từ 15 tuổi, có chi tiết nhỏ.</li></ul>}
      </div>

      <Rail title="Sản phẩm tương tự" items={related} />
      {guide && <SizeGuide onClose={() => setGuide(false)} />}
      {callback && <CallbackForm product={p} onClose={() => setCallback(false)} />}
    </div>
  )
}

function CallbackForm({ product, onClose }) {
  const { toast, user } = useShop()
  const [phone, setPhone] = useState(user?.phone || '')
  return (
    <Modal title="Yêu cầu gọi lại" onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); if (!/^0\d{9}$/.test(phone.replace(/\s/g, ''))) return toast('Số điện thoại chưa đúng', 'bad'); toast('Đã ghi nhận, chuyên viên sẽ gọi bạn trong 15 phút'); onClose() }}>
        <p>Sản phẩm: <b>{product.name}</b></p>
        <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Số điện thoại" inputMode="tel" autoFocus />
        <button className="btn block mt">Gọi lại cho tôi</button>
      </form>
    </Modal>
  )
}
