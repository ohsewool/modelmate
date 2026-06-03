import axios from 'axios'

const urlParams = new URLSearchParams(window.location.search)
if (urlParams.get('demo') === '1') localStorage.setItem('mm_demo_mode', '1')
if (urlParams.get('demo') === '0') localStorage.removeItem('mm_demo_mode')

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : '/api'
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('mm_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (localStorage.getItem('mm_demo_mode') === '1') {
    config.params = { ...(config.params || {}), demo: true }
  }
  return config
})

export default api
