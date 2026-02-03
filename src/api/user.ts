import apiClient from './client'

export interface UserHistoryRecord {
  record_date: string
  weight_factor: number | null
  value_factor: number | null
  submissions_count: number | null
  mean_prod_correlation: number | null
  mean_self_correlation: number | null
  super_alpha_submissions_count: number | null
  super_alpha_mean_prod_correlation: number | null
  super_alpha_mean_self_correlation: number | null
  university: string | null
  country: string | null
}

export interface UserHistoryResponse {
  wq_id: string
  username: string | null
  data: UserHistoryRecord[]
}

export interface UserStatistics {
  wq_id: string
  username: string | null
  current_weight: number
  current_value: number
  current_submissions: number
  max_weight: number
  max_daily_change: number
  max_change_date: string | null
  total_submissions: number
  record_days: number
  daily_change: number
  university: string | null
  country: string | null
  latest_date: string | null
}

export const userApi = {
  // 获取用户历史数据
  getHistory: (limitDays: number = 30) => {
    return apiClient.get<UserHistoryResponse>('/user/profile/history', {
      params: { limit_days: limitDays }
    })
  },

  // 获取用户统计数据
  getStatistics: () => {
    return apiClient.get<UserStatistics>('/user/profile/statistics')
  }
}
