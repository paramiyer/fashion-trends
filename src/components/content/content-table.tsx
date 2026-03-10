import { useCallback } from 'react'
import type { ContentKpiDaily } from '../../types/database'
import { DataTable, type Column } from '../shared/data-table'
import { SectionCard } from '../shared/section-card'
import { formatCategory, formatScore, formatNumber } from '../../lib/utils'

interface Props {
  data: ContentKpiDaily[]
  highlightedCategories?: string[]
}

const columns: Column<ContentKpiDaily>[] = [
  { key: 'date_utc', label: 'Date' },
  { key: 'category', label: 'Category', render: (r) => formatCategory(r.category) },
  { key: 'analysis_type', label: 'Type' },
  { key: 'posts_count', label: 'Posts', align: 'right' },
  { key: 'likes_sum', label: 'Likes', align: 'right', render: (r) => formatNumber(Number(r.likes_sum)) },
  { key: 'comments_sum', label: 'Comments', align: 'right', render: (r) => formatNumber(Number(r.comments_sum)) },
  { key: 'shares_sum', label: 'Shares', align: 'right', render: (r) => formatNumber(Number(r.shares_sum)) },
  { key: 'saves_sum', label: 'Saves', align: 'right', render: (r) => formatNumber(Number(r.saves_sum)) },
  { key: 'views_sum', label: 'Views', align: 'right', render: (r) => formatNumber(Number(r.views_sum)) },
  { key: 'followers_sum', label: 'Followers', align: 'right', render: (r) => formatNumber(Number(r.followers_sum)) },
  { key: 'engagement_sum', label: 'Eng Sum', align: 'right', render: (r) => formatScore(Number(r.engagement_sum)) },
  { key: 'like_rate_per_1k', label: 'Like /1K', align: 'right', render: (r) => formatScore(Number(r.like_rate_per_1k)) },
  { key: 'comment_rate_per_1k', label: 'Cmnt /1K', align: 'right', render: (r) => formatScore(Number(r.comment_rate_per_1k)) },
  { key: 'share_rate_per_1k', label: 'Share /1K', align: 'right', render: (r) => formatScore(Number(r.share_rate_per_1k)) },
  { key: 'save_rate_per_1k', label: 'Save /1K', align: 'right', render: (r) => formatScore(Number(r.save_rate_per_1k)) },
  { key: 'engagement_quality_score', label: 'Eng Quality', align: 'right', render: (r) => formatScore(Number(r.engagement_quality_score)) },
  { key: 'viral_ratio', label: 'Viral', align: 'right', render: (r) => formatScore(Number(r.viral_ratio), 4) },
]

export function ContentTable({ data, highlightedCategories = [] }: Props) {
  const hasHighlight = highlightedCategories.length > 0

  const rowClassName = useCallback(
    (row: ContentKpiDaily) => {
      if (!hasHighlight) return 'hover:bg-muted/30'
      const isMatch = highlightedCategories.includes(row.category)
      return isMatch
        ? 'bg-primary/6 hover:bg-primary/10 border-l-2 border-l-primary'
        : 'opacity-50 hover:bg-muted/30'
    },
    [hasHighlight, highlightedCategories]
  )

  return (
    <SectionCard title="Content KPI Detail Table" description="All columns with sorting and tooltips">
      <DataTable columns={columns} data={data} rowClassName={hasHighlight ? rowClassName : undefined} />
    </SectionCard>
  )
}
