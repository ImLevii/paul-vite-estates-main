import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { onDataChanged } from '@/lib/data-sync'
import type { Booking, Property } from '@/lib/supabase'
import type { Settings } from '@/lib/settings'

const READ_KEY = 'haven_admin_notification_reads'
const DAY_MS = 24 * 60 * 60 * 1000

type NotificationSeverity = 'info' | 'warning' | 'critical'

export type AdminNotification = {
  id: string
  title: string
  message: string
  href?: string
  createdAt: string
  severity: NotificationSeverity
}

type ReadMap = Record<string, boolean>

function loadReadMap(): ReadMap {
  try {
    const raw = localStorage.getItem(READ_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object') return parsed as ReadMap
  } catch {
    // Ignore invalid cache values.
  }
  return {}
}

function saveReadMap(map: ReadMap): void {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify(map))
  } catch {
    // Ignore quota/private mode failures.
  }
}

function safeMs(value: string): number {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function severitySortValue(severity: NotificationSeverity): number {
  if (severity === 'critical') return 0
  if (severity === 'warning') return 1
  return 2
}

function buildNotifications(
  bookings: Booking[],
  properties: Property[],
  settings: Settings,
): AdminNotification[] {
  const now = Date.now()
  const items: AdminNotification[] = []

  const pendingBookings = bookings.filter(b => b.status === 'pending')
  if (pendingBookings.length > 0) {
    const newestPending = pendingBookings
      .map(b => b.created_at)
      .sort((a, b) => safeMs(b) - safeMs(a))[0] ?? new Date(now).toISOString()
    items.push({
      id: 'pending-bookings',
      title: 'Pending booking requests',
      message: `${pendingBookings.length} request${pendingBookings.length === 1 ? '' : 's'} need review.`,
      href: '/admin/bookings',
      createdAt: newestPending,
      severity: pendingBookings.length >= 5 ? 'critical' : 'warning',
    })
  }

  const recentBookings = bookings.filter(b => now - safeMs(b.created_at) <= DAY_MS)
  if (recentBookings.length > 0) {
    const newestRecent = recentBookings
      .map(b => b.created_at)
      .sort((a, b) => safeMs(b) - safeMs(a))[0] ?? new Date(now).toISOString()
    items.push({
      id: 'recent-bookings',
      title: 'New bookings in the last 24h',
      message: `${recentBookings.length} new booking${recentBookings.length === 1 ? '' : 's'} came in today.`,
      href: '/admin/bookings',
      createdAt: newestRecent,
      severity: 'info',
    })
  }

  const inactiveProperties = properties.filter(p => !p.is_active)
  if (inactiveProperties.length > 0) {
    items.push({
      id: 'inactive-listings',
      title: 'Inactive listings found',
      message: `${inactiveProperties.length} listing${inactiveProperties.length === 1 ? '' : 's'} are hidden from guests.`,
      href: '/admin/listings',
      createdAt: inactiveProperties[0]?.updated_at ?? new Date(now).toISOString(),
      severity: 'warning',
    })
  }

  if (properties.length === 0) {
    items.push({
      id: 'no-listings',
      title: 'No active inventory yet',
      message: 'Add your first listing to start accepting bookings.',
      href: '/admin/listings/new',
      createdAt: new Date(now).toISOString(),
      severity: 'info',
    })
  }

  if (settings.stripeEnabled && !settings.stripePublicKey.trim().startsWith('pk_')) {
    items.push({
      id: 'stripe-not-configured',
      title: 'Stripe appears misconfigured',
      message: 'Update your Stripe publishable key in Settings > Payments.',
      href: '/admin/settings',
      createdAt: new Date(now).toISOString(),
      severity: 'warning',
    })
  }

  if (settings.paypalEnabled && settings.paypalClientId.trim().length < 10) {
    items.push({
      id: 'paypal-not-configured',
      title: 'PayPal appears misconfigured',
      message: 'Add a valid PayPal client ID in Settings > Payments.',
      href: '/admin/settings',
      createdAt: new Date(now).toISOString(),
      severity: 'warning',
    })
  }

  if (items.length === 0) {
    items.push({
      id: 'all-clear',
      title: 'All clear',
      message: 'No urgent admin notifications right now.',
      href: '/admin',
      createdAt: new Date(now).toISOString(),
      severity: 'info',
    })
  }

  return items.sort((a, b) => {
    const severityDiff = severitySortValue(a.severity) - severitySortValue(b.severity)
    if (severityDiff !== 0) return severityDiff
    return safeMs(b.createdAt) - safeMs(a.createdAt)
  })
}

export function useAdminNotifications(settings: Settings) {
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [readMap, setReadMap] = useState<ReadMap>(() => loadReadMap())

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [nextBookings, nextProperties] = await Promise.all([
        api.admin.bookings.list(),
        api.admin.properties.list(),
      ])
      setBookings(nextBookings || [])
      setProperties(nextProperties || [])
    } catch {
      setBookings([])
      setProperties([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const offDataChanged = onDataChanged(refresh)
    const timer = window.setInterval(refresh, 45000)
    return () => {
      offDataChanged()
      window.clearInterval(timer)
    }
  }, [refresh])

  const notifications = useMemo(
    () => buildNotifications(bookings, properties, settings),
    [bookings, properties, settings],
  )

  const unreadCount = useMemo(
    () => notifications.filter(item => !readMap[item.id]).length,
    [notifications, readMap],
  )

  function markAsRead(id: string) {
    setReadMap(current => {
      if (current[id]) return current
      const next = { ...current, [id]: true }
      saveReadMap(next)
      return next
    })
  }

  function markAllAsRead() {
    setReadMap(current => {
      const next = { ...current }
      for (const item of notifications) next[item.id] = true
      saveReadMap(next)
      return next
    })
  }

  function resetReadState() {
    setReadMap({})
    saveReadMap({})
  }

  return {
    loading,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    resetReadState,
    refresh,
    isRead: (id: string) => !!readMap[id],
  }
}
