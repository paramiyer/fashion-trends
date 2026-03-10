export interface TrendKpiDaily {
  id: number
  date_utc: string
  category: string
  analysis_type: 'heuristic' | 'ai'
  trend_name: string
  post_count: number
  unique_authors: number
  engagement_score_sum: number
  engagement_score_avg: number
  shares_sum: number
  breakout_score: number
  threshold_hit: boolean
  breakout_days_30d: number
  breakout_streak: number
  longest_breakout_streak: number
  time_to_breakout_days: number | null
  post_growth_7d: number
  engagement_growth_7d: number
  author_concentration_top10: number
  novelty_score_7d: number
  stability_score_14d: number
  trend_health_index: number
}

export interface ContentKpiDaily {
  id: number
  date_utc: string
  category: string
  analysis_type: 'heuristic' | 'ai'
  posts_count: number
  likes_sum: number
  comments_sum: number
  shares_sum: number
  saves_sum: number
  views_sum: number
  followers_sum: number
  engagement_sum: number
  like_rate_per_1k: number
  comment_rate_per_1k: number
  share_rate_per_1k: number
  save_rate_per_1k: number
  engagement_quality_score: number
  viral_ratio: number
}

export interface UserInfluenceOverall {
  window_end_date: string
  analysis_type: 'heuristic' | 'ai'
  user_id: string
  username: string
  posts_7d: number
  engagement_sum_7d: number
  avg_engagement_7d: number
  followers_est: number
  influence_score_7d: number
  rank_overall: number
}

export interface UserInfluenceByCategory {
  window_end_date: string
  category: string
  analysis_type: 'heuristic' | 'ai'
  user_id: string
  username: string
  posts_7d: number
  engagement_sum_7d: number
  avg_engagement_7d: number
  followers_est: number
  influence_score_7d: number
  rank_in_category: number
}

export interface FilterState {
  dateFrom: string
  dateTo: string
  categories: string[]
  analysisType: 'all' | 'heuristic' | 'ai'
}
