import apiClient from './client'
import type {
  BasePaymentDashboardResponse,
  BasePaymentImageUploadResponse,
  BasePaymentLeaderboardResponse,
  BasePaymentMyStatusResponse,
  BasePaymentUploadRequest,
  BasePaymentUploadResponse
} from '@/types/payment'

const getCurrentUserId = (): string => {
  const rawUser = localStorage.getItem('user')
  if (!rawUser) return 'anonymous'

  try {
    const parsed = JSON.parse(rawUser)
    const wqId = String(parsed?.wq_id || '').trim().toUpperCase()
    return wqId || 'anonymous'
  } catch {
    return 'anonymous'
  }
}

const getPageAuthGrantStorageKey = (pageKey: string): string => {
  return `page-auth:grant:${getCurrentUserId()}:${pageKey}`
}

const getBasePaymentAccessGrantToken = (): string | null => {
  const rawCache = sessionStorage.getItem(getPageAuthGrantStorageKey('base-payment'))
  if (!rawCache) return null

  try {
    const parsed = JSON.parse(rawCache) as { access_grant_token?: string; expires_at?: string }
    const token = String(parsed?.access_grant_token || '').trim()
    const expiresAtTs = Date.parse(String(parsed?.expires_at || '').trim())
    if (token && Number.isFinite(expiresAtTs) && expiresAtTs > Date.now()) {
      return token
    }
  } catch {
    // noop
  }

  sessionStorage.removeItem(getPageAuthGrantStorageKey('base-payment'))
  return null
}

const buildBasePaymentAuthHeaders = () => {
  const token = getBasePaymentAccessGrantToken()
  if (!token) return undefined
  return {
    'X-Page-Auth-Grant': token
  }
}

export const paymentApi = {
  getMyTodayStatus: (recordDate?: string) => {
    return apiClient.get<BasePaymentMyStatusResponse>('/base-payment/my-today', {
      params: {
        record_date: recordDate
      },
      headers: buildBasePaymentAuthHeaders()
    })
  },

  uploadMyTodayPayment: (payload: BasePaymentUploadRequest) => {
    return apiClient.post<BasePaymentUploadResponse>('/base-payment/upload', payload, {
      headers: buildBasePaymentAuthHeaders()
    })
  },

  uploadImages: (files: File[], recordDate?: string) => {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append('files', file)
    })
    if (recordDate) {
      formData.append('record_date', recordDate)
    }

    return apiClient.post<BasePaymentImageUploadResponse>('/base-payment/upload-images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...buildBasePaymentAuthHeaders()
      }
    })
  },

  getLeaderboard: (options?: {
    page?: number
    pageSize?: number
    startDate?: string
    endDate?: string
    sortBy?: 'total_payment' | 'regular_payment' | 'super_payment' | 'regular_count' | 'super_count' | 'value_factor' | 'daily_osmosis_rank'
    sortOrder?: 'desc' | 'asc'
  }) => {
    return apiClient.get<BasePaymentLeaderboardResponse>('/base-payment/leaderboard', {
      params: {
        page: options?.page ?? 1,
        page_size: options?.pageSize ?? 50,
        start_date: options?.startDate,
        end_date: options?.endDate,
        sort_by: options?.sortBy ?? 'total_payment',
        sort_order: options?.sortOrder ?? 'desc'
      },
      headers: buildBasePaymentAuthHeaders()
    })
  },

  getDashboard: (recordDate?: string) => {
    return apiClient.get<BasePaymentDashboardResponse>('/base-payment/dashboard', {
      params: {
        record_date: recordDate
      },
      headers: buildBasePaymentAuthHeaders()
    })
  }
}
