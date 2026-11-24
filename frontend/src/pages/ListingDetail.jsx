import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, imageUrl } from '../api.js'
import { useAuth } from '../auth.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { formatArea, formatDate, formatPrice, formatVND, pricePerM2 } from '../utils.js'

function RequestForm({ listing, user }) {
  const canDeposit = listing.status === 'approved'
  const [type, setType] = useState('contact')
  const [values, setValues] = useState({ message: '', phone: user.phone || '', viewing_date: '', deposit_amount: '' })
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [sending, setSending] = useState(false)
  const set = (key) => (e) => setValues({ ...values, [key]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      await api('/api/transactions', {
        method: 'POST',
        body: {
          listing_id: listing.id,
          type,
          message: values.message,
          phone: values.phone,
          viewing_date: type === 'contact' && values.viewing_date ? values.viewing_date : null,
          deposit_amount: type === 'deposit' ? Number(values.deposit_amount) : null,
        },
      })
      setDone(type === 'deposit'
        ? 'Đã gửi yêu cầu đặt cọc (mô phỏng). Vui lòng chờ người đăng xác nhận.'
        : 'Đã gửi yêu cầu liên hệ. Người đăng sẽ phản hồi sớm.')
      setValues({ ...values, message: '', viewing_date: '', deposit_amount: '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="card pad">
      <div className="tabs">
        <button type="button" className={type === 'contact' ? 'active' : ''} onClick={() => setType('contact')}>
          Liên hệ xem nhà
        </button>
        <button type="button" className={type === 'deposit' ? 'active' : ''} disabled={!canDeposit}
          onClick={() => setType('deposit')} title={canDeposit ? '' : 'Tin đã được đặt cọc'}>
          Đặt cọc
        </button>
      </div>
      {done && <div className="alert alert-success">{done} <Link to="/transactions">Xem giao dịch</Link></div>}
      {error && <div className="alert alert-error">{error}</div>}
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>Số điện thoại của bạn *</span>
          <input value={values.phone} onChange={set('phone')} required minLength={8} />
        </label>
        {type === 'contact' ? (
          <label className="field">
            <span>Ngày muốn xem nhà</span>
            <input type="date" value={values.viewing_date} onChange={set('viewing_date')}
              min={new Date().toISOString().slice(0, 10)} />
          </label>
        ) : (
          <label className="field">
            <span>Số tiền đặt cọc (VND) *</span>
            <input type="number" min="1" max={listing.price} value={values.deposit_amount}
              onChange={set('deposit_amount')} required />
            {Number(values.deposit_amount) > 0 && <small className="hint">≈ {formatPrice(values.deposit_amount)}</small>}
            <small className="hint">Đây là đặt cọc mô phỏng, không phát sinh thanh toán thật.</small>
          </label>
        )}
        <label className="field">
          <span>Lời nhắn</span>
          <textarea rows={3} value={values.message} onChange={set('message')}
            placeholder={type === 'contact' ? 'Tôi muốn xem nhà vào...' : 'Ghi chú cho người bán...'} />
        </label>
        <button className="btn btn-primary btn-block" disabled={sending}>
          {sending ? 'Đang gửi...' : type === 'deposit' ? 'Gửi yêu cầu đặt cọc' : 'Gửi yêu cầu liên hệ'}
        </button>
      </form>
    </div>
  )
}

export default function ListingDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [listing, setListing] = useState(null)
  const [active, setActive] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    setListing(null)
    setActive(0)
    api(`/api/listings/${id}`).then(setListing).catch((err) => setError(err.message))
  }, [id])

  if (error) return <div className="alert alert-error">{error} <Link to="/">Quay lại danh sách</Link></div>
  if (!listing) return <div className="empty">Đang tải...</div>

  const isOwner = user && user.id === listing.owner_id
  const isPublic = ['approved', 'deposited'].includes(listing.status)
  const images = listing.image_ids

  return (
    <div className="detail">
      <Link to="/" className="back">‹ Quay lại danh sách</Link>
      <div className="detail-layout">
        <div>
          <div className="gallery card">
            <div className="gallery-main">
              {images.length ? <img src={imageUrl(images[active])} alt={listing.title} /> : <div className="no-img">Chưa có ảnh</div>}
              {images.length > 1 && (
                <>
                  <button className="nav-btn prev" onClick={() => setActive((active - 1 + images.length) % images.length)}>‹</button>
                  <button className="nav-btn next" onClick={() => setActive((active + 1) % images.length)}>›</button>
                  <span className="chip chip-count">{active + 1}/{images.length}</span>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="gallery-thumbs">
                {images.map((imgId, i) => (
                  <img key={imgId} src={imageUrl(imgId)} alt="" className={i === active ? 'active' : ''} onClick={() => setActive(i)} />
                ))}
              </div>
            )}
          </div>

          <div className="card pad">
            <div className="detail-badges">
              <span className="badge badge-primary">{listing.transaction_type}</span>
              <span className="badge badge-muted">{listing.property_type}</span>
              <StatusBadge status={listing.status} />
            </div>
            <h1 className="detail-title">{listing.title}</h1>
            <p className="muted">📍 {listing.address}, {listing.district}, {listing.province}</p>
            <div className="key-stats">
              <div>
                <span className="muted">Mức giá</span>
                <b className="price">{formatPrice(listing.price, listing.transaction_type)}</b>
                {listing.transaction_type === 'Bán' && <small className="muted">~{pricePerM2(listing.price, listing.area)}</small>}
              </div>
              <div>
                <span className="muted">Diện tích</span>
                <b>{formatArea(listing.area)}</b>
              </div>
              <div>
                <span className="muted">Ngày đăng</span>
                <b>{formatDate(listing.created_at)}</b>
              </div>
            </div>
            {listing.status === 'rejected' && listing.reject_reason && (
              <div className="alert alert-error">Lý do từ chối: {listing.reject_reason}</div>
            )}
            <h3>Thông tin mô tả</h3>
            <p className="description">{listing.description || 'Chưa có mô tả.'}</p>
            <h3>Đặc điểm bất động sản</h3>
            <table className="info-table">
              <tbody>
                <tr><td>Loại BĐS</td><td>{listing.property_type}</td></tr>
                <tr><td>Hình thức</td><td>{listing.transaction_type}</td></tr>
                <tr><td>Giá</td><td>{formatVND(listing.price)}{listing.transaction_type === 'Cho thuê' ? ' / tháng' : ''}</td></tr>
                <tr><td>Diện tích</td><td>{formatArea(listing.area)}</td></tr>
                <tr><td>Tỉnh/Thành phố</td><td>{listing.province}</td></tr>
                <tr><td>Quận/Huyện</td><td>{listing.district}</td></tr>
                <tr><td>Địa chỉ</td><td>{listing.address}</td></tr>
                <tr><td>Mã tin</td><td>#{listing.id}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <aside className="detail-side">
          <div className="card pad owner-card">
            <div className="avatar">{listing.owner.full_name.charAt(0).toUpperCase()}</div>
            <div>
              <div className="muted">Người đăng</div>
              <b>{listing.owner.full_name}</b>
            </div>
            <a className="btn btn-accent btn-block" href={`tel:${listing.contact_phone}`}>📞 {listing.contact_phone}</a>
            <div className="muted small">Email: {listing.owner.email}</div>
          </div>
          {listing.status === 'deposited' && (
            <div className="alert alert-info">Bất động sản này đã được đặt cọc. Bạn vẫn có thể gửi yêu cầu liên hệ.</div>
          )}
          {isOwner ? (
            <div className="card pad">
              <p>Đây là tin đăng của bạn.</p>
              <Link to="/transactions" className="btn btn-primary btn-block">Xem yêu cầu giao dịch</Link>
            </div>
          ) : !isPublic ? null : user ? (
            <RequestForm listing={listing} user={user} />
          ) : (
            <div className="card pad center">
              <p>Đăng nhập để gửi yêu cầu liên hệ hoặc đặt cọc.</p>
              <Link to="/login" state={{ from: `/listings/${listing.id}` }} className="btn btn-primary btn-block">Đăng nhập</Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
