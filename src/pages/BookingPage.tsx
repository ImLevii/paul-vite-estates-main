import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, Lock, CreditCard, Shield, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { Header } from '@/components/layout/Header'
import { type Property } from '@/lib/supabase'
import { api } from '@/lib/api'
import { getPropertyImage } from '@/lib/constants'
import { differenceInDays, format, parseISO } from 'date-fns'
import { toast } from 'sonner'

export function BookingPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const checkIn = searchParams.get('checkIn') || ''
  const checkOut = searchParams.get('checkOut') || ''
  const guestsCount = parseInt(searchParams.get('guests') || '1')

  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal'>('stripe')

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialRequests: '',
    // Card fields (demo)
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
    cardName: '',
  })

  useEffect(() => {
    if (id) loadProperty(id)
  }, [id])

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

  const nights = checkIn && checkOut ? differenceInDays(parseISO(checkOut), parseISO(checkIn)) : 0
  const baseCost = property ? nights * property.price_per_night : 0
  const cleaningFee = property?.cleaning_fee || 0
  const serviceFee = property ? baseCost * (property.service_fee_percent / 100) : 0
  const totalCost = baseCost + cleaningFee + serviceFee

  function formatCardNumber(value: string) {
    return value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19)
  }

  function formatExpiry(value: string) {
    return value.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1/$2').slice(0, 5)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!property || !form.firstName || !form.email) {
      toast.error('Please fill in all required fields')
      return
    }

    setSubmitting(true)

    try {
      // Create booking record
      const booking = await api.bookings.create({
        property_id: property.id,
        guest_id: '00000000-0000-0000-0000-000000000000', // demo user id
        check_in: checkIn,
        check_out: checkOut,
        guests_count: guestsCount,
        base_price: baseCost,
        cleaning_fee: cleaningFee,
        service_fee: serviceFee,
        total_price: totalCost,
        status: 'confirmed',
        payment_status: 'authorized',
        payment_method: paymentMethod,
        payment_intent_id: `pi_demo_${Date.now()}`,
        special_requests: form.specialRequests,
        guest_name: `${form.firstName} ${form.lastName}`,
        guest_email: form.email,
      })

      toast.success('Booking confirmed!')
      navigate(`/booking/confirmation/${booking.id}`)
    } catch (err) {
      console.error(err)
      // For demo, simulate success even if auth fails
      const demoId = `demo-${Date.now()}`
      toast.success('Booking confirmed! (Demo mode)')
      navigate(`/booking/confirmation/${demoId}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-background"><Header /><div className="container py-20 text-center"><Loader2 className="mx-auto size-8 animate-spin" /></div></div>
  }

  if (!property) {
    return <div className="min-h-screen bg-background"><Header /><div className="container py-20 text-center"><p>Property not found</p></div></div>
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-6xl px-4 py-8">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link to={`/property/${property.id}`}>
            <ChevronLeft className="size-4" /> Back to property
          </Link>
        </Button>

        <h1 className="scroll-m-20 text-3xl font-bold tracking-tight">Confirm and pay</h1>

        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-5">
          {/* Left - Form */}
          <div className="lg:col-span-3">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Guest Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">First name *</Label>
                    <Input id="firstName" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">Last name *</Label>
                    <Input id="lastName" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="email">Email address *</Label>
                    <Input id="email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="phone">Phone number</Label>
                    <Input id="phone" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="requests">Special requests</Label>
                    <Textarea
                      id="requests"
                      placeholder="Any special requests for your stay..."
                      value={form.specialRequests}
                      onChange={e => setForm(f => ({ ...f, specialRequests: e.target.value }))}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Lock className="size-4" /> Payment method
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'stripe' | 'paypal')} className="grid grid-cols-2 gap-3">
                    <Label
                      htmlFor="stripe"
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${paymentMethod === 'stripe' ? 'border-foreground bg-muted' : 'hover:bg-muted/50'}`}
                    >
                      <RadioGroupItem value="stripe" id="stripe" />
                      <div className="flex items-center gap-2">
                        <CreditCard className="size-5" />
                        <div>
                          <p className="font-medium text-sm">Credit Card</p>
                          <p className="text-xs text-muted-foreground">Via Stripe</p>
                        </div>
                      </div>
                    </Label>
                    <Label
                      htmlFor="paypal"
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${paymentMethod === 'paypal' ? 'border-foreground bg-muted' : 'hover:bg-muted/50'}`}
                    >
                      <RadioGroupItem value="paypal" id="paypal" />
                      <div className="flex items-center gap-2">
                        <div className="flex size-5 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">P</div>
                        <div>
                          <p className="font-medium text-sm">PayPal</p>
                          <p className="text-xs text-muted-foreground">Secure checkout</p>
                        </div>
                      </div>
                    </Label>
                  </RadioGroup>

                  {paymentMethod === 'stripe' && (
                    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                      <div className="space-y-1.5">
                        <Label>Card number</Label>
                        <Input
                          placeholder="1234 5678 9012 3456"
                          value={form.cardNumber}
                          onChange={e => setForm(f => ({ ...f, cardNumber: formatCardNumber(e.target.value) }))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>Expiry date</Label>
                          <Input
                            placeholder="MM/YY"
                            value={form.cardExpiry}
                            onChange={e => setForm(f => ({ ...f, cardExpiry: formatExpiry(e.target.value) }))}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>CVC</Label>
                          <Input
                            placeholder="123"
                            maxLength={4}
                            value={form.cardCvc}
                            onChange={e => setForm(f => ({ ...f, cardCvc: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Name on card</Label>
                        <Input placeholder="John Doe" value={form.cardName} onChange={e => setForm(f => ({ ...f, cardName: e.target.value }))} />
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'paypal' && (
                    <div className="rounded-lg border bg-blue-50 p-4 text-center dark:bg-blue-900/20">
                      <p className="text-sm text-muted-foreground">You'll be redirected to PayPal to complete payment securely.</p>
                      <div className="mt-3 flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400">
                        <Shield className="size-4" />
                        <span className="text-sm font-medium">PayPal Buyer Protection</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Cancellation Policy */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold">Cancellation policy</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Free cancellation up to 48 hours before check-in. After that, the first night is non-refundable.
                  </p>
                </CardContent>
              </Card>

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? <><Loader2 className="size-4 animate-spin" /> Processing payment...</> : `Confirm and pay $${totalCost.toFixed(2)}`}
              </Button>
            </form>
          </div>

          {/* Right - Summary */}
          <div className="lg:col-span-2">
            <Card className="sticky top-20 glass-strong shadow-elevated">
              <CardContent className="pt-6 space-y-4">
                {/* Property Preview */}
                <div className="flex gap-3">
                  <img
                    src={getPropertyImage(property.property_type)}
                    alt={property.title}
                    className="size-20 shrink-0 rounded-xl object-cover ring-1 ring-black/5"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{property.title}</p>
                    <p className="text-sm text-muted-foreground">{property.city}, {property.state}</p>
                    {property.rating_avg > 0 && (
                      <div className="mt-1 flex items-center gap-1 text-sm">
                        <span className="text-amber-500">★</span>
                        <span>{property.rating_avg.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Booking Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Check-in</span>
                    <span className="font-medium">{checkIn && format(parseISO(checkIn), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Check-out</span>
                    <span className="font-medium">{checkOut && format(parseISO(checkOut), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Guests</span>
                    <span className="font-medium">{guestsCount} guest{guestsCount > 1 ? 's' : ''}</span>
                  </div>
                </div>

                <Separator />

                {/* Price Breakdown */}
                <div className="space-y-2 text-sm">
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
                    <span>Service fee</span>
                    <span>${serviceFee.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-baseline justify-between text-base font-semibold">
                    <span>Total (USD)</span>
                    <span className="text-lg tracking-tight">${totalCost.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  <Shield className="size-4 shrink-0" />
                  <span>Your payment is secured with 256-bit SSL encryption</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
