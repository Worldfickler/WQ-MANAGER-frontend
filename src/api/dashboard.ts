import apiClient from './client'
import type {
  PaginatedResponse,
  CountryRankingData,
  CountryHistoryData,
  UniversityRankingData,
  UserWeightRankingData,
  UserWeightChangeRankingData,
  UserSubmissionsRankingData,
  UserCorrelationRankingData
} from '@/types/dashboard'

export const dashboardApi = {
  // 获取国家排名
  getCountryRankings: (page: number = 1, page_size: number = 50, quarter: string = '') => {
    return apiClient.get<PaginatedResponse<CountryRankingData>>('/dashboard/country-rankings', {
      params: { page, page_size, quarter }
    })
  },

  // 获取大学排名
  getUniversityRankings: (page: number = 1, page_size: number = 50, quarter: string = '') => {
    return apiClient.get<PaginatedResponse<UniversityRankingData>>('/dashboard/university-rankings', {
      params: { page, page_size, quarter }
    })
  },

  // 获取权重最高用户
  getTopUsersByWeight: (page: number = 1, page_size: number = 50, country?: string) => {
    return apiClient.get<PaginatedResponse<UserWeightRankingData>>('/dashboard/top-users-by-weight', {
      params: { page, page_size, country }
    })
  },

  // 获取权重变化最大用户
  getTopUsersByWeightChange: (page: number = 1, page_size: number = 50, quarter: string = '', order: 'desc' | 'asc' = 'desc', country?: string) => {
    return apiClient.get<PaginatedResponse<UserWeightChangeRankingData>>('/dashboard/top-users-by-weight-change', {
      params: { page, page_size, quarter, order, country }
    })
  },

  // 获取提交数最多用户
  getTopUsersBySubmissions: (page: number = 1, page_size: number = 50, country?: string) => {
    return apiClient.get<PaginatedResponse<UserSubmissionsRankingData>>('/dashboard/top-users-by-submissions', {
      params: { page, page_size, country }
    })
  },

  // 获取相关性最高用户
  getTopUsersByCorrelation: (page: number = 1, page_size: number = 50, correlationType: 'prod' | 'self' = 'prod', country?: string) => {
    return apiClient.get<PaginatedResponse<UserCorrelationRankingData>>('/dashboard/top-users-by-correlation', {
      params: { page, page_size, correlation_type: correlationType, country }
    })
  },

  // 获取国家历史数据
  getCountryHistory: (country: string, page: number = 1, page_size: number = 20) => {
    return apiClient.get<PaginatedResponse<CountryHistoryData>>(`/dashboard/country-history/${country}`, {
      params: { page, page_size }
    })
  }
}
