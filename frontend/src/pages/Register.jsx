import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [values, setValues] = useState({ full_name: '', email: '', phone: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const set = (key) => (e) => setValues({ ...values, [key]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    if (values.password !== values.confirm) return setError('Mật khẩu nhập lại không khớp')
    setError('')
    setLoading(true)
    try {
      const { confirm: _, ...payload } = values
      await register(payload)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="auth-box card pad">
      <h2>Tạo tài khoản</h2>
      {error && <div className="alert alert-error">{error}</div>}
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>Họ và tên</span>
          <input value={values.full_name} onChange={set('full_name')} required autoFocus />
        </label>
        <label className="field">
          <span>Email</span>
          <input type="email" value={values.email} onChange={set('email')} required />
        </label>
        <label className="field">
          <span>Số điện thoại</span>
          <input value={values.phone} onChange={set('phone')} placeholder="VD: 0901234567" />
        </label>
        <label className="field">
          <span>Mật khẩu (tối thiểu 6 ký tự)</span>
          <input type="password" value={values.password} onChange={set('password')} required minLength={6} />
        </label>
        <label className="field">
          <span>Nhập lại mật khẩu</span>
          <input type="password" value={values.confirm} onChange={set('confirm')} required minLength={6} />
        </label>
        <button className="btn btn-primary btn-lg btn-block" disabled={loading}>
          {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
        </button>
      </form>
      <p className="muted center">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
    </div>
  )
}
