import axios from 'axios'
import router from '@/router'

const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30 second timeout
})

// Request interceptor - 添加JWT token
apiClient.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - 处理认证错误
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // 如果是401错误，清除认证信息并跳转到登录页
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      localStorage.removeItem('isAuthenticated')
      router.push('/login')
    }

    return Promise.reject(error)
  }
)

export default apiClient
