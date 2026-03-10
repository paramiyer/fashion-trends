import type { TrendKpiDaily } from '../../types/database'
import { TrendHealthChart } from './trend-health-chart'
import { BreakoutScoreChart } from './breakout-score-chart'
import { BreakoutDaysChart } from './breakout-days-chart'
import { TrendTable } from './trend-table'

interface Props {
  data: TrendKpiDaily[]
  highlightedCategories?: string[]
}

export function TrendSection({ data, highlightedCategories = [] }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold tracking-tight">Trend Analytics</h2>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{data.length} records</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TrendHealthChart data={data} highlightedCategories={highlightedCategories} />
        <BreakoutScoreChart data={data} highlightedCategories={highlightedCategories} />
      </div>
      <BreakoutDaysChart data={data} highlightedCategories={highlightedCategories} />
      <TrendTable data={data} highlightedCategories={highlightedCategories} />
    </div>
  )
}
