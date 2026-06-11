import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Lock, Loader2, ArrowLeft, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { setAdminToken } from '@/lib/admin-auth'
import { useSettings } from '@/lib/settings'
import { toast } from 'sonner'

/** Custom premium crest — a faceted obsidian shield holding a keyhole. */
function AdminCrest({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="crest-face" x1="24" y1="3" x2="24" y2="45" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="oklch(0.42 0.014 270)" />
          <stop offset="0.55" stopColor="oklch(0.24 0.01 270)" />
          <stop offset="1" stopColor="oklch(0.13 0.008 270)" />
        </linearGradient>
        <linearGradient id="crest-edge" x1="24" y1="3" x2="24" y2="45" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="oklch(0.98 0.005 95)" stopOpacity="0.9" />
          <stop offset="0.5" stopColor="oklch(0.78 0.02 90)" stopOpacity="0.45" />
          <stop offset="1" stopColor="oklch(0.6 0.01 270)" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      {/* shield body */}
      <path
        d="M24 3.5 41 9.5v12.2c0 10.4-6.9 18.7-17 22.8-10.1-4.1-17-12.4-17-22.8V9.5L24 3.5Z"
        fill="url(#crest-face)"
        stroke="url(#crest-edge)"
        strokeWidth="1.4"
      />
      {/* inner facet hairline */}
      <path
        d="M24 7 37 11.6v9.9c0 8.5-5.5 15.4-13 18.9-7.5-3.5-13-10.4-13-18.9V11.6L24 7Z"
        stroke="oklch(0.95 0.01 95)"
        strokeOpacity="0.16"
        strokeWidth="1"
      />
      {/* keyhole */}
      <circle cx="24" cy="21" r="4.1" stroke="oklch(0.9 0.02 92)" strokeOpacity="0.9" strokeWidth="1.7" />
      <path
        d="M24 24.6 22.5 32.5h3L24 24.6Z"
        fill="oklch(0.9 0.02 92)"
        fillOpacity="0.9"
      />
    </svg>
  )
}

export function AdminLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const { siteName } = useSettings()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/admin'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username || !password) {
      toast.error('Enter your username and password')
      return
    }
    setLoading(true)
    try {
      const { token } = await api.admin.login({ username, password })
      setAdminToken(token)
      toast.success('Welcome back')
      navigate(from, { replace: true })
    } catch {
      toast.error('Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-premium relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* cinematic obsidian backdrop */}
      <div className="login-aurora pointer-events-none absolute inset-0 -z-10" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid mask-fade-b opacity-[0.07]" />
      <div className="login-orb login-orb-a pointer-events-none absolute -z-10" />
      <div className="login-orb login-orb-b pointer-events-none absolute -z-10" />

      <div className="w-full max-w-sm">
        <Link
          to="/"
          className="login-back mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" /> Back to site
        </Link>

        <div className="login-card relative overflow-hidden rounded-2xl p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="login-crest flex size-16 items-center justify-center rounded-2xl">
              <AdminCrest className="size-16" />
            </span>
            <div className="space-y-1">
              <h1 className="login-title text-2xl font-semibold tracking-tight">{siteName} Admin</h1>
              <p className="login-subtitle text-sm">Sign in to manage your platform</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="login-label">Username</Label>
              <div className="login-field flex items-center gap-2 rounded-xl px-3">
                <User className="size-4 shrink-0 opacity-60" />
                <Input
                  id="username"
                  autoComplete="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="admin"
                  className="login-input border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="login-label">Password</Label>
              <div className="login-field flex items-center gap-2 rounded-xl px-3">
                <Lock className="size-4 shrink-0 opacity-60" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="login-input border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>
            <Button type="submit" className="search-cta mt-2 w-full" disabled={loading}>
              {loading
                ? <><Loader2 className="size-4 animate-spin" /> Signing in...</>
                : <><Lock className="size-4" /> Sign in</>}
            </Button>
          </form>
        </div>

        <p className="login-footnote mt-6 text-center text-xs">
          Protected area · authorized access only
        </p>
      </div>
    </div>
  )
}
