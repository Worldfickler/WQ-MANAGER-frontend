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

export interface ValueFactorSummary {
  users_on_target_date: number
  users_on_base_date: number
  comparable_users: number
  new_users: number
  missing_users: number
  increased_users: number
  decreased_users: number
  unchanged_users: number
  avg_target_value_factor: number
  avg_base_value_factor: number
  avg_change: number
  median_change: number
  max_increase: number
  max_decrease: number
}

export interface ValueFactorDimensionItem {
  dimension: string
  comparable_users: number
  avg_target_value_factor: number
  avg_base_value_factor: number
  avg_change: number
  median_change: number
  increased_users: number
  decreased_users: number
  unchanged_users: number
}

export interface ValueFactorUserChangeItem {
  user: string
  country?: string | null
  university?: string | null
  genius_level?: string | null
  base_value_factor: number
  target_value_factor: number
  change: number
}

export interface ValueFactorDistribution {
  labels: string[]
  counts: number[]
}

export interface ValueFactorAnalysisResponse {
  base_record_date: string
  target_record_date: string
  summary: ValueFactorSummary
  by_country: ValueFactorDimensionItem[]
  by_university: ValueFactorDimensionItem[]
  top_gainers: ValueFactorUserChangeItem[]
  top_decliners: ValueFactorUserChangeItem[]
  distribution: ValueFactorDistribution
}

export interface ValueFactorUserChangePageResponse {
  total: number
  page: number
  page_size: number
  items: ValueFactorUserChangeItem[]
}

export interface CombinedSummary {
  users_on_target_date: number
  users_on_base_date: number
  comparable_users: number
  new_users: number
  missing_users: number
}

export interface CombinedMetricSummary {
  metric: string
  display_name: string
  avg_target: number
  avg_base: number
  avg_change: number
  median_change: number
  max_increase: number
  max_decrease: number
  increased_users: number
  decreased_users: number
  unchanged_users: number
}

export interface CombinedDistribution {
  labels: string[]
  counts: number[]
}

export interface CombinedAnalysisResponse {
  base_record_date: string
  target_record_date: string
  summary: CombinedSummary
  metric_summaries: CombinedMetricSummary[]
  distributions: Record<string, CombinedDistribution>
}

export interface CombinedUserChangeItem {
  user: string
  country?: string | null
  genius_level?: string | null
  base_alpha: number
  target_alpha: number
  alpha_change: number
  base_power_pool: number
  target_power_pool: number
  power_pool_change: number
  base_selected: number
  target_selected: number
  selected_change: number
}

export interface CombinedUserChangePageResponse {
  total: number
  page: number
  page_size: number
  items: CombinedUserChangeItem[]
}

export interface ValueFactorTrendPoint {
  update_date: string
  date_range: string
  value_factor: number | null
}

export interface CombinedTrendPoint {
  update_date: string
  date_range: string
  combined_alpha_performance: number | null
  combined_power_pool_alpha_performance: number | null
  combined_selected_alpha_performance: number | null
}

export interface UserMetricTrendResponse {
  user: string
  value_factor_trend: ValueFactorTrendPoint[]
  combined_trend: CombinedTrendPoint[]
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
