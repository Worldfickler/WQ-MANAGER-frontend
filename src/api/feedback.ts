import apiClient from './client'

export interface FeedbackRequest {
  content: string
  feedback_type: 'bug' | 'optimize' | 'request'
  page?: string
  contact?: string
}

export interface FeedbackResponse {
  success: boolean
  message: string
}

export const feedbackApi = {
  submitFeedback: (payload: FeedbackRequest) => {
    return apiClient.post<FeedbackResponse>('/feedback', payload)
  }
}
