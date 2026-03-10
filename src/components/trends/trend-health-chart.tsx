import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { format, parseISO } from 'date-fns'
import type { TrendKpiDaily } from '@/types/database'
import { SectionCard } from '@/components/shared/section-card'
import { getCategoryColor } from '@/lib/chart-colors'
import { formatCategory } from '@/lib/utils'

interface Props {
  data: TrendKpiDaily[]
}

export function TrendHealthChart({ data }: Props) {
  const categories = [...new Set(data.map((d) => d.category))]
  const dateMap = new Map<string, Record<string, { sum: number; count: number }>>()

  for (const row of data) {
    if (!dateMap.has(row.date_utc)) dateMap.set(row.date_utc, {})
    const entry = dateMap.get(row.date_utc)!
    if (!entry[row.category]) entry[row.category] = { sum: 0, count: 0 }
    entry[row.category].sum += Number(row.trend_health_index)
    entry[row.category].count += 1
  }

  const chartData = [...dateMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cats]) => {
      const point: Record<string, unknown> = { date }
      for (const cat of categories) {
        const c = cats[cat]
        point[cat] = c ? +(c.sum / c.count).toFixed(2) : null
      }
      return point
    })

  return (
    <SectionCard title="Trend Health Index Over Time" description="Average per category per day">
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
            {categories.map((cat, i) => (
              <Line
                key={cat}
                type="monotone"
                dataKey={cat}
                stroke={getCategoryColor(cat, i)}
                strokeWidth={2}
                dot={false}
                name={cat}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  )
}
