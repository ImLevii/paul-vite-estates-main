/**
 * Shared admin/site settings persisted in localStorage. Both the admin
 * Settings page and the public site (e.g. the header branding) read from here,
 * and changes propagate live to all open tabs and the current one.
 */
import { useSyncExternalStore } from 'react'

export const SETTINGS_KEY = 'haven_admin_settings'

export const DEFAULT_SETTINGS = {
  siteName: 'Paul',
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

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  // Notify the current tab (storage events only fire in *other* tabs).
  window.dispatchEvent(new Event(EVENT_NAME))
}

function subscribe(listener: () => void): () => void {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === SETTINGS_KEY) listener()
  }
  window.addEventListener(EVENT_NAME, listener)
  window.addEventListener('storage', handleStorage)
  return () => {
    window.removeEventListener(EVENT_NAME, listener)
    window.removeEventListener('storage', handleStorage)
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
