import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { MapPin, Star, Bed, Bath, Users, Check, Clock, CalendarDays, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Calendar } from '@/components/ui/calendar'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { type Property } from '@/lib/supabase'
import { api } from '@/lib/api'
import { useLiveData } from '@/hooks/use-live-data'
import { getPropertyImage } from '@/lib/constants'
import { addDays, differenceInDays, format, isBefore, startOfDay } from 'date-fns'
import type { DateRange } from 'react-day-picker'

export function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [guests, setGuests] = useState('1')
  const [bookedDates, setBookedDates] = useState<Date[]>([])

  const photos = [
    getPropertyImage(property?.property_type || 'apartment', 0),
    getPropertyImage(property?.property_type || 'apartment', 1),
    getPropertyImage(property?.property_type || 'apartment', 2),
  ]

  useEffect(() => {
    if (id) {
      loadProperty(id)
      loadBookedDates(id)
    }
  }, [id])

  // Reflect admin edits live (broadcast + focus + poll).
  useLiveData(() => {
    if (id) {
      loadProperty(id)
      loadBookedDates(id)
    }
  })

  async function loadProperty(propertyId: string) {
    try {
      const data = await api.properties.get(propertyId)
      setProperty(data)
    } catch {
      setProperty(null)
    } finally {
      setLoading(false)
    }
  }

  async function loadBookedDates(propertyId: string) {
    try {
      const bookings = await api.properties.getBookedDates(propertyId)
      const dates: Date[] = []
      bookings.forEach(b => {
        let d = new Date(b.check_in)
        const end = new Date(b.check_out)
        while (isBefore(d, end)) {
          dates.push(new Date(d))
          d = addDays(d, 1)
        }
      })
      setBookedDates(dates)
    } catch {
      setBookedDates([])
    }
  }

  const nights = dateRange?.from && dateRange?.to
    ? differenceInDays(dateRange.to, dateRange.from)
    : 0

  const baseCost = property ? nights * property.price_per_night : 0
  const cleaningFee = property?.cleaning_fee || 0
  const serviceFee = property ? baseCost * (property.service_fee_percent / 100) : 0
  const totalCost = baseCost + cleaningFee + serviceFee

  function handleBooking() {
    if (!dateRange?.from || !dateRange?.to || !property) return
    const params = new URLSearchParams({
      checkIn: format(dateRange.from, 'yyyy-MM-dd'),
      checkOut: format(dateRange.to, 'yyyy-MM-dd'),
      guests,
    })
    navigate(`/book/${property.id}?${params.toString()}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <Skeleton className="h-[400px] w-full rounded-2xl" />
          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-32 w-full" />
            </div>
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto max-w-7xl px-4 py-20 text-center">
          <h1 className="text-2xl font-semibold">Property not found</h1>
          <Button className="mt-4" asChild><Link to="/">Back to listings</Link></Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto max-w-7xl px-4 py-6">
        {/* Breadcrumb */}
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="size-3" />
          <span className="capitalize">{property.property_type}s</span>
          <ChevronRight className="size-3" />
          <span className="text-foreground font-medium truncate">{property.title}</span>
        </div>

        {/* Photo Gallery */}
        <div className="grid grid-cols-4 grid-rows-2 gap-2 rounded-2xl overflow-hidden h-[400px] border ring-1 ring-black/5 shadow-elevated">
          <div className="group col-span-2 row-span-2 overflow-hidden">
            <img src={photos[0]} alt={property.title} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
          </div>
          {photos.slice(1).map((photo, i) => (
            <div key={i} className="group col-span-2 row-span-1 overflow-hidden">
              <img src={photo} alt={`View ${i + 2}`} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Title & Overview */}
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  {property.is_featured && <Badge className="mb-2">Featured</Badge>}
                  <h1 className="scroll-m-20 text-3xl font-bold tracking-tight">{property.title}</h1>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="size-4" />{property.address}, {property.city}, {property.state} {property.zip_code}</span>
                  </div>
                </div>
                {property.rating_avg > 0 && (
                  <div className="shrink-0 text-center">
                    <div className="flex items-center gap-1 text-lg font-bold">
                      <Star className="size-5 fill-current text-amber-500" />
                      {property.rating_avg.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">{property.review_count} reviews</p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-4">
                <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
                  <Bed className="size-4 text-muted-foreground" />
                  <span>{property.bedrooms === 0 ? 'Studio' : `${property.bedrooms} Bedroom${property.bedrooms > 1 ? 's' : ''}`}</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
                  <Bath className="size-4 text-muted-foreground" />
                  <span>{property.bathrooms} Bathroom{property.bathrooms > 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
                  <Users className="size-4 text-muted-foreground" />
                  <span>Up to {property.max_guests} guests</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm capitalize">
                  <span className="text-base">{property.property_type === 'cabin' ? '🌲' : property.property_type === 'villa' ? '🏛️' : '🏠'}</span>
                  <span>{property.property_type}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div>
              <h2 className="scroll-m-20 text-xl font-semibold tracking-tight">About this property</h2>
              <p className="mt-3 leading-7 text-muted-foreground">{property.description}</p>
            </div>

            <Separator />

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <div>
                <h2 className="scroll-m-20 text-xl font-semibold tracking-tight">What this place offers</h2>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {(property.amenities as string[]).map(amenity => (
                    <div key={amenity} className="flex items-center gap-2 text-sm">
                      <Check className="size-4 shrink-0 text-primary" />
                      {amenity}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Check-in info */}
            <div>
              <h2 className="scroll-m-20 text-xl font-semibold tracking-tight">House rules</h2>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Clock className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Check-in</p>
                    <p className="text-sm text-muted-foreground">After {property.check_in_time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Check-out</p>
                    <p className="text-sm text-muted-foreground">Before {property.check_out_time}</p>
                  </div>
                </div>
                {property.min_stay_nights > 1 && (
                  <div className="flex items-center gap-3">
                    <CalendarDays className="size-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Minimum stay</p>
                      <p className="text-sm text-muted-foreground">{property.min_stay_nights} nights</p>
                    </div>
                  </div>
                )}
              </div>
              {property.rules && Object.keys(property.rules).length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {Object.entries(property.rules as Record<string, boolean | string>).map(([rule, value]) => (
                    <div key={rule} className="flex items-center gap-2 text-sm">
                      <span className={value === true || value === 'true' ? 'text-red-500' : 'text-green-500'}>
                        {value === true || value === 'true' ? '✗' : '✓'}
                      </span>
                      <span className="capitalize text-muted-foreground">{rule.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Booking Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20 glass-strong shadow-elevated">
              <CardHeader>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold tracking-tight">${property.price_per_night.toFixed(0)}</span>
                  <span className="text-muted-foreground">/ night</span>
                </div>
                {property.rating_avg > 0 && (
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="size-3.5 fill-current text-amber-500" />
                    <span className="font-medium">{property.rating_avg.toFixed(2)}</span>
                    <span className="text-muted-foreground">· {property.review_count} reviews</span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date Picker */}
                <div>
                  <p className="mb-2 text-sm font-medium">Select dates</p>
                  <div className="rounded-lg border p-2">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      disabled={(date) => {
                        const today = startOfDay(new Date())
                        if (isBefore(date, today)) return true
                        return bookedDates.some(d =>
                          format(d, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                        )
                      }}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Guests */}
                <div>
                  <p className="mb-2 text-sm font-medium">Guests</p>
                  <Select value={guests} onValueChange={setGuests}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: property.max_guests }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {i + 1} guest{i > 0 ? 's' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Cost Breakdown */}
                {nights > 0 && (
                  <div className="space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
                    <div className="flex justify-between">
                      <span>${property.price_per_night.toFixed(0)} × {nights} night{nights > 1 ? 's' : ''}</span>
                      <span>${baseCost.toFixed(2)}</span>
                    </div>
                    {cleaningFee > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Cleaning fee</span>
                        <span>${cleaningFee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-muted-foreground">
                      <span>Service fee ({property.service_fee_percent}%)</span>
                      <span>${serviceFee.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>${totalCost.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleBooking}
                  disabled={!dateRange?.from || !dateRange?.to || nights < (property.min_stay_nights || 1)}
                >
                  {!dateRange?.from ? 'Select dates to book' : nights < (property.min_stay_nights || 1) ? `Minimum ${property.min_stay_nights} nights` : 'Reserve Now'}
                </Button>

                <p className="text-center text-xs text-muted-foreground">You won't be charged yet</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
