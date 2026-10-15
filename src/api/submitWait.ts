import apiClient from './client'
import type { Decision, FeedScope, PageResult, PostStatus, SubmitGroup, SubmitImage, SubmitPost, SubmitStats, SubmitVote, SubmitSticker } from '@/types/submitWait'

const base = '/submit-wait'

export const submitWaitApi = {
  stats: () => apiClient.get<SubmitStats>(`${base}/stats`),
  groups: () => apiClient.get<SubmitGroup[]>(`${base}/groups`),
  stickers: () => apiClient.get<SubmitSticker[]>(`${base}/stickers`),
  createGroup: (name: string) => apiClient.post<SubmitGroup>(`${base}/groups`, { name }),
  joinGroup: (invite_code: string) => apiClient.post<SubmitGroup[]>(`${base}/groups/join`, { invite_code }),
  posts: (params: { scope: FeedScope; group_id?: number; status?: PostStatus; search: string; blocked: string[]; page: number }) =>
    apiClient.get<PageResult<SubmitPost>>(`${base}/posts`, {
      params: { ...params, page_size: 12 },
      paramsSerializer: { indexes: null }
    }),
  post: (id: number) => apiClient.get<SubmitPost>(`${base}/posts/${id}`),
  randomPost: (params: { group_id?: number; blocked: string[]; exclude_id?: number }) =>
    apiClient.get<SubmitPost | null>(`${base}/posts/random`, { params, paramsSerializer: { indexes: null } }),
  create: (payload: { title: string; content: string; anonymous: boolean; group_id: number | null; image_ids: number[] }) =>
    apiClient.post<SubmitPost>(`${base}/posts`, payload),
  upload: (files: File[]) => {
    const data = new FormData()
    files.forEach(file => data.append('files', file))
    return apiClient.post<SubmitImage[]>(`${base}/images`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000
    })
  },
  vote: (id: number, decision: Decision, reason: string, sticker_ids: number[] = []) =>
    apiClient.post<SubmitPost>(`${base}/posts/${id}/votes`, { decision, reason, sticker_ids }),
  watch: (id: number) => apiClient.post<SubmitPost>(`${base}/posts/${id}/watch`),
  votes: (id: number, page = 1) => apiClient.get<PageResult<SubmitVote>>(`${base}/posts/${id}/votes`, { params: { page, page_size: 20 } }),
  flower: (postId: number, voteId: number) =>
    apiClient.put<{ flower_count: number; flowered: boolean }>(`${base}/posts/${postId}/votes/${voteId}/flower`),
  outcome: (id: number, status: 'submitted' | 'held', note: string) =>
    apiClient.patch<SubmitPost>(`${base}/posts/${id}/outcome`, { status, note }),
  remove: (id: number) => apiClient.delete(`${base}/posts/${id}`)
}
