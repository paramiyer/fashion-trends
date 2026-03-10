import { Info } from 'lucide-react'
import { useState } from 'react'

interface Props {
  description: string
}

export function KpiTooltip({ description }: Props) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={() => setVisible(!visible)}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {visible && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 px-3 py-2 text-xs leading-relaxed bg-foreground text-background rounded-lg shadow-lg pointer-events-none">
          {description}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-foreground" />
        </div>
      )}
    </div>
  )
}
