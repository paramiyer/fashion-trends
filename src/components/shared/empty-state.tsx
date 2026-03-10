import { Inbox } from 'lucide-react'

interface Props {
  message?: string
}

export function EmptyState({ message = 'No data available for the selected filters.' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
        <Inbox className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground text-center">{message}</p>
    </div>
  )
}
