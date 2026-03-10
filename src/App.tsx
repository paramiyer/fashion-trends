import { useState, useEffect, useCallback, useMemo } from 'react'
import { Header } from './components/layout/header'
import { FilterBar } from './components/filters/filter-bar'
import { KpiCards } from './components/overview/kpi-cards'
import { TrendSection } from './components/trends/trend-section'
import { ContentSection } from './components/content/content-section'
import { UserSection } from './components/users/user-section'
import { KpiDrawer } from './components/dictionary/kpi-drawer'
import { LoadingState } from './components/shared/loading-state'
import { ErrorState } from './components/shared/error-state'
import { EmptyState } from './components/shared/empty-state'
import { useFilters } from './hooks/use-filters'
import { useQuery } from './hooks/use-query'
import { fetchTrendKpis, fetchContentKpis, fetchCategories, fetchDateRange } from './lib/queries'
import { supabaseMisconfigured } from './lib/supabase'
import type { SelectedUser } from './types/database'

type ActiveTab = 'trends' | 'content' | 'users'

function App() {
  const [dictionaryOpen, setDictionaryOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('trends')
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null)

  const metaQuery = useQuery(
    async () => {
      if (supabaseMisconfigured) return null
      const [categories, dateRange] = await Promise.all([fetchCategories(), fetchDateRange()])
      return { categories, dateRange }
    },
    []
  )

  const defaultFrom = metaQuery.data?.dateRange.min ?? '2026-01-01'
  const defaultTo = metaQuery.data?.dateRange.max ?? '2026-03-09'

  const { filters, setFilters } = useFilters(defaultFrom, defaultTo)

  useEffect(() => {
    if (metaQuery.data) {
      const params = new URLSearchParams(window.location.search)
      if (!params.get('from')) {
        setFilters({ dateFrom: metaQuery.data.dateRange.min, dateTo: metaQuery.data.dateRange.max })
      }
    }
  }, [metaQuery.data, setFilters])

  const trendQuery = useQuery(
    () => supabaseMisconfigured ? Promise.resolve([]) : fetchTrendKpis(filters),
    [filters.dateFrom, filters.dateTo, filters.categories.join(','), filters.analysisType]
  )

  const contentQuery = useQuery(
    () => supabaseMisconfigured ? Promise.resolve([]) : fetchContentKpis(filters),
    [filters.dateFrom, filters.dateTo, filters.categories.join(','), filters.analysisType]
  )

  const categories = useMemo(() => metaQuery.data?.categories ?? [], [metaQuery.data])

  const handleOpenDictionary = useCallback(() => setDictionaryOpen(true), [])
  const handleCloseDictionary = useCallback(() => setDictionaryOpen(false), [])
  const handleClearUser = useCallback(() => setSelectedUser(null), [])

  const highlightedCategories = useMemo(
    () => selectedUser?.categories ?? [],
    [selectedUser]
  )

  if (supabaseMisconfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="text-center max-w-md space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Configuration Required</h2>
          <p className="text-sm text-slate-500">
            Missing Supabase environment variables. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file, then restart the dev server.
          </p>
        </div>
      </div>
    )
  }

  if (metaQuery.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingState message="Connecting to data source..." />
      </div>
    )
  }

  if (metaQuery.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <ErrorState message={metaQuery.error} onRetry={metaQuery.refetch} />
      </div>
    )
  }

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: 'trends', label: 'Trends' },
    { key: 'content', label: 'Content' },
    { key: 'users', label: 'Users' },
  ]

  const dataLoading = trendQuery.loading || contentQuery.loading
  const dataError = trendQuery.error ?? contentQuery.error
  const hasTrendData = (trendQuery.data?.length ?? 0) > 0
  const hasContentData = (contentQuery.data?.length ?? 0) > 0

  return (
    <div className="min-h-screen bg-background">
      <Header onOpenDictionary={handleOpenDictionary} />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        <FilterBar
          filters={filters}
          onFilterChange={setFilters}
          categories={categories}
          dateRange={metaQuery.data?.dateRange ?? { min: defaultFrom, max: defaultTo }}
          selectedUser={selectedUser}
          onClearUser={handleClearUser}
        />

        {dataLoading ? (
          <LoadingState message="Loading KPI data..." />
        ) : dataError ? (
          <ErrorState
            message={dataError}
            onRetry={() => { trendQuery.refetch(); contentQuery.refetch() }}
          />
        ) : !hasTrendData && !hasContentData ? (
          <EmptyState message="No data found for the current filters. Try adjusting the date range or categories." />
        ) : (
          <>
            <KpiCards
              trendData={trendQuery.data ?? []}
              contentData={contentQuery.data ?? []}
            />

            <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
              {tabs.map((tab) => {
                const hasUserHighlight = selectedUser && tab.key !== 'users'
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`relative px-5 py-2 text-sm rounded-md transition-all duration-200 font-medium cursor-pointer ${activeTab === tab.key ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {tab.label}
                    {hasUserHighlight && activeTab !== tab.key && (
                      <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                )
              })}
            </div>

            {activeTab === 'trends' && (
              hasTrendData
                ? <TrendSection data={trendQuery.data!} highlightedCategories={highlightedCategories} />
                : <EmptyState message="No trend data for these filters." />
            )}

            {activeTab === 'content' && (
              hasContentData
                ? <ContentSection data={contentQuery.data!} highlightedCategories={highlightedCategories} />
                : <EmptyState message="No content data for these filters." />
            )}

            {activeTab === 'users' && (
              <UserSection
                filters={filters}
                categories={categories}
                selectedUser={selectedUser}
                onSelectUser={setSelectedUser}
              />
            )}
          </>
        )}
      </main>

      <KpiDrawer open={dictionaryOpen} onClose={handleCloseDictionary} />
    </div>
  )
}

export default App
