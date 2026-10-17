import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams, useLocation } from 'react-router-dom'
import { useShop } from '../lib/store.jsx'
import { CATEGORIES, GROUPS, SCALES, SKINS, GENDERS, SETS, STOCK_TYPES, COLLECTIONS } from '../lib/data.js'
import { filterProducts, PRICE_RANGES, SORTS } from '../lib/catalog.js'
import { Breadcrumb, Countdown, Grid, Icon } from '../components/ui.jsx'

const FACETS = [
  { param: 'ti-le', key: 'scale', title: 'Tỉ lệ (size)', options: SCALES },
  { param: 'hang', key: 'stock', title: 'Tình trạng hàng', options: STOCK_TYPES },
  { param: 'bo', key: 'set', title: 'Loại bộ (búp bê)', options: SETS },
  { param: 'gioi-tinh', key: 'gender', title: 'Giới tính', options: GENDERS },
  { param: 'mau-da', key: 'skin', title: 'Màu da (búp bê)', options: SKINS },
  { param: 'gia', key: 'price', title: 'Mức giá', options: PRICE_RANGES },
]
const PAGE = 24

export default function Listing() {
  const { slug } = useParams()
  const { pathname } = useLocation()
  const [sp, setSp] = useSearchParams()
  const { products } = useShop()
  const [shown, setShown] = useState(PAGE)
  const [panel, setPanel] = useState(false)

  const ctx = useMemo(() => {
    if (pathname.startsWith('/tim-kiem')) return { title: `Kết quả cho “${sp.get('q') || ''}”`, base: { q: sp.get('q') || '' } }
    if (pathname.startsWith('/khuyen-mai')) return { title: 'Khuyến mãi', base: { tag: 'sale' }, promo: true }
    if (pathname.startsWith('/bo-suu-tap')) {
      const c = COLLECTIONS.find(x => x.slug === slug)
      return { title: 'Bộ sưu tập ' + (c?.name || ''), sub: c?.tagline, base: { collection: slug } }
    }
    const cat = CATEGORIES.find(c => c.slug === slug)
    if (cat) {
      const g = GROUPS.find(x => x.key === cat.grp)
      return { title: cat.name, base: { cat: slug }, crumbs: [{ label: g.name, to: '/danh-muc/' + g.key }], siblings: CATEGORIES.filter(c => c.grp === cat.grp) }
    }
    const g = GROUPS.find(x => x.key === slug)
    if (g) return { title: g.name, base: { grp: slug }, siblings: CATEGORIES.filter(c => c.grp === slug) }
    return { title: 'Tất cả sản phẩm', base: {}, siblings: CATEGORIES }
  }, [slug, pathname, sp])

  const list = (k) => (sp.get(k) ? sp.get(k).split(',') : [])
  const f = {
    ...ctx.base,
    scale: list('ti-le'), stock: list('hang'), set: list('bo'), gender: list('gioi-tinh'), skin: list('mau-da'), price: list('gia'),
    sort: sp.get('sap-xep') || 'pho-bien',
    ...(sp.get('the') ? { tag: sp.get('the') } : {}),
  }
  const items = useMemo(() => (products ? filterProducts(products, f) : null), [products, sp.toString(), ctx]) // eslint-disable-line

  const toggle = (param, v) => {
    const cur = list(param)
    const next = cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v]
    const n = new URLSearchParams(sp)
    next.length ? n.set(param, next.join(',')) : n.delete(param)
    setSp(n, { replace: true }); setShown(PAGE)
  }
  const setSort = v => { const n = new URLSearchParams(sp); n.set('sap-xep', v); setSp(n, { replace: true }) }
  const clearAll = () => { const n = new URLSearchParams(); if (sp.get('q')) n.set('q', sp.get('q')); setSp(n, { replace: true }) }
  const active = FACETS.flatMap(fc => list(fc.param).map(v => ({ fc, v, name: fc.options.find(o => o.key === v)?.name || v })))

  const endOfDay = (() => { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime() })()

  return (
    <div className="container">
      <Breadcrumb items={[...(ctx.crumbs || []), { label: ctx.title }]} />
      {ctx.promo && <div className="promo-head"><div><h1>Săn deal BJD</h1><p>Giảm đến 20% — số lượng có hạn. Nhập thêm mã <b>BJD10</b> giảm 10%.</p></div><div>Flash sale kết thúc sau <Countdown to={endOfDay} /></div></div>}
      {!ctx.promo && <div className="list-head"><h1>{ctx.title}</h1>{ctx.sub && <p className="muted">{ctx.sub}</p>}</div>}

      {ctx.siblings && (
        <div className="chips scroll">
          {ctx.siblings.map(c => <Link key={c.slug} to={`/danh-muc/${c.slug}`} className={'chip' + (c.slug === slug ? ' on' : '')} onClick={() => setShown(PAGE)}>{c.name}</Link>)}
        </div>
      )}

      <div className="listing">
        <aside className={'filters' + (panel ? ' open' : '')} aria-label="Bộ lọc">
          <div className="filters-head only-m"><h3>Bộ lọc</h3><button className="icon-btn" onClick={() => setPanel(false)} aria-label="Đóng"><Icon name="close" /></button></div>
          {FACETS.map(fc => (
            <fieldset key={fc.param} className="facet">
              <legend>{fc.title}</legend>
              {fc.options.map(o => (
                <label key={o.key} className="check">
                  <input type="checkbox" checked={list(fc.param).includes(o.key)} onChange={() => toggle(fc.param, o.key)} />
                  <span>{o.name}</span>
                </label>
              ))}
            </fieldset>
          ))}
          <div className="filters-foot only-m"><button className="btn ghost" onClick={clearAll}>Xóa lọc</button><button className="btn" onClick={() => setPanel(false)}>Xem {items?.length || 0} sản phẩm</button></div>
        </aside>

        <div className="list-main">
          <div className="toolbar">
            <button className="btn ghost sm only-m" onClick={() => setPanel(true)}><Icon name="filter" size={16} /> Lọc{active.length ? ` (${active.length})` : ''}</button>
            <span className="muted only-d">{items ? `${items.length} sản phẩm` : 'Đang tải…'}</span>
            <label className="sort">Sắp xếp
              <select value={f.sort} onChange={e => setSort(e.target.value)}>{SORTS.map(s => <option key={s.key} value={s.key}>{s.name}</option>)}</select>
            </label>
          </div>
          {active.length > 0 && (
            <div className="chips">
              {active.map(a => <button key={a.fc.param + a.v} className="chip on" onClick={() => toggle(a.fc.param, a.v)}>{a.name} ✕</button>)}
              <button className="link-btn" onClick={clearAll}>Xóa tất cả</button>
            </div>
          )}
          <Grid items={items?.slice(0, shown)} empty={ctx.base.q ? 'Không tìm thấy sản phẩm. Thử từ khóa khác như “1/4 full set”, “tóc giả 1/6”, “mắt 14mm”.' : 'Không có sản phẩm phù hợp bộ lọc'} />
          {items && items.length > shown && (
            <div className="center"><button className="btn ghost" onClick={() => setShown(s => s + PAGE)}>Xem thêm {Math.min(PAGE, items.length - shown)} sản phẩm</button></div>
          )}
        </div>
      </div>
    </div>
  )
}
