import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'
import { format, parseISO } from 'date-fns'
import type { TrendKpiDaily } from '../../types/database'
import { SectionCard } from '../shared/section-card'
import { getCategoryColor } from '../../lib/chart-colors'
import { formatCategory } from '../../lib/utils'

interface Props {
  data: TrendKpiDaily[]
  highlightedCategories?: string[]
}

export function BreakoutScoreChart({ data, highlightedCategories = [] }: Props) {
  const hasHighlight = highlightedCategories.length > 0

  if (hasHighlight) {
    const allCategories = [...new Set(data.map((d) => d.category))]
    const dateMap = new Map<string, Record<string, { sum: number; count: number }>>()

    for (const row of data) {
      if (!dateMap.has(row.date_utc)) dateMap.set(row.date_utc, {})
      const entry = dateMap.get(row.date_utc)!
      if (!entry[row.category]) entry[row.category] = { sum: 0, count: 0 }
      entry[row.category].sum += Number(row.breakout_score)
      entry[row.category].count += 1
    }

    const chartData = [...dateMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, cats]) => {
        const point: Record<string, unknown> = { date }
        for (const cat of allCategories) {
          const c = cats[cat]
          point[cat] = c ? +(c.sum / c.count).toFixed(3) : null
        }
        return point
      })

    return (
      <SectionCard title="Breakout Score Over Time" description="Per-category Z-score -- highlighted categories emphasized">
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
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} width={45} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                labelFormatter={(v) => format(parseISO(v as string), 'MMM d, yyyy')}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v: string) => formatCategory(v)} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
              {allCategories.map((cat, i) => {
                const isHighlighted = highlightedCategories.includes(cat)
                return (
                  <Line
                    key={cat}
                    type="monotone"
                    dataKey={cat}
                    stroke={getCategoryColor(cat, i)}
                    strokeWidth={isHighlighted ? 3.5 : 1.5}
                    strokeOpacity={!isHighlighted ? 0.2 : 1}
                    dot={false}
                    name={cat}
                    connectNulls
                  />
                )
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    )
  }

  const dateMap = new Map<string, { sum: number; count: number }>()
  for (const row of data) {
    const existing = dateMap.get(row.date_utc) ?? { sum: 0, count: 0 }
    existing.sum += Number(row.breakout_score)
    existing.count += 1
    dateMap.set(row.date_utc, existing)
  }

  const chartData = [...dateMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      date,
      breakout_score: +(vals.sum / vals.count).toFixed(3),
    }))

  return (
    <SectionCard title="Breakout Score Over Time" description="Average Z-score intensity across all categories">
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
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} width={45} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
              labelFormatter={(v) => format(parseISO(v as string), 'MMM d, yyyy')}
            />
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="breakout_score" stroke="#f59e0b" strokeWidth={2} dot={false} name="Breakout Score" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  )
}
