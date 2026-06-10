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

function safeEqual(a: string, b: string): boolean {
  try {
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    return false
  }
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
  cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }),
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
// Admin: Auth
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/admin/login', async (c) => {
  const body = await c.req.json<{ username?: string; password?: string }>()
  const { username = '', password = '' } = body
  if (!safeEqual(username, ADMIN_USERNAME) || !safeEqual(password, ADMIN_PASSWORD)) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }
  const token = await sign(
    { sub: username, role: 'admin', exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 },
    JWT_SECRET,
    'HS256',
  )
  return c.json({ token })
})

app.get('/api/admin/me', jwt({ secret: JWT_SECRET, alg: 'HS256' }), async (c) => {
  const payload = c.get('jwtPayload') as { sub: string; role: string }
  return c.json({ username: payload.sub, role: payload.role })
})

// Protect all remaining admin routes with JWT
app.use('/api/admin/*', jwt({ secret: JWT_SECRET, alg: 'HS256' }))

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
