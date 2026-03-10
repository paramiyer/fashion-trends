import { X } from 'lucide-react'
import { useEffect } from 'react'
import { kpiDictionary } from '@/lib/kpi-dictionary'

interface Props {
  open: boolean
  onClose: () => void
}

const sectionLabels: Record<string, string> = {
  trend: 'Trend KPIs (gl_trend_kpis_daily)',
  content: 'Content/Performance KPIs (gl_content_kpis_daily)',
  user_overall: 'User Influence Overall (gl_user_influence_7d_overall)',
  user_category: 'User Influence By Category (gl_user_influence_7d_by_category)',
}

const sectionOrder = ['trend', 'content', 'user_overall', 'user_category'] as const

export function KpiDrawer({ open, onClose }: Props) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-50 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-lg bg-card border-l shadow-2xl z-50 transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between h-14 px-6 border-b">
          <h2 className="text-sm font-semibold">KPI Dictionary</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-3.5rem)] px-6 py-5 space-y-8">
          {sectionOrder.map((section) => {
            const kpis = kpiDictionary.filter((k) => k.section === section)
            if (kpis.length === 0) return null
            return (
              <div key={section}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  {sectionLabels[section]}
                </h3>
                <div className="space-y-2">
                  {kpis.map((kpi) => (
                    <div key={kpi.key} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-foreground">{kpi.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{kpi.description}</p>
                        <code className="text-[10px] text-muted-foreground/60 mt-1 block font-mono">{kpi.key}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
