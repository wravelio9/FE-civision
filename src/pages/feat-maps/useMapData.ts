import { useCallback, useEffect, useState } from 'react'
import { getMapData, type MapViolation } from '../../services/dashboard/mapData'

// Loads the violation markers once per mount. retry() fetches again.
export function useMapData() {
  const [violations, setViolations] = useState<MapViolation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    getMapData(controller.signal)
      .then(setViolations)
      .catch((err) => {
        if (controller.signal.aborted) return
        setError(err?.message || 'terjadi kesalahan.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [attempt])

  const retry = useCallback(() => setAttempt((a) => a + 1), [])
  return { violations, loading, error, retry }
}
