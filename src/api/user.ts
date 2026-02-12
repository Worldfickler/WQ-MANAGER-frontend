import apiClient from './client'

export interface UserHistoryRecord {
  record_date: string
  weight_factor: number | null
  value_factor: number | null
  combined_alpha_performance: number | null
  combined_power_pool_alpha_performance: number | null
  combined_selected_alpha_performance: number | null
  submissions_count: number | null
  mean_prod_correlation: number | null
  mean_self_correlation: number | null
  super_alpha_submissions_count: number | null
  super_alpha_mean_prod_correlation: number | null
  super_alpha_mean_self_correlation: number | null
  university: string | null
  country: string | null
}

export interface ValueFactorTrendRecord {
  update_date: string
  date_range: string
  value_factor: number | null
}

export interface CombinedTrendRecord {
  update_date: string
  date_range: string
  combined_alpha_performance: number | null
  combined_power_pool_alpha_performance: number | null
  combined_selected_alpha_performance: number | null
}

export interface UserHistoryResponse {
  wq_id: string
  username: string | null
  data: UserHistoryRecord[]
  value_factor_trend: ValueFactorTrendRecord[]
  combined_trend: CombinedTrendRecord[]
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
  getHistory: (limitDays: number = 30) => {
    return apiClient.get<UserHistoryResponse>('/user/profile/history', {
      params: { limit_days: limitDays }
    })
  },

  getStatistics: () => {
    return apiClient.get<UserStatistics>('/user/profile/statistics')
  }
}
