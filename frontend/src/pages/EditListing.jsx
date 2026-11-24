import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import ListingForm from '../components/ListingForm.jsx'

export default function EditListing() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [listing, setListing] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api(`/api/listings/${id}`).then(setListing).catch((err) => setError(err.message))
  }, [id])

  const submit = async (fd) => {
    await api(`/api/listings/${id}`, { method: 'PUT', form: fd })
    navigate('/my-listings', { state: { notice: 'Đã cập nhật tin. Tin sẽ được duyệt lại trước khi hiển thị.' } })
  }

  if (error) return <div className="alert alert-error">{error}</div>
  if (!listing) return <div className="empty">Đang tải...</div>
  if (listing.owner_id !== user.id) return <div className="alert alert-error">Bạn không có quyền sửa tin này.</div>
  if (listing.status === 'deposited') return <div className="alert alert-info">Tin đã được đặt cọc nên không thể sửa.</div>

  return (
    <div className="narrow">
      <h1 className="page-title">Sửa tin đăng</h1>
      <div className="alert alert-info">Sau khi sửa, tin sẽ chuyển về trạng thái <b>Chờ duyệt</b>.</div>
      <ListingForm initial={listing} submitLabel="Lưu thay đổi" onSubmit={submit} />
    </div>
  )
}
