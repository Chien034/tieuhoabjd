import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ShopProvider } from './lib/store.jsx'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Listing from './pages/Listing.jsx'
import Product from './pages/Product.jsx'
import Cart from './pages/Cart.jsx'
import Checkout from './pages/Checkout.jsx'
import { OrderPage, TrackOrder, DemoGateway, PaymentReturn } from './pages/Order.jsx'
import { Login, Register, Forgot } from './pages/Auth.jsx'
import Account from './pages/Account.jsx'
import Admin from './pages/Admin.jsx'
import { Guide, Stores, Policy, NotFound } from './pages/Info.jsx'
import './styles.css'
import './danh-gia.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ShopProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="danh-muc/:slug" element={<Listing />} />
            <Route path="bo-suu-tap/:slug" element={<Listing />} />
            <Route path="tim-kiem" element={<Listing />} />
            <Route path="khuyen-mai" element={<Listing />} />
            <Route path="san-pham/:slug" element={<Product />} />
            <Route path="gio-hang" element={<Cart />} />
            <Route path="thanh-toan" element={<Checkout />} />
            <Route path="thanh-toan/gia-lap" element={<DemoGateway />} />
            <Route path="thanh-toan/ket-qua" element={<PaymentReturn />} />
            <Route path="dat-hang/:code" element={<OrderPage />} />
            <Route path="tra-cuu-don-hang" element={<TrackOrder />} />
            <Route path="dang-nhap" element={<Login />} />
            <Route path="dang-ky" element={<Register />} />
            <Route path="quen-mat-khau" element={<Forgot />} />
            <Route path="tai-khoan/*" element={<Account />} />
            <Route path="quan-tri/*" element={<Admin />} />
            <Route path="huong-dan" element={<Guide />} />
            <Route path="cua-hang" element={<Stores />} />
            <Route path="chinh-sach/:slug" element={<Policy />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </ShopProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
