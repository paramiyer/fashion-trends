import type { ContentKpiDaily } from '../../types/database'
import { InteractionsChart } from './interactions-chart'
import { QualityChart } from './quality-chart'
import { ContentTable } from './content-table'

interface Props {
  data: ContentKpiDaily[]
}

export function ContentSection({ data }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold tracking-tight">Content Performance</h2>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{data.length} records</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <InteractionsChart data={data} />
        <QualityChart data={data} />
      </div>
      <ContentTable data={data} />
    </div>
  )
}
