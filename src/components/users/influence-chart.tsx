import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { UserInfluenceOverall } from '../../types/database'
import { SectionCard } from '../shared/section-card'

interface Props {
  data: UserInfluenceOverall[]
  selectedUserId?: string | null
  onUserClick?: (row: UserInfluenceOverall) => void
}

export function InfluenceChart({ data, selectedUserId, onUserClick }: Props) {
  const top10 = data.slice(0, 10)

  const chartData = top10.map((row, i) => ({
    username: row.username || row.user_id || `#${i + 1}`,
    influence_score_7d: Number(row.influence_score_7d),
    _index: i,
  }))

  return (
    <SectionCard title="Top 10 Users by Influence Score" description="7-day trailing influence score -- click a bar to view details">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis dataKey="username" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={110} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
              formatter={(value) => [Number(value).toFixed(2), 'Influence Score']}
            />
            <Bar
              dataKey="influence_score_7d"
              radius={[0, 4, 4, 0]}
              name="Influence Score"
              onClick={(_data: unknown, index: number) => {
                if (onUserClick && top10[index]) {
                  onUserClick(top10[index])
                }
              }}
              style={{ cursor: onUserClick ? 'pointer' : undefined }}
            >
              {chartData.map((entry) => {
                const row = top10[entry._index]
                const isSelected = selectedUserId && row?.user_id === selectedUserId
                return (
                  <Cell
                    key={entry._index}
                    fill={isSelected ? '#0284c7' : '#0ea5e9'}
                    stroke={isSelected ? '#0369a1' : 'none'}
                    strokeWidth={isSelected ? 2 : 0}
                    opacity={selectedUserId && !isSelected ? 0.5 : 1}
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
