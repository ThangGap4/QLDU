export const PROPERTY_TYPES = ['Căn hộ', 'Nhà phố', 'Đất nền', 'Biệt thự', 'Phòng trọ']
export const TRANSACTION_TYPES = ['Bán', 'Cho thuê']
export const PROVINCES = [
  'TP.HCM', 'Hà Nội', 'Đà Nẵng', 'Bình Dương', 'Đồng Nai', 'Hải Phòng',
  'Cần Thơ', 'Khánh Hòa', 'Bà Rịa - Vũng Tàu', 'Quảng Ninh', 'Long An', 'Khác',
]

export const LISTING_STATUS = {
  pending: { label: 'Chờ duyệt', cls: 'badge-warning' },
  approved: { label: 'Đang hiển thị', cls: 'badge-success' },
  rejected: { label: 'Bị từ chối', cls: 'badge-danger' },
  deposited: { label: 'Đã đặt cọc', cls: 'badge-info' },
}

export const TX_STATUS = {
  pending: { label: 'Chờ xử lý', cls: 'badge-warning' },
  accepted: { label: 'Đã chấp nhận', cls: 'badge-success' },
  rejected: { label: 'Bị từ chối', cls: 'badge-danger' },
  cancelled: { label: 'Đã hủy', cls: 'badge-muted' },
}

export const TX_TYPE = { contact: 'Liên hệ xem nhà', deposit: 'Đặt cọc' }

function trimNumber(n) {
  return (Math.round(n * 100) / 100).toString().replace('.', ',')
}

export function formatPrice(price, transactionType) {
  const n = Number(price) || 0
  let text
  if (n >= 1e9) text = `${trimNumber(n / 1e9)} tỷ`
  else if (n >= 1e6) text = `${trimNumber(n / 1e6)} triệu`
  else if (n >= 1e3) text = `${trimNumber(n / 1e3)} nghìn`
  else text = `${n} đ`
  return transactionType === 'Cho thuê' ? `${text}/tháng` : text
}

export function formatVND(n) {
  return `${Number(n || 0).toLocaleString('vi-VN')} ₫`
}

export function formatArea(a) {
  return `${Number(a).toLocaleString('vi-VN')} m²`
}

export function formatDate(value, withTime = false) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return withTime ? d.toLocaleString('vi-VN') : d.toLocaleDateString('vi-VN')
}

export function pricePerM2(price, area) {
  if (!area) return ''
  return `${formatPrice(price / area)}/m²`
}
