export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')

const TOKEN_KEY = 'bds_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token) => {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export const imageUrl = (id) => `${API_URL}/api/images/${id}`

function errorMessage(data, status) {
  const detail = data && data.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((d) => `${(d.loc || []).slice(-1)[0] || ''}: ${d.msg}`).join('; ')
  }
  if (status === 0) return 'Không kết nối được máy chủ'
  return `Lỗi máy chủ (${status})`
}

export async function api(path, { method = 'GET', body, form, params } = {}) {
  let url = `${API_URL}${path}`
  if (params) {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, v)
    })
    const s = qs.toString()
    if (s) url += `?${s}`
  }
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  let payload
  if (form) payload = form
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  let res
  try {
    res = await fetch(url, { method, headers, body: payload })
  } catch {
    throw new Error('Không kết nối được máy chủ. Vui lòng thử lại sau.')
  }
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const err = new Error(errorMessage(data, res.status))
    err.status = res.status
    throw err
  }
  return data
}
