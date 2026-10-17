import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useShop, rememberViewed } from '../lib/store.jsx'
import { api } from '../lib/api.js'
import { CATEGORIES, GROUPS, SKINS, GENDERS, SETS, COLLECTIONS } from '../lib/data.js'
import { relatedProducts } from '../lib/catalog.js'
import { vnd, date } from '../lib/format.js'
import ProductArt from '../components/ProductArt.jsx'
import { Breadcrumb, Icon, Modal, Price, Qty, Rail, Stars, Empty, Spinner } from '../components/ui.jsx'
import { telHref } from '../lib/shopInfo.js'
import { hasVariants, variantOf, unitStock } from '../lib/variants.js'
import { VideoView, VideoThumb, productMedia } from '../components/ProductMedia.jsx'
import { reviewSummary, MAX_REVIEW_IMAGES, fmtSold } from '../lib/reviews.js'

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

function ReviewImages({ images }) {
  if (!images?.length) return null
  return <div className="review-imgs">{images.map((src, i) => <a key={i} href={src} target="_blank" rel="noreferrer"><img src={src} alt={'Ảnh đánh giá ' + (i + 1)} loading="lazy" /></a>)}</div>
}

// Tổng quan: điểm trung bình + tỉ lệ % từng mức sao. Chưa có đánh giá thì không hiện điểm.
export function ReviewSummary({ list }) {
  const s = reviewSummary(list)
  if (!s.count) return <p className="muted">Chưa có đánh giá nào cho sản phẩm này.</p>
  return (
    <div className="review-sum">
      <div className="review-avg"><b>{s.avg.toFixed(1)}</b><Stars value={s.avg} size={18} /><span className="muted small">{s.count} đánh giá</span></div>
      <div className="review-bars">
        {[5, 4, 3, 2, 1].map(n => (
          <div key={n} className="review-bar"><span>{n} ★</span><i><em style={{ width: s.pct[n] + '%' }} /></i><small>{s.pct[n]}%</small></div>
        ))}
      </div>
    </div>
  )
}

function ReviewForm({ product, slots, onSent }) {
  const { toast } = useShop()
  const open = slots.filter(x => !x.review_id)
  const [order, setOrder] = useState(open[0]?.order_id || '')
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  const [images, setImages] = useState([])
  const [busy, setBusy] = useState(false)
  const addImages = async files => {
    const list = [...files].filter(f => f.type.startsWith('image/')).slice(0, MAX_REVIEW_IMAGES.customer - images.length)
    if (!list.length) return
    setBusy(true)
    try { const got = []; for (const f of list) got.push(await api.uploadReviewImage(f)); setImages(x => [...x, ...got]) } catch (er) { toast(er.message, 'bad') } finally { setBusy(false) }
  }
  const submit = async e => {
    e.preventDefault()
    if (content.trim().length < 5) return toast('Vui lòng viết ít nhất vài chữ', 'bad')
    setBusy(true)
    try {
      await api.submitReview({ product_id: product.id, order_id: order, rating, content, images })
      setContent(''); setImages([]); toast('Cảm ơn bạn đã đánh giá!'); onSent()
    } catch (er) { toast(er.message === 'LOGIN' ? 'Vui lòng đăng nhập' : er.message, 'bad') } finally { setBusy(false) }
  }
  if (!open.length) return <p className="muted small">Bạn đã đánh giá sản phẩm này cho {slots.length > 1 ? `cả ${slots.length} lần mua` : 'lần mua của mình'}. Cảm ơn bạn!</p>
  return (
    <form className="review-form" onSubmit={submit}>
      {open.length > 1 ? (
        <label className="small">Đánh giá cho đơn <select className="input sm auto" value={order} onChange={e => setOrder(e.target.value)}>{open.map(x => <option key={x.order_id} value={x.order_id}>{x.code}</option>)}</select></label>
      ) : <small className="muted">Đánh giá cho đơn <b>{open[0].code}</b></small>}
      <div className="star-pick" role="radiogroup" aria-label="Số sao">
        {[1, 2, 3, 4, 5].map(n => <button type="button" key={n} className={n <= rating ? 'on' : ''} onClick={() => setRating(n)} aria-label={n + ' sao'} aria-checked={n === rating} role="radio">★</button>)}
      </div>
      <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Chia sẻ cảm nhận của bạn về sản phẩm…" rows={3} maxLength={1000} />
      <div className="review-imgs">
        {images.map((src, i) => <span key={i} className="review-img-edit"><img src={src} alt={'Ảnh ' + (i + 1)} /><button type="button" onClick={() => setImages(x => x.filter((_, k) => k !== i))} aria-label="Bỏ ảnh">✕</button></span>)}
        {images.length < MAX_REVIEW_IMAGES.customer && <label className="review-img-add">{busy ? '…' : '+ Ảnh'}<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={e => { addImages(e.target.files); e.target.value = '' }} /></label>}
      </div>
      <button className="btn sm" disabled={busy}>{busy ? 'Đang gửi…' : 'Gửi đánh giá'}</button>
    </form>
  )
}

