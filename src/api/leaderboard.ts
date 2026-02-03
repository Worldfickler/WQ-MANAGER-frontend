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
  SummaryStatistics
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
  }
}


