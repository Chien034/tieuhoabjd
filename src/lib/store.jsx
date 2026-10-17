import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, onAuthChange } from './api.js'

const Ctx = createContext(null)
export const useShop = () => useContext(Ctx)

const readCart = () => { try { return JSON.parse(localStorage.getItem('hk_cart')) || [] } catch { return [] } }
const writeCart = c => { try { localStorage.setItem('hk_cart', JSON.stringify(c)) } catch { /* bỏ qua */ } }

export function ShopProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = đang tải
  const [products, setProducts] = useState(null)
  const [productsError, setProductsError] = useState('')
  const [cart, setCart] = useState(readCart)
  const [wish, setWish] = useState([])
  const [toasts, setToasts] = useState([])
  const [miniCart, setMiniCart] = useState(false)

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
    .map(l => ({ ...l, product: byId.get(l.product_id) }))
    .filter(l => l.product), [cart, byId])
  const cartCount = cartLines.reduce((s, l) => s + l.qty, 0)
  const subtotal = cartLines.reduce((s, l) => s + l.qty * l.product.price, 0)

  const addToCart = useCallback((p, size, qty = 1, { silent } = {}) => {
    setCart(c => {
      const i = c.findIndex(l => l.product_id === p.id && (l.size || '') === (size || ''))
      if (i >= 0) return c.map((l, k) => (k === i ? { ...l, qty: Math.min(10, l.qty + qty) } : l))
      return [...c, { product_id: p.id, size: size || '', qty }]
    })
    if (!silent) setMiniCart(true)
  }, [])
  const setQty = (pid, size, qty) => setCart(c => c.map(l => (l.product_id === pid && l.size === size ? { ...l, qty: Math.max(1, Math.min(10, qty)) } : l)))
  const removeLine = (pid, size) => setCart(c => c.filter(l => !(l.product_id === pid && l.size === size)))
  const changeSize = (pid, oldSize, newSize) => setCart(c => {
    const line = c.find(l => l.product_id === pid && l.size === oldSize)
    const rest = c.filter(l => l !== line)
    const dup = rest.find(l => l.product_id === pid && l.size === newSize)
    if (dup) return rest.map(l => (l === dup ? { ...l, qty: Math.min(10, l.qty + line.qty) } : l))
    return c.map(l => (l === line ? { ...l, size: newSize } : l))
  })
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
    cart: cartLines, cartCount, subtotal, addToCart, setQty, removeLine, changeSize, clearCart,
    wish, toggleWish, toast, miniCart, setMiniCart,
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
