import { Calendar, ListFilter as Filter, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { FilterState } from '../../types/database'
import { formatCategory } from '../../lib/utils'
import { useState, useRef, useEffect } from 'react'

interface Props {
  filters: FilterState
  onFilterChange: (update: Partial<FilterState>) => void
  categories: string[]
  dateRange: { min: string; max: string }
}

export function FilterBar({ filters, onFilterChange, categories, dateRange }: Props) {
  const [catOpen, setCatOpen] = useState(false)
  const catRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const selectedCategories = filters.categories.length === 0 ? categories : filters.categories
  const allSelected = filters.categories.length === 0 || filters.categories.includes('All')

  function toggleCategory(cat: string) {
    if (cat === 'All') {
      onFilterChange({ categories: [] })
      return
    }
    const current = filters.categories.filter((c) => c !== 'All')
    const next = current.includes(cat)
      ? current.filter((c) => c !== cat)
      : [...current, cat]
    onFilterChange({ categories: next.length === categories.length ? [] : next })
  }

  return (
    <div className="bg-card rounded-xl border shadow-sm p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          Filters
        </div>

        <div className="h-4 w-px bg-border" />

        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="date"
            value={filters.dateFrom}
            min={dateRange.min}
            max={filters.dateTo}
            onChange={(e) => onFilterChange({ dateFrom: e.target.value })}
            className="h-8 px-2.5 text-xs border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={filters.dateTo}
            min={filters.dateFrom}
            max={dateRange.max}
            onChange={(e) => onFilterChange({ dateTo: e.target.value })}
            className="h-8 px-2.5 text-xs border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="h-4 w-px bg-border" />

        <div className="relative" ref={catRef}>
          <button
            type="button"
            onClick={() => setCatOpen(!catOpen)}
            className="h-8 px-3 text-xs border rounded-lg bg-background hover:bg-muted transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {allSelected
              ? 'All Categories'
              : `${selectedCategories.length} categor${selectedCategories.length === 1 ? 'y' : 'ies'}`}
          </button>
          {catOpen && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-card border rounded-lg shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
              <button
                type="button"
                onClick={() => toggleCategory('All')}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center gap-2 cursor-pointer ${allSelected ? 'text-primary font-medium' : ''}`}
              >
                <span className={`h-3.5 w-3.5 rounded border flex items-center justify-center text-[8px] ${allSelected ? 'bg-primary border-primary text-white' : ''}`}>
                  {allSelected && '\u2713'}
                </span>
                All Categories
              </button>
              {categories.map((cat) => {
                const checked = selectedCategories.includes(cat)
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span className={`h-3.5 w-3.5 rounded border flex items-center justify-center text-[8px] ${checked && !allSelected ? 'bg-primary border-primary text-white' : ''}`}>
                      {(checked || allSelected) && '\u2713'}
                    </span>
                    {formatCategory(cat)}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-border" />

        <select
          value={filters.analysisType}
          onChange={(e) => onFilterChange({ analysisType: e.target.value as FilterState['analysisType'] })}
          className="h-8 px-2.5 text-xs border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
        >
          <option value="all">All Analysis Types</option>
          <option value="heuristic">Heuristic</option>
          <option value="ai">AI</option>
        </select>

        {(filters.categories.length > 0 || filters.analysisType !== 'all' || filters.dateFrom !== dateRange.min || filters.dateTo !== dateRange.max) && (
          <>
            <div className="h-4 w-px bg-border" />
            <button
              type="button"
              onClick={() => onFilterChange({ categories: [], analysisType: 'all', dateFrom: dateRange.min, dateTo: dateRange.max })}
              className="flex items-center gap-1 h-8 px-3 text-xs text-muted-foreground hover:text-foreground border rounded-lg hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="h-3 w-3" />
              Reset
            </button>
          </>
        )}

        <div className="ml-auto text-[10px] text-muted-foreground hidden lg:block">
          {format(parseISO(filters.dateFrom), 'MMM d')} - {format(parseISO(filters.dateTo), 'MMM d, yyyy')}
        </div>
      </div>
    </div>
  )
}
