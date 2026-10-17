// Quản trị > Tin nhắn: hộp thư trả lời khách (realtime) + cài đặt trợ lý Ngân Nguyệt.
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api.js'
import { useShop } from '../lib/store.jsx'
import { chat, MAX_LEN } from '../lib/chatApi.js'
import { DEFAULT_ASSISTANT } from '../lib/assistant.js'
import { dateTime } from '../lib/format.js'
import { Field, Spinner } from '../components/ui.jsx'
import NganNguyet from '../components/NganNguyet.jsx'
import { RichText } from '../components/ChatWidget.jsx'

const when = d => {
  const t = new Date(d)
  return t.toDateString() === new Date().toDateString() ? t.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : t.toLocaleDateString('vi-VN')
}

// Số tin khách chưa đọc — dùng cho nhãn ở thanh menu quản trị
export function useChatUnread() {
  const [n, setN] = useState(0)
  useEffect(() => {
    const load = () => chat.admin.threads().then(t => setN(t.reduce((s, x) => s + x.unread, 0))).catch(() => {})
    load()
    const off = chat.admin.subscribe(load)
    const t = setInterval(load, 30000)
    return () => { off(); clearInterval(t) }
  }, [])
  return n
}

function Conversation({ thread, onChanged }) {
  const { toast } = useShop()
  const [msgs, setMsgs] = useState(null)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const box = useRef(null)
  const cid = thread.customer_id
  const load = useCallback(() => chat.admin.messages(cid).then(setMsgs).catch(e => { toast(e.message, 'bad'); setMsgs([]) }), [cid, toast])
  useEffect(() => { setMsgs(null); load() }, [load])
  useEffect(() => { if (thread.unread) chat.admin.markSeen(cid).then(onChanged).catch(() => {}) }, [cid, thread.unread, onChanged])
  useEffect(() => { const el = box.current; if (el) el.scrollTop = el.scrollHeight }, [msgs])
  useEffect(() => { load() }, [thread.last?.id, load])
  const send = async e => {
    e.preventDefault()
    if (!q.trim() || busy) return
    setBusy(true)
    try { await chat.admin.reply(cid, q); setQ(''); await load(); onChanged() } catch (er) { toast(er.message, 'bad') } finally { setBusy(false) }
  }
  return (
    <div className="panel inbox-chat">
      <div className="inbox-head">
        <b>{thread.name}</b>
        <div className="muted small">{[thread.email, thread.phone].filter(Boolean).join(' · ')}</div>
      </div>
      <div className="nn-msgs" ref={box}>
        {!msgs ? <Spinner /> : msgs.map(m => (
          <div key={m.id} className={'nn-msg ' + (m.sender === 'shop' ? 'me' : 'shop')}>
            <div className="nn-bubble-wrap"><div className="nn-bubble"><RichText text={m.body} /></div><small className="nn-time">{m.sender === 'shop' ? 'Shop' : thread.name} · {dateTime(m.created_at)}{m.sender === 'shop' && m.seen ? ' · Đã xem' : ''}</small></div>
          </div>
        ))}
      </div>
      <form className="nn-input" onSubmit={send}>
        <textarea value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) send(e) }} rows={2} placeholder="Trả lời khách… (Enter để gửi, Shift+Enter xuống dòng)" maxLength={MAX_LEN} aria-label="Trả lời" />
        <button className="btn" disabled={!q.trim() || busy}>Gửi</button>
      </form>
    </div>
  )
}