function Reviews({ product }) {
  const { user, reloadProducts } = useShop()
  const [list, setList] = useState(null)
  const [slots, setSlots] = useState(null)
  const load = () => {
    api.reviews(product.id).then(setList).catch(() => setList([]))
    if (user) api.reviewSlots(product.id).then(setSlots).catch(() => setSlots([]))
  }
  useEffect(load, [product.id, user?.id])
  return (
    <div>
      {list === null ? <Spinner /> : <ReviewSummary list={list} />}
      {!user ? <p className="muted small"><Link to="/dang-nhap">Đăng nhập</Link> để đánh giá sản phẩm bạn đã mua.</p>
        : slots === null ? null
        : slots.length ? <ReviewForm key={slots.map(x => x.review_id).join()} product={product} slots={slots} onSent={() => { load(); reloadProducts() }} />
        : <p className="muted small">Chỉ khách đã mua và nhận hàng thành công mới đánh giá được sản phẩm này.</p>}
      {list?.map(r => (
        <div key={r.id} className="review">
          <div className="row gap wrap"><b>{r.name || 'Khách hàng'}</b><Stars value={r.rating} />{r.order_id && <span className="review-buyer">✓ Đã mua hàng</span>}<small className="muted">{date(r.created_at)}</small></div>
          <p>{r.content}</p>
          <ReviewImages images={r.images} />
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
  const [vid, setVid] = useState('')
  const [varErr, setVarErr] = useState(false)
  const media = useMemo(() => (p ? productMedia(p) : []), [p])
  const { hash } = useLocation()
  useEffect(() => { if (hash === '#danh-gia') setTab('danh-gia') }, [hash, slug])

  useEffect(() => { if (p) { rememberViewed(p.id); document.title = p.name } setImg(0); setSize(''); setQty(1); setSizeErr(false); setVid(''); setVarErr(false) }, [p])

  if (!products) return <div className="container pad-l"><Spinner /></div>
  if (!p) return <div className="container"><Empty text="Sản phẩm không tồn tại hoặc đã ngừng bán"><Link className="btn" to="/">Về trang chủ</Link></Empty></div>

  const cat = CATEGORIES.find(c => c.slug === p.category)
  const grp = GROUPS.find(g => g.key === cat?.grp)
  const col = COLLECTIONS.find(c => c.slug === p.collection)
  const liked = wish.includes(p.id)
  const related = relatedProducts(products, p)
  const v = variantOf(p, vid)
  const shown = v ? { ...p, price: v.price, compare_price: v.compare_price } : p // giá theo biến thể đang chọn
  const stock = v ? unitStock(p, vid) : p.stock
  const out = stock <= 0
  const cur = media[img] || media[0]
  const pickVariant = x => {
    setVid(x.id); setVarErr(false); setQty(1)
    const i = x.image ? media.findIndex(m => m.src === x.image) : -1
    if (i >= 0) setImg(i)
  }

  const add = buyNow => {
    if (hasVariants(p) && !v) { setVarErr(true); toast('Vui lòng chọn loại sản phẩm', 'bad'); return }
    if (p.sizes?.length && !size) { setSizeErr(true); toast('Vui lòng chọn size', 'bad'); return }
    addToCart(p, size, qty, { silent: buyNow, variant: vid })
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
            {media.map((m, i) => (
              <button key={i} className={i === img ? 'on' : ''} onClick={() => setImg(i)} aria-label={(m.type === 'video' ? 'Video ' : 'Ảnh ') + (i + 1)}>
                {m.type === 'video' ? <VideoThumb src={m.src} /> : <ProductArt product={m.type === 'img' ? { ...p, images: [m.src] } : p} variant={m.n || 0} />}
              </button>
            ))}
          </div>
          {cur?.type === 'video' ? (
            <div className="main-img is-video"><VideoView key={cur.src} src={cur.src} /></div>
          ) : (
            <div className="main-img"
              onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }) }}
              onMouseLeave={() => setZoom(null)}>
              <div style={zoom ? { transform: 'scale(1.8)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined} className="zoomer"><ProductArt product={cur?.type === 'img' ? { ...p, images: [cur.src] } : p} variant={cur?.n || 0} /></div>
              {shown.compare_price > shown.price && <span className="badge sale-tag">-{Math.round((1 - shown.price / shown.compare_price) * 100)}%</span>}
            </div>
          )}
        </div>

        <div className="pdp-info">
          <h1>{p.name}</h1>
          <div className="row gap wrap muted small">
            <span>Mã: <b>{p.sku}</b></span>{p.review_count > 0 ? <button className="link-btn small" onClick={() => setTab('danh-gia')}><Stars value={p.rating} /> {Number(p.rating).toFixed(1)} · {p.review_count} đánh giá</button> : <span>Chưa có đánh giá</span>}<span>Đã bán {fmtSold(p.sold || 0)}</span>
          </div>
          <Price p={shown} big from={v ? false : undefined} />
          {p.stock_type === 'order' && p.kind === 'doll' ? <div className="install">Đặt cọc 50%{v ? '' : ' (từ)'}: <b>{vnd(Math.ceil(shown.price / 2 / 1000) * 1000)}</b></div> : <div className="install">&nbsp;</div>}

          {p.stock_type === 'order' ? (
            <div className="notice warn small">Hàng <b>đặt trước</b>: xưởng làm theo đơn, về Việt Nam khoảng <b>{p.lead_days}–{p.lead_days + 20} ngày</b>. {p.kind === 'doll' ? 'Đặt cọc 50% khi chốt đơn, thanh toán phần còn lại khi hàng về.' : ''}</div>
          ) : <div className="notice small">Hàng <b>có sẵn</b> tại Việt Nam, giao 1–3 ngày.</div>}
          <button className="link-btn small" onClick={() => setGuide(true)}>Bảng size BJD (chiều cao, size tóc, size mắt)</button>
          {hasVariants(p) && (
            <div className={'sizes variants' + (varErr ? ' err' : '')}>
              <b>Chọn loại</b>
              <div className="size-list variant-list" role="radiogroup" aria-label="Loại sản phẩm">
                {p.variants.map(x => {
                  const none = p.stock_type !== 'order' && x.stock <= 0
                  return (
                    <button key={x.id} role="radio" aria-checked={vid === x.id} className={vid === x.id ? 'on' : ''} disabled={none} onClick={() => pickVariant(x)}>
                      {x.image && <img src={x.image} alt="" />}
                      <span>{x.name}<small>{vnd(x.price)}{none ? ' · Hết hàng' : ''}</small></span>
                    </button>
                  )
                })}
              </div>
              {varErr && <small className="field-err">Bạn chưa chọn loại</small>}
            </div>
          )}
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
            <Qty value={qty} onChange={setQty} max={Math.max(1, Math.min(10, stock))} />
            <span className={out ? 'bad-text' : stock < 5 ? 'warn-text' : 'ok-text'}>{out ? 'Tạm hết hàng' : p.stock_type === 'order' ? 'Nhận đặt trước' : stock < 5 ? `Chỉ còn ${stock} sản phẩm` : 'Còn hàng'}</span>
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
