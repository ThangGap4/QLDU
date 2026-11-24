import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  const handleLogout = () => {
    logout()
    close()
    navigate('/')
  }

  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="logo" onClick={close}>
          <span className="logo-mark">⌂</span> BĐS Online
        </Link>
        <button className="menu-toggle" onClick={() => setOpen(!open)} aria-label="Menu">☰</button>
        <nav className={`nav ${open ? 'open' : ''}`}>
          <NavLink to="/" end onClick={close}>Mua bán & cho thuê</NavLink>
          {user && <NavLink to="/my-listings" onClick={close}>Tin của tôi</NavLink>}
          {user && <NavLink to="/transactions" onClick={close}>Giao dịch của tôi</NavLink>}
          {user?.role === 'admin' && <NavLink to="/admin" onClick={close}>Quản trị</NavLink>}
          <span className="nav-spacer" />
          {user ? (
            <>
              <span className="nav-user" title={user.email}>
                Xin chào, <b>{user.full_name}</b>
              </span>
              <button className="btn btn-ghost" onClick={handleLogout}>Đăng xuất</button>
            </>
          ) : (
            <>
              <NavLink to="/login" onClick={close}>Đăng nhập</NavLink>
              <NavLink to="/register" onClick={close}>Đăng ký</NavLink>
            </>
          )}
          <Link to="/post" className="btn btn-accent" onClick={close}>+ Đăng tin</Link>
        </nav>
      </div>
    </header>
  )
}
