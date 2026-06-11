import type { Property, PropertyPhoto, Booking, HeroSlide } from './supabase'
import { getAdminToken, clearAdminToken, AdminUnauthorizedError } from './admin-auth'
import { notifyDataChanged } from './data-sync'

export type BookingWithProperty = Booking & { property?: Pick<Property, 'id' | 'title' | 'city' | 'state' | 'property_type'> | null }

export type PropertyType = {
  id: string
  value: string
  label: string
  icon: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type AdminRole = 'admin' | 'manager' | 'guest'

export type AdminUser = {
  id: string
  username: string
  full_name: string
  email: string
  role: AdminRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export type NavLink = {
  id: string
  label: string
  href: string
  new_tab: boolean
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// In dev, Vite proxies /api → http://localhost:3001
// In production, set VITE_API_URL to your deployed API origin
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  if (body) headers['Content-Type'] = 'application/json'
  const token = getAdminToken()
  if (token && path.startsWith('/admin/')) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  if (res.status === 401 || res.status === 403) {
    if (path.startsWith('/admin/') && path !== '/admin/login') clearAdminToken()
    throw new AdminUnauthorizedError()
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(text)
  }
  // A successful admin mutation changed server data — tell other tabs to refetch.
  if (method !== 'GET' && path.startsWith('/admin/') && path !== '/admin/login') {
    notifyDataChanged()
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

const get = <T>(path: string, params?: Record<string, string | undefined>) => {
  const url = new URL(`${BASE}/api${path}`, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) url.searchParams.set(k, v) })
  }
  return req<T>('GET', path + (url.search ? `?${url.searchParams.toString()}` : ''))
}

// Postgres numeric columns can arrive as strings (e.g. from an un-restarted
// server or stale deploy). Coerce them so `.toFixed()` and arithmetic are safe.
const toNum = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : 0
}

function normalizeProperty<T extends Record<string, unknown> | null | undefined>(p: T): T {
  if (!p) return p
  return {
    ...p,
    latitude: p.latitude == null ? null : toNum(p.latitude),
    longitude: p.longitude == null ? null : toNum(p.longitude),
    price_per_night: toNum(p.price_per_night),
    cleaning_fee: toNum(p.cleaning_fee),
    service_fee_percent: toNum(p.service_fee_percent),
    bedrooms: toNum(p.bedrooms),
    bathrooms: toNum(p.bathrooms),
    max_guests: toNum(p.max_guests),
    min_stay_nights: toNum(p.min_stay_nights),
    max_stay_nights: toNum(p.max_stay_nights),
    rating_avg: toNum(p.rating_avg),
    review_count: toNum(p.review_count),
  }
}

function normalizeBooking<T extends Record<string, unknown> | null | undefined>(b: T): T {
  if (!b) return b
  return {
    ...b,
    guests_count: toNum(b.guests_count),
    nights: toNum(b.nights),
    base_price: toNum(b.base_price),
    cleaning_fee: toNum(b.cleaning_fee),
    service_fee: toNum(b.service_fee),
    total_price: toNum(b.total_price),
  }
}

export const api = {
  heroSlides: {
    list: () => get<HeroSlide[]>('/hero-slides'),
  },

  propertyTypes: {
    list: () => get<PropertyType[]>('/property-types'),
  },

  navLinks: {
    list: () => get<NavLink[]>('/nav-links'),
  },

  properties: {
    list: (params?: { active?: boolean; type?: string; sort?: string }) =>
      get<Property[]>('/properties', {
        active: params?.active !== undefined ? String(params.active) : undefined,
        type: params?.type,
        sort: params?.sort,
      }).then(rows => rows.map(normalizeProperty)),
    get: (id: string) => get<Property>(`/properties/${id}`).then(normalizeProperty),
    getBookedDates: (id: string) =>
      get<Pick<Booking, 'check_in' | 'check_out'>[]>(`/properties/${id}/booked-dates`),
  },

  bookings: {
    get: (id: string) => get<Booking>(`/bookings/${id}`).then(normalizeBooking),
    create: (data: Partial<Booking>) => req<Booking>('POST', '/bookings', data).then(normalizeBooking),
  },

  admin: {
    login: (data: { username: string; password: string }) =>
      req<{ token: string; role: AdminRole }>('POST', '/admin/login', data),

    me: () => get<{ username: string; role: AdminRole }>('/admin/me'),

    propertyTypes: {
      list: () => get<PropertyType[]>('/admin/property-types'),
      create: (data: Partial<PropertyType>) => req<PropertyType>('POST', '/admin/property-types', data),
      update: (id: string, data: Partial<PropertyType>) => req<PropertyType>('PATCH', `/admin/property-types/${id}`, data),
      delete: (id: string) => req<{ ok: boolean }>('DELETE', `/admin/property-types/${id}`),
    },

    users: {
      list: () => get<AdminUser[]>('/admin/users'),
      create: (data: { username: string; password: string; full_name?: string; email?: string; role?: AdminRole; is_active?: boolean }) =>
        req<AdminUser>('POST', '/admin/users', data),
      update: (id: string, data: { password?: string; full_name?: string; email?: string; role?: AdminRole; is_active?: boolean }) =>
        req<AdminUser>('PATCH', `/admin/users/${id}`, data),
      delete: (id: string) => req<{ ok: boolean }>('DELETE', `/admin/users/${id}`),
    },

    navLinks: {
      list: () => get<NavLink[]>('/admin/nav-links'),
      create: (data: Partial<NavLink>) => req<NavLink>('POST', '/admin/nav-links', data),
      update: (id: string, data: Partial<NavLink>) => req<NavLink>('PATCH', `/admin/nav-links/${id}`, data),
      delete: (id: string) => req<{ ok: boolean }>('DELETE', `/admin/nav-links/${id}`),
    },

    properties: {
      list: () => get<Property[]>('/admin/properties').then(rows => rows.map(normalizeProperty)),
      get: (id: string) =>
        get<Property & { photos: PropertyPhoto[] }>(`/admin/properties/${id}`).then(normalizeProperty),
      create: (data: Partial<Property>) =>
        req<Property>('POST', '/admin/properties', data).then(normalizeProperty),
      update: (id: string, data: Partial<Property>) =>
        req<Property>('PATCH', `/admin/properties/${id}`, data).then(normalizeProperty),
      delete: (id: string) => req<{ ok: boolean }>('DELETE', `/admin/properties/${id}`),
      savePhotos: (
        id: string,
        photos: Array<{ url: string; is_primary: boolean; sort_order: number }>,
      ) => req<{ ok: boolean }>('POST', `/admin/properties/${id}/photos`, photos),
    },

    bookings: {
      list: () =>
        get<BookingWithProperty[]>('/admin/bookings').then(rows => rows.map(normalizeBooking)),
      get: (id: string) =>
        get<{ booking: Booking; property: Property | null }>(`/admin/bookings/${id}`).then(r => ({
          booking: normalizeBooking(r.booking),
          property: normalizeProperty(r.property),
        })),
      update: (id: string, data: { status?: string; payment_status?: string }) =>
        req<Booking>('PATCH', `/admin/bookings/${id}`, data).then(normalizeBooking),
    },

    heroSlides: {
      list: () => get<HeroSlide[]>('/admin/hero-slides'),
      create: (data: Partial<HeroSlide>) => req<HeroSlide>('POST', '/admin/hero-slides', data),
      update: (id: string, data: Partial<HeroSlide>) => req<HeroSlide>('PATCH', `/admin/hero-slides/${id}`, data),
      delete: (id: string) => req<{ ok: boolean }>('DELETE', `/admin/hero-slides/${id}`),
    },
  },
}