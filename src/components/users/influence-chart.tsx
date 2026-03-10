import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { UserInfluenceOverall } from '../../types/database'
import { SectionCard } from '../shared/section-card'

interface Props {
  data: UserInfluenceOverall[]
}

export function InfluenceChart({ data }: Props) {
  const top10 = data
    .slice(0, 10)
    .map((row, i) => ({
      username: row.username || row.user_id || `#${i + 1}`,
      influence_score_7d: Number(row.influence_score_7d),
    }))

  return (
    <SectionCard title="Top 10 Users by Influence Score" description="7-day trailing influence score">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top10} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis dataKey="username" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={110} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
              formatter={(value) => [Number(value).toFixed(2), 'Influence Score']}
            />
            <Bar dataKey="influence_score_7d" fill="#0ea5e9" radius={[0, 4, 4, 0]} name="Influence Score" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  )
}
