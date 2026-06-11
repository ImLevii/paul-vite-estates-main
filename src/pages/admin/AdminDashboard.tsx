import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, ArrowUpRight, ArrowDownRight, ArrowRight, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ListingsIcon, BookingsIcon, RevenueIcon, RatingIcon } from '@/components/layout/AdminStatIcon'
import { type Property, type Booking } from '@/lib/supabase'
import { api } from '@/lib/api'
import { useLiveData } from '@/hooks/use-live-data'
import { BOOKING_STATUSES } from '@/lib/constants'
import { format, parseISO } from 'date-fns'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'

const chartConfig = {
  revenue: { label: 'Revenue', color: 'var(--chart-1)' },
  bookings: { label: 'Bookings', color: 'var(--chart-2)' },
}

const REV_UP = 'oklch(0.72 0.17 155)'
const REV_DOWN = 'oklch(0.64 0.21 25)'

// Demo chart data
const revenueData = [
  { month: 'Jan', revenue: 4200, bookings: 12 },
  { month: 'Feb', revenue: 5800, bookings: 18 },
  { month: 'Mar', revenue: 7200, bookings: 22 },
  { month: 'Apr', revenue: 6500, bookings: 20 },
  { month: 'May', revenue: 9100, bookings: 28 },
  { month: 'Jun', revenue: 11400, bookings: 35 },
]

// directional dot: green when revenue rose vs prior month, red when it fell
function RevenueDot(props: { cx?: number; cy?: number; index?: number }) {
  const { cx, cy, index } = props
  if (cx == null || cy == null || index == null) return null
  const prev = revenueData[index - 1]
  const curr = revenueData[index]
  const up = !prev || curr.revenue >= prev.revenue
  const color = up ? REV_UP : REV_DOWN
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill={color} opacity={0.18} />
      <circle cx={cx} cy={cy} r={3.2} fill={color} stroke="var(--card)" strokeWidth={1.5} />
    </g>
  )
}

