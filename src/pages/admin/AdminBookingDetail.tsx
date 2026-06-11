import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, CalendarDays, User, CreditCard, Home, Clock, FileText, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { type Booking, type Property } from '@/lib/supabase'
import { api } from '@/lib/api'
import { BOOKING_STATUSES, PAYMENT_STATUSES } from '@/lib/constants'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'

export function AdminBookingDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    if (id) loadBooking(id)
  }, [id])

  async function loadBooking(bookingId: string) {
    try {
      const { booking: b, property: p } = await api.admin.bookings.get(bookingId)
      setBooking(b)
      setProperty(p)
    } catch {
      setBooking(null)
      setProperty(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!id) return
    try {
      await api.admin.bookings.delete(id)
      toast.success('Booking deleted')
      navigate('/admin/bookings', { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete booking')
      setDeleteOpen(false)
    }
  }

  async function updateStatus(field: 'status' | 'payment_status', value: string) {
    if (!id) return
    try {
      await api.admin.bookings.update(id, { [field]: value })
      setBooking(b => b ? { ...b, [field]: value } as Booking : b)
      toast.success('Status updated')
    } catch {
      toast.error('Failed to update status')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Booking not found</p>
        <Button className="mt-4" asChild><Link to="/admin/bookings">Back to bookings</Link></Button>
      </div>
    )
  }

  const status = BOOKING_STATUSES[booking.status]
  const payStatus = PAYMENT_STATUSES[booking.payment_status]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild className="shrink-0">
          <Link to="/admin/bookings"><ChevronLeft className="size-5" /></Link>
        </Button>
        <div className="min-w-0">
          <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">Booking Details</h1>
          <p className="truncate font-mono text-xs text-muted-foreground">{booking.id}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto shrink-0 text-destructive hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="size-4" /> <span className="hidden sm:inline">Delete</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Status Management */}
          <Card>
            <CardHeader>
              <CardTitle>Status Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Booking Status</p>
                  <div className="flex items-center gap-2">
                    <Badge className={status?.color}>{status?.label}</Badge>
                    <Select value={booking.status} onValueChange={v => updateStatus('status', v)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(BOOKING_STATUSES).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Payment Status</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={payStatus?.color}>{payStatus?.label}</Badge>
                    <Select value={booking.payment_status} onValueChange={v => updateStatus('payment_status', v)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PAYMENT_STATUSES).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stay Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CalendarDays className="size-4" /> Stay Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Check-in</p>
                  <p className="font-medium">{format(parseISO(booking.check_in), 'EEEE, MMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Check-out</p>
                  <p className="font-medium">{format(parseISO(booking.check_out), 'EEEE, MMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-medium">{booking.nights} night{booking.nights !== 1 ? 's' : ''}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Guests</p>
                  <p className="font-medium">{booking.guests_count} guest{booking.guests_count !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {booking.special_requests && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground"><FileText className="size-3" /> Special Requests</p>
                    <p className="mt-1 text-sm">{booking.special_requests}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Guest Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="size-4" /> Guest Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium">{booking.guest_name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium">{booking.guest_email || '—'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Property */}
          {property && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Home className="size-4" /> Property</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{property.title}</p>
                <p className="text-sm text-muted-foreground">{property.address}, {property.city}, {property.state}</p>
                <div className="flex gap-2 pt-1">
                  <Button size="xs" variant="outline" asChild>
                    <Link to={`/property/${property.id}`} target="_blank">View Listing</Link>
                  </Button>
                  <Button size="xs" variant="ghost" asChild>
                    <Link to={`/admin/listings/${property.id}`}>Edit</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CreditCard className="size-4" /> Payment Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base price</span>
                <span>${booking.base_price.toFixed(2)}</span>
              </div>
              {booking.cleaning_fee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cleaning fee</span>
                  <span>${booking.cleaning_fee.toFixed(2)}</span>
                </div>
              )}
              {booking.service_fee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service fee</span>
                  <span>${booking.service_fee.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>${booking.total_price.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Method</span>
                <span className="capitalize">{booking.payment_method}</span>
              </div>
              {booking.payment_intent_id && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Payment ID</span>
                  <span className="truncate max-w-[120px] font-mono">{booking.payment_intent_id}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock className="size-4" /> Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{format(parseISO(booking.created_at), 'MMM d, yyyy HH:mm')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{format(parseISO(booking.updated_at), 'MMM d, yyyy HH:mm')}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the booking and its revenue from your records. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
