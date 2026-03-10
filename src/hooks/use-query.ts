import { useState, useEffect, useCallback, useRef } from 'react'

interface UseQueryResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

const TIMEOUT_MS = 15000

export function useQuery<T>(
  queryFn: () => Promise<T>,
  deps: unknown[] = []
): UseQueryResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trigger, setTrigger] = useState(0)
  const mountedRef = useRef(true)

  const refetch = useCallback(() => setTrigger((t) => t + 1), [])

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const timeout = setTimeout(() => {
      if (!cancelled && mountedRef.current) {
        setError('Request timed out. Check your connection and try again.')
        setLoading(false)
      }
    }, TIMEOUT_MS)

    queryFn()
      .then((result) => {
        clearTimeout(timeout)
        if (!cancelled && mountedRef.current) {
          setData(result)
          setLoading(false)
        }
      })
      .catch((err) => {
        clearTimeout(timeout)
        if (!cancelled && mountedRef.current) {
          setError(err?.message ?? 'An error occurred')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, ...deps])

  return { data, loading, error, refetch }
}