function AssistantSettings() {
  const { toast } = useShop()
  const [f, setF] = useState(null)
  const [busy, setBusy] = useState(false)
  const [up, setUp] = useState(false)
  useEffect(() => { chat.assistant().then(a => setF({ name: a.name, greeting: a.greeting, image: a.image })).catch(() => setF({ ...DEFAULT_ASSISTANT })) }, [])
  if (!f) return <Spinner />
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const save = async e => {
    e.preventDefault(); setBusy(true)
    try { await chat.admin.saveAssistant(f); toast('Đã lưu cài đặt trợ lý (khách thấy khi tải lại trang)') } catch (x) { toast(x.message, 'bad') } finally { setBusy(false) }
  }
  const upload = async file => {
    if (!file) return
    setUp(true)
    try { set('image', await api.admin.uploadImage(file)) } catch (x) { toast(x.message, 'bad') } finally { setUp(false) }
  }
  return (
    <form className="panel" onSubmit={save}>
      <h3>Trợ lý tự động</h3>
      <div className="tro-ly-preview mb">
        {['cho', 'chao', 'vui', 'nghi', 'ngai'].map(m => <NganNguyet key={m} mood={m} size={120} image={f.image} />)}
      </div>
      <div className="form-grid">
        <Field label="Tên trợ lý" hint="Hiện ở khung chat góc màn hình"><input className="input" value={f.name} maxLength={40} onChange={e => set('name', e.target.value)} placeholder={DEFAULT_ASSISTANT.name} /></Field>
        <Field label="Ảnh trợ lý (không bắt buộc)" hint="Để trống thì dùng nhân vật vẽ sẵn. Chỉ dùng ảnh shop có quyền sử dụng.">
          <div className="row gap wrap">
            <label className="btn ghost sm">{up ? 'Đang tải…' : 'Chọn ảnh'}<input type="file" accept="image/*" hidden onChange={e => upload(e.target.files[0])} /></label>
            {f.image && <button type="button" className="link-btn danger" onClick={() => set('image', '')}>Bỏ ảnh, dùng nhân vật vẽ</button>}
          </div>
        </Field>
      </div>
      <Field label="Lời chào" hint="{ten} = tên trợ lý, {shop} = tên cửa hàng"><textarea className="input" rows={3} maxLength={400} value={f.greeting} onChange={e => set('greeting', e.target.value)} placeholder={DEFAULT_ASSISTANT.greeting} /></Field>
      <p className="muted small">Trợ lý tự trả lời về cách đặt hàng, đặt cọc, phí giao hàng, thanh toán, đổi trả, size và tìm sản phẩm, lấy số liệu từ Cài đặt cửa hàng và danh sách sản phẩm. Câu nào không hiểu, trợ lý mời khách chuyển sang chat với shop.</p>
      <button className="btn" disabled={busy || up}>{busy ? 'Đang lưu…' : 'Lưu cài đặt trợ lý'}</button>
    </form>
  )
}

export default function AdminChat() {
  const [threads, setThreads] = useState(null)
  const [err, setErr] = useState('')
  const [sel, setSel] = useState(null)
  const [q, setQ] = useState('')
  const load = useCallback(() => chat.admin.threads().then(t => { setThreads(t); setErr('') }).catch(e => { setErr(e.message); setThreads([]) }), [])
  useEffect(() => {
    load()
    const off = chat.admin.subscribe(load)
    const t = setInterval(load, 20000)
    return () => { off(); clearInterval(t) }
  }, [load])
  const shown = (threads || []).filter(t => !q || `${t.name} ${t.email} ${t.phone}`.toLowerCase().includes(q.toLowerCase()))
  const cur = (threads || []).find(t => t.customer_id === sel) || null
  return (
    <div>
      {err && <div className="panel bad-text">{err}</div>}
      {!threads ? <Spinner /> : (
        <div className="inbox mb">
          <div>
            <input className="input mb" value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm khách theo tên, email…" aria-label="Tìm khách" />
            <div className="panel inbox-list">
              {shown.length === 0 && <p className="muted pad">Chưa có tin nhắn nào từ khách.</p>}
              {shown.map(t => (
                <button key={t.customer_id} className={'inbox-item' + (t.customer_id === sel ? ' on' : '')} onClick={() => setSel(t.customer_id)}>
                  <div className="row-between"><b>{t.name}</b><small className="muted">{when(t.last.created_at)}</small></div>
                  <div className="row-between"><p>{t.last.sender === 'shop' ? 'Shop: ' : ''}{t.last.body}</p>{t.unread > 0 && <span className="pill">{t.unread}</span>}</div>
                </button>
              ))}
            </div>
          </div>
          {cur ? <Conversation thread={cur} onChanged={load} /> : <div className="panel muted">Chọn một khách bên trái để xem và trả lời tin nhắn.</div>}
        </div>
      )}
      <AssistantSettings />
    </div>
  )
}

