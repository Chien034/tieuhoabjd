// Chat trực tiếp khách ↔ cửa hàng + cài đặt trợ lý Ngân Nguyệt.
// Supabase: bảng chat_messages (realtime) + assistant_settings — tạo bằng supabase/tro-ly-chat.sql.
// Demo: lưu localStorage, đồng bộ giữa các tab bằng sự kiện storage.
import { api, DEMO, supabase } from './api.js'
import { DEFAULT_ASSISTANT } from './assistant.js'
import { groupThreads, normalizeAssistant } from './chatData.js'

export { groupThreads, normalizeAssistant }

export const MAX_LEN = 2000
const clean = s => String(s || '').replace(/\r\n?/g, '\n').trim().slice(0, MAX_LEN)
const NO_TABLE = 'Chưa có bảng tin nhắn — hãy chạy file supabase/tro-ly-chat.sql trong Supabase SQL Editor'
const viChatError = m => (/chat_messages|assistant_settings|schema cache/i.test(m) ? NO_TABLE : m)
const must = ({ data, error }) => { if (error) throw new Error(viChatError(error.message)); return data }

// ------------------------------------------------------------ DEMO
const LS = 'hk_chat'
const read = () => { try { return JSON.parse(localStorage.getItem(LS)) || [] } catch { return [] } }
const write = v => { try { localStorage.setItem(LS, JSON.stringify(v)) } catch { /* bộ nhớ đầy */ } window.dispatchEvent(new Event('hk-chat')) }
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random())
function demoSubscribe(cb) {
  const f = e => { if (!e.key || e.key === LS) cb() }
  window.addEventListener('storage', f); window.addEventListener('hk-chat', f)
  return () => { window.removeEventListener('storage', f); window.removeEventListener('hk-chat', f) }
}

const demo = {
  async mine() { const me = await api.currentUser(); return me ? read().filter(m => m.customer_id === me.id) : [] },
  async send(body) {
    const me = await api.currentUser(); if (!me) throw new Error('LOGIN')
    const b = clean(body); if (!b) return null
    const m = { id: uid(), customer_id: me.id, customer_name: me.full_name, customer_email: me.email, sender: 'khach', body: b, seen: false, created_at: new Date().toISOString() }
    write([...read(), m]); return m
  },
  async markSeen() { const me = await api.currentUser(); if (me) write(read().map(m => (m.customer_id === me.id && m.sender === 'shop' ? { ...m, seen: true } : m))) },
  subscribe: (_uid, cb) => demoSubscribe(cb),
  async assistant() { try { return { ...DEFAULT_ASSISTANT, ...normalizeAssistant(JSON.parse(localStorage.getItem('hk_tro_ly')) || {}, true) } } catch { return DEFAULT_ASSISTANT } },
  admin: {
    async threads() { return groupThreads(read()) },
    async messages(cid) { return read().filter(m => m.customer_id === cid) },
    async reply(cid, body) {
      const b = clean(body); if (!b) return null
      const m = { id: uid(), customer_id: cid, sender: 'shop', body: b, seen: false, created_at: new Date().toISOString() }
      write([...read(), m]); return m
    },
    async markSeen(cid) { write(read().map(m => (m.customer_id === cid && m.sender === 'khach' ? { ...m, seen: true } : m))) },
    subscribe: cb => demoSubscribe(cb),
    async saveAssistant(s) { const v = normalizeAssistant(s); try { localStorage.setItem('hk_tro_ly', JSON.stringify(v)) } catch { /* bỏ qua */ } return v },
  },
}

// ------------------------------------------------------------ SUPABASE
function sbSubscribe(filter, cb) {
  const ch = supabase.channel('chat-' + (filter || 'all') + '-' + Math.random().toString(36).slice(2))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages', ...(filter ? { filter } : {}) }, () => cb())
    .subscribe()
  return () => { supabase.removeChannel(ch) }
}
const sb = {
  async mine() {
    const { data } = await supabase.auth.getUser(); if (!data.user) return []
    return must(await supabase.from('chat_messages').select('*').eq('customer_id', data.user.id).order('created_at').limit(500))
  },
  async send(body) {
    const { data } = await supabase.auth.getUser(); if (!data.user) throw new Error('LOGIN')
    const b = clean(body); if (!b) return null
    return must(await supabase.from('chat_messages').insert({ customer_id: data.user.id, sender: 'khach', body: b }).select().single())
  },
  async markSeen() {
    const { data } = await supabase.auth.getUser(); if (!data.user) return
    await supabase.from('chat_messages').update({ seen: true }).eq('customer_id', data.user.id).eq('sender', 'shop').eq('seen', false)
  },
  subscribe: (userId, cb) => sbSubscribe('customer_id=eq.' + userId, cb),
  async assistant() {
    const { data } = await supabase.from('assistant_settings').select('data').eq('id', 1).maybeSingle()
    return { ...DEFAULT_ASSISTANT, ...normalizeAssistant(data?.data || {}, true) }
  },
  admin: {
    async threads() {
      const msgs = must(await supabase.from('chat_messages').select('*').order('created_at', { ascending: false }).limit(3000))
      const ids = [...new Set(msgs.map(m => m.customer_id))]
      const profs = ids.length ? must(await supabase.from('profiles').select('id, full_name, email, phone').in('id', ids)) : []
      return groupThreads(msgs, Object.fromEntries(profs.map(p => [p.id, p])))
    },
    async messages(cid) { return must(await supabase.from('chat_messages').select('*').eq('customer_id', cid).order('created_at').limit(1000)) },
    async reply(cid, body) {
      const b = clean(body); if (!b) return null
      return must(await supabase.from('chat_messages').insert({ customer_id: cid, sender: 'shop', body: b }).select().single())
    },
    async markSeen(cid) { must(await supabase.from('chat_messages').update({ seen: true }).eq('customer_id', cid).eq('sender', 'khach').eq('seen', false)) },
    subscribe: cb => sbSubscribe('', cb),
    async saveAssistant(s) {
      const v = normalizeAssistant(s)
      must(await supabase.from('assistant_settings').upsert({ id: 1, data: v, updated_at: new Date().toISOString() }))
      return v
    },
  },
}

export const chat = DEMO ? demo : sb
