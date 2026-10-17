// Tính giá vốn hàng order Taobao về Việt Nam và giá bán đề xuất.
// Dùng chung cho: dữ liệu mẫu, trang Quản trị → Tính giá nhập, form sản phẩm.

// Thông số mặc định — đổi trong Quản trị → Tính giá nhập (lưu lại theo cửa hàng).
// Nguồn tham khảo (10/2026): bảng phí order Taobao của các đơn vị vận chuyển Trung – Việt
// (phí dịch vụ 3% với đơn ≤ 2 triệu, cước lẻ ~24.000đ/kg về HN, ~30.000đ/kg về TP.HCM).
// Tỷ giá: kiểm tra lại giá bán NDT của ngân hàng / đơn vị order trước khi nhập hàng.
export const DEFAULT_IMPORT = {
  rate: 3700,            // VND / 1 NDT (tệ)
  servicePct: 3,         // phí mua hộ, % tiền hàng
  shipPerKg: 30000,      // cước Trung → Việt (VND/kg, đã gồm thông quan tiểu ngạch)
  insurancePct: 2,       // bảo hiểm hàng dễ vỡ, % tiền hàng (áp dụng búp bê)
  overheadPct: 3,        // phí cổng thanh toán, đổi trả, hao hụt — % giá vốn
  marginDoll: 30,        // lãi mong muốn với búp bê, % giá vốn
  marginAcc: 60,         // lãi với phụ kiện
  marginSmall: 90,       // lãi với món nhỏ (giá vốn < 150.000đ)
  smallUnder: 150000,
}

// Đóng gói chống va đập (đệm khí / đóng gỗ) theo tỉ lệ búp bê — VND/món
export const PACKING = { '1/3': 80000, '1/4': 50000, '1/6': 30000, '1/8': 20000 }

export const roundPrice = v => Math.ceil(v / 10000) * 10000

// item: { yuan, weight_kg, cn_ship_yuan?, kind, scale, margin_pct? }
export function landedCost(item, s = DEFAULT_IMPORT) {
  const yuan = Number(item.yuan) || 0
  const cnShip = Number(item.cn_ship_yuan) || 0
  const isDoll = item.kind === 'doll'
  const goods = yuan * s.rate                                   // tiền hàng
  const service = goods * s.servicePct / 100                    // phí mua hộ
  const cnShipVnd = cnShip * s.rate                             // ship nội địa Trung Quốc
  const intl = (Number(item.weight_kg) || 0) * s.shipPerKg      // cước về Việt Nam
  const packing = isDoll ? (PACKING[item.scale] || 0) : 0
  const insurance = isDoll ? goods * s.insurancePct / 100 : 0
  const base = goods + service + cnShipVnd + intl + packing + insurance
  const overhead = base * s.overheadPct / 100
  const cost = base + overhead
  const margin = item.margin_pct != null && item.margin_pct !== ''
    ? Number(item.margin_pct)
    : isDoll ? s.marginDoll : cost < s.smallUnder ? s.marginSmall : s.marginAcc
  const price = roundPrice(cost * (1 + margin / 100))
  return {
    goods: Math.round(goods), service: Math.round(service), cnShip: Math.round(cnShipVnd), intl: Math.round(intl),
    packing, insurance: Math.round(insurance), overhead: Math.round(overhead),
    cost: Math.round(cost), margin, price, profit: price - Math.round(cost),
  }
}
