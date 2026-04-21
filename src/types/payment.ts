export interface BasePaymentUploadRequest {
  record_date?: string
  anonymity: 0 | 1
  regular_payment: number
  super_payment: number
  regular_count?: number
  super_count?: number
  picture?: string
  pictures?: string[]
  value_factor?: number
  daily_osmosis_rank?: number
}

export interface BasePaymentRecord {
  record_date: string
  wq_id: string
  display_wq_id: string
  anonymity: number
  regular_payment: number | null
  super_payment: number | null
  total_payment: number | null
  regular_count: number | null
  super_count: number | null
  picture: string | null
  pictures: string[]
  picture_urls: string[]
  value_factor: number | null
  daily_osmosis_rank: number | null
  is_owner: boolean
}

export interface BasePaymentImageUploadItem {
  file_name: string
  object_name: string
  content_type: string
  size: number
  url: string
}

export interface BasePaymentImageUploadResponse {
  success: boolean
  message: string
  items: BasePaymentImageUploadItem[]
}

export interface BasePaymentUploadResponse {
  success: boolean
  message: string
  data: BasePaymentRecord
}

export interface BasePaymentMyStatusResponse {
  has_uploaded_for_date: boolean
  record_date: string
  data: BasePaymentRecord | null
  consultant_defaults?: BasePaymentConsultantDefaults | null
}

export interface BasePaymentConsultantDefaults {
  record_date: string
  value_factor: number | null
  daily_osmosis_rank: number | null
}

export interface BasePaymentLeaderboardItem extends BasePaymentRecord {
  rank: number
}

export interface BasePaymentLeaderboardResponse {
  record_date: string
  start_date?: string | null
  end_date?: string | null
  sort_by?: 'total_payment' | 'regular_payment' | 'super_payment' | 'regular_count' | 'super_count' | 'value_factor' | 'daily_osmosis_rank'
  sort_order?: 'desc' | 'asc'
  total: number
  page: number
  page_size: number
  items: BasePaymentLeaderboardItem[]
}

export interface BasePaymentDashboardTopItem {
  rank: number
  display_wq_id: string
  total_payment: number | null
  regular_payment: number | null
  super_payment: number | null
  value_factor: number | null
  daily_osmosis_rank: number | null
}

export interface BasePaymentDashboardOverview {
  participant_count: number
  total_payment_sum: number
  regular_payment_sum: number
  super_payment_sum: number
  regular_share_pct: number
  super_share_pct: number
  average_total_payment: number | null
  max_total_payment: number | null
  min_total_payment: number | null
  positive_count: number
  negative_count: number
  flat_count: number
  positive_rate_pct: number
  anonymity_count: number
  anonymity_rate_pct: number
  picture_count: number
  picture_rate_pct: number
  average_regular_count: number | null
  average_super_count: number | null
  average_value_factor: number | null
  average_daily_osmosis_rank: number | null
}

export interface BasePaymentDashboardResponse {
  record_date: string
  overview: BasePaymentDashboardOverview
  top_performers: BasePaymentDashboardTopItem[]
}
