// Hàm thuần cho chat (không phụ thuộc Supabase) — dùng chung cho web và kiểm thử

// Gom tin nhắn thành từng cuộc trò chuyện (một khách = một cuộc), mới nhất lên đầu
export function groupThreads(messages, profiles = {}) {
  const map = new Map()
  for (const m of [...messages].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const t = map.get(m.customer_id) || { customer_id: m.customer_id, unread: 0, count: 0 }
    t.last = m; t.count++
    if (m.sender === 'khach' && !m.seen) t.unread++
    const p = profiles[m.customer_id]
    t.name = p?.full_name || m.customer_name || t.name || p?.email || m.customer_email || 'Khách'
    t.email = p?.email || m.customer_email || t.email || ''
    t.phone = p?.phone || ''
    map.set(m.customer_id, t)
  }
  return [...map.values()].sort((a, b) => b.last.created_at.localeCompare(a.last.created_at))
}

// Làm sạch cài đặt trợ lý. partial: chỉ giữ trường có giá trị (để ghép với mặc định)
export function normalizeAssistant(s = {}, partial = false) {
  const out = {
    name: String(s.name || '').trim().slice(0, 40),
    greeting: String(s.greeting || '').trim().slice(0, 400),
    image: /^(https?:\/\/|data:image\/)/i.test(String(s.image || '').trim()) ? String(s.image).trim() : '',
  }
  if (partial) return Object.fromEntries(Object.entries(out).filter(([, v]) => v))
  return out
}
