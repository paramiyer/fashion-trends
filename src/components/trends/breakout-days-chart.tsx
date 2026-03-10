import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { TrendKpiDaily } from '../../types/database'
import { SectionCard } from '../shared/section-card'
import { formatCategory } from '../../lib/utils'
import { getCategoryColor } from '../../lib/chart-colors'

interface Props {
  data: TrendKpiDaily[]
  highlightedCategories?: string[]
}

export function BreakoutDaysChart({ data, highlightedCategories = [] }: Props) {
  const hasHighlight = highlightedCategories.length > 0
  const latestDate = data.reduce((max, r) => (r.date_utc > max ? r.date_utc : max), '')
  const latestData = data.filter((r) => r.date_utc === latestDate)

  const categoryMap = new Map<string, number>()
  for (const row of latestData) {
    categoryMap.set(row.category, (categoryMap.get(row.category) ?? 0) + row.breakout_days_30d)
  }

  const chartData = [...categoryMap.entries()]
    .map(([rawCategory, breakout_days_30d]) => ({
      category: formatCategory(rawCategory),
      rawCategory,
      breakout_days_30d,
    }))
    .sort((a, b) => b.breakout_days_30d - a.breakout_days_30d)

  return (
    <SectionCard title="Breakout Days (30d) by Category" description={`Latest date: ${latestDate}`}>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis dataKey="category" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={130} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
            <Bar dataKey="breakout_days_30d" radius={[0, 4, 4, 0]} name="Breakout Days">
              {chartData.map((entry, i) => {
                const isHighlighted = highlightedCategories.includes(entry.rawCategory)
                return (
                  <Cell
                    key={i}
                    fill={hasHighlight ? getCategoryColor(entry.rawCategory, i) : '#0ea5e9'}
                    opacity={hasHighlight && !isHighlighted ? 0.25 : 1}
                    stroke={hasHighlight && isHighlighted ? getCategoryColor(entry.rawCategory, i) : 'none'}
                    strokeWidth={hasHighlight && isHighlighted ? 2 : 0}
                  />
                )
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  )
}
