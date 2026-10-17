import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useShop, viewedIds } from '../lib/store.jsx'
import { CATEGORIES, COLLECTIONS } from '../lib/data.js'
import { filterProducts } from '../lib/catalog.js'
import ProductArt from '../components/ProductArt.jsx'
import { Countdown, Rail, Icon, ProductCard } from '../components/ui.jsx'
import { SizeTable } from './Product.jsx'
import { telHref } from '../lib/shopInfo.js'

const SLIDES = [
  { title: 'BJD 1/4 — dễ chơi nhất', sub: 'Full set đủ tóc, mắt, trang phục, makeup — chỉ việc mở hộp', cta: 'Xem búp bê 1/4', to: '/danh-muc/bjd-1-4', bg: 'linear-gradient(120deg,#4a2c5e,#8a5a9e)', pick: p => p.kind === 'doll' && p.scale === '1/4' && p.set_type === 'fullset' },
  { title: 'Hàng có sẵn, nhận ngay', sub: 'Không cần chờ order — giao 1–3 ngày trên toàn quốc', cta: 'Mua hàng có sẵn', to: '/danh-muc/tat-ca?hang=co-san', bg: 'linear-gradient(120deg,#7a2f4f,#c35b7d)', pick: p => p.kind === 'doll' && p.stock_type === 'co-san' },
  { title: 'Tủ đồ cho bé', sub: 'Tóc giả, mắt, váy lolita, Hán phục, giày — đủ size 1/3, 1/4, 1/6', cta: 'Xem phụ kiện', to: '/danh-muc/phu-kien', bg: 'linear-gradient(120deg,#2f4a6e,#5b84b1)', pick: p => p.kind === 'doll' && p.collection === 'co-trang' },
]

function endOfDay() { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime() }

function Hero({ products }) {
  const [i, setI] = useState(0)
  useEffect(() => { const t = setInterval(() => setI(x => (x + 1) % SLIDES.length), 6000); return () => clearInterval(t) }, [])
  return (
    <div className="hero">
      {SLIDES.map((s, k) => {
        const p = products?.find(s.pick)
        return (
          <div key={k} className={'slide' + (k === i ? ' on' : '')} style={{ background: s.bg }} aria-hidden={k !== i}>
            <div className="slide-text">
              <span className="eyebrow">Ưu đãi tháng {new Date().getMonth() + 1}</span>
              <h1>{s.title}</h1>
              <p>{s.sub}</p>
              <Link to={s.to} className="btn gold" tabIndex={k === i ? 0 : -1}>{s.cta}</Link>
            </div>
            <div className="slide-art">{p && <ProductArt product={p} />}</div>
          </div>
        )
      })}
      <div className="dots">{SLIDES.map((_, k) => <button key={k} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={'Slide ' + (k + 1)} />)}</div>
    </div>
  )
}

export default function Home() {
  const { products, info } = useShop()

  const L = useMemo(() => {
    if (!products) return {}
    const ids = viewedIds()
    return {
      flash: filterProducts(products, { tag: 'flash', sort: 'giam-nhieu' }).slice(0, 10),
      best: filterProducts(products, { sort: 'ban-chay' }).slice(0, 12),
      fresh: filterProducts(products, { sort: 'moi' }).slice(0, 12),
      ready: filterProducts(products, { grp: 'bup-be', stock: ['co-san'], sort: 'pho-bien' }).slice(0, 12),
      acc: filterProducts(products, { grp: 'phu-kien', sort: 'ban-chay' }).slice(0, 12),
      viewed: ids.map(id => products.find(p => p.id === id)).filter(Boolean),
      catPic: Object.fromEntries(CATEGORIES.map(c => [c.slug, filterProducts(products, { cat: c.slug, sort: 'ban-chay' })[0]])),
      colPic: Object.fromEntries(COLLECTIONS.map(c => [c.slug, filterProducts(products, { collection: c.slug, sort: 'ban-chay' }).slice(0, 3)])),
    }
  }, [products])

  return (
    <div className="container">
      <Hero products={products} />

      <section className="section">
        <div className="cat-tiles">
          {CATEGORIES.map(c => (
            <Link key={c.slug} to={`/danh-muc/${c.slug}`} className="cat-tile">
              <div className="cat-pic">{L.catPic?.[c.slug] && <ProductArt product={L.catPic[c.slug]} />}</div>
              <span>{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {L.flash?.length > 0 && (
        <section className="section flash">
          <div className="section-head">
            <h2><span className="bolt">⚡</span> Flash sale hôm nay</h2>
            <div className="row gap">Kết thúc sau <Countdown to={endOfDay()} /><Link to="/khuyen-mai" className="more light">Xem tất cả</Link></div>
          </div>
          <div className="rail">{L.flash.map(p => <ProductCard key={p.id} p={p} />)}</div>
        </section>
      )}

      <Rail title="Bán chạy nhất" link="/danh-muc/tat-ca?sap-xep=ban-chay" items={L.best} />
      <Rail title="Búp bê có sẵn — nhận ngay" link="/danh-muc/bup-be?hang=co-san" items={L.ready} />

      <section className="section">
        <div className="section-head"><h2>Bộ sưu tập</h2></div>
        <div className="collections">
          {COLLECTIONS.map(c => (
            <Link key={c.slug} to={`/bo-suu-tap/${c.slug}`} className="collection" style={{ '--hue': c.hue }}>
              <div><h3>{c.name}</h3><p>{c.tagline}</p><span className="more">Khám phá →</span></div>
              <div className="col-arts">{L.colPic?.[c.slug]?.map(p => <ProductArt key={p.id} product={p} />)}</div>
            </Link>
          ))}
        </div>
      </section>

      <Rail title="Phụ kiện bán chạy" link="/danh-muc/phu-kien" items={L.acc} />
      <Rail title="Hàng mới về" link="/danh-muc/tat-ca?sap-xep=moi" items={L.fresh} />

      <section className="section split">
        <div className="panel">
          <div className="section-head"><h2>Chọn size nào?</h2><Link to="/huong-dan" className="more">Hướng dẫn chi tiết</Link></div>
          <SizeTable />
        </div>
        <div className="panel promo-panel">
          <h2>Order theo yêu cầu</h2>
          <p>Thích mẫu nào trên Taobao, Weibo? Gửi link cho shop — báo giá trọn gói về Việt Nam trong 24 giờ, cọc 50%, theo dõi đơn ngay trên web.</p>
          <a href={telHref(info.hotline)} className="btn gold"><Icon name="phone" size={16} /> Gọi {info.hotline}</a>
        </div>
      </section>

      {L.viewed?.length > 0 && <Rail title="Sản phẩm bạn đã xem" items={L.viewed} />}
    </div>
  )
}
