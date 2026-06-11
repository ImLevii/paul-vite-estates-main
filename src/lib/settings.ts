/**
 * Shared admin/site settings. The database is the source of truth (so settings
 * sync across every device and visitor), with localStorage used as an instant
 * paint cache + offline fallback. Changes propagate live to all open tabs and
 * the current one, and the cache is refreshed from the server on mount, focus,
 * cross-tab broadcast, and a periodic poll.
 */
import { useSyncExternalStore } from 'react'
import { api } from '@/lib/api'
import { onDataChanged } from '@/lib/data-sync'

export const SETTINGS_KEY = 'haven_admin_settings'

export const DEFAULT_SETTINGS = {
  siteName: 'Paul',
  brandTagline: 'Private Estates',
  siteUrl: 'https://paul.example.com',
  contactEmail: 'admin@paul.com',
  heroEyebrow: 'Curated Escapes',
  heroTitle: 'Find Your Perfect',
  heroTitleAccent: 'Escape',
  heroSubtitle: 'Discover handpicked rentals from cozy lakeside cabins to beachfront villas. Book with confidence.',
  footerTagline: 'Discover extraordinary places to stay. From cozy cabins to luxury villas, find your perfect getaway.',
  footerNote: 'Crafted with precision.',
  currency: 'USD',
  defaultServiceFee: '12',
  defaultCleaningFee: '50',
  defaultMinStay: '1',
  defaultCheckIn: '15:00',
  defaultCheckOut: '11:00',
  stripePublicKey: 'pk_test_...',
  stripeSecretKey: '',
  paypalClientId: '',
  paypalEnabled: true,
  stripeEnabled: true,
  emailNotifications: true,
  bookingConfirmations: true,
  cancellationAlerts: true,
  newListingReviews: true,
  requireEmailVerification: false,
  autoConfirmBookings: false,
  allowGuestReviews: true,
}

export type Settings = typeof DEFAULT_SETTINGS

const EVENT_NAME = 'haven-settings-changed'

export function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
  } catch {
    /* ignore */
  }
  return DEFAULT_SETTINGS
}

export async function saveSettings(settings: Settings): Promise<void> {
  writeLocal(settings)
  await api.admin.settings.update(settings as unknown as Record<string, unknown>)
}

/** Write to the local cache and notify the current tab + other tabs. */
function writeLocal(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    /* ignore */
  }
  // Storage events only fire in *other* tabs, so dispatch our own for this one.
  window.dispatchEvent(new Event(EVENT_NAME))
}

/**
 * Fetch the latest settings from the server and update the local cache if they
 * changed. De-duplicates concurrent calls. Never throws (network errors leave
 * the cached values in place).
 */
let inflight: Promise<void> | null = null
export function refreshSettings(): Promise<void> {
  if (inflight) return inflight
  inflight = api.settings
    .get()
    .then(data => {
      const merged: Settings = { ...DEFAULT_SETTINGS, ...(data as Partial<Settings>) }
      const raw = JSON.stringify(merged)
      let current: string | null = null
      try {
        current = localStorage.getItem(SETTINGS_KEY)
      } catch {
        /* ignore */
      }
      if (raw !== current) {
        try {
          localStorage.setItem(SETTINGS_KEY, raw)
        } catch {
          /* ignore */
        }
        window.dispatchEvent(new Event(EVENT_NAME))
      }
    })
    .catch(() => {
      /* keep cached values */
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

// ── Server-refresh lifecycle, shared across all hook consumers (refcounted) ──
let subscribers = 0
let teardownGlobal: (() => void) | null = null

function startGlobal(): () => void {
  refreshSettings()
  const onVisible = () => {
    if (document.visibilityState === 'visible') refreshSettings()
  }
  const offData = onDataChanged(refreshSettings)
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('focus', refreshSettings)
  const timer = window.setInterval(() => {
    if (document.visibilityState === 'visible') refreshSettings()
  }, 30000)
  return () => {
    offData()
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('focus', refreshSettings)
    window.clearInterval(timer)
  }
}

function subscribe(listener: () => void): () => void {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === SETTINGS_KEY) listener()
  }
  window.addEventListener(EVENT_NAME, listener)
  window.addEventListener('storage', handleStorage)

  subscribers += 1
  if (subscribers === 1) teardownGlobal = startGlobal()

  return () => {
    window.removeEventListener(EVENT_NAME, listener)
    window.removeEventListener('storage', handleStorage)
    subscribers -= 1
    if (subscribers === 0 && teardownGlobal) {
      teardownGlobal()
      teardownGlobal = null
    }
  }
}

// Cache the parsed snapshot so useSyncExternalStore stays referentially stable
// between renders (it only changes when settings actually change).
let cachedRaw: string | null = null
let cachedValue: Settings = DEFAULT_SETTINGS

function getSnapshot(): Settings {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(SETTINGS_KEY)
  } catch {
    /* ignore */
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedValue = loadSettings()
  }
  return cachedValue
}

/** Subscribe to the live site settings. Updates on save and across tabs. */
export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_SETTINGS)
}
