import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import ListingForm from '../components/ListingForm.jsx'

export default function PostListing() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const submit = async (fd) => {
    await api('/api/listings', { method: 'POST', form: fd })
    navigate('/my-listings', { state: { notice: 'Đăng tin thành công! Tin của bạn đang chờ quản trị viên duyệt.' } })
  }

  return (
    <div className="narrow">
      <h1 className="page-title">Đăng tin bất động sản</h1>
      <p className="muted">Tin đăng sẽ được quản trị viên kiểm duyệt trước khi hiển thị công khai.</p>
      <ListingForm defaultPhone={user?.phone} submitLabel="Đăng tin" onSubmit={submit} />
    </div>
  )
}
