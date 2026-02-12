import apiClient from './client'
import type {
  CountryWeightTimeSeries,
  CountrySubmissionTimeSeries,
  GeniusCountryTimeSeries,
  GeniusWeightTimeSeries,
  GeniusUserWeightChange,
  GeniusLevelWeightChange,
  UserWeightTimeSeries,
  CountryWeightData,
  UserWeightData,
  SummaryStatistics,
   ValueFactorAnalysisResponse,
   ValueFactorUserChangePageResponse,
   CombinedAnalysisResponse,
   CombinedUserChangePageResponse,
   UserMetricTrendResponse
 } from '@/types/leaderboard'

export const leaderboardApi = {
  getCountryWeightTimeSeries: (countries?: string, limitDays: number = 30) => {
    const params: any = { limit_days: limitDays }
    if (countries) {
      params.countries = countries
    }
    return apiClient.get<CountryWeightTimeSeries[]>('/leaderboard/country-weight-timeseries', { params })
  },

  getCountrySubmissionTimeSeries: (countries?: string, limitDays: number = 30, startDate?: string, endDate?: string) => {
    const params: any = { limit_days: limitDays }
    if (countries) {
      params.countries = countries
    }
    if (startDate) {
      params.start_date = startDate
    }
    if (endDate) {
      params.end_date = endDate
    }
    return apiClient.get<CountrySubmissionTimeSeries[]>('/leaderboard/country-submission-timeseries', { params })
  },

  getAvailableCountries: () => {
    return apiClient.get<string[]>('/leaderboard/available-countries')
  },

  // 获取国家排行榜
  getCountryLeaderboard: (limit: number = 10, days: number = 7) => {
    return apiClient.get<CountryWeightData[]>('/leaderboard/country-leaderboard', {
      params: { limit, days }
    })
  },

  // 鑾峰彇鐢ㄦ埛鎺掕姒滐紙鎸墂eight鍙樺寲閲忔帓搴忥級
  getUserLeaderboard: (limit: number = 6, days: number = 7, order: 'desc' | 'asc' = 'desc') => {
    return apiClient.get<UserWeightData[]>('/leaderboard/user-leaderboard', {
      params: { limit, days, order }
    })
  },

  // 获取汇总统计
  getSummaryStatistics: (days: number = 7) => {
    return apiClient.get<SummaryStatistics>('/leaderboard/summary-statistics', {
      params: { days }
    })
  },

  // 获取Genius国家时间序列
  getGeniusCountryTimeSeries: (countries?: string, startDate?: string, endDate?: string) => {
    const params: any = {}
    if (countries) {
      params.countries = countries
    }
    if (startDate) {
      params.start_date = startDate
    }
    if (endDate) {
      params.end_date = endDate
    }
    return apiClient.get<GeniusCountryTimeSeries[]>('/leaderboard/genius-country-timeseries', { params })
  },

  getGeniusWeightTimeSeries: (levels?: string, countries?: string, startDate?: string, endDate?: string) => {
    const params: any = {}
    if (levels) {
      params.levels = levels
    }
    if (countries) {
      params.countries = countries
    }
    if (startDate) {
      params.start_date = startDate
    }
    if (endDate) {
      params.end_date = endDate
    }
    return apiClient.get<GeniusWeightTimeSeries[]>('/leaderboard/genius-weight-timeseries', { params })
  },

  getGeniusUserWeightChanges: (levels?: string, countries?: string, startDate?: string, endDate?: string, order: 'desc' | 'asc' = 'desc') => {
    const params: any = { order }
    if (levels) {
      params.levels = levels
    }
    if (countries) {
      params.countries = countries
    }
    if (startDate) {
      params.start_date = startDate
    }
    if (endDate) {
      params.end_date = endDate
    }
    return apiClient.get<GeniusUserWeightChange[]>('/leaderboard/genius-user-weight-changes', { params })
  },

  getGeniusUserWeightTimeSeries: (user: string, startDate?: string, endDate?: string) => {
    const params: any = { user }
    if (startDate) {
      params.start_date = startDate
    }
    if (endDate) {
      params.end_date = endDate
    }
    return apiClient.get<UserWeightTimeSeries>('/leaderboard/genius-user-weight-timeseries', { params })
  },

  getGeniusAvailableCountries: () => {
    return apiClient.get<string[]>('/leaderboard/genius-available-countries')
  },

  getGeniusAvailableLevels: () => {
    return apiClient.get<string[]>('/leaderboard/genius-available-levels')
  },

  getGeniusLevelWeightChanges: (days: number = 7) => {
    return apiClient.get<GeniusLevelWeightChange[]>('/leaderboard/genius-level-weight-changes', {
      params: { days }
    })
  },

  getValueFactorAnalysis: (excludeBothHalf: boolean = false) => {
    return apiClient.get<ValueFactorAnalysisResponse>('/leaderboard/value-factor-analysis', {
      params: { exclude_both_half: excludeBothHalf }
    })
  },

  getValueFactorUserChanges: (options?: {
    sortBy?: 'change' | 'base_value_factor' | 'target_value_factor'
    sortOrder?: 'desc' | 'asc'
    page?: number
    pageSize?: number
    countries?: string[]
    geniusLevels?: string[]
    excludeBothHalf?: boolean
  }) => {
    const params: any = {
      sort_by: options?.sortBy ?? 'change',
      sort_order: options?.sortOrder ?? 'desc',
      page: options?.page ?? 1,
      page_size: options?.pageSize ?? 20,
      exclude_both_half: options?.excludeBothHalf ?? false
    }

    if (options?.countries && options.countries.length > 0) {
      params.countries = options.countries.join(',')
    }
    if (options?.geniusLevels && options.geniusLevels.length > 0) {
      params.genius_levels = options.geniusLevels.join(',')
    }

    return apiClient.get<ValueFactorUserChangePageResponse>('/leaderboard/value-factor-user-changes', { params })
  },

  getCombinedAnalysis: (options?: {
    countries?: string[]
    geniusLevels?: string[]
    excludeAlphaBothZero?: boolean
    excludePowerPoolBothZero?: boolean
    excludeSelectedBothZero?: boolean
  }) => {
    const params: any = {}
    if (options?.countries && options.countries.length > 0) {
      params.countries = options.countries.join(',')
    }
    if (options?.geniusLevels && options.geniusLevels.length > 0) {
      params.levels = options.geniusLevels.join(',')
    }
    params.exclude_alpha_both_zero = options?.excludeAlphaBothZero ?? false
    params.exclude_power_pool_both_zero = options?.excludePowerPoolBothZero ?? false
    params.exclude_selected_both_zero = options?.excludeSelectedBothZero ?? false
    return apiClient.get<CombinedAnalysisResponse>('/leaderboard/combined-analysis', { params })
  },

  getCombinedUserChanges: (options?: {
    sortBy?: 'alpha_change' | 'power_pool_change' | 'selected_change' | 'base_alpha' | 'target_alpha' | 'base_power_pool' | 'target_power_pool' | 'base_selected' | 'target_selected'
    sortOrder?: 'desc' | 'asc'
    page?: number
    pageSize?: number
    countries?: string[]
    geniusLevels?: string[]
    excludeAlphaBothZero?: boolean
    excludePowerPoolBothZero?: boolean
    excludeSelectedBothZero?: boolean
  }) => {
    const params: any = {
      sort_by: options?.sortBy ?? 'alpha_change',
      sort_order: options?.sortOrder ?? 'desc',
      page: options?.page ?? 1,
      page_size: options?.pageSize ?? 20,
      exclude_alpha_both_zero: options?.excludeAlphaBothZero ?? false,
      exclude_power_pool_both_zero: options?.excludePowerPoolBothZero ?? false,
      exclude_selected_both_zero: options?.excludeSelectedBothZero ?? false
    }

    if (options?.countries && options.countries.length > 0) {
      params.countries = options.countries.join(',')
    }
    if (options?.geniusLevels && options.geniusLevels.length > 0) {
      params.levels = options.geniusLevels.join(',')
    }

    return apiClient.get<CombinedUserChangePageResponse>('/leaderboard/combined-user-changes', { params })
  },

  getUserMetricTrends: (user: string) => {
    return apiClient.get<UserMetricTrendResponse>('/leaderboard/user-metric-trends', {
      params: { user }
    })
  }
}


