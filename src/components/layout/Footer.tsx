import { Link } from 'react-router-dom'
import { Home, Mail } from 'lucide-react'
import { useSettings } from '@/lib/settings'

export function Footer() {
  const { siteName, contactEmail } = useSettings()
  return (
    <footer className="footer-premium relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-dot opacity-50" />
      <div className="container relative z-1 mx-auto max-w-7xl px-4 py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="group flex items-center gap-3">
              <div className="logo-3d relative flex size-9.5 items-center justify-center rounded-[0.85rem] text-primary-foreground">
                <Home className="size-4.5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]" strokeWidth={1.75} />
              </div>
              <span className="wordmark-premium text-2xl leading-none" data-text={siteName}>{siteName}</span>
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Discover extraordinary places to stay. From cozy cabins to luxury villas, find your perfect getaway.
            </p>
            {contactEmail && (
              <a
                href={`mailto:${contactEmail}`}
                className="footer-link mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <Mail className="size-4" />
                {contactEmail}
              </a>
            )}
          </div>
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Explore</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link to="/" className="footer-link hover:text-foreground">All Properties</Link></li>
              <li><Link to="/?type=villa" className="footer-link hover:text-foreground">Villas</Link></li>
              <li><Link to="/?type=cabin" className="footer-link hover:text-foreground">Cabins</Link></li>
              <li><Link to="/?type=apartment" className="footer-link hover:text-foreground">Apartments</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Platform</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link to="/admin" className="footer-link hover:text-foreground">Admin Dashboard</Link></li>
              <li><Link to="/admin/listings/new" className="footer-link hover:text-foreground">List Your Property</Link></li>
              <li><Link to="/admin/bookings" className="footer-link hover:text-foreground">Manage Bookings</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-8 text-sm text-muted-foreground sm:flex-row">
          <p>&copy; {new Date().getFullYear()} {siteName}. All rights reserved.</p>
          <p className="text-xs tracking-wide">Crafted with precision.</p>
        </div>
      </div>
    </footer>
  )
}
