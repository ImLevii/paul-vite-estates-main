import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { useSettings } from '@/lib/settings'

import { HomePage } from '@/pages/HomePage'
import { PropertyDetailPage } from '@/pages/PropertyDetailPage'
import { BookingPage } from '@/pages/BookingPage'
import { BookingConfirmationPage } from '@/pages/BookingConfirmationPage'
import { AdminLayout } from '@/pages/admin/AdminLayout'
import { AdminLogin } from '@/pages/admin/AdminLogin'
import { RequireAdmin } from '@/pages/admin/RequireAdmin'
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { AdminListings } from '@/pages/admin/AdminListings'
import { AdminListingEdit } from '@/pages/admin/AdminListingEdit'
import { AdminBookings } from '@/pages/admin/AdminBookings'
import { AdminBookingDetail } from '@/pages/admin/AdminBookingDetail'
import { AdminHero } from '@/pages/admin/AdminHero'
import { AdminNavigation } from '@/pages/admin/AdminNavigation'
import { AdminCategories } from '@/pages/admin/AdminCategories'
import { AdminUsers } from '@/pages/admin/AdminUsers'
import { AdminSettings } from '@/pages/admin/AdminSettings'

export default function App() {
  const { siteName, heroSubtitle } = useSettings()

  useEffect(() => {
    const title = `${siteName} — Premium Stays`
    const description = heroSubtitle
    document.title = title

    const setMeta = (selector: string, attr: string, value: string) => {
      const el = document.head.querySelector<HTMLMetaElement>(selector)
      if (el) el.setAttribute(attr, value)
    }
    setMeta('meta[name="description"]', 'content', description)
    setMeta('meta[property="og:site_name"]', 'content', siteName)
    setMeta('meta[property="og:title"]', 'content', title)
    setMeta('meta[property="og:description"]', 'content', description)
    setMeta('meta[name="twitter:title"]', 'content', title)
    setMeta('meta[name="twitter:description"]', 'content', description)
  }, [siteName, heroSubtitle])

  return (
    <ThemeProvider defaultTheme="light" storageKey="haven-theme">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/property/:id" element={<PropertyDetailPage />} />
          <Route path="/book/:id" element={<BookingPage />} />
          <Route path="/booking/confirmation/:id" element={<BookingConfirmationPage />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
            <Route index element={<AdminDashboard />} />
            <Route path="listings" element={<AdminListings />} />
            <Route path="listings/new" element={<AdminListingEdit />} />
            <Route path="listings/:id" element={<AdminListingEdit />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="bookings/:id" element={<AdminBookingDetail />} />
            <Route path="hero" element={<AdminHero />} />
            <Route path="navigation" element={<AdminNavigation />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Routes>
        <Toaster />
      </BrowserRouter>
    </ThemeProvider>
  )
}
