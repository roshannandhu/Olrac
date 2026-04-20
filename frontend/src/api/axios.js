import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

const storedToken = typeof window !== 'undefined' ? localStorage.getItem('olrac_token') : null
if (storedToken) {
  api.defaults.headers.common.Authorization = `Bearer ${storedToken}`
}

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('olrac_token')
    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('olrac_token')
      localStorage.removeItem('olrac_user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
