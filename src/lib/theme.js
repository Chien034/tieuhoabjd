// Chế độ Nhật (sáng) / Nguyệt (tối). index.html đặt data-theme trước khi vẽ trang để không nháy màu;
// file này chỉ đọc lại giá trị đó, cho khách đổi và ghi nhớ trong trình duyệt.
import { useEffect, useState } from 'react'

export const THEME_KEY = 'tieuhoa-theme'
const THEME_COLOR = { light: '#4a2c5e', dark: '#13111b' }

// Lựa chọn đã lưu thắng; chưa chọn thì theo cài đặt máy.
export function resolveTheme(saved, prefersDark) {
  if (saved === 'light' || saved === 'dark') return saved
  return prefersDark ? 'dark' : 'light'
}

function readSaved() {
  try { return localStorage.getItem(THEME_KEY) } catch { return null }
}

function systemDark() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
}

export function applyTheme(theme) {
  const root = document.documentElement
  root.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
}

export function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || resolveTheme(readSaved(), systemDark()))

  useEffect(() => { applyTheme(theme) }, [theme])

  // Khách chưa tự chọn thì đổi theo máy khi máy chuyển sáng/tối.
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = e => { if (!readSaved()) setTheme(e.matches ? 'dark' : 'light') }
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  const toggle = () => setTheme(t => {
    const next = t === 'dark' ? 'light' : 'dark'
    try { localStorage.setItem(THEME_KEY, next) } catch { /* trình duyệt chặn lưu: vẫn đổi trong lần xem này */ }
    return next
  })

  return { theme, toggle }
}
