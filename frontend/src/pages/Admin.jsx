import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, imageUrl } from '../api.js'
import StatusBadge from '../components/StatusBadge.jsx'
import { LISTING_STATUS, TX_STATUS, formatArea, formatDate, formatPrice } from '../utils.js'

function StatCard({ label, value, tone = '' }) {
  return (
    <div className={`card stat ${tone}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

export default function Admin() {
  const [stats, setStats] = useState(null)
  const [status, setStatus] = useState('pending')
  const [items, setItems] = useState(null)
  const [rejecting, setRejecting] = useState(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadStats = () => api('/api/admin/stats').then(setStats).catch((err) => setError(err.message))
  const loadItems = (s = status) =>
    api('/api/admin/listings', { params: { status: s } }).then(setItems).catch((err) => setError(err.message))

  useEffect(() => {
    loadStats()
  }, [])
  useEffect(() => {
    setItems(null)
    loadItems(status)
  }, [status])

  const refresh = (msg) => {
    setNotice(msg)
    setRejecting(null)
    setReason('')
    loadStats()
    loadItems()
  }

  const approve = async (l) => {
    setError('')
    try {
      await api(`/api/admin/listings/${l.id}/approve`, { method: 'POST' })
      refresh(`Đã duyệt tin #${l.id}`)
    } catch (err) {
      setError(err.message)
    }
  }

  const reject = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api(`/api/admin/listings/${rejecting}/reject`, { method: 'POST', body: { reason } })
      refresh(`Đã từ chối tin #${rejecting}`)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <h1 className="page-title">Trang quản trị</h1>
      {stats && (
        <>
          <div className="stats">
            <StatCard label="Người dùng" value={stats.users} />
            <StatCard label="Tổng tin đăng" value={stats.listings_total} />
            {Object.entries(stats.listings_by_status).map(([k, v]) => (
              <StatCard key={k} label={`Tin ${LISTING_STATUS[k].label.toLowerCase()}`} value={v} tone={`tone-${k}`} />
            ))}
          </div>
          <div className="stats">
            <StatCard label="Tổng giao dịch" value={stats.transactions_total} />
            {Object.entries(stats.transactions_by_status).map(([k, v]) => (
              <StatCard key={k} label={`GD ${TX_STATUS[k].label.toLowerCase()}`} value={v} />
            ))}
          </div>
        </>
      )}

      <div className="page-head">
        <h2>Kiểm duyệt tin đăng</h2>
        <label className="sort">
          Trạng thái:
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đang hiển thị</option>
            <option value="rejected">Bị từ chối</option>
            <option value="deposited">Đã đặt cọc</option>
            <option value="all">Tất cả</option>
          </select>
        </label>
      </div>
      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {!items && <div className="empty">Đang tải...</div>}
      {items && items.length === 0 && <div className="empty">Không có tin nào.</div>}
      <div className="list">
        {items?.map((l) => (
          <div key={l.id} className="card list-row">
            <Link to={`/listings/${l.id}`} className="list-thumb">
              {l.thumbnail_id ? <img src={imageUrl(l.thumbnail_id)} alt="" /> : <div className="no-img">Chưa có ảnh</div>}
            </Link>
            <div className="list-body">
              <div className="list-top">
                <StatusBadge status={l.status} />
                <span className="muted small">#{l.id} · {l.owner.full_name} ({l.owner.email}) · {formatDate(l.created_at, true)}</span>
              </div>
              <Link to={`/listings/${l.id}`} className="list-title">{l.title}</Link>
              <div>
                <b className="price">{formatPrice(l.price, l.transaction_type)}</b>
                <span className="muted"> · {formatArea(l.area)} · {l.property_type} · {l.transaction_type} · {l.district}, {l.province}</span>
              </div>
              <p className="muted small clamp">{l.description}</p>
              {l.reject_reason && <div className="alert alert-error small">Lý do từ chối: {l.reject_reason}</div>}
              {rejecting === l.id && (
                <form className="reject-form" onSubmit={reject}>
                  <input value={reason} onChange={(e) => setReason(e.target.value)} required autoFocus
                    placeholder="Nhập lý do từ chối (VD: thông tin không chính xác, ảnh không rõ...)" />
                  <button className="btn btn-danger">Xác nhận từ chối</button>
                  <button type="button" className="btn btn-ghost" onClick={() => setRejecting(null)}>Hủy</button>
                </form>
              )}
            </div>
            {l.status === 'pending' && rejecting !== l.id && (
              <div className="list-actions">
                <button className="btn btn-primary" onClick={() => approve(l)}>Duyệt</button>
                <button className="btn btn-danger" onClick={() => { setRejecting(l.id); setReason('') }}>Từ chối</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
