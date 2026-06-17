import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CheckCircle, Home, CalendarDays, Mail, ArrowRight, Loader2, AlertCircle, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Header } from '@/components/layout/Header'
import { api } from '@/lib/api'
import { type Booking } from '@/lib/supabase'

export function BookingConfirmationPage() {
  const { id } = useParams<{ id: string }>()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }

    let active = true
    api.bookings
      .get(id)
      .then((data) => {
        if (active) setBooking(data)
      })
      .catch(() => {
        if (active) setBooking(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [id])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="relative container mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-dot mask-fade-b opacity-70" />
        <div className="flex justify-center">
          <div className="relative">
            <span className="absolute inset-0 animate-ping rounded-[1.4rem] bg-emerald-500/20" />
            <div className="logo-3d-success relative flex size-20 items-center justify-center rounded-[1.4rem]">
              <CheckCircle className="logo-mark-success size-10" />
            </div>
          </div>
        </div>

        <h1 className="mt-6 scroll-m-20 text-4xl font-semibold tracking-tight">
          Booking Confirmed!
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Your reservation has been successfully processed.
        </p>

        <Card className="mt-8 text-left glass-strong shadow-elevated">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <CalendarDays className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Booking Reference</p>
                <p className="text-sm font-mono text-muted-foreground">{id}</p>
              </div>
            </div>

            <Separator />

            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <Mail className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Confirmation Email</p>
                {loading ? (
                  <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" /> Checking delivery status...
                  </p>
                ) : booking?.confirmation_email_sent_at ? (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      <Send className="mr-1 size-3.5" /> Sent
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      A confirmation has been sent to {booking.guest_email || 'your email address'}.
                    </p>
                  </div>
                ) : booking?.confirmation_email_error ? (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant="destructive">
                      <AlertCircle className="mr-1 size-3.5" /> Pending resend
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      We saved your booking, but the email is still being retried.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    We saved your booking and are preparing the confirmation email.
                  </p>
                )}
              </div>
            </div>

            <Separator />

            <div className="rounded-lg bg-muted/50 p-4">
              <h3 className="font-semibold">What's next?</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                  Check your email for full booking details and instructions
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                  Your booking is already confirmed in the system after payment
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
                  Check-in instructions will be sent 48 hours before arrival
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link to="/">
              <Home className="size-4" /> Browse more properties
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/admin/bookings">
              View booking details <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
