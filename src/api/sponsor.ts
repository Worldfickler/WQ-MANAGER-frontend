import apiClient from './client'
import type { SponsorDonorListResponse } from '@/types/sponsor'

export const sponsorApi = {
  getDonors: () => apiClient.get<SponsorDonorListResponse>('/sponsor/donors')
}
