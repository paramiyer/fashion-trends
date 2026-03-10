export interface KpiDefinition {
  key: string
  label: string
  description: string
  section: 'trend' | 'content' | 'user_overall' | 'user_category'
}

export const kpiDictionary: KpiDefinition[] = [
  { key: 'post_count', label: 'Post Count', description: 'Number of posts in the trend cluster for that day.', section: 'trend' },
  { key: 'unique_authors', label: 'Unique Authors', description: 'Number of distinct users posting in that trend that day.', section: 'trend' },
  { key: 'engagement_score_sum', label: 'Engagement Score Sum', description: 'Total normalized engagement for the trend that day.', section: 'trend' },
  { key: 'engagement_score_avg', label: 'Engagement Score Avg', description: 'Average normalized engagement per post for the trend that day.', section: 'trend' },
  { key: 'shares_sum', label: 'Shares Sum', description: 'Total shares for trend posts that day (horizon-based shares).', section: 'trend' },
  { key: 'breakout_score', label: 'Breakout Score', description: 'Z-score style breakout intensity vs recent baseline.', section: 'trend' },
  { key: 'threshold_hit', label: 'Threshold Hit', description: 'True when breakout condition was met.', section: 'trend' },
  { key: 'breakout_days_30d', label: 'Breakout Days 30d', description: 'Count of days in last 30 days where threshold_hit=true.', section: 'trend' },
  { key: 'breakout_streak', label: 'Breakout Streak', description: 'Current consecutive days of threshold_hit=true.', section: 'trend' },
  { key: 'longest_breakout_streak', label: 'Longest Breakout Streak', description: 'Maximum consecutive breakout streak observed up to that day.', section: 'trend' },
  { key: 'time_to_breakout_days', label: 'Time to Breakout', description: 'Days from first breakout occurrence reference point.', section: 'trend' },
  { key: 'post_growth_7d', label: 'Post Growth 7d', description: '7-day growth rate of post count.', section: 'trend' },
  { key: 'engagement_growth_7d', label: 'Engagement Growth 7d', description: '7-day growth rate of engagement sum.', section: 'trend' },
  { key: 'author_concentration_top10', label: 'Author Concentration Top 10', description: 'Share of engagement driven by top 10 authors (higher = more concentrated).', section: 'trend' },
  { key: 'novelty_score_7d', label: 'Novelty Score 7d', description: 'Share of authors considered new in the recent 7-day context.', section: 'trend' },
  { key: 'stability_score_14d', label: 'Stability Score 14d', description: 'Inverse volatility proxy from 14-day share variability.', section: 'trend' },
  { key: 'trend_health_index', label: 'Trend Health Index', description: 'Composite trend score using breakout + growth + novelty.', section: 'trend' },
  { key: 'posts_count', label: 'Posts Count', description: 'Number of posts in that category/day.', section: 'content' },
  { key: 'likes_sum', label: 'Likes Sum', description: 'Total likes for category/day.', section: 'content' },
  { key: 'comments_sum', label: 'Comments Sum', description: 'Total comments for category/day.', section: 'content' },
  { key: 'content_shares_sum', label: 'Shares Sum', description: 'Total shares for category/day.', section: 'content' },
  { key: 'saves_sum', label: 'Saves Sum', description: 'Total saves for category/day.', section: 'content' },
  { key: 'views_sum', label: 'Views Sum', description: 'Total views for category/day.', section: 'content' },
  { key: 'followers_sum', label: 'Followers Sum', description: 'Sum of follower baselines used for normalization.', section: 'content' },
  { key: 'engagement_sum', label: 'Engagement Sum', description: 'Sum of normalized engagement scores.', section: 'content' },
  { key: 'like_rate_per_1k', label: 'Like Rate /1K', description: 'Likes per 1,000 followers.', section: 'content' },
  { key: 'comment_rate_per_1k', label: 'Comment Rate /1K', description: 'Comments per 1,000 followers.', section: 'content' },
  { key: 'share_rate_per_1k', label: 'Share Rate /1K', description: 'Shares per 1,000 followers.', section: 'content' },
  { key: 'save_rate_per_1k', label: 'Save Rate /1K', description: 'Saves per 1,000 followers.', section: 'content' },
  { key: 'engagement_quality_score', label: 'Engagement Quality Score', description: 'Weighted quality engagement normalized by followers.', section: 'content' },
  { key: 'viral_ratio', label: 'Viral Ratio', description: 'Fraction of posts in top engagement percentile.', section: 'content' },
  { key: 'posts_7d', label: 'Posts 7d', description: "User's posts in trailing 7-day window.", section: 'user_overall' },
  { key: 'engagement_sum_7d', label: 'Engagement Sum 7d', description: 'Sum of normalized engagement in trailing 7 days.', section: 'user_overall' },
  { key: 'avg_engagement_7d', label: 'Avg Engagement 7d', description: 'Average normalized engagement in trailing 7 days.', section: 'user_overall' },
  { key: 'followers_est', label: 'Followers Est', description: 'Estimated follower baseline used in score.', section: 'user_overall' },
  { key: 'influence_score_7d', label: 'Influence Score 7d', description: 'engagement_sum_7d * ln(1 + followers_est).', section: 'user_overall' },
  { key: 'rank_overall', label: 'Rank Overall', description: 'User rank among all users for that window_end_date.', section: 'user_overall' },
  { key: 'rank_in_category', label: 'Rank in Category', description: 'User rank within category for that window_end_date.', section: 'user_category' },
]

export function getKpiDescription(key: string): string {
  return kpiDictionary.find((k) => k.key === key)?.description ?? ''
}
