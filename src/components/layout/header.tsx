import { Activity, BookOpen } from 'lucide-react'

interface HeaderProps {
  onOpenDictionary: () => void
}

export function Header({ onOpenDictionary }: HeaderProps) {
  return (
    <header className="bg-card border-b sticky top-0 z-40">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center justify-center shrink-0">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-semibold tracking-tight">Social Trend Mining</h1>
            <p className="text-[10px] text-muted-foreground leading-none">KPI Dashboard</p>
          </div>
        </div>
        <button
          onClick={onOpenDictionary}
          className="flex items-center gap-2 h-8 px-3 text-xs font-medium border rounded-lg hover:bg-muted transition-colors cursor-pointer"
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">KPI Dictionary</span>
        </button>
      </div>
    </header>
  )
}
