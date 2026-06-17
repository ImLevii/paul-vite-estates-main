import dotenv from 'dotenv'
import path from 'path'
import crypto from 'crypto'

if (process.env.VERCEL !== '1') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
}

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { jwt, sign } from 'hono/jwt'
import { serve } from '@hono/node-server'
import postgres from 'postgres'
import type { Property, PropertyPhoto, Booking, HeroSlide } from '../src/lib/supabase.js'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set in .env.local')

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? ''
const JWT_SECRET = process.env.ADMIN_JWT_SECRET ?? 'please-set-ADMIN_JWT_SECRET-in-env'

// ─────────────────────────────────────────────────────────────────────────────
// Payments (Stripe + PayPal) — server-side authorization via REST APIs.
// Secrets live ONLY on the server. The client never sees secret keys.
//   Stripe:  STRIPE_SECRET_KEY (sk_test_… / sk_live_…)
//            STRIPE_PUBLISHABLE_KEY (falls back to VITE_STRIPE_PUBLISHABLE_KEY)
//   PayPal:  PAYPAL_CLIENT_ID (falls back to VITE_PAYPAL_CLIENT_ID)
//            PAYPAL_CLIENT_SECRET, PAYPAL_ENV ('sandbox' | 'live')
// ─────────────────────────────────────────────────────────────────────────────
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? ''
const STRIPE_PUBLISHABLE_KEY =
  process.env.STRIPE_PUBLISHABLE_KEY ?? process.env.VITE_STRIPE_PUBLISHABLE_KEY ?? ''
const PAYPAL_CLIENT_ID =
  process.env.PAYPAL_CLIENT_ID ?? process.env.VITE_PAYPAL_CLIENT_ID ?? ''
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET ?? ''
const PAYPAL_ENV = (process.env.PAYPAL_ENV ?? 'sandbox').toLowerCase()
const PAYPAL_API_BASE =
  PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'

// A provider is "configured" only when its server secret is present and real.
const STRIPE_CONFIGURED = STRIPE_SECRET_KEY.startsWith('sk_')
const PAYPAL_CONFIGURED =
  PAYPAL_CLIENT_SECRET.length > 0 &&
  PAYPAL_CLIENT_ID.length > 0 &&
  !PAYPAL_CLIENT_ID.toLowerCase().startsWith('demo')

const toMinorUnits = (amount: number) => Math.round(amount * 100)

async function paypalAccessToken(): Promise<string> {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error('PayPal authentication failed')
  const data = (await res.json()) as { access_token: string }
  return data.access_token
}

function safeEqual(a: string, b: string): boolean {
  try {
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    return false
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Password hashing (scrypt — no external dependency)
// Stored as `scrypt$<saltHex>$<hashHex>`.
// ─────────────────────────────────────────────────────────────────────────────

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(password, salt, 64)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, saltHex, hashHex] = stored.split('$')
    if (scheme !== 'scrypt' || !saltHex || !hashHex) return false
    const salt = Buffer.from(saltHex, 'hex')
    const expected = Buffer.from(hashHex, 'hex')
    const actual = crypto.scryptSync(password, salt, expected.length)
    return crypto.timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

type Role = 'admin' | 'manager' | 'guest'

/** Reads + verifies the JWT role from the request context. */
function getRole(c: { get: (k: string) => unknown }): Role {
  const payload = c.get('jwtPayload') as { role?: string } | undefined
  return (payload?.role as Role) ?? 'guest'
}

const db = postgres(DATABASE_URL, {
  ssl: 'require',
  types: {
    // Postgres `numeric`/`decimal` (OID 1700) is returned as a string by
    // default to preserve precision. Our columns (prices, fees, rating,
    // bathrooms, lat/lng) are safe to use as JS numbers, so parse them here
    // — otherwise the client gets strings and `.toFixed()` blows up.
    numeric: {
      to: 1700,
      from: [1700],
      serialize: (x: number | string) => x.toString(),
      parse: (x: string) => parseFloat(x),
    },
  },
})

const app = new Hono()
app.use(
  '*',
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:4173',
      'http://localhost:4174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:4173',
      'http://127.0.0.1:4174',
    ],
  }),
)

// Never cache API responses — admin changes must reflect immediately on the
// public site (browsers and the Vercel CDN otherwise serve stale GET data).
app.use('*', async (c, next) => {
  await next()
  c.header('Cache-Control', 'no-store, no-cache, must-revalidate')
  c.header('Pragma', 'no-cache')
  c.header('Expires', '0')
})

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const ORDER_MAP: Record<string, string> = {
  featured: 'is_featured DESC, rating_avg DESC',
  price_asc: 'price_per_night ASC',
  price_desc: 'price_per_night DESC',
  rating: 'rating_avg DESC',
}