export function AdminDashboard() {
  const [properties, setProperties] = useState<Property[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  useLiveData(() => loadData())

  async function loadData() {
    try {
      const [props, books] = await Promise.all([
        api.admin.properties.list(),
        api.admin.bookings.list(),
      ])
      setProperties(props || [])
      setBookings(books || [])
    } catch {
      setProperties([])
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  const activeProperties = properties.filter(p => p.is_active).length
  const pendingBookings = bookings.filter(b => b.status === 'pending').length
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length
  const totalRevenue = bookings
    .filter(b => b.payment_status === 'paid' || b.payment_status === 'authorized')
    .reduce((sum, b) => sum + b.total_price, 0)

  const recentBookings = bookings.slice(0, 5)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome back. Here's what's happening.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="admin-card admin-card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Listings</CardTitle>
            <span className="admin-medallion flex size-9 items-center justify-center rounded-xl">
              <ListingsIcon className="size-4.5" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="admin-stat-value text-2xl font-bold">{properties.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">{activeProperties} active</p>
          </CardContent>
        </Card>

        <Card className="admin-card admin-card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Bookings</CardTitle>
            <span className="admin-medallion flex size-9 items-center justify-center rounded-xl">
              <BookingsIcon className="size-4.5" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="admin-stat-value text-2xl font-bold">{bookings.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">{pendingBookings} pending · {confirmedBookings} confirmed</p>
          </CardContent>
        </Card>

        <Card className="admin-card admin-card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
            <span className="admin-medallion flex size-9 items-center justify-center rounded-xl">
              <RevenueIcon className="size-4.5" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="admin-stat-value text-2xl font-bold">${totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
            <p className="mt-1 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <ArrowUpRight className="size-3" /> +12% this month
            </p>
          </CardContent>
        </Card>

        <Card className="admin-card admin-card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Rating</CardTitle>
            <span className="admin-medallion flex size-9 items-center justify-center rounded-xl">
              <RatingIcon className="size-4.5" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="admin-stat-value text-2xl font-bold">
              {properties.length > 0
                ? (properties.reduce((s, p) => s + (p.rating_avg || 0), 0) / properties.filter(p => p.rating_avg > 0).length || 0).toFixed(2)
                : '—'}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Across all properties</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Revenue Chart */}
        <Card className="admin-card lg:col-span-3">
          <CardHeader className="flex flex-row items-start justify-between">
            <div className="space-y-1.5">
              <CardTitle>Revenue Overview</CardTitle>
              <CardDescription>Monthly revenue for 2025</CardDescription>
            </div>
            {(() => {
              const first = revenueData[0].revenue
              const last = revenueData[revenueData.length - 1].revenue
              const pct = first > 0 ? ((last - first) / first) * 100 : 0
              const up = pct >= 0
              return (
                <span
                  className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium"
                  style={{
                    color: up ? REV_UP : REV_DOWN,
                    borderColor: `color-mix(in oklab, ${up ? REV_UP : REV_DOWN} 35%, transparent)`,
                    background: `color-mix(in oklab, ${up ? REV_UP : REV_DOWN} 12%, transparent)`,
                  }}
                >
                  {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                  {up ? '+' : ''}{pct.toFixed(1)}%
                </span>
              )
            })()}
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-48 w-full">
              <AreaChart data={revenueData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={REV_UP} stopOpacity={0.35} />
                    <stop offset="55%" stopColor={REV_UP} stopOpacity={0.12} />
                    <stop offset="100%" stopColor={REV_UP} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="revenueStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={REV_DOWN} />
                    <stop offset="45%" stopColor={REV_UP} />
                    <stop offset="100%" stopColor={REV_UP} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} tickFormatter={v => `$${v / 1000}k`} />
                <Tooltip content={<ChartTooltipContent />} cursor={{ stroke: 'var(--border)', strokeDasharray: '4 4' }} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="url(#revenueStroke)"
                  strokeWidth={2.5}
                  fill="url(#revenueFill)"
                  dot={<RevenueDot />}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--card)' }}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Top Properties */}
        <Card className="admin-card lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Top Properties</CardTitle>
              <CardDescription>By rating</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/listings">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {properties
                .filter(p => p.rating_avg > 0)
                .sort((a, b) => b.rating_avg - a.rating_avg)
                .slice(0, 4)
                .map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.city}, {p.state}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1 text-sm">
                      <Star className="size-3 fill-current text-yellow-500" />
                      <span className="font-medium">{p.rating_avg.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              {properties.filter(p => p.rating_avg > 0).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No ratings yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      <Card className="admin-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Bookings</CardTitle>
            <CardDescription>Latest reservation activity</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/bookings">View all <ArrowRight className="size-4" /></Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentBookings.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No bookings yet. <Link to="/admin/listings" className="text-primary hover:underline">Add a listing</Link> to get started.
            </div>
          ) : (
            <div className="space-y-0">
              {recentBookings.map((booking, i) => {
                const status = BOOKING_STATUSES[booking.status]
                return (
                  <div key={booking.id}>
                    {i > 0 && <Separator />}
                    <div className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{booking.guest_name || booking.guest_email || 'Guest'}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(booking.check_in), 'MMM d')} – {format(parseISO(booking.check_out), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge className={`text-xs ${status?.color}`}>{status?.label}</Badge>
                        <p className="mt-1 text-sm font-medium">${booking.total_price.toFixed(0)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Button variant="outline" className="admin-card admin-card-hover h-auto gap-3 p-4 justify-start" asChild>
          <Link to="/admin/listings/new">
            <span className="admin-medallion flex size-9 items-center justify-center rounded-xl">
              <ListingsIcon className="size-4.5" />
            </span>
            <div className="text-left">
              <p className="font-medium">Add Listing</p>
              <p className="text-xs text-muted-foreground">Create a new property</p>
            </div>
          </Link>
        </Button>
        <Button variant="outline" className="admin-card admin-card-hover h-auto gap-3 p-4 justify-start" asChild>
          <Link to="/admin/bookings">
            <span className="admin-medallion flex size-9 items-center justify-center rounded-xl">
              <BookingsIcon className="size-4.5" />
            </span>
            <div className="text-left">
              <p className="font-medium">Manage Bookings</p>
              <p className="text-xs text-muted-foreground">{pendingBookings} pending requests</p>
            </div>
          </Link>
        </Button>
        <Button variant="outline" className="admin-card admin-card-hover h-auto gap-3 p-4 justify-start" asChild>
          <Link to="/">
            <span className="admin-medallion flex size-9 items-center justify-center rounded-xl">
              <TrendingUp className="size-4.5" />
            </span>
            <div className="text-left">
              <p className="font-medium">View Site</p>
              <p className="text-xs text-muted-foreground">Preview public listings</p>
            </div>
          </Link>
        </Button>
      </div>
    </div>
  )
}
