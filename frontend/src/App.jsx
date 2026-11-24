import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/Header.jsx'
import { useAuth } from './auth.jsx'
import Home from './pages/Home.jsx'
import ListingDetail from './pages/ListingDetail.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import PostListing from './pages/PostListing.jsx'
import EditListing from './pages/EditListing.jsx'
import MyListings from './pages/MyListings.jsx'
import MyTransactions from './pages/MyTransactions.jsx'
import Admin from './pages/Admin.jsx'

function RequireAuth({ children, admin = false }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <>
      <Header />
      <main className="container main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/listings/:id" element={<ListingDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/post" element={<RequireAuth><PostListing /></RequireAuth>} />
          <Route path="/listings/:id/edit" element={<RequireAuth><EditListing /></RequireAuth>} />
          <Route path="/my-listings" element={<RequireAuth><MyListings /></RequireAuth>} />
          <Route path="/transactions" element={<RequireAuth><MyTransactions /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth admin><Admin /></RequireAuth>} />
          <Route path="*" element={<div className="empty">Không tìm thấy trang. <Link to="/">Về trang chủ</Link></div>} />
        </Routes>
      </main>
      <footer className="footer">
        <div className="container">© 2026 BĐS Online — Nền tảng đăng tin và giao dịch bất động sản trực tuyến (đồ án môn học)</div>
      </footer>
    </>
  )
}
