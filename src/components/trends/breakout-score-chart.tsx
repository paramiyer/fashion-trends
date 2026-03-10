import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { format, parseISO } from 'date-fns'
import type { TrendKpiDaily } from '../../types/database'
import { SectionCard } from '../shared/section-card'

interface Props {
  data: TrendKpiDaily[]
}

export function BreakoutScoreChart({ data }: Props) {
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
