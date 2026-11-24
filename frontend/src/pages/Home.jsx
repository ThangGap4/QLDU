import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import ListingCard from '../components/ListingCard.jsx'
import Pagination from '../components/Pagination.jsx'
import { PROPERTY_TYPES, PROVINCES, TRANSACTION_TYPES } from '../utils.js'

const FILTER_KEYS = ['keyword', 'property_type', 'transaction_type', 'province', 'price_min', 'price_max', 'area_min', 'area_max', 'sort']
const MILLION = 1_000_000

function readFilters(params) {
  const f = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || '']))
  if (!f.sort) f.sort = 'newest'
  return f
}

export default function Home() {
  const [params, setParams] = useSearchParams()
  const [form, setForm] = useState(() => readFilters(params))
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const page = Number(params.get('page')) || 1

  useEffect(() => {
    const f = readFilters(params)
    setForm(f)
    setLoading(true)
    setError('')
    api('/api/listings', {
      params: {
        ...f,
        price_min: f.price_min ? Math.round(Number(f.price_min) * MILLION) : '',
        price_max: f.price_max ? Math.round(Number(f.price_max) * MILLION) : '',
        page,
        page_size: 9,
      },
    })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [params, page])

  const apply = (next, newPage = 1) => {
    const p = {}
    Object.entries(next).forEach(([k, v]) => {
      if (v !== '' && !(k === 'sort' && v === 'newest')) p[k] = v
    })
    if (newPage > 1) p.page = newPage
    setParams(p)
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const submit = (e) => {
    e.preventDefault()
    apply(form)
  }
  const reset = () => apply({ sort: 'newest' })
  const changeSort = (e) => apply({ ...readFilters(params), sort: e.target.value })
  const changePage = (p) => {
    apply(readFilters(params), p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <section className="hero">
        <h1>Tìm ngôi nhà phù hợp với bạn</h1>
        <p>Hàng trăm tin mua bán, cho thuê căn hộ, nhà phố, đất nền đã được kiểm duyệt.</p>
        <form className="search-bar" onSubmit={submit}>
          <input value={form.keyword} onChange={set('keyword')} placeholder="Nhập từ khóa: tên dự án, đường, quận..." />
          <button className="btn btn-accent btn-lg">Tìm kiếm</button>
        </form>
      </section>

      <div className="layout">
        <aside className="filters card pad">
          <form onSubmit={submit}>
            <h3>Bộ lọc</h3>
            <label className="field">
              <span>Hình thức</span>
              <select value={form.transaction_type} onChange={set('transaction_type')}>
                <option value="">Tất cả</option>
                {TRANSACTION_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Loại bất động sản</span>
              <select value={form.property_type} onChange={set('property_type')}>
                <option value="">Tất cả</option>
                {PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Tỉnh / Thành phố</span>
              <select value={form.province} onChange={set('province')}>
                <option value="">Toàn quốc</option>
                {PROVINCES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <div className="field">
              <span>Giá (triệu VND)</span>
              <div className="range">
                <input type="number" min="0" step="any" placeholder="Từ" value={form.price_min} onChange={set('price_min')} />
                <input type="number" min="0" step="any" placeholder="Đến" value={form.price_max} onChange={set('price_max')} />
              </div>
            </div>
            <div className="field">
              <span>Diện tích (m²)</span>
              <div className="range">
                <input type="number" min="0" step="any" placeholder="Từ" value={form.area_min} onChange={set('area_min')} />
                <input type="number" min="0" step="any" placeholder="Đến" value={form.area_max} onChange={set('area_max')} />
              </div>
            </div>
            <div className="filter-actions">
              <button className="btn btn-primary">Áp dụng</button>
              <button type="button" className="btn btn-ghost" onClick={reset}>Xóa lọc</button>
            </div>
          </form>
        </aside>

        <section className="results">
          <div className="results-head">
            <div>
              {data && <span><b>{data.total}</b> tin đăng phù hợp</span>}
            </div>
            <label className="sort">
              Sắp xếp:
              <select value={readFilters(params).sort} onChange={changeSort}>
                <option value="newest">Mới nhất</option>
                <option value="price_asc">Giá thấp → cao</option>
                <option value="price_desc">Giá cao → thấp</option>
              </select>
            </label>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          {loading && !data && <div className="empty">Đang tải...</div>}
          {data && data.items.length === 0 && <div className="empty">Không có tin đăng nào phù hợp với bộ lọc.</div>}
          {data && (
            <div className={`grid ${loading ? 'is-loading' : ''}`}>
              {data.items.map((l) => <ListingCard key={l.id} listing={l} />)}
            </div>
          )}
          {data && <Pagination page={data.page} pages={data.pages} onChange={changePage} />}
        </section>
      </div>
    </>
  )
}
