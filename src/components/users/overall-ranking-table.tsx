import type { UserInfluenceOverall } from '../../types/database'
import { KpiTooltip } from '../shared/kpi-tooltip'
import { getKpiDescription } from '../../lib/kpi-dictionary'
import { formatScore, formatNumber } from '../../lib/utils'
import { SectionCard } from '../shared/section-card'

interface Props {
  data: UserInfluenceOverall[]
  limit: number
  onLimitChange: (n: number) => void
}

export function OverallRankingTable({ data, limit, onLimitChange }: Props) {
  const windowDate = data[0]?.window_end_date ?? '-'

  return (
    <SectionCard
      title="Overall User Influence (7-day)"
      description={`Window ending: ${windowDate}`}
      headerAction={
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Top</span>
          {[10, 25, 50].map((n) => (
            <button
              key={n}
              onClick={() => onLimitChange(n)}
              className={`h-7 px-2.5 text-xs rounded-md border transition-colors cursor-pointer ${limit === n ? 'bg-foreground text-background border-foreground' : 'hover:bg-muted'}`}
            >
              {n}
            </button>
          ))}
        </div>
      }
    >
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50">
              {[
                { key: 'rank_overall', label: 'Rank' },
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
                <td className="px-3 py-2 tabular-nums font-medium">{row.rank_overall}</td>
                <td className="px-3 py-2 font-medium">{row.username}</td>
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
    </SectionCard>
  )
}
