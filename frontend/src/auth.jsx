import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, getToken, setToken } from './api.js'

const AuthContext = createContext(null)
const USER_KEY = 'bds_user'

function loadUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY))
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (getToken() ? loadUser() : null))

  const saveSession = useCallback((data) => {
    setToken(data.access_token)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    setUser(data.user)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }, [])

  useEffect(() => {
    if (!getToken()) return
    api('/api/auth/me')
      .then((u) => {
        localStorage.setItem(USER_KEY, JSON.stringify(u))
        setUser(u)
      })
      .catch((err) => {
        if (err.status === 401) logout()
      })
  }, [logout])

  const login = async (email, password) => {
    saveSession(await api('/api/auth/login', { method: 'POST', body: { email, password } }))
  }

  const register = async (payload) => {
    saveSession(await api('/api/auth/register', { method: 'POST', body: payload }))
  }

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
