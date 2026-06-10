import { useEffect, useRef } from 'react'
import { onDataChanged } from '@/lib/data-sync'

type Options = {
  /** Refetch when the tab regains focus / becomes visible. Default true. */
  onFocus?: boolean
  /** Refetch when another tab reports an admin change. Default true. */
  onBroadcast?: boolean
  /** Poll interval in ms. Set 0 to disable. Default 20000 (20s). */
  pollMs?: number
}

/**
 * Keeps a page's data fresh so admin changes reflect "live":
 *  - instantly via cross-tab broadcast after an admin save,
 *  - on tab focus / visibility change,
 *  - and on a background poll as a fallback.
 */
export function useLiveData(callback: () => void, options: Options = {}) {
  const { onFocus = true, onBroadcast = true, pollMs = 20000 } = options
  const cbRef = useRef(callback)
  cbRef.current = callback

  useEffect(() => {
    const run = () => cbRef.current()

    const cleanups: Array<() => void> = []

    if (onFocus) {
      const handleVisibility = () => {
        if (document.visibilityState === 'visible') run()
      }
      document.addEventListener('visibilitychange', handleVisibility)
      window.addEventListener('focus', run)
      cleanups.push(() => {
        document.removeEventListener('visibilitychange', handleVisibility)
        window.removeEventListener('focus', run)
      })
    }

    if (onBroadcast) {
      cleanups.push(onDataChanged(run))
    }

    if (pollMs > 0) {
      const timer = setInterval(() => {
        if (document.visibilityState === 'visible') run()
      }, pollMs)
      cleanups.push(() => clearInterval(timer))
    }

    return () => cleanups.forEach(fn => fn())
  }, [onFocus, onBroadcast, pollMs])
}
