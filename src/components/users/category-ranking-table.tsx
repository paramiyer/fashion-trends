import type { UserInfluenceByCategory } from '../../types/database'
import { KpiTooltip } from '../shared/kpi-tooltip'
import { getKpiDescription } from '../../lib/kpi-dictionary'
import { formatScore, formatNumber, formatCategory } from '../../lib/utils'
import { SectionCard } from '../shared/section-card'
import { EmptyState } from '../shared/empty-state'

interface Props {
  data: UserInfluenceByCategory[]
  categories: string[]
  selectedCategory: string
  onCategoryChange: (cat: string) => void
}

export function CategoryRankingTable({ data, categories, selectedCategory, onCategoryChange }: Props) {
  const windowDate = data[0]?.window_end_date ?? '-'

  return (
    <SectionCard
      title="User Influence by Category (7-day)"
      description={`Window ending: ${windowDate}`}
      headerAction={
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="h-8 px-2.5 text-xs border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>{formatCategory(cat)}</option>
          ))}
        </select>
      }
    >
      {data.length === 0 ? (
        <EmptyState message="No data for this category in the selected date range." />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50">
                {[
                  { key: 'rank_in_category', label: 'Rank' },
                  { key: 'username', label: 'Username' },
                  { key: 'analysis_type', label: 'Type' },
                  { key: 'posts_7d', label: 'Posts 7d' },
                  { key: 'engagement_sum_7d', label: 'Eng Sum 7d' },
                  { key: 'avg_engagement_7d', label: 'Avg Eng 7d' },
                  { key: 'followers_est', label: 'Followers' },
                  { key: 'influence_score_7d', label: 'Influence Score' },
                ].map((col) => {
                  const desc = getKpiDescription(col.key)
                  return (
                    <th key={col.key} className="px-3 py-2.5 font-medium text-muted-foreground text-left whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        {col.label}
                        {desc && <KpiTooltip description={desc} />}
                      </span>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={`${row.user_id}-${row.analysis_type}`} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 tabular-nums font-medium">{row.rank_in_category}</td>
                  <td className="px-3 py-2 font-medium">{row.username || row.user_id || '-'}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${row.analysis_type === 'ai' ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-700'}`}>
                      {row.analysis_type}
                    </span>
                  </td>
                  <td className="px-3 py-2 tabular-nums text-right">{row.posts_7d}</td>
                  <td className="px-3 py-2 tabular-nums text-right">{formatScore(Number(row.engagement_sum_7d))}</td>
                  <td className="px-3 py-2 tabular-nums text-right">{formatScore(Number(row.avg_engagement_7d), 3)}</td>
                  <td className="px-3 py-2 tabular-nums text-right">{formatNumber(row.followers_est)}</td>
                  <td className="px-3 py-2 tabular-nums text-right font-medium">{formatScore(Number(row.influence_score_7d))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  )
}
