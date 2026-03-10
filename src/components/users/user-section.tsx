import { useState, useEffect, useMemo, useCallback } from 'react'
import type { FilterState, SelectedUser, UserInfluenceOverall, UserInfluenceByCategory } from '../../types/database'
import { fetchUserInfluenceOverall, fetchUserInfluenceByCategory, buildSelectedUser } from '../../lib/queries'
import { useQuery } from '../../hooks/use-query'
import { OverallRankingTable } from './overall-ranking-table'
import { CategoryRankingTable } from './category-ranking-table'
import { InfluenceChart } from './influence-chart'
import { UserDetailPopup } from './user-detail-popup'
import { LoadingState } from '../shared/loading-state'
import { ErrorState } from '../shared/error-state'
import { EmptyState } from '../shared/empty-state'

interface Props {
  filters: FilterState
  categories: string[]
  selectedUser: SelectedUser | null
  onSelectUser: (user: SelectedUser | null) => void
}

export function UserSection({ filters, categories, selectedUser, onSelectUser }: Props) {
  const [overallLimit, setOverallLimit] = useState(25)
  const [selectedCategory, setSelectedCategory] = useState(categories[0] ?? '')
  const [popupUser, setPopupUser] = useState<UserInfluenceOverall | null>(null)

  useEffect(() => {
    if (categories.length > 0 && !categories.includes(selectedCategory)) {
      setSelectedCategory(categories[0])
    }
  }, [categories, selectedCategory])

  const overallQuery = useQuery(
    () => fetchUserInfluenceOverall(filters, overallLimit),
    [filters.dateFrom, filters.dateTo, filters.analysisType, overallLimit]
  )

  const categoryFilters = useMemo(() => ({
    ...filters,
    categories: [selectedCategory],
  }), [filters, selectedCategory])

  const categoryQuery = useQuery(
    () => fetchUserInfluenceByCategory(categoryFilters, selectedCategory, 25),
    [categoryFilters.dateFrom, categoryFilters.dateTo, categoryFilters.analysisType, selectedCategory]
  )

  const handleUserClick = useCallback(async (row: UserInfluenceOverall | UserInfluenceByCategory) => {
    const overallRow = overallQuery.data?.find((u) => u.user_id === row.user_id)
    if (overallRow) {
      setPopupUser(overallRow)
      const user = await buildSelectedUser(overallRow, filters)
      onSelectUser(user)
    } else {
      setPopupUser({
        window_end_date: row.window_end_date,
        analysis_type: row.analysis_type,
        user_id: row.user_id,
        username: row.username,
        posts_7d: row.posts_7d,
        engagement_sum_7d: Number(row.engagement_sum_7d),
        avg_engagement_7d: Number(row.avg_engagement_7d),
        followers_est: row.followers_est,
        influence_score_7d: Number(row.influence_score_7d),
        rank_overall: 0,
      })
      const user = await buildSelectedUser(
        {
          ...row,
          rank_overall: 0,
          engagement_sum_7d: Number(row.engagement_sum_7d),
          avg_engagement_7d: Number(row.avg_engagement_7d),
          influence_score_7d: Number(row.influence_score_7d),
        },
        filters
      )
      onSelectUser(user)
    }
  }, [overallQuery.data, filters, onSelectUser])

  const handleClosePopup = useCallback(() => {
    setPopupUser(null)
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold tracking-tight">User Influence</h2>
      </div>

      {overallQuery.loading ? (
        <LoadingState message="Loading user rankings..." />
      ) : overallQuery.error ? (
        <ErrorState message={overallQuery.error} onRetry={overallQuery.refetch} />
      ) : !overallQuery.data || overallQuery.data.length === 0 ? (
        <EmptyState message="No user influence data for the selected filters." />
      ) : (
        <>
          <InfluenceChart
            data={overallQuery.data}
            selectedUserId={selectedUser?.user_id}
            onUserClick={handleUserClick}
          />
          <OverallRankingTable
            data={overallQuery.data}
            limit={overallLimit}
            onLimitChange={setOverallLimit}
            selectedUserId={selectedUser?.user_id}
            onUserClick={handleUserClick}
          />
        </>
      )}

      {categoryQuery.loading ? (
        <LoadingState message="Loading category rankings..." />
      ) : categoryQuery.error ? (
        <ErrorState message={categoryQuery.error} onRetry={categoryQuery.refetch} />
      ) : (
        <CategoryRankingTable
          data={categoryQuery.data ?? []}
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          selectedUserId={selectedUser?.user_id}
          onUserClick={handleUserClick}
        />
      )}

      {popupUser && (
        <UserDetailPopup
          userId={popupUser.user_id}
          username={popupUser.username}
          influenceScore={Number(popupUser.influence_score_7d)}
          followersEst={popupUser.followers_est}
          rankOverall={popupUser.rank_overall}
          posts7d={popupUser.posts_7d}
          engagementSum7d={Number(popupUser.engagement_sum_7d)}
          filters={filters}
          onClose={handleClosePopup}
        />
      )}
    </div>
  )
}
