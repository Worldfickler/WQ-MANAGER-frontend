export interface SummaryStatistics {
  total_users: number
  user_change: number
  total_alpha: number
  alpha_change: number
  total_weight: number
  weight_change: number
  total_records: number
  latest_record_date?: string | null
}

export interface CountryWeightData {
  record_date: string
  country: string
  weight_factor: number | null
  user: number | null
  value_factor: number | null
  submissions_count: number | null
  weight_change?: number | null
  weight_change_percent?: number | null
}

export interface CountryWeightTimeSeries {
  country: string
  dates: string[]
  weights: number[]
}

export interface CountrySubmissionTimeSeries {
  country: string
  dates: string[]
  submissions_count: number[]
  super_alpha_submissions_count: number[]
  submissions_change: number[]
  super_alpha_submissions_change: number[]
}


export interface GeniusCountryTimeSeries {
  country: string
  dates: string[]
  alpha_count_change: number[]
}

export interface GeniusWeightTimeSeries {
  genius_level: string
  country: string
  dates: string[]
  weights: number[]
}

export interface GeniusUserWeightChange {
  user: string
  genius_level?: string | null
  country?: string | null
  start_weight: number
  end_weight: number
  weight_change: number
  weight_change_percent?: number | null
  rank: number
  percentile: number
}

export interface UserWeightTimeSeries {
  user: string
  dates: string[]
  weights: number[]
}

export interface GeniusLevelWeightChange {
  genius_level: string
  total_users: number
  total_weight: number
  weight_change: number
  weight_change_percent?: number | null
}


export interface UserWeightData {
  record_date: string
  user: string
  weight_factor: number | null
  value_factor: number | null
  submissions_count: number | null
  university: string | null
  country: string | null
  weight_change?: number | null
  weight_change_percent?: number | null
}
