import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, onAuthChange } from './api.js'
import { DEFAULT_INFO } from './shopInfo.js'
import { variantOf, unitPrice, unitStock } from './variants.js'

const Ctx = createContext(null)
export const useShop = () => useContext(Ctx)

const readCart = () => { try { return JSON.parse(localStorage.getItem('hk_cart')) || [] } catch { return [] } }
// Một dòng giỏ = sản phẩm + size + biến thể
export const lineKey = l => `${l.product_id}|${l.size || ''}|${l.variant || ''}`
const writeCart = c => { try { localStorage.setItem('hk_cart', JSON.stringify(c)) } catch { /* bỏ qua */ } }

export function ShopProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = đang tải
  const [products, setProducts] = useState(null)
  const [productsError, setProductsError] = useState('')
  const [cart, setCart] = useState(readCart)
  const [wish, setWish] = useState([])
  const [toasts, setToasts] = useState([])
  const [miniCart, setMiniCart] = useState(false)
  const [info, setInfo] = useState(DEFAULT_INFO) // thông tin cửa hàng (Quản trị > Cài đặt cửa hàng)

  const toast = useCallback((text, tone = 'ok') => {
    const id = Math.random()
    setToasts(t => [...t, { id, text, tone }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200)
  }, [])

  const reloadProducts = useCallback(async () => {
    try { setProducts(await api.products({ includeInactive: false })); setProductsError('') }
    catch (e) { setProductsError(e.message); setProducts([]) }
  }, [])

  useEffect(() => {
    api.currentUser().then(setUser).catch(() => setUser(null))
    reloadProducts()
    api.shopInfo().then(setInfo).catch(() => {})
    return onAuthChange(u => setUser(u))
  }, [reloadProducts])

  useEffect(() => {
    if (user) api.wishlist().then(setWish).catch(() => {})
    else setWish([])
  }, [user])

  useEffect(() => { writeCart(cart) }, [cart])
  useEffect(() => {
    const f = e => { if (e.key === 'hk_cart') setCart(readCart()) }
    window.addEventListener('storage', f)
    return () => window.removeEventListener('storage', f)
  }, [])

  const byId = useMemo(() => new Map((products || []).map(p => [p.id, p])), [products])

  const cartLines = useMemo(() => cart
    .map(l => {
      const product = byId.get(l.product_id)
      if (!product) return null
      const variant = variantOf(product, l.variant)
      // biến thể đã bị xóa → để trống, khách chọn lại trong giỏ (key giữ theo dòng đã lưu)
      const vid = variant ? variant.id : ''
      return { ...l, variant: vid, key: lineKey(l), product, variantObj: variant, unit: unitPrice(product, vid), stock: unitStock(product, vid) }
    })
    .filter(Boolean), [cart, byId])
  const cartCount = cartLines.reduce((s, l) => s + l.qty, 0)
  const subtotal = cartLines.reduce((s, l) => s + l.qty * l.unit, 0)

  const addToCart = useCallback((p, size, qty = 1, { silent, variant = '' } = {}) => {
    setCart(c => {
      const k = lineKey({ product_id: p.id, size, variant })
      const i = c.findIndex(l => lineKey(l) === k)
      if (i >= 0) return c.map((l, j) => (j === i ? { ...l, qty: Math.min(10, l.qty + qty) } : l))
      return [...c, { product_id: p.id, size: size || '', variant: variant || '', qty }]
    })
    if (!silent) setMiniCart(true)
  }, [])
  const setQty = (key, qty) => setCart(c => c.map(l => (lineKey(l) === key ? { ...l, qty: Math.max(1, Math.min(10, qty)) } : l)))
  const removeLine = key => setCart(c => c.filter(l => lineKey(l) !== key))
  // Đổi size / biến thể của một dòng; trùng dòng có sẵn thì gộp số lượng
  const changeLine = (key, patch) => setCart(c => {
    const line = c.find(l => lineKey(l) === key)
    if (!line) return c
    const next = { ...line, ...patch }
    const dup = c.find(l => l !== line && lineKey(l) === lineKey(next))
    if (dup) return c.filter(l => l !== line).map(l => (l === dup ? { ...l, qty: Math.min(10, l.qty + line.qty) } : l))
    return c.map(l => (l === line ? next : l))
  })
  const changeSize = (key, size) => changeLine(key, { size })
  const changeVariant = (key, variant) => changeLine(key, { variant })
  const clearCart = () => setCart([])

  const toggleWish = async pid => {
    try {
      const next = await api.toggleWish(pid)
      const added = next.includes(pid)
      setWish(next); toast(added ? 'Đã thêm vào yêu thích' : 'Đã bỏ khỏi yêu thích')
      return true
    } catch (e) {
      if (e.message === 'LOGIN') { toast('Đăng nhập để lưu sản phẩm yêu thích', 'info'); return false }
      toast(e.message, 'bad'); return true
    }
  }

  const value = {
    user, setUser, products, productsError, reloadProducts, byId,
    cart: cartLines, cartCount, subtotal, addToCart, setQty, removeLine, changeSize, changeVariant, clearCart,
    wish, toggleWish, toast, miniCart, setMiniCart, info, setInfo,
  }
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map(t => <div key={t.id} className={'toast ' + t.tone}>{t.text}</div>)}
      </div>
    </Ctx.Provider>
  )
}

// Ghi nhớ sản phẩm vừa xem (tối đa 12)
export function rememberViewed(id) {
  try {
    const cur = JSON.parse(localStorage.getItem('hk_viewed')) || []
    localStorage.setItem('hk_viewed', JSON.stringify([id, ...cur.filter(x => x !== id)].slice(0, 12)))
  } catch { /* bỏ qua */ }
}
export function viewedIds() { try { return JSON.parse(localStorage.getItem('hk_viewed')) || [] } catch { return [] } }
