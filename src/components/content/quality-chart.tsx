import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { format, parseISO } from 'date-fns'
import type { ContentKpiDaily } from '../../types/database'
import { SectionCard } from '../shared/section-card'

interface Props {
  data: ContentKpiDaily[]
}

export function QualityChart({ data }: Props) {
  const dateMap = new Map<string, { eqSum: number; vrSum: number; count: number }>()

  for (const row of data) {
    const existing = dateMap.get(row.date_utc) ?? { eqSum: 0, vrSum: 0, count: 0 }
    existing.eqSum += Number(row.engagement_quality_score)
    existing.vrSum += Number(row.viral_ratio)
    existing.count += 1
    dateMap.set(row.date_utc, existing)
  }

  const chartData = [...dateMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      date,
      engagement_quality: +(vals.eqSum / vals.count).toFixed(2),
      viral_ratio: +(vals.vrSum / vals.count).toFixed(4),
    }))

  return (
    <SectionCard title="Quality & Virality Over Time" description="Average engagement quality score and viral ratio">
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
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} width={45} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} width={50} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
              labelFormatter={(v) => format(parseISO(v as string), 'MMM d, yyyy')}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line yAxisId="left" type="monotone" dataKey="engagement_quality" stroke="#0ea5e9" strokeWidth={2} dot={false} name="Eng Quality Score" />
            <Line yAxisId="right" type="monotone" dataKey="viral_ratio" stroke="#10b981" strokeWidth={2} dot={false} name="Viral Ratio" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  )
}
