import { LISTING_STATUS, TX_STATUS } from '../utils.js'

export default function StatusBadge({ status, kind = 'listing' }) {
  const map = kind === 'tx' ? TX_STATUS : LISTING_STATUS
  const info = map[status] || { label: status, cls: 'badge-muted' }
  return <span className={`badge ${info.cls}`}>{info.label}</span>
}
