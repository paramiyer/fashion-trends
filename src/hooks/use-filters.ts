import { useState, useCallback, useEffect } from 'react'
import type { FilterState } from '../types/database'

function readFromUrl(defaultFrom: string, defaultTo: string): FilterState {
  const params = new URLSearchParams(window.location.search)
  return {
    dateFrom: params.get('from') ?? defaultFrom,
    dateTo: params.get('to') ?? defaultTo,
    categories: params.get('categories')?.split(',').filter(Boolean) ?? [],
    analysisType: (params.get('analysis') as FilterState['analysisType']) ?? 'all',
  }
}

function writeToUrl(filters: FilterState) {
  const params = new URLSearchParams()
  params.set('from', filters.dateFrom)
  params.set('to', filters.dateTo)
  if (filters.categories.length > 0) {
    params.set('categories', filters.categories.join(','))
  }
  if (filters.analysisType !== 'all') {
    params.set('analysis', filters.analysisType)
  }
  const url = `${window.location.pathname}?${params.toString()}`
  window.history.replaceState(null, '', url)
}

export function useFilters(defaultFrom: string, defaultTo: string) {
  const [filters, setFiltersState] = useState<FilterState>(() =>
    readFromUrl(defaultFrom, defaultTo)
  )

  const setFilters = useCallback((update: Partial<FilterState>) => {
    setFiltersState((prev) => {
      const next = { ...prev, ...update }
      return next
    })
  }, [])

  useEffect(() => {
    writeToUrl(filters)
  }, [filters])

  return { filters, setFilters }
}
