import { useState, useMemo } from 'react'
import type { FilterState } from '../../types/database'
import { fetchUserInfluenceOverall, fetchUserInfluenceByCategory } from '../../lib/queries'
import { useQuery } from '../../hooks/use-query'
import { OverallRankingTable } from './overall-ranking-table'
import { CategoryRankingTable } from './category-ranking-table'
import { InfluenceChart } from './influence-chart'
import { LoadingState } from '../shared/loading-state'
import { ErrorState } from '../shared/error-state'
import { EmptyState } from '../shared/empty-state'

interface Props {
  filters: FilterState
  categories: string[]
}

export function UserSection({ filters, categories }: Props) {
  const [overallLimit, setOverallLimit] = useState(25)
  const [selectedCategory, setSelectedCategory] = useState(categories[0] ?? '')

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
          <InfluenceChart data={overallQuery.data} />
          <OverallRankingTable
            data={overallQuery.data}
            limit={overallLimit}
            onLimitChange={setOverallLimit}
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
        />
      )}
    </div>
  )
}
