import type { TrendKpiDaily } from '../../types/database'
import { DataTable, type Column } from '../shared/data-table'
import { SectionCard } from '../shared/section-card'
import { formatCategory, formatScore } from '../../lib/utils'

interface Props {
  data: TrendKpiDaily[]
}

const columns: Column<TrendKpiDaily>[] = [
  { key: 'date_utc', label: 'Date' },
  { key: 'category', label: 'Category', render: (r) => formatCategory(r.category) },
  { key: 'trend_name', label: 'Trend' },
  { key: 'analysis_type', label: 'Type' },
  { key: 'post_count', label: 'Posts', align: 'right' },
  { key: 'unique_authors', label: 'Authors', align: 'right' },
  { key: 'engagement_score_sum', label: 'Eng Sum', align: 'right', render: (r) => formatScore(Number(r.engagement_score_sum)) },
  { key: 'engagement_score_avg', label: 'Eng Avg', align: 'right', render: (r) => formatScore(Number(r.engagement_score_avg), 3) },
  { key: 'shares_sum', label: 'Shares', align: 'right' },
  { key: 'breakout_score', label: 'Breakout', align: 'right', render: (r) => formatScore(Number(r.breakout_score), 3) },
  { key: 'threshold_hit', label: 'Threshold', render: (r) => r.threshold_hit ? 'Yes' : 'No' },
  { key: 'breakout_days_30d', label: 'BO Days', align: 'right' },
  { key: 'breakout_streak', label: 'Streak', align: 'right' },
  { key: 'longest_breakout_streak', label: 'Max Streak', align: 'right' },
  { key: 'time_to_breakout_days', label: 'Time BO', align: 'right', render: (r) => r.time_to_breakout_days != null ? String(r.time_to_breakout_days) : '-' },
  { key: 'post_growth_7d', label: 'Post Gr 7d', align: 'right', render: (r) => formatScore(Number(r.post_growth_7d), 4) },
  { key: 'engagement_growth_7d', label: 'Eng Gr 7d', align: 'right', render: (r) => formatScore(Number(r.engagement_growth_7d), 4) },
  { key: 'author_concentration_top10', label: 'Author Conc', align: 'right', render: (r) => formatScore(Number(r.author_concentration_top10), 4) },
  { key: 'novelty_score_7d', label: 'Novelty', align: 'right', render: (r) => formatScore(Number(r.novelty_score_7d), 4) },
  { key: 'stability_score_14d', label: 'Stability', align: 'right', render: (r) => formatScore(Number(r.stability_score_14d), 4) },
  { key: 'trend_health_index', label: 'Health Idx', align: 'right', render: (r) => formatScore(Number(r.trend_health_index)) },
]

export function TrendTable({ data }: Props) {
  return (
    <SectionCard title="Trend KPI Detail Table" description="All columns with sorting and tooltips">
      <DataTable columns={columns} data={data} />
    </SectionCard>
  )
}
