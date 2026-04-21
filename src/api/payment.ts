import apiClient from './client'
import type {
  BasePaymentDashboardResponse,
  BasePaymentImageUploadResponse,
  BasePaymentLeaderboardResponse,
  BasePaymentMyStatusResponse,
  BasePaymentUploadRequest,
  BasePaymentUploadResponse
} from '@/types/payment'

export const paymentApi = {
  getMyTodayStatus: (recordDate?: string) => {
    return apiClient.get<BasePaymentMyStatusResponse>('/base-payment/my-today', {
      params: {
        record_date: recordDate
      }
    })
  },

  uploadMyTodayPayment: (payload: BasePaymentUploadRequest) => {
    return apiClient.post<BasePaymentUploadResponse>('/base-payment/upload', payload)
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
        'Content-Type': 'multipart/form-data'
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
      }
    })
  },

  getDashboard: (recordDate?: string) => {
    return apiClient.get<BasePaymentDashboardResponse>('/base-payment/dashboard', {
      params: {
        record_date: recordDate
      }
    })
  }
}
