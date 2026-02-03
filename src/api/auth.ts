import apiClient from './client'

export interface LoginRequest {
  wq_id: string
}

export interface LoginResponse {
  success: boolean
  message: string
  access_token?: string
  token_type?: string
  wq_id?: string
  username?: string
}

export const authApi = {
  login: (wqId: string) => {
    return apiClient.post<LoginResponse>('/auth/login', { wq_id: wqId })
  },

  getCurrentUser: (wqId: string) => {
    return apiClient.get(`/auth/user/me?wq_id=${wqId}`)
  }
}
