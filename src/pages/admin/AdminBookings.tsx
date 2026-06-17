import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, CalendarDays, ArrowRight, Filter, Trash2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { type Booking } from '@/lib/supabase'
import { api, type BookingWithProperty } from '@/lib/api'
import { BOOKING_STATUSES, PAYMENT_STATUSES } from '@/lib/constants'
import { getAdminRole } from '@/lib/admin-auth'
import { formatDateInAppTimeZone } from '@/lib/datetime'
import { toast } from 'sonner'

type BookingRow = BookingWithProperty

export function AdminBookings() {
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const isAdmin = getAdminRole() === 'admin'

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const data = await api.admin.bookings.list().catch(() => [])
    setBookings(data)
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    try {
      await api.admin.bookings.update(id, { status })
      setBookings(bs => bs.map(b => b.id === id ? { ...b, status: status as Booking['status'] } : b))
    } catch {
      // silently ignore
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await api.admin.bookings.delete(deleteId)
      setBookings(bs => bs.filter(b => b.id !== deleteId))
      toast.success('Booking deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete booking')
    } finally {
      setDeleteId(null)
    }
  }

  async function handleResetRevenue() {
    try {
      const { updated } = await api.admin.bookings.resetRevenue()
      toast.success(updated > 0 ? `Revenue reset — ${updated} booking${updated === 1 ? '' : 's'} marked unpaid` : 'No revenue to reset')
      await loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset revenue')
    } finally {
      setResetOpen(false)
    }
  }

  const filtered = bookings.filter(b => {
    const matchSearch = !search ||
      (b.guest_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.guest_email || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.property?.title || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || b.status === statusFilter
    return matchSearch && matchStatus
  })

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    revenue: bookings
      .filter(b => b.payment_status === 'paid' || b.payment_status === 'authorized')
      .reduce((s, b) => s + b.total_price, 0),
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">Bookings</h1>
          <p className="text-sm text-muted-foreground">{bookings.length} total reservations</p>
        </div>
        {isAdmin && (
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setResetOpen(true)}
            disabled={stats.revenue === 0}
          >
            <RotateCcw className="size-4" /> Reset Revenue
          </Button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Total', value: stats.total, color: '' },
          { label: 'Pending', value: stats.pending, color: 'text-yellow-600 dark:text-yellow-400' },
          { label: 'Confirmed', value: stats.confirmed, color: 'text-green-600 dark:text-green-400' },
          { label: 'Revenue', value: `$${stats.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, color: '' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by guest name, email, or property..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <Filter className="size-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(BOOKING_STATUSES).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CalendarDays className="mx-auto size-10 text-muted-foreground" />
            <h3 className="mt-3 font-semibold">No bookings found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Bookings will appear here once guests start reserving'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(booking => {
            const status = BOOKING_STATUSES[booking.status]
            const payStatus = PAYMENT_STATUSES[booking.payment_status]
            return (
              <Card key={booking.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{booking.guest_name || booking.guest_email || 'Guest'}</h3>
                        <Badge className={`text-xs ${status?.color}`}>{status?.label}</Badge>
                        <Badge variant="outline" className={`text-xs ${payStatus?.color}`}>{payStatus?.label}</Badge>
                        <Badge variant="outline" className="text-xs capitalize">{booking.payment_method}</Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs ${booking.confirmation_email_sent_at
                            ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-300'
                            : booking.confirmation_email_error
                              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300'
                              : 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-900/50 dark:bg-yellow-900/20 dark:text-yellow-300'}`}
                        >
                          {booking.confirmation_email_sent_at ? 'Email sent' : booking.confirmation_email_error ? 'Email retrying' : 'Email queued'}
                        </Badge>
                      </div>
                      {booking.guest_email && (
                        <p className="text-sm text-muted-foreground">{booking.guest_email}</p>
                      )}
                      {booking.property && (
                        <p className="text-sm font-medium">{booking.property.title} · {booking.property.city}, {booking.property.state}</p>
                      )}
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="size-3.5" />
                          {formatDateInAppTimeZone(booking.check_in, { withYear: false })} – {formatDateInAppTimeZone(booking.check_out)}
                        </span>
                        <span>{booking.nights} night{booking.nights !== 1 ? 's' : ''}</span>
                        <span>{booking.guests_count} guest{booking.guests_count !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <div className="flex flex-row items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
                      <div className="text-right">
                        <p className="text-lg font-bold">${booking.total_price.toFixed(0)}</p>
                        <p className="text-xs text-muted-foreground">total</p>
                      </div>
                      <div className="flex gap-1">
                        {booking.status === 'pending' && (
                          <>
                            <Button size="xs" onClick={() => updateStatus(booking.id, 'confirmed')}>Confirm</Button>
                            <Button size="xs" variant="outline" onClick={() => updateStatus(booking.id, 'cancelled')}>Decline</Button>
                          </>
                        )}
                        <Button size="xs" variant="ghost" asChild>
                          <Link to={`/admin/bookings/${booking.id}`}>
                            Details <ArrowRight className="size-3" />
                          </Link>
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(booking.id)}
                          title="Delete booking"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
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

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset revenue data?</AlertDialogTitle>
            <AlertDialogDescription>
              This marks every paid and authorized booking as <strong>unpaid</strong>, resetting reported
              revenue to $0. The bookings themselves are kept. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetRevenue} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Reset Revenue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
