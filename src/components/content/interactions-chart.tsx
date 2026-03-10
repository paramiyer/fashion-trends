import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { format, parseISO } from 'date-fns'
import type { ContentKpiDaily } from '../../types/database'
import { SectionCard } from '../shared/section-card'

interface Props {
  data: ContentKpiDaily[]
  highlightedCategories?: string[]
}

export function InteractionsChart({ data, highlightedCategories = [] }: Props) {
  const hasHighlight = highlightedCategories.length > 0
  const dateMap = new Map<string, { likes: number; comments: number; shares: number; saves: number }>()
  const highlightMap = new Map<string, { likes: number; comments: number; shares: number; saves: number }>()

  for (const row of data) {
    const existing = dateMap.get(row.date_utc) ?? { likes: 0, comments: 0, shares: 0, saves: 0 }
    existing.likes += Number(row.likes_sum)
    existing.comments += Number(row.comments_sum)
    existing.shares += Number(row.shares_sum)
    existing.saves += Number(row.saves_sum)
    dateMap.set(row.date_utc, existing)

    if (hasHighlight && highlightedCategories.includes(row.category)) {
      const hExisting = highlightMap.get(row.date_utc) ?? { likes: 0, comments: 0, shares: 0, saves: 0 }
      hExisting.likes += Number(row.likes_sum)
      hExisting.comments += Number(row.comments_sum)
      hExisting.shares += Number(row.shares_sum)
      hExisting.saves += Number(row.saves_sum)
      highlightMap.set(row.date_utc, hExisting)
    }
  }

  const chartData = [...dateMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => {
      const hVals = highlightMap.get(date)
      return {
        date,
        ...vals,
        ...(hasHighlight && hVals ? {
          h_likes: hVals.likes,
          h_comments: hVals.comments,
          h_shares: hVals.shares,
          h_saves: hVals.saves,
        } : {}),
      }
    })

  return (
    <SectionCard
      title="Interactions Over Time"
      description={hasHighlight ? 'Bold lines = selected user categories, faded = all categories' : 'Aggregated likes, comments, shares, and saves by day'}
    >
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickFormatter={(v: string) => format(parseISO(v), 'MMM d')}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} width={55} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
              labelFormatter={(v) => format(parseISO(v as string), 'MMM d, yyyy')}
              formatter={(value) => Number(value).toLocaleString()}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="likes" stroke="#0ea5e9" strokeWidth={hasHighlight ? 1 : 2} strokeOpacity={hasHighlight ? 0.3 : 1} dot={false} name="Likes (all)" />
            <Line type="monotone" dataKey="comments" stroke="#10b981" strokeWidth={hasHighlight ? 1 : 2} strokeOpacity={hasHighlight ? 0.3 : 1} dot={false} name="Comments (all)" />
            <Line type="monotone" dataKey="shares" stroke="#f59e0b" strokeWidth={hasHighlight ? 1 : 2} strokeOpacity={hasHighlight ? 0.3 : 1} dot={false} name="Shares (all)" />
            <Line type="monotone" dataKey="saves" stroke="#ef4444" strokeWidth={hasHighlight ? 1 : 2} strokeOpacity={hasHighlight ? 0.3 : 1} dot={false} name="Saves (all)" />
            {hasHighlight && (
              <>
                <Line type="monotone" dataKey="h_likes" stroke="#0ea5e9" strokeWidth={3} dot={false} name="Likes (selected)" connectNulls />
                <Line type="monotone" dataKey="h_comments" stroke="#10b981" strokeWidth={3} dot={false} name="Comments (selected)" connectNulls />
                <Line type="monotone" dataKey="h_shares" stroke="#f59e0b" strokeWidth={3} dot={false} name="Shares (selected)" connectNulls />
                <Line type="monotone" dataKey="h_saves" stroke="#ef4444" strokeWidth={3} dot={false} name="Saves (selected)" connectNulls />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  )
}
