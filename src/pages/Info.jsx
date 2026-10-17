import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { Breadcrumb, Empty, Icon, Spinner } from '../components/ui.jsx'
import { SizeTable } from './Product.jsx'

export function Guide() {
  return (
    <div className="container narrow">
      <Breadcrumb items={[{ label: 'Hướng dẫn chọn size BJD' }]} />
      <h1>Chọn búp bê BJD cho người mới</h1>
      <div className="panel prose">
        <h3>1. Chọn tỉ lệ (size)</h3>
        <SizeTable />
        <h3>2. Full set hay Nude?</h3>
        <p><b>Full set</b> có sẵn tóc giả, mắt, trang phục, giày và makeup như ảnh — hợp người mới. <b>Nude</b> chỉ gồm thân + đầu đã makeup và mắt mặc định, rẻ hơn, để bạn tự phối đồ.</p>
        <h3>3. Hàng có sẵn hay đặt trước?</h3>
        <p>Hàng <b>có sẵn</b> đã ở Việt Nam, giao 1–3 ngày. Hàng <b>đặt trước</b> do xưởng đúc theo đơn, về khoảng 25–60 ngày; cọc 50% khi chốt đơn, trả phần còn lại khi hàng về. Shop báo tiến độ trên trang đơn hàng.</p>
        <h3>4. Phụ kiện cần đúng số đo</h3>
        <p>Tóc giả chọn theo <b>chu vi đầu</b> (inch), mắt theo <b>đường kính</b> (mm), quần áo và giày theo <b>tỉ lệ</b> của búp bê. Các hãng có thể chênh nhau — hỏi shop nếu chưa chắc.</p>
        <h3>5. Bảo quản resin</h3>
        <p>Tránh nắng trực tiếp và nhiệt độ cao (resin ngả vàng), không để quần áo đậm màu ép lâu lên da (dễ lem màu), cất trong túi hoặc hộp có đệm.</p>
      </div>
    </div>
  )
}

export function Stores() {
  const [list, setList] = useState(null)
  const [city, setCity] = useState('')
  const [q, setQ] = useState('')
  useEffect(() => { api.stores().then(setList).catch(() => setList([])) }, [])
  const cities = [...new Set((list || []).map(s => s.city))]
  const shown = (list || []).filter(s => (!city || s.city === city) && (!q || (s.name + s.address + s.district).toLowerCase().includes(q.toLowerCase())))
  return (
    <div className="container">
      <Breadcrumb items={[{ label: 'Showroom' }]} />
      <h1>Showroom — xem búp bê trực tiếp</h1>
      <div className="row gap wrap mb">
        <select className="input auto" value={city} onChange={e => setCity(e.target.value)} aria-label="Tỉnh / thành"><option value="">Tất cả tỉnh / thành ({list?.length || 0})</option>{cities.map(c => <option key={c}>{c}</option>)}</select>
        <input className="input auto grow" value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm theo tên đường, quận…" aria-label="Tìm cửa hàng" />
      </div>
      {!list ? <Spinner /> : shown.length === 0 ? <Empty text="Không có cửa hàng phù hợp" /> : (
        <div className="store-grid">
          {shown.map(s => (
            <div key={s.id} className="panel store">
              <h3>{s.name}</h3>
              <p><Icon name="pin" size={16} /> {s.address}, {s.district}, {s.city}</p>
              <p><Icon name="phone" size={16} /> <a href={'tel:' + s.phone.replace(/\s/g, '')}>{s.phone}</a> · {s.hours}</p>
              <a className="btn ghost sm" target="_blank" rel="noreferrer" href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(`${s.address}, ${s.district}, ${s.city}`)}>Chỉ đường</a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const POLICIES = {
  'doi-tra': ['Chính sách đổi trả', [
    'Vui lòng quay video khi mở hàng. Lỗi đúc (bọt khí lớn, nứt), vỡ do vận chuyển, giao sai mẫu: báo trong 48 giờ để được đổi mới hoặc hoàn tiền 100%.',
    'Chênh lệch nhẹ màu resin giữa các đợt đúc, vết đường khuôn mờ là đặc điểm của BJD, không thuộc diện lỗi.',
    'Phụ kiện còn nguyên tem, chưa sử dụng được đổi mẫu / size trong 7 ngày (khách chịu phí ship).',
    'Đơn thanh toán online được hoàn tiền về đúng tài khoản / ví đã thanh toán trong 3 – 7 ngày làm việc.',
  ]],
  'dat-truoc': ['Chính sách đặt trước (order)', [
    'Hàng đặt trước do xưởng sản xuất theo đơn. Thời gian dự kiến ghi trên từng sản phẩm (thường 25 – 60 ngày tính từ khi nhận cọc).',
    'Đặt cọc 50% giá trị đơn khi chốt; thanh toán phần còn lại khi hàng về kho Việt Nam, shop gửi ảnh thực tế trước khi giao.',
    'Hoàn 100% tiền cọc nếu xưởng không giao được hoặc trễ quá 30 ngày so với thời gian hẹn. Khách tự hủy sau khi xưởng đã sản xuất: không hoàn cọc.',
    'Đơn có hàng đặt trước không áp dụng thanh toán khi nhận hàng (COD).',
  ]],
  'giao-hang': ['Giao hàng & thanh toán', [
    'Miễn phí giao hàng cho đơn từ 1.000.000 ₫; đơn nhỏ hơn phí 30.000 ₫. Hàng có sẵn giao 1 – 3 ngày.',
    'Búp bê được bọc đệm khí nhiều lớp, đóng hộp cứng; đơn giá trị cao có bảo hiểm vận chuyển.',
    'Thanh toán: chuyển khoản VietQR, thẻ ATM / Visa / Master qua VNPay, ví MoMo; COD cho đơn toàn hàng có sẵn.',
    'Nhận tại showroom: chọn showroom khi đặt, shop báo khi hàng sẵn sàng.',
  ]],
  'bao-mat': ['Chính sách bảo mật', [
    'Thông tin cá nhân chỉ dùng để xử lý đơn hàng, chăm sóc khách hàng và gửi ưu đãi khi bạn đồng ý.',
    'Chúng tôi không lưu thông tin thẻ; thanh toán thẻ được xử lý trực tiếp bởi cổng thanh toán.',
    'Bạn có thể yêu cầu xem, sửa hoặc xóa dữ liệu cá nhân bất kỳ lúc nào qua hotline.',
  ]],
}

export function Policy() {
  const { slug } = useParams()
  const p = POLICIES[slug]
  if (!p) return <div className="container"><Empty text="Không tìm thấy trang"><Link to="/" className="btn">Về trang chủ</Link></Empty></div>
  return (
    <div className="container narrow">
      <Breadcrumb items={[{ label: p[0] }]} />
      <h1>{p[0]}</h1>
      <div className="panel prose">{p[1].map((t, i) => <p key={i}>{t}</p>)}</div>
      <div className="chips">{Object.entries(POLICIES).filter(([k]) => k !== slug).map(([k, v]) => <Link key={k} className="chip" to={'/chinh-sach/' + k}>{v[0]}</Link>)}</div>
    </div>
  )
}

export function NotFound() {
  return <div className="container"><Empty text="Trang bạn tìm không tồn tại"><Link to="/" className="btn">Về trang chủ</Link></Empty></div>
}
