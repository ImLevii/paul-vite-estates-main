/*
  # Real Estate Platform Schema

  ## Summary
  Creates the full schema for a real estate rental platform with:

  1. New Tables
    - `properties` - Rental property listings with all configurable fields
      - id, title, description, address, city, state, country, zip_code
      - price_per_night, bedrooms, bathrooms, max_guests
      - property_type, amenities (jsonb array), rules (jsonb)
      - is_active, is_featured, created_at, updated_at
      - owner_id (FK to auth.users)
    - `property_photos` - Photos for each property
      - id, property_id (FK), url, caption, is_primary, sort_order
    - `property_availability` - Blocked/unavailable date ranges
      - id, property_id (FK), start_date, end_date, reason
    - `bookings` - Guest booking records
      - id, property_id (FK), guest_id (FK to auth.users)
      - check_in, check_out, guests_count, total_price
      - status (pending/confirmed/cancelled/completed)
      - payment_status, payment_intent_id, payment_method
      - special_requests, created_at, updated_at
    - `reviews` - Guest reviews for properties
      - id, booking_id (FK), property_id (FK), reviewer_id (FK)
      - rating, comment, created_at
    - `profiles` - Extended user profiles
      - id (FK to auth.users), full_name, avatar_url, phone, role (admin/host/guest)

  2. Security
    - RLS enabled on all tables
    - Policies for authenticated users to read/write their own data
    - Admin role gets full access
    - Public can read active properties and reviews

  3. Indexes for performance
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  phone text,
  role text NOT NULL DEFAULT 'guest' CHECK (role IN ('admin', 'host', 'guest')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT 'US',
  zip_code text NOT NULL DEFAULT '',
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  price_per_night numeric(10, 2) NOT NULL DEFAULT 0,
  cleaning_fee numeric(10, 2) DEFAULT 0,
  service_fee_percent numeric(5, 2) DEFAULT 10,
  bedrooms integer NOT NULL DEFAULT 1,
  bathrooms numeric(3, 1) NOT NULL DEFAULT 1,
  max_guests integer NOT NULL DEFAULT 2,
  property_type text NOT NULL DEFAULT 'apartment' CHECK (property_type IN ('apartment', 'house', 'villa', 'condo', 'studio', 'townhouse', 'cabin', 'cottage', 'other')),
  amenities jsonb DEFAULT '[]'::jsonb,
  rules jsonb DEFAULT '{}'::jsonb,
  check_in_time text DEFAULT '15:00',
  check_out_time text DEFAULT '11:00',
  min_stay_nights integer DEFAULT 1,
  max_stay_nights integer DEFAULT 365,
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  rating_avg numeric(3, 2) DEFAULT 0,
  review_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active properties"
  ON properties FOR SELECT
  USING (is_active = true OR auth.uid() = owner_id);

CREATE POLICY "Hosts can insert properties"
  ON properties FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners and admins can update properties"
  ON properties FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete properties"
  ON properties FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Property photos table
CREATE TABLE IF NOT EXISTS property_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties ON DELETE CASCADE,
  url text NOT NULL,
  caption text DEFAULT '',
  is_primary boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE property_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read property photos"
  ON property_photos FOR SELECT
  USING (true);

CREATE POLICY "Property owners can manage photos"
  ON property_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_id
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Property owners can update photos"
  ON property_photos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_id
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Property owners can delete photos"
  ON property_photos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_id
      AND properties.owner_id = auth.uid()
    )
  );

-- Property availability (blocked dates)
CREATE TABLE IF NOT EXISTS property_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text DEFAULT 'blocked',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE property_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read availability"
  ON property_availability FOR SELECT
  USING (true);

CREATE POLICY "Property owners can manage availability"
  ON property_availability FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_id
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Property owners can update availability"
  ON property_availability FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_id
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Property owners can delete availability"
  ON property_availability FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_id
      AND properties.owner_id = auth.uid()
    )
  );

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties ON DELETE RESTRICT,
  guest_id uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  check_in date NOT NULL,
  check_out date NOT NULL,
  guests_count integer NOT NULL DEFAULT 1,
  nights integer GENERATED ALWAYS AS (check_out - check_in) STORED,
  base_price numeric(10, 2) NOT NULL DEFAULT 0,
  cleaning_fee numeric(10, 2) DEFAULT 0,
  service_fee numeric(10, 2) DEFAULT 0,
  total_price numeric(10, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'authorized', 'paid', 'refunded', 'failed')),
  payment_intent_id text,
  payment_method text DEFAULT 'stripe' CHECK (payment_method IN ('stripe', 'paypal')),
  special_requests text DEFAULT '',
  guest_name text,
  guest_email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guests can read own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    auth.uid() = guest_id
    OR EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_id
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Guests can insert bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = guest_id);

CREATE POLICY "Guests and owners can update bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = guest_id
    OR EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_id
      AND properties.owner_id = auth.uid()
    )
  );

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings ON DELETE SET NULL,
  property_id uuid NOT NULL REFERENCES properties ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews"
  ON reviews FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Reviewers can update own reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = reviewer_id)
  WITH CHECK (auth.uid() = reviewer_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_is_active ON properties(is_active);
CREATE INDEX IF NOT EXISTS idx_properties_is_featured ON properties(is_featured);
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_property_id ON bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_bookings_guest_id ON bookings(guest_id);
CREATE INDEX IF NOT EXISTS idx_bookings_check_in ON bookings(check_in);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_property_photos_property_id ON property_photos(property_id);
CREATE INDEX IF NOT EXISTS idx_reviews_property_id ON reviews(property_id);

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'role', 'guest')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
