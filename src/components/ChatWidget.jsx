// Trợ lý nhỏ ở góc màn hình: hỏi bot Ngân Nguyệt (tự động) hoặc chat trực tiếp với shop (cần đăng nhập).
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import NganNguyet from './NganNguyet.jsx'
import ProductArt from './ProductArt.jsx'
import { Icon } from './ui.jsx'
import { useShop } from '../lib/store.jsx'
import { api } from '../lib/api.js'
import { ask, greeting } from '../lib/assistant.js'
import { chat, MAX_LEN } from '../lib/chatApi.js'
import { vnd, dateTime } from '../lib/format.js'

const ss = {
  get(k, d) { try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d } },
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)) } catch { /* bỏ qua */ } },
}

// **đậm** và xuống dòng
export function RichText({ text }) {
  return String(text || '').split('\n').map((line, i) => (
    <Fragment key={i}>{i > 0 && <br />}{line.split(/(\*\*[^*]+\*\*)/).map((s, k) => (s.startsWith('**') && s.endsWith('**') ? <b key={k}>{s.slice(2, -2)}</b> : s))}</Fragment>
  ))
}

const time = d => new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

function BotTab({ ctx, setMood, goLive }) {
  const [msgs, setMsgs] = useState(() => ss.get('nn_bot', null) || [{ from: 'bot', ...greeting(ctx), at: Date.now() }])
  const [q, setQ] = useState('')
  const [typing, setTyping] = useState(false)
  const end = useRef(null)
  const { setMiniCart } = useShop()
  useEffect(() => { ss.set('nn_bot', msgs.slice(-40)) }, [msgs])
  useEffect(() => { const el = end.current; if (el) el.scrollTop = el.scrollHeight }, [msgs, typing])

  const send = async text => {
    const t = String(text || '').trim()
    if (!t || typing) return
    setQ('')
    setMsgs(m => [...m, { from: 'me', text: t, at: Date.now() }])
    setTyping(true); setMood('noi')
    const history = msgs.slice(-10)
    const [a] = await Promise.all([ask(t, ctx, history), new Promise(r => setTimeout(r, 450 + Math.min(900, t.length * 15)))])
    setTyping(false); setMood(a.mood || 'vui')
    setMsgs(m => [...m, { from: 'bot', ...a, at: Date.now() }])
    if (a.action === 'live') setTimeout(goLive, 900)
  }

  return (
    <>
      <div className="nn-msgs" aria-live="polite" ref={end}>
        {msgs.map((m, i) => (
          <div key={i} className={'nn-msg ' + m.from}>
            {m.from === 'bot' && <NganNguyet mood="cho" size={28} bust image={ctx.assistant.image} className="nn-mini" />}
            <div className="nn-bubble-wrap">
              <div className="nn-bubble"><RichText text={m.text} /></div>
              {m.products?.length > 0 && (
                <div className="nn-products">
                  {m.products.map(p => (
                    <Link key={p.id} to={`/san-pham/${p.slug}`} className="nn-prod" onClick={() => setMiniCart(false)}>
                      <ProductArt product={p} /><span><span className="s-name">{p.name}</span><b>{vnd(p.price)}</b>{p.stock_type === 'order' ? <small className="muted">Đặt trước</small> : <small className="ok-text">Có sẵn</small>}</span>
                    </Link>
                  ))}
                </div>
              )}
              {(m.links?.length > 0 || m.action === 'live') && (
                <div className="nn-links">
                  {m.links?.map(l => (/^https?:/.test(l.to) ? <a key={l.to} href={l.to} target="_blank" rel="noreferrer" className="nn-link">{l.label}</a> : <Link key={l.to} to={l.to} className="nn-link">{l.label}</Link>))}
                  {m.action === 'live' && <button className="nn-link" onClick={goLive}>Chat với shop</button>}
                </div>
              )}
              {i === msgs.length - 1 && m.chips?.length > 0 && (
                <div className="nn-chips">{m.chips.map(c => <button key={c} className="chip" onClick={() => (c === 'Gặp nhân viên' ? goLive() : send(c))}>{c}</button>)}</div>
              )}
            </div>
          </div>
        ))}
        {typing && <div className="nn-msg bot"><NganNguyet mood="noi" size={28} bust image={ctx.assistant.image} className="nn-mini" /><div className="nn-bubble nn-typing"><i /><i /><i /></div></div>}
      </div>
      <form className="nn-input" onSubmit={e => { e.preventDefault(); send(q) }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={`Hỏi ${ctx.assistant.name}…`} aria-label="Câu hỏi" maxLength={300} />
        <button className="btn sm" disabled={!q.trim() || typing} aria-label="Gửi">Gửi</button>
      </form>
    </>
  )
}

function LiveTab({ user, info, onUnread, active, onLeave }) {
  const [msgs, setMsgs] = useState(null)
  const [q, setQ] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef(null)
  const loc = useLocation()
  const nav = useNavigate()
  const load = useCallback(() => {
    if (!user) return
    chat.mine().then(list => { setMsgs(list); setErr('') }).catch(e => { setErr(e.message); setMsgs([]) })
  }, [user])
  useEffect(() => {
    if (!user || user.role === 'admin') { setMsgs(null); return }
    load()
    const off = chat.subscribe(user.id, load)
    const t = setInterval(load, 20000) // phòng khi realtime chưa bật
    return () => { off(); clearInterval(t) }
  }, [user, load])
  const unread = (msgs || []).filter(m => m.sender === 'shop' && !m.seen).length
  useEffect(() => { onUnread(unread) }, [unread, onUnread])
  useEffect(() => { if (active && unread) chat.markSeen().then(load).catch(() => {}) }, [active, unread, load])
  useEffect(() => { const el = end.current; if (active && el) el.scrollTop = el.scrollHeight }, [msgs, active])

  if (!active) return null
  if (!user) {
    const go = to => { ss.set('nn_open', 'live'); onLeave(); nav(to + '?tiep=' + encodeURIComponent(loc.pathname + loc.search)) }
    return (
      <div className="nn-live-empty">
        <p>Đăng nhập tài khoản web để nhắn trực tiếp cho shop. Tin nhắn được lưu lại, shop trả lời bạn xem được cả khi quay lại sau.</p>
        <button className="btn block" onClick={() => go('/dang-nhap')}>Đăng nhập</button>
        <button className="btn ghost block" onClick={() => go('/dang-ky')}>Tạo tài khoản</button>
        {info.hotline && <p className="muted small">Cần gấp? Gọi hotline <a href={'tel:' + info.hotline.replace(/[^\d+]/g, '')}><b>{info.hotline}</b></a></p>}
      </div>
    )
  }
  if (user.role === 'admin') {
    return <div className="nn-live-empty"><p>Bạn đang đăng nhập bằng tài khoản quản trị. Tin nhắn của khách nằm ở trang quản trị.</p><Link to="/quan-tri/tin-nhan" className="btn block">Mở hộp thư khách hàng</Link></div>
  }
  const send = async e => {
    e.preventDefault()
    if (!q.trim() || busy) return
    setBusy(true)
    try { const m = await chat.send(q); if (m) setMsgs(l => [...(l || []).filter(x => x.id !== m.id), m]); setQ('') } catch (er) { setErr(er.message) } finally { setBusy(false) }
  }
  return (
    <>
      <div className="nn-msgs" ref={end}>
        <div className="nn-note">Bạn đang nhắn với nhân viên {info.name}{info.hours ? `, giờ hỗ trợ ${info.hours}` : ''}. Shop sẽ trả lời ngay khi có thể.</div>
        {msgs === null ? <div className="spinner" /> : msgs.length === 0 && <p className="muted small center">Chưa có tin nhắn. Bạn cứ hỏi, ví dụ mẫu búp bê muốn order, size tóc, tình trạng đơn hàng…</p>}
        {(msgs || []).map(m => (
          <div key={m.id} className={'nn-msg ' + (m.sender === 'khach' ? 'me' : 'shop')}>
            <div className="nn-bubble-wrap"><div className="nn-bubble"><RichText text={m.body} /></div><small className="nn-time" title={dateTime(m.created_at)}>{m.sender === 'shop' ? 'Shop · ' : ''}{time(m.created_at)}</small></div>
          </div>
        ))}
        {err && <p className="bad-text small">{/tro-ly-chat\.sql/.test(err) ? `Chat với shop đang được bật, bạn tạm gọi hotline ${info.hotline} nhé.` : err}</p>}
      </div>
      <form className="nn-input" onSubmit={send}>
        <textarea value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) send(e) }} rows={1} placeholder="Nhắn cho shop…" aria-label="Tin nhắn" maxLength={MAX_LEN} />
        <button className="btn sm" disabled={!q.trim() || busy}>Gửi</button>
      </form>
    </>
  )
}

