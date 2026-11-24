import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api, imageUrl } from '../api.js'
import StatusBadge from '../components/StatusBadge.jsx'
import { formatArea, formatDate, formatPrice } from '../utils.js'

export default function MyListings() {
  const location = useLocation()
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(location.state?.notice || '')

  const load = () => api('/api/listings/mine').then(setItems).catch((err) => setError(err.message))
  useEffect(() => {
    load()
  }, [])

  const remove = async (listing) => {
    if (!window.confirm(`Xóa tin "${listing.title}"? Thao tác không thể hoàn tác.`)) return
    try {
      await api(`/api/listings/${listing.id}`, { method: 'DELETE' })
      setNotice('Đã xóa tin đăng.')
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Tin của tôi</h1>
        <Link to="/post" className="btn btn-accent">+ Đăng tin mới</Link>
      </div>
      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {!items && !error && <div className="empty">Đang tải...</div>}
      {items && items.length === 0 && (
        <div className="empty">Bạn chưa có tin đăng nào. <Link to="/post">Đăng tin ngay</Link></div>
      )}
      <div className="list">
        {items?.map((l) => (
          <div key={l.id} className="card list-row">
            <Link to={`/listings/${l.id}`} className="list-thumb">
              {l.thumbnail_id ? <img src={imageUrl(l.thumbnail_id)} alt="" /> : <div className="no-img">Chưa có ảnh</div>}
            </Link>
            <div className="list-body">
              <div className="list-top">
                <StatusBadge status={l.status} />
                <span className="muted small">#{l.id} · Đăng ngày {formatDate(l.created_at)}</span>
              </div>
              <Link to={`/listings/${l.id}`} className="list-title">{l.title}</Link>
              <div>
                <b className="price">{formatPrice(l.price, l.transaction_type)}</b>
                <span className="muted"> · {formatArea(l.area)} · {l.property_type} · {l.district}, {l.province}</span>
              </div>
              {l.status === 'rejected' && l.reject_reason && (
                <div className="alert alert-error small">Lý do từ chối: {l.reject_reason}</div>
              )}
            </div>
            <div className="list-actions">
              {l.status !== 'deposited' && <Link to={`/listings/${l.id}/edit`} className="btn btn-ghost">Sửa</Link>}
              <button className="btn btn-danger" onClick={() => remove(l)}>Xóa</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
