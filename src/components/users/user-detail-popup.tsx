import { X, User, TrendingUp, ChartBar as BarChart3 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { FilterState, UserInfluenceByCategory } from '../../types/database'
import { useQuery } from '../../hooks/use-query'
import { fetchUserCategoryBreakdown } from '../../lib/queries'
import { formatScore, formatNumber, formatCategory } from '../../lib/utils'
import { getCategoryColor } from '../../lib/chart-colors'
import { LoadingState } from '../shared/loading-state'

interface Props {
  userId: string
  username: string
  influenceScore: number
  followersEst: number
  rankOverall: number
  posts7d: number
  engagementSum7d: number
  filters: FilterState
  onClose: () => void
}

export function UserDetailPopup({
  userId,
  username,
  influenceScore,
  followersEst,
  rankOverall,
  posts7d,
  engagementSum7d,
  filters,
  onClose,
}: Props) {
  const { data, loading } = useQuery(
    () => fetchUserCategoryBreakdown(userId, filters),
    [userId, filters.dateFrom, filters.dateTo, filters.analysisType]
  )

  const breakdown = data?.breakdown ?? []

  const chartData = breakdown
    .reduce<{ category: string; rawCategory: string; influence_score_7d: number }[]>((acc, row) => {
      const existing = acc.find((a) => a.rawCategory === row.category)
      if (existing) {
        existing.influence_score_7d += Number(row.influence_score_7d)
      } else {
        acc.push({
          category: formatCategory(row.category),
          rawCategory: row.category,
          influence_score_7d: Number(row.influence_score_7d),
        })
      }
      return acc
    }, [])
    .sort((a, b) => b.influence_score_7d - a.influence_score_7d)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative bg-card rounded-2xl border shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{username}</h2>
              <p className="text-xs text-muted-foreground">
                Rank #{rankOverall} -- {formatNumber(followersEst)} followers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(85vh-68px)]">
          <div className="grid grid-cols-3 gap-3 p-6 pb-4">
            <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Influence Score" value={formatScore(influenceScore)} />
            <StatCard icon={<BarChart3 className="h-4 w-4" />} label="Engagement (7d)" value={formatScore(engagementSum7d)} />
            <StatCard icon={<BarChart3 className="h-4 w-4" />} label="Posts (7d)" value={String(posts7d)} />
          </div>

          {loading ? (
            <div className="px-6 pb-6">
              <LoadingState message="Loading category breakdown..." />
            </div>
          ) : breakdown.length === 0 ? (
            <div className="px-6 pb-6">
              <p className="text-xs text-muted-foreground text-center py-8">
                No category-level data available for this user.
              </p>
            </div>
          ) : (
            <>
              <div className="px-6 pb-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Influence by Category
                </h3>
                <div className="h-48 -ml-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis
                        dataKey="category"
                        type="category"
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        width={120}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                        formatter={(value) => [formatScore(Number(value)), 'Influence Score']}
                      />
                      <Bar
                        dataKey="influence_score_7d"
                        radius={[0, 4, 4, 0]}
                        name="Influence Score"
                        fill="#0ea5e9"
                      >
                        {chartData.map((entry, idx) => (
                          <Cell key={idx} fill={getCategoryColor(entry.rawCategory, 0)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="px-6 pb-6 pt-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Category Breakdown
                </h3>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Category</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Posts</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Eng Sum</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Avg Eng</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Influence</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Rank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {breakdown.map((row: UserInfluenceByCategory) => (
                        <tr
                          key={`${row.category}-${row.analysis_type}`}
                          className="border-t hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-3 py-2 font-medium">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2 w-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: getCategoryColor(row.category, 0) }}
                              />
                              {formatCategory(row.category)}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${row.analysis_type === 'ai' ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-700'}`}>
                              {row.analysis_type}
                            </span>
                          </td>
                          <td className="px-3 py-2 tabular-nums text-right">{row.posts_7d}</td>
                          <td className="px-3 py-2 tabular-nums text-right">{formatScore(Number(row.engagement_sum_7d))}</td>
                          <td className="px-3 py-2 tabular-nums text-right">{formatScore(Number(row.avg_engagement_7d), 3)}</td>
                          <td className="px-3 py-2 tabular-nums text-right font-medium">{formatScore(Number(row.influence_score_7d))}</td>
                          <td className="px-3 py-2 tabular-nums text-right">#{row.rank_in_category}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded-lg p-3 text-center">
      <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}