export default function ChatWidget() {
  const { user, info, products } = useShop()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('bot')
  const [mood, setMood] = useState('cho')
  const [assistant, setAssistant] = useState({ name: 'Ngân Nguyệt', greeting: '', image: '' })
  const [stores, setStores] = useState([])
  const [unread, setUnread] = useState(0)
  const [teaser, setTeaser] = useState(false)
  const loc = useLocation()
  const hidden = loc.pathname.startsWith('/quan-tri')

  useEffect(() => {
    chat.assistant().then(setAssistant).catch(() => {})
    api.stores().then(setStores).catch(() => {})
    if (!ss.get('nn_teased', false)) {
      const t = setTimeout(() => { setTeaser(true); ss.set('nn_teased', true) }, 5000)
      return () => clearTimeout(t)
    }
  }, [])
  // vừa đăng nhập từ nút trong khung chat: mở lại đúng tab chat với shop
  useEffect(() => {
    if (user && ss.get('nn_open', '') === 'live') { ss.set('nn_open', ''); setTab('live'); setOpen(true) }
  }, [user])
  // biểu cảm trở về bình thường sau một lúc
  useEffect(() => {
    if (mood === 'cho' || mood === 'noi') return
    const t = setTimeout(() => setMood('cho'), 5000)
    return () => clearTimeout(t)
  }, [mood])
  useEffect(() => {
    if (!open) return
    const f = e => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f)
  }, [open])

  const toggle = () => { setOpen(o => !o); setTeaser(false); if (!open) setMood('chao') }
  const goLive = useCallback(() => setTab('live'), [])
  const ctx = { info, products, stores, user, assistant }
  if (hidden) return null

  return (
    <div className={'nn-widget' + (open ? ' open' : '')}>
      {/* luôn gắn để nhận tin shop trả lời (chấm đỏ) cả khi đang thu nhỏ */}
      <section className="nn-panel" role="dialog" aria-label={'Trợ lý ' + assistant.name} hidden={!open}>
          <header className="nn-head">
            <NganNguyet mood={tab === 'live' ? 'cho' : mood} size={76} bust image={assistant.image} />
            <div className="nn-title">
              <b>{tab === 'live' ? info.name : assistant.name}</b>
              <small>{tab === 'live' ? 'Nhân viên cửa hàng' : 'Trợ lý tự động · luôn sẵn sàng'}</small>
            </div>
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Thu nhỏ"><Icon name="close" /></button>
          </header>
          <div className="nn-tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'bot'} className={tab === 'bot' ? 'on' : ''} onClick={() => setTab('bot')}>Hỏi {assistant.name}</button>
            <button role="tab" aria-selected={tab === 'live'} className={tab === 'live' ? 'on' : ''} onClick={() => setTab('live')}>Chat với shop{unread > 0 && <i className="dot">{unread}</i>}</button>
          </div>
          {tab === 'bot' && <BotTab ctx={ctx} setMood={setMood} goLive={goLive} />}
          <LiveTab user={user} info={info} onUnread={setUnread} active={open && tab === 'live'} onLeave={() => setOpen(false)} />
      </section>
      {!open && teaser && (
        <button className="nn-teaser" onClick={toggle}>
          Chào bạn ✨ Cần tìm búp bê hay hỏi cách đặt hàng không?
          <span className="nn-teaser-x" role="button" aria-label="Ẩn" onClick={e => { e.stopPropagation(); setTeaser(false) }}>✕</span>
        </button>
      )}
      <button className="nn-launcher" onClick={toggle} aria-label={open ? 'Thu nhỏ trợ lý' : 'Mở trợ lý ' + assistant.name} aria-expanded={open}>
        <NganNguyet mood={open ? 'vui' : teaser ? 'chao' : 'cho'} size={70} bust image={assistant.image} />
        {!open && unread > 0 && <i className="dot">{unread}</i>}
      </button>
    </div>
  )
}
