// 分页响应
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// 国家排名数据
export interface CountryRankingData {
  country: string
  user_count: number
  weight_factor: number
  value_factor?: number | null
  submissions_count: number
  super_alpha_submissions_count: number
  total_submissions: number
  mean_prod_correlation?: number | null
  mean_self_correlation?: number | null
  super_alpha_mean_prod_correlation?: number | null
  super_alpha_mean_self_correlation?: number | null
  // 变化值
  weight_change?: number | null
  value_change?: number | null
  submissions_change?: number | null
  super_alpha_submissions_change?: number | null
  total_submissions_change?: number | null
  prod_corr_change?: number | null
  self_corr_change?: number | null
}

// 国家历史数据
export interface CountryHistoryData {
  record_date: string
  user_count: number
  weight_factor: number
  value_factor?: number | null
  submissions_count: number
  super_alpha_submissions_count: number
  total_submissions: number
  mean_prod_correlation?: number | null
  mean_self_correlation?: number | null
  super_alpha_mean_prod_correlation?: number | null
  super_alpha_mean_self_correlation?: number | null
}

// 大学排名数据
export interface UniversityRankingData {
  university: string
  user_count: number
  avg_weight: number
  max_weight: number
  total_submissions: number
}

// 用户权重排名数据
export interface UserWeightRankingData {
  rank: number
  user: string
  weight_factor: number
  value_factor?: number | null
  total_submissions: number
  country?: string | null
  university?: string | null
}

// 用户权重变化排名数据
export interface UserWeightChangeRankingData {
  rank: number
  user: string
  current_weight: number
  weight_change: number
  country?: string | null
  university?: string | null
}

// 用户提交数排名数据
export interface UserSubmissionsRankingData {
  rank: number
  user: string
  weight_factor?: number | null
  regular_submissions: number
  super_alpha_submissions: number
  total_submissions: number
  country?: string | null
  university?: string | null
}

// 用户相关性排名数据
export interface UserCorrelationRankingData {
  rank: number
  user: string
  weight_factor?: number | null
  regular_correlation?: number | null
  super_alpha_correlation?: number | null
  avg_correlation: number
  country?: string | null
  university?: string | null
}
