import { Loader as Loader2 } from 'lucide-react'

interface Props {
  message?: string
}

export function LoadingState({ message = 'Loading...' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Loader2 className="h-6 w-6 text-primary animate-spin" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