// ─────────────────────────────────────────────────────────────────────────────
// Public: Hero Slides
// ─────────────────────────────────────────────────────────────────────────────

// Lazy one-time table creation — runs on first hero-slides request, not at startup
let heroSlidesReady = false
async function ensureHeroSlidesTable() {
  if (heroSlidesReady) return
  await db.unsafe(`
    CREATE TABLE IF NOT EXISTS hero_slides (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      image       TEXT NOT NULL,
      location    TEXT NOT NULL,
      tagline     TEXT NOT NULL DEFAULT '',
      sort_order  INTEGER NOT NULL DEFAULT 0,
      is_active   BOOLEAN NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
  // Seed only if empty
  const [{ count }] = await db<[{ count: string }]>`SELECT COUNT(*)::text AS count FROM hero_slides`
  if (parseInt(count) === 0) {
    await db.unsafe(`
      INSERT INTO hero_slides (image, location, tagline, sort_order, is_active) VALUES
        ('https://images.unsplash.com/photo-1717097902827-9cccce31954a?w=1800&q=80', 'Sheboygan, Wisconsin',          'Sandy dunes & lakefront living on Lake Michigan', 0, true),
        ('https://images.unsplash.com/photo-1664580534860-2c0c909644d8?w=1800&q=80', 'Lake Michigan Shore, Wisconsin', 'Miles of untouched Great Lakes beaches',          1, true),
        ('https://images.unsplash.com/photo-1525225393258-f65b5a38a17a?w=1800&q=80', 'Milwaukee, Wisconsin',           'Misty lakefront sunrises from the heartland',     2, true),
        ('https://images.unsplash.com/photo-1713576325516-f21e4e6b9677?w=1800&q=80', 'Chicago Lakefront, Illinois',    'Prairie blooms meet skyline & marina views',       3, true),
        ('https://images.unsplash.com/photo-1567608475261-252cc172d02b?w=1800&q=80', 'Pictured Rocks, Michigan',       'Rugged cliffs & turquoise Great Lakes waters',     4, true)
    `)
  }
  heroSlidesReady = true
}

app.get('/api/hero-slides', async (c) => {
  await ensureHeroSlidesTable()
  const rows = await db<HeroSlide[]>`
    SELECT * FROM hero_slides WHERE is_active = true ORDER BY sort_order ASC
  `
  return c.json(rows)
})

// ─────────────────────────────────────────────────────────────────────────────
// Public: Properties
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/properties', async (c) => {
  const active = c.req.query('active') !== 'false'
  const type = c.req.query('type')
  const sort = c.req.query('sort') ?? 'featured'
  const orderClause = ORDER_MAP[sort] ?? ORDER_MAP.featured

  let rows: Property[]
  if (type && type !== 'all') {
    rows = await db<Property[]>`
      SELECT * FROM properties
      WHERE is_active = ${active} AND property_type = ${type}
      ORDER BY ${db.unsafe(orderClause)}
    `
  } else {
    rows = await db<Property[]>`
      SELECT * FROM properties
      WHERE is_active = ${active}
      ORDER BY ${db.unsafe(orderClause)}
    `
  }
  return c.json(rows)
})

app.get('/api/properties/:id', async (c) => {
  const { id } = c.req.param()
  const [property] = await db<Property[]>`SELECT * FROM properties WHERE id = ${id}`
  if (!property) return c.json({ error: 'Not found' }, 404)
  return c.json(property)
})

app.get('/api/properties/:id/booked-dates', async (c) => {
  const { id } = c.req.param()
  const rows = await db<Pick<Booking, 'check_in' | 'check_out'>[]>`
    SELECT check_in, check_out FROM bookings
    WHERE property_id = ${id} AND status IN ('confirmed', 'pending')
  `
  return c.json(rows)
})

// ─────────────────────────────────────────────────────────────────────────────
// Public: Bookings
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/bookings/:id', async (c) => {
  const { id } = c.req.param()
  const [booking] = await db<Booking[]>`SELECT * FROM bookings WHERE id = ${id}`
  if (!booking) return c.json({ error: 'Not found' }, 404)
  return c.json(booking)
})

app.post('/api/bookings', async (c) => {
  const body = await c.req.json<Partial<Booking>>()
  const {
    property_id, guest_id, check_in, check_out, guests_count,
    base_price, cleaning_fee, service_fee, total_price,
    status, payment_status, payment_method, payment_intent_id,
    special_requests, guest_name, guest_email,
  } = body

  const [booking] = await db<Booking[]>`
    INSERT INTO bookings (
      property_id, guest_id, check_in, check_out, guests_count,
      base_price, cleaning_fee, service_fee, total_price,
      status, payment_status, payment_method, payment_intent_id,
      special_requests, guest_name, guest_email
    ) VALUES (
      ${property_id!}, ${guest_id ?? null}, ${check_in!}, ${check_out!}, ${guests_count ?? 1},
      ${base_price ?? 0}, ${cleaning_fee ?? 0}, ${service_fee ?? 0}, ${total_price ?? 0},
      ${status ?? 'pending'}, ${payment_status ?? 'unpaid'},
      ${payment_method ?? 'stripe'}, ${payment_intent_id ?? null},
      ${special_requests ?? ''}, ${guest_name ?? null}, ${guest_email ?? null}
    ) RETURNING *
  `
  return c.json(booking, 201)
})

// ─────────────────────────────────────────────────────────────────────────────
// Public: Payments
// ─────────────────────────────────────────────────────────────────────────────

// Tells the client which providers are live and exposes the public identifiers
// (publishable key / client id) needed to mount the checkout widgets.
app.get('/api/payments/config', (c) => {
  return c.json({
    stripe: {
      configured: STRIPE_CONFIGURED,
      publishableKey: STRIPE_CONFIGURED ? STRIPE_PUBLISHABLE_KEY : '',
    },
    paypal: {
      configured: PAYPAL_CONFIGURED,
      clientId: PAYPAL_CONFIGURED ? PAYPAL_CLIENT_ID : '',
      env: PAYPAL_ENV,
    },
  })
})

// Creates a Stripe PaymentIntent and returns its client secret so the browser
// can confirm the card payment with Stripe Elements.
app.post('/api/payments/stripe/create-intent', async (c) => {
  if (!STRIPE_CONFIGURED) {
    return c.json({ configured: false, error: 'Stripe is not configured' }, 503)
  }
  const { amount, currency = 'usd', metadata } = await c.req.json<{
    amount: number
    currency?: string
    metadata?: Record<string, string>
  }>()
  if (!amount || amount <= 0) return c.json({ error: 'Invalid amount' }, 400)

  const params = new URLSearchParams()
  params.set('amount', String(toMinorUnits(amount)))
  params.set('currency', currency.toLowerCase())
  params.set('automatic_payment_methods[enabled]', 'true')
  if (metadata) {
    for (const [k, v] of Object.entries(metadata)) {
      params.set(`metadata[${k}]`, String(v))
    }
  }

  const res = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })
  const data = (await res.json()) as {
    id?: string
    client_secret?: string
    error?: { message?: string }
  }
  if (!res.ok) {
    return c.json({ error: data?.error?.message ?? 'Stripe error' }, 502)
  }
  return c.json({ clientSecret: data.client_secret, paymentIntentId: data.id })
})

// Creates a PayPal order to authorize/capture the booking total.
app.post('/api/payments/paypal/create-order', async (c) => {
  if (!PAYPAL_CONFIGURED) {
    return c.json({ configured: false, error: 'PayPal is not configured' }, 503)
  }
  const { amount, currency = 'USD' } = await c.req.json<{ amount: number; currency?: string }>()
  if (!amount || amount <= 0) return c.json({ error: 'Invalid amount' }, 400)

  const token = await paypalAccessToken()
  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        { amount: { currency_code: currency.toUpperCase(), value: amount.toFixed(2) } },
      ],
    }),
  })
  const data = (await res.json()) as { id?: string; message?: string }
  if (!res.ok) return c.json({ error: data?.message ?? 'PayPal error' }, 502)
  return c.json({ orderId: data.id })
})

// Captures a previously approved PayPal order, finalizing the payment.
app.post('/api/payments/paypal/capture-order', async (c) => {
  if (!PAYPAL_CONFIGURED) {
    return c.json({ configured: false, error: 'PayPal is not configured' }, 503)
  }
  const { orderId } = await c.req.json<{ orderId: string }>()
  if (!orderId) return c.json({ error: 'orderId is required' }, 400)

  const token = await paypalAccessToken()
  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  const data = (await res.json()) as {
    status?: string
    message?: string
    purchase_units?: Array<{ payments?: { captures?: Array<{ id?: string }> } }>
  }
  if (!res.ok) return c.json({ error: data?.message ?? 'PayPal capture error' }, 502)
  const captureId = data?.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null
  return c.json({ status: data.status, captureId })
})

// ─────────────────────────────────────────────────────────────────────────────
// Admin: Auth
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Admin Users (DB-backed) — single source of truth for credentials across all
// devices/locations. The env ADMIN_USERNAME/ADMIN_PASSWORD seeds the first
// admin account on initial startup only.
// ─────────────────────────────────────────────────────────────────────────────

let adminUsersReady = false
async function ensureAdminUsersTable() {
  if (adminUsersReady) return
  await db.unsafe(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name     TEXT NOT NULL DEFAULT '',
      email         TEXT NOT NULL DEFAULT '',
      role          TEXT NOT NULL DEFAULT 'guest' CHECK (role IN ('admin', 'manager', 'guest')),
      is_active     BOOLEAN NOT NULL DEFAULT true,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
  // Seed the initial admin from env, but only if no users exist yet.
  const [{ count }] = await db<[{ count: string }]>`SELECT COUNT(*)::text AS count FROM admin_users`
  if (parseInt(count) === 0 && ADMIN_USERNAME && ADMIN_PASSWORD) {
    await db`
      INSERT INTO admin_users (username, password_hash, full_name, role)
      VALUES (${ADMIN_USERNAME}, ${hashPassword(ADMIN_PASSWORD)}, 'Administrator', 'admin')
      ON CONFLICT (username) DO NOTHING
    `
  }
  adminUsersReady = true
}

type AdminUserRow = {
  id: string
  username: string
  password_hash: string
  full_name: string
  email: string
  role: Role
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Property Types (DB-backed) — configurable category pills/filters.
// ─────────────────────────────────────────────────────────────────────────────

let propertyTypesReady = false
async function ensurePropertyTypesTable() {
  if (propertyTypesReady) return
  await db.unsafe(`
    CREATE TABLE IF NOT EXISTS property_types (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      value       TEXT NOT NULL UNIQUE,
      label       TEXT NOT NULL,
      icon        TEXT NOT NULL DEFAULT 'other',
      sort_order  INTEGER NOT NULL DEFAULT 0,
      is_active   BOOLEAN NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
  // Custom categories require dropping the original CHECK constraint on
  // properties.property_type (seeded by the SQL migration), otherwise inserting
  // a property with a new type fails.
  await db.unsafe(`ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_property_type_check`)
  const [{ count }] = await db<[{ count: string }]>`SELECT COUNT(*)::text AS count FROM property_types`
  if (parseInt(count) === 0) {
    const seed = [
      { value: 'apartment', label: 'Apartment', icon: 'apartment' },
      { value: 'house', label: 'House', icon: 'house' },
      { value: 'villa', label: 'Villa', icon: 'villa' },
      { value: 'condo', label: 'Condo', icon: 'condo' },
      { value: 'studio', label: 'Studio', icon: 'studio' },
      { value: 'townhouse', label: 'Townhouse', icon: 'townhouse' },
      { value: 'cabin', label: 'Cabin', icon: 'cabin' },
      { value: 'cottage', label: 'Cottage', icon: 'cottage' },
      { value: 'other', label: 'Other', icon: 'other' },
    ].map((t, i) => ({ ...t, sort_order: i, is_active: true }))
    await db`INSERT INTO property_types ${db(seed)}`
  }
  propertyTypesReady = true
}

type PropertyTypeRow = {
  id: string
  value: string
  label: string
  icon: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

app.get('/api/property-types', async (c) => {
  await ensurePropertyTypesTable()
  const rows = await db<PropertyTypeRow[]>`
    SELECT * FROM property_types WHERE is_active = true ORDER BY sort_order ASC
  `
  return c.json(rows)
})

// ─────────────────────────────────────────────────────────────────────────────
// Navigation Links (DB-backed) — configurable header menu links.
// ─────────────────────────────────────────────────────────────────────────────

let navLinksReady = false
async function ensureNavLinksTable() {
  if (navLinksReady) return
  await db.unsafe(`
    CREATE TABLE IF NOT EXISTS nav_links (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      label       TEXT NOT NULL,
      href        TEXT NOT NULL,
      new_tab     BOOLEAN NOT NULL DEFAULT false,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      is_active   BOOLEAN NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
  navLinksReady = true
}

type NavLinkRow = {
  id: string
  label: string
  href: string
  new_tab: boolean
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

app.get('/api/nav-links', async (c) => {
  await ensureNavLinksTable()
  const rows = await db<NavLinkRow[]>`
    SELECT * FROM nav_links WHERE is_active = true ORDER BY sort_order ASC
  `
  return c.json(rows)
})

// ─────────────────────────────────────────────────────────────────────────────
// Site settings (single-row JSON blob). DB-backed so branding / hero text /
// footer / payment config sync across every device and visitor.
// ─────────────────────────────────────────────────────────────────────────────

let siteSettingsReady = false
async function ensureSiteSettingsTable() {
  if (siteSettingsReady) return
  await db.unsafe(`
    CREATE TABLE IF NOT EXISTS site_settings (
      id          SMALLINT PRIMARY KEY DEFAULT 1,
      data        JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT site_settings_single_row CHECK (id = 1)
    )
  `)
  siteSettingsReady = true
}

app.get('/api/settings', async (c) => {
  await ensureSiteSettingsTable()
  const [row] = await db<{ data: Record<string, unknown> }[]>`
    SELECT data FROM site_settings WHERE id = 1
  `
  return c.json(row?.data ?? {})
})

// ─────────────────────────────────────────────────────────────────────────────
// Admin: Auth
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/admin/login', async (c) => {
  await ensureAdminUsersTable()
  const body = await c.req.json<{ username?: string; password?: string }>()
  const { username = '', password = '' } = body

  const [user] = await db<AdminUserRow[]>`
    SELECT * FROM admin_users WHERE username = ${username}
  `

  // Fallback to env credentials when the DB has no matching user yet — keeps
  // the very first login working before any account is seeded.
  let authed = false
  let role: Role = 'guest'
  let sub = username
  if (user && user.is_active && verifyPassword(password, user.password_hash)) {
    authed = true
    role = user.role
    sub = user.username
  } else if (!user && ADMIN_PASSWORD && safeEqual(username, ADMIN_USERNAME) && safeEqual(password, ADMIN_PASSWORD)) {
    authed = true
    role = 'admin'
  }

  if (!authed) return c.json({ error: 'Invalid credentials' }, 401)

  const token = await sign(
    { sub, role, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 },
    JWT_SECRET,
    'HS256',
  )
  return c.json({ token, role })
})

app.get('/api/admin/me', jwt({ secret: JWT_SECRET, alg: 'HS256' }), async (c) => {
  const payload = c.get('jwtPayload') as { sub: string; role: string }
  return c.json({ username: payload.sub, role: payload.role })
})

// Protect all remaining admin routes with JWT
app.use('/api/admin/*', jwt({ secret: JWT_SECRET, alg: 'HS256' }))

// ─────────────────────────────────────────────────────────────────────────────
// Admin: Site settings
// ─────────────────────────────────────────────────────────────────────────────

app.patch('/api/admin/settings', async (c) => {
  if (getRole(c) !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  await ensureSiteSettingsTable()
  const body = await c.req.json<Record<string, unknown>>()
  const json = db.json(body as Parameters<typeof db.json>[0])
  const [row] = await db<{ data: Record<string, unknown> }[]>`
    INSERT INTO site_settings (id, data, updated_at)
    VALUES (1, ${json}, now())
    ON CONFLICT (id) DO UPDATE
      SET data = site_settings.data || ${json}, updated_at = now()
    RETURNING data
  `
  return c.json(row.data)
})

// ─────────────────────────────────────────────────────────────────────────────
// Admin: Property Types
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/admin/property-types', async (c) => {
  await ensurePropertyTypesTable()
  const rows = await db<PropertyTypeRow[]>`SELECT * FROM property_types ORDER BY sort_order ASC`
  return c.json(rows)
})

app.post('/api/admin/property-types', async (c) => {
  await ensurePropertyTypesTable()
  if (getRole(c) !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  const body = await c.req.json<Partial<PropertyTypeRow>>()
  const value = (body.value ?? '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
  const { label, icon = 'other', sort_order = 0, is_active = true } = body
  if (!value || !label) return c.json({ error: 'value and label are required' }, 400)
  try {
    const [row] = await db<PropertyTypeRow[]>`
      INSERT INTO property_types (value, label, icon, sort_order, is_active)
      VALUES (${value}, ${label}, ${icon}, ${sort_order}, ${is_active})
      RETURNING *
    `
    return c.json(row, 201)
  } catch {
    return c.json({ error: 'A category with that value already exists' }, 409)
  }
})

app.patch('/api/admin/property-types/:id', async (c) => {
  if (getRole(c) !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  const { id } = c.req.param()
  const body = await c.req.json<Record<string, unknown>>()
  const ALLOWED = new Set(['label', 'icon', 'sort_order', 'is_active'])
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED.has(k)) updates[k] = v
  }
  const [row] = await db<PropertyTypeRow[]>`
    UPDATE property_types SET ${db(updates)} WHERE id = ${id} RETURNING *
  `
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.delete('/api/admin/property-types/:id', async (c) => {
  if (getRole(c) !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  const { id } = c.req.param()
  await db`DELETE FROM property_types WHERE id = ${id}`
  return c.json({ ok: true })
})

// ─────────────────────────────────────────────────────────────────────────────
// Admin: Users (admin role only)
// ─────────────────────────────────────────────────────────────────────────────

const publicUser = (u: AdminUserRow) => ({
  id: u.id, username: u.username, full_name: u.full_name,
  email: u.email, role: u.role, is_active: u.is_active,
  created_at: u.created_at, updated_at: u.updated_at,
})

app.get('/api/admin/users', async (c) => {
  await ensureAdminUsersTable()
  if (getRole(c) !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  const rows = await db<AdminUserRow[]>`SELECT * FROM admin_users ORDER BY created_at ASC`
  return c.json(rows.map(publicUser))
})

app.post('/api/admin/users', async (c) => {
  await ensureAdminUsersTable()
  if (getRole(c) !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  const body = await c.req.json<{
    username?: string; password?: string; full_name?: string
    email?: string; role?: Role; is_active?: boolean
  }>()
  const username = (body.username ?? '').trim()
  const { password = '', full_name = '', email = '', role = 'guest', is_active = true } = body
  if (!username || !password) return c.json({ error: 'username and password are required' }, 400)
  if (!['admin', 'manager', 'guest'].includes(role)) return c.json({ error: 'Invalid role' }, 400)
  try {
    const [row] = await db<AdminUserRow[]>`
      INSERT INTO admin_users (username, password_hash, full_name, email, role, is_active)
      VALUES (${username}, ${hashPassword(password)}, ${full_name}, ${email}, ${role}, ${is_active})
      RETURNING *
    `
    return c.json(publicUser(row), 201)
  } catch {
    return c.json({ error: 'A user with that username already exists' }, 409)
  }
})

app.patch('/api/admin/users/:id', async (c) => {
  await ensureAdminUsersTable()
  if (getRole(c) !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  const { id } = c.req.param()
  const body = await c.req.json<Record<string, unknown>>()

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.full_name === 'string') updates.full_name = body.full_name
  if (typeof body.email === 'string') updates.email = body.email
  if (typeof body.is_active === 'boolean') updates.is_active = body.is_active
  if (typeof body.role === 'string' && ['admin', 'manager', 'guest'].includes(body.role)) {
    updates.role = body.role
  }
  if (typeof body.password === 'string' && body.password.length > 0) {
    updates.password_hash = hashPassword(body.password)
  }

  // Never allow removing/demoting the last active admin.
  if (updates.role !== undefined && updates.role !== 'admin' || updates.is_active === false) {
    const [target] = await db<AdminUserRow[]>`SELECT * FROM admin_users WHERE id = ${id}`
    if (target?.role === 'admin') {
      const [{ count }] = await db<[{ count: string }]>`
        SELECT COUNT(*)::text AS count FROM admin_users WHERE role = 'admin' AND is_active = true
      `
      if (parseInt(count) <= 1) return c.json({ error: 'Cannot demote or disable the last active admin' }, 409)
    }
  }

  const [row] = await db<AdminUserRow[]>`
    UPDATE admin_users SET ${db(updates)} WHERE id = ${id} RETURNING *
  `
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(publicUser(row))
})

app.delete('/api/admin/users/:id', async (c) => {
  await ensureAdminUsersTable()
  if (getRole(c) !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  const { id } = c.req.param()
  const [target] = await db<AdminUserRow[]>`SELECT * FROM admin_users WHERE id = ${id}`
  if (!target) return c.json({ error: 'Not found' }, 404)
  if (target.role === 'admin') {
    const [{ count }] = await db<[{ count: string }]>`
      SELECT COUNT(*)::text AS count FROM admin_users WHERE role = 'admin' AND is_active = true
    `
    if (parseInt(count) <= 1) return c.json({ error: 'Cannot delete the last active admin' }, 409)
  }
  await db`DELETE FROM admin_users WHERE id = ${id}`
  return c.json({ ok: true })
})

// ─────────────────────────────────────────────────────────────────────────────
// Admin: Properties
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/admin/properties', async (c) => {
  const rows = await db<Property[]>`SELECT * FROM properties ORDER BY created_at DESC`
  return c.json(rows)
})

app.post('/api/admin/properties', async (c) => {
  const body = await c.req.json<Partial<Property>>()
  const {
    title, description = '', address = '', city = '', state = '',
    country = 'US', zip_code = '',
    price_per_night, cleaning_fee = 0, service_fee_percent = 12,
    bedrooms = 1, bathrooms = 1, max_guests = 2,
    property_type = 'apartment',
    amenities = [], rules = {},
    check_in_time = '15:00', check_out_time = '11:00',
    min_stay_nights = 1, max_stay_nights = 365,
    is_active = true, is_featured = false, owner_id = null,
  } = body

  const [property] = await db<Property[]>`
    INSERT INTO properties (
      title, description, address, city, state, country, zip_code,
      price_per_night, cleaning_fee, service_fee_percent,
      bedrooms, bathrooms, max_guests, property_type,
      amenities, rules, check_in_time, check_out_time,
      min_stay_nights, max_stay_nights, is_active, is_featured, owner_id
    ) VALUES (
      ${title!}, ${description}, ${address}, ${city}, ${state}, ${country}, ${zip_code},
      ${price_per_night!}, ${cleaning_fee}, ${service_fee_percent},
      ${bedrooms}, ${bathrooms}, ${max_guests}, ${property_type},
      ${db.json(amenities)}, ${db.json(rules)}, ${check_in_time}, ${check_out_time},
      ${min_stay_nights}, ${max_stay_nights}, ${is_active}, ${is_featured}, ${owner_id}
    ) RETURNING *
  `
  return c.json(property, 201)
})

app.get('/api/admin/properties/:id', async (c) => {
  const { id } = c.req.param()
  const [property] = await db<Property[]>`SELECT * FROM properties WHERE id = ${id}`
  if (!property) return c.json({ error: 'Not found' }, 404)
  const photos = await db<PropertyPhoto[]>`
    SELECT * FROM property_photos WHERE property_id = ${id} ORDER BY sort_order
  `
  return c.json({ ...property, photos })
})

app.patch('/api/admin/properties/:id', async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json<Record<string, unknown>>()

  const ALLOWED = new Set([
    'title', 'description', 'address', 'city', 'state', 'country', 'zip_code',
    'price_per_night', 'cleaning_fee', 'service_fee_percent',
    'bedrooms', 'bathrooms', 'max_guests', 'property_type',
    'amenities', 'rules', 'check_in_time', 'check_out_time',
    'min_stay_nights', 'max_stay_nights', 'is_active', 'is_featured',
    'owner_id', 'updated_at',
  ])

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED.has(k)) {
      // Serialize jsonb columns
      updates[k] = (k === 'amenities' || k === 'rules') ? db.json(v as never) : v
    }
  }

  const [property] = await db<Property[]>`
    UPDATE properties SET ${db(updates)} WHERE id = ${id} RETURNING *
  `
  return c.json(property)
})

app.delete('/api/admin/properties/:id', async (c) => {
  const { id } = c.req.param()
  try {
    await db`DELETE FROM properties WHERE id = ${id}`
    return c.json({ ok: true })
  } catch {
    return c.json({ error: 'Cannot delete property with existing bookings' }, 409)
  }
})

app.post('/api/admin/properties/:id/photos', async (c) => {
  const { id } = c.req.param()
  const photos = await c.req.json<Array<{ url: string; is_primary: boolean; sort_order: number }>>()

  await db`DELETE FROM property_photos WHERE property_id = ${id}`
  if (photos.length > 0) {
    await db`
      INSERT INTO property_photos ${db(photos.map(p => ({ ...p, property_id: id })))}
    `
  }
  return c.json({ ok: true })
})

// ─────────────────────────────────────────────────────────────────────────────
// Admin: Bookings
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/admin/bookings', async (c) => {
  const bookings = await db<Booking[]>`SELECT * FROM bookings ORDER BY created_at DESC`
  const properties = await db<Pick<Property, 'id' | 'title' | 'city' | 'state' | 'property_type'>[]>`
    SELECT id, title, city, state, property_type FROM properties
  `
  const propMap = new Map(properties.map(p => [p.id, p]))
  return c.json(bookings.map(b => ({ ...b, property: propMap.get(b.property_id) ?? null })))
})

app.get('/api/admin/bookings/:id', async (c) => {
  const { id } = c.req.param()
  const [booking] = await db<Booking[]>`SELECT * FROM bookings WHERE id = ${id}`
  if (!booking) return c.json({ error: 'Not found' }, 404)
  let property: Property | null = null
  if (booking.property_id) {
    const [p] = await db<Property[]>`SELECT * FROM properties WHERE id = ${booking.property_id}`
    property = p ?? null
  }
  return c.json({ booking, property })
})

app.patch('/api/admin/bookings/:id', async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json<Record<string, unknown>>()
  const ALLOWED = new Set(['status', 'payment_status'])
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED.has(k)) updates[k] = v
  }
  const [booking] = await db<Booking[]>`
    UPDATE bookings SET ${db(updates)} WHERE id = ${id} RETURNING *
  `
  return c.json(booking)
})

app.delete('/api/admin/bookings/:id', async (c) => {
  const { id } = c.req.param()
  const [deleted] = await db<Booking[]>`DELETE FROM bookings WHERE id = ${id} RETURNING id`
  if (!deleted) return c.json({ error: 'Not found' }, 404)
  return c.json({ ok: true })
})

// Reset revenue: clear paid/authorized markers so computed revenue resets to $0.
// Bookings themselves are kept; only their payment_status is reset to 'unpaid'.
app.post('/api/admin/revenue/reset', async (c) => {
  if (getRole(c) !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  const rows = await db<{ id: string }[]>`
    UPDATE bookings
    SET payment_status = 'unpaid', updated_at = ${new Date().toISOString()}
    WHERE payment_status IN ('paid', 'authorized')
    RETURNING id
  `
  return c.json({ ok: true, updated: rows.length })
})

// ─────────────────────────────────────────────────────────────────────────────
// Admin: Hero Slides
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/admin/hero-slides', async (c) => {
  await ensureHeroSlidesTable()
  const rows = await db<HeroSlide[]>`SELECT * FROM hero_slides ORDER BY sort_order ASC`
  return c.json(rows)
})

app.post('/api/admin/hero-slides', async (c) => {
  await ensureHeroSlidesTable()
  const body = await c.req.json<Partial<HeroSlide>>()
  const { image, location, tagline = '', sort_order = 0, is_active = true } = body
  if (!image || !location) return c.json({ error: 'image and location are required' }, 400)
  const [row] = await db<HeroSlide[]>`
    INSERT INTO hero_slides (image, location, tagline, sort_order, is_active)
    VALUES (${image}, ${location}, ${tagline}, ${sort_order}, ${is_active})
    RETURNING *
  `
  return c.json(row, 201)
})

app.patch('/api/admin/hero-slides/:id', async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json<Record<string, unknown>>()
  const ALLOWED = new Set(['image', 'location', 'tagline', 'sort_order', 'is_active'])
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED.has(k)) updates[k] = v
  }
  const [row] = await db<HeroSlide[]>`
    UPDATE hero_slides SET ${db(updates)} WHERE id = ${id} RETURNING *
  `
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.delete('/api/admin/hero-slides/:id', async (c) => {
  const { id } = c.req.param()
  await db`DELETE FROM hero_slides WHERE id = ${id}`
  return c.json({ ok: true })
})

// ─────────────────────────────────────────────────────────────────────────────
// Admin: Navigation Links
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/admin/nav-links', async (c) => {
  await ensureNavLinksTable()
  const rows = await db<NavLinkRow[]>`SELECT * FROM nav_links ORDER BY sort_order ASC`
  return c.json(rows)
})

app.post('/api/admin/nav-links', async (c) => {
  await ensureNavLinksTable()
  const body = await c.req.json<Partial<NavLinkRow>>()
  const { label, href, new_tab = false, sort_order = 0, is_active = true } = body
  if (!label || !href) return c.json({ error: 'label and href are required' }, 400)
  const [row] = await db<NavLinkRow[]>`
    INSERT INTO nav_links (label, href, new_tab, sort_order, is_active)
    VALUES (${label}, ${href}, ${new_tab}, ${sort_order}, ${is_active})
    RETURNING *
  `
  return c.json(row, 201)
})

app.patch('/api/admin/nav-links/:id', async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json<Record<string, unknown>>()
  const ALLOWED = new Set(['label', 'href', 'new_tab', 'sort_order', 'is_active'])
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED.has(k)) updates[k] = v
  }
  const [row] = await db<NavLinkRow[]>`
    UPDATE nav_links SET ${db(updates)} WHERE id = ${id} RETURNING *
  `
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.delete('/api/admin/nav-links/:id', async (c) => {
  const { id } = c.req.param()
  await db`DELETE FROM nav_links WHERE id = ${id}`
  return c.json({ ok: true })
})

// ─────────────────────────────────────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.API_PORT ?? '3001')

if (process.env.VERCEL !== '1') {
  serve({ fetch: app.fetch, port: PORT }, () =>
    console.log(`✓ API server → http://localhost:${PORT}`),
  )
}

export { app }

export default app
