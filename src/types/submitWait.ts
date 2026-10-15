export type Decision = 'submit' | 'hold'
export type PostStatus = 'open' | 'submitted' | 'held'
export type FeedScope = 'all' | 'mine' | 'reviewed' | 'watched'

export interface SubmitImage {
  id: number
  url: string
}

export interface SubmitGroup {
  id: number
  name: string
  invite_code: string
  member_count: number
}

export interface SubmitPost {
  id: number
  title: string
  content: string
  anonymous: boolean
  author_name: string
  is_owner: boolean
  group_id: number | null
  group_name: string | null
  status: PostStatus
  outcome_note: string
  created_at: string
  closed_at: string | null
  images: SubmitImage[]
  review_count: number
  watch_count: number
  has_watched: boolean
  results_visible: boolean
  submit_count: number | null
  hold_count: number | null
  my_decision: Decision | null
}

export interface SubmitSticker {
  id: number
  name: string
  url: string
  width: number
  height: number
}

export interface SubmitVote {
  id: number
  reviewer_name: string
  decision: Decision
  reason: string
  created_at: string
  is_mine: boolean
  flower_count: number
  flowered: boolean
  stickers: SubmitSticker[]
}

export interface SubmitStats {
  posts: number
  reviewed: number
  submitted: number
  held: number
}

export interface PageResult<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}
