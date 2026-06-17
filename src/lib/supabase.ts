// Data access goes through the Neon-backed API layer in `src/lib/api.ts`.
// This module only provides the shared row types used across the app and server.

export type Property = {
  id: string
  owner_id: string | null
  title: string
  description: string
  address: string
  city: string
  state: string
  country: string
  zip_code: string
  latitude: number | null
  longitude: number | null
  price_per_night: number
  cleaning_fee: number
  service_fee_percent: number
  bedrooms: number
  bathrooms: number
  max_guests: number
  property_type: string
  amenities: string[]
  rules: Record<string, boolean | string>
  check_in_time: string
  check_out_time: string
  min_stay_nights: number
  max_stay_nights: number
  is_active: boolean
  is_featured: boolean
  rating_avg: number
  review_count: number
  created_at: string
  updated_at: string
}

export type PropertyPhoto = {
  id: string
  property_id: string
  url: string
  caption: string
  is_primary: boolean
  sort_order: number
  created_at: string
}

export type Booking = {
  id: string
  property_id: string
  guest_id: string | null
  check_in: string
  check_out: string
  guests_count: number
  nights: number
  base_price: number
  cleaning_fee: number
  service_fee: number
  total_price: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  payment_status: 'unpaid' | 'authorized' | 'paid' | 'refunded' | 'failed'
  payment_intent_id: string | null
  payment_method: 'stripe' | 'paypal'
  special_requests: string
  guest_name: string | null
  guest_email: string | null
  confirmation_email_sent_at: string | null
  confirmation_email_error: string | null
  created_at: string
  updated_at: string
}

export type Profile = {
  id: string
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  role: 'admin' | 'host' | 'guest'
  created_at: string
  updated_at: string
}

export type Review = {
  id: string
  booking_id: string | null
  property_id: string
  reviewer_id: string
  rating: number
  comment: string
  created_at: string
}

export type HeroSlide = {
  id: string
  image: string
  location: string
  tagline: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}
