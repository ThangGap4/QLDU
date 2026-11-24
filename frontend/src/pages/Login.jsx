import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="auth-box card pad">
      <h2>Đăng nhập</h2>
      {error && <div className="alert alert-error">{error}</div>}
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label className="field">
          <span>Mật khẩu</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button className="btn btn-primary btn-lg btn-block" disabled={loading}>
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>
      <p className="muted center">Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link></p>
      <div className="demo-accounts">
        <b>Tài khoản demo:</b>
        <div>Người bán: seller@bds.local / seller123</div>
        <div>Người mua: buyer@bds.local / buyer123</div>
        <div>Quản trị: admin@bds.local / admin123</div>
      </div>
    </div>
  )
}
