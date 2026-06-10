/**
 * Cross-tab data sync. When the admin makes a change in one tab, public pages
 * in other tabs (and the admin's own views) refetch immediately instead of
 * waiting for a tab focus or reload.
 *
 * Uses BroadcastChannel where available, with a localStorage `storage` event
 * fallback for older browsers.
 */

const CHANNEL_NAME = 'haven-data-sync'
const STORAGE_KEY = 'haven_data_changed_at'

type Listener = () => void

const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null

/** Notify all tabs (and this one) that server data changed. */
export function notifyDataChanged(): void {
  channel?.postMessage('changed')
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()))
  } catch {
    /* ignore */
  }
}

/** Subscribe to data-change notifications. Returns an unsubscribe function. */
export function onDataChanged(listener: Listener): () => void {
  const handleMessage = () => listener()
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener()
  }

  channel?.addEventListener('message', handleMessage)
  window.addEventListener('storage', handleStorage)

  return () => {
    channel?.removeEventListener('message', handleMessage)
    window.removeEventListener('storage', handleStorage)
  }
}
