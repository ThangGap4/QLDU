import { useEffect, useState } from 'react'
import { imageUrl } from '../api.js'
import { PROPERTY_TYPES, PROVINCES, TRANSACTION_TYPES, formatPrice } from '../utils.js'

const MAX_FILES = 5
const MAX_SIZE = 5 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

const EMPTY = {
  title: '',
  property_type: PROPERTY_TYPES[0],
  transaction_type: TRANSACTION_TYPES[0],
  price: '',
  area: '',
  province: PROVINCES[0],
  district: '',
  address: '',
  description: '',
  contact_phone: '',
}

export default function ListingForm({ initial, defaultPhone, submitLabel, onSubmit }) {
  const [values, setValues] = useState(() => {
    if (initial) {
      return Object.fromEntries(Object.keys(EMPTY).map((k) => [k, initial[k] ?? '']))
    }
    return { ...EMPTY, contact_phone: defaultPhone || '' }
  })
  const [existing, setExisting] = useState(initial?.image_ids || [])
  const [removed, setRemoved] = useState([])
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f))
    setPreviews(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [files])

  const set = (key) => (e) => setValues({ ...values, [key]: e.target.value })

  const addFiles = (e) => {
    const picked = Array.from(e.target.files || [])
    e.target.value = ''
    for (const f of picked) {
      if (!ACCEPTED.includes(f.type)) return setError(`Ảnh "${f.name}" phải là JPEG, PNG hoặc WEBP`)
      if (f.size > MAX_SIZE) return setError(`Ảnh "${f.name}" vượt quá 5MB`)
    }
    if (existing.length + files.length + picked.length > MAX_FILES) {
      return setError(`Tối đa ${MAX_FILES} ảnh mỗi tin`)
    }
    setError('')
    setFiles([...files, ...picked])
  }

  const removeExisting = (id) => {
    setExisting(existing.filter((x) => x !== id))
    setRemoved([...removed, id])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const fd = new FormData()
    Object.entries(values).forEach(([k, v]) => fd.append(k, String(v).trim()))
    files.forEach((f) => fd.append('images', f))
    if (removed.length) fd.append('remove_image_ids', removed.join(','))
    setSaving(true)
    try {
      await onSubmit(fd)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const totalImages = existing.length + files.length

  return (
    <form className="form card pad" onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}
      <label className="field">
        <span>Tiêu đề *</span>
        <input value={values.title} onChange={set('title')} required minLength={5} maxLength={255}
          placeholder="VD: Bán căn hộ 2PN view sông, nội thất đầy đủ" />
      </label>
      <div className="grid-3">
        <label className="field">
          <span>Loại bất động sản *</span>
          <select value={values.property_type} onChange={set('property_type')}>
            {PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Hình thức *</span>
          <select value={values.transaction_type} onChange={set('transaction_type')}>
            {TRANSACTION_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Diện tích (m²) *</span>
          <input type="number" min="1" step="0.1" value={values.area} onChange={set('area')} required />
        </label>
      </div>
      <label className="field">
        <span>Giá (VND){values.transaction_type === 'Cho thuê' ? ' / tháng' : ''} *</span>
        <input type="number" min="1" step="1" value={values.price} onChange={set('price')} required
          placeholder="VD: 3500000000" />
        {Number(values.price) > 0 && (
          <small className="hint">≈ {formatPrice(values.price, values.transaction_type)}</small>
        )}
      </label>
      <div className="grid-3">
        <label className="field">
          <span>Tỉnh / Thành phố *</span>
          <select value={values.province} onChange={set('province')}>
            {PROVINCES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Quận / Huyện *</span>
          <input value={values.district} onChange={set('district')} required placeholder="VD: Quận 7" />
        </label>
        <label className="field">
          <span>Số điện thoại liên hệ *</span>
          <input value={values.contact_phone} onChange={set('contact_phone')} required minLength={8} maxLength={30} />
        </label>
      </div>
      <label className="field">
        <span>Địa chỉ *</span>
        <input value={values.address} onChange={set('address')} required placeholder="Số nhà, đường, phường/xã" />
      </label>
      <label className="field">
        <span>Mô tả chi tiết</span>
        <textarea rows={6} value={values.description} onChange={set('description')}
          placeholder="Mô tả vị trí, pháp lý, nội thất, tiện ích xung quanh..." />
      </label>
      <div className="field">
        <span>Hình ảnh ({totalImages}/{MAX_FILES}) — JPEG/PNG/WEBP, tối đa 5MB mỗi ảnh</span>
        <div className="thumbs">
          {existing.map((id) => (
            <div key={`e${id}`} className="thumb">
              <img src={imageUrl(id)} alt="" />
              <button type="button" onClick={() => removeExisting(id)} title="Xóa ảnh">×</button>
            </div>
          ))}
          {previews.map((url, i) => (
            <div key={url} className="thumb">
              <img src={url} alt="" />
              <button type="button" onClick={() => setFiles(files.filter((_, idx) => idx !== i))} title="Bỏ ảnh">×</button>
            </div>
          ))}
          {totalImages < MAX_FILES && (
            <label className="thumb thumb-add">
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addFiles} hidden />
              + Thêm ảnh
            </label>
          )}
        </div>
      </div>
      <div className="form-actions">
        <button className="btn btn-primary btn-lg" disabled={saving}>
          {saving ? 'Đang lưu...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
