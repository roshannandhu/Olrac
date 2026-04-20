import { useEffect, useState } from 'react'
import api from '../api/axios'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const validateSession = async () => {
      const savedToken = localStorage.getItem('olrac_token')
      const savedUser = localStorage.getItem('olrac_user')

      if (!savedToken || !savedUser) {
        localStorage.removeItem('olrac_token')
        localStorage.removeItem('olrac_user')
        delete api.defaults.headers.common.Authorization
        setToken(null)
        setUser(null)
        setLoading(false)
        return
      }

      try {
        api.defaults.headers.common.Authorization = `Bearer ${savedToken}`
        setToken(savedToken)
        setUser(JSON.parse(savedUser))

        const res = await api.get('/auth/me')
        const freshUser = res.data
        localStorage.setItem('olrac_user', JSON.stringify(freshUser))
        setUser(freshUser)
      } catch {
        localStorage.removeItem('olrac_token')
        localStorage.removeItem('olrac_user')
        delete api.defaults.headers.common.Authorization
        setToken(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    validateSession()
  }, [])

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    const { access_token, user: userData } = res.data
    localStorage.setItem('olrac_token', access_token)
    localStorage.setItem('olrac_user', JSON.stringify(userData))
    api.defaults.headers.common.Authorization = `Bearer ${access_token}`
    setToken(access_token)
    setUser(userData)
    return userData
  }

  const signup = async (data) => {
    const res = await api.post('/auth/signup', data)
    const { access_token, user: userData } = res.data
    localStorage.setItem('olrac_token', access_token)
    localStorage.setItem('olrac_user', JSON.stringify(userData))
    api.defaults.headers.common.Authorization = `Bearer ${access_token}`
    setToken(access_token)
    setUser(userData)
    return userData
  }

  const logout = () => {
    localStorage.removeItem('olrac_token')
    localStorage.removeItem('olrac_user')
    delete api.defaults.headers.common.Authorization
    setToken(null)
    setUser(null)
  }

  const updateStoredUser = (nextUser) => {
    localStorage.setItem('olrac_user', JSON.stringify(nextUser))
    setUser(nextUser)
  }

  const isAdmin = user?.role === 'admin'
  const isAuthenticated = !!token

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, updateStoredUser, isAdmin, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  )
}
