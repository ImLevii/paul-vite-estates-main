import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Lock, Loader2, ArrowLeft, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { HavenMark } from '@/components/layout/HavenMark'
import { api } from '@/lib/api'
import { setAdminToken, setAdminRole } from '@/lib/admin-auth'
import { useSettings } from '@/lib/settings'
import { toast } from 'sonner'

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
      const { token, role } = await api.admin.login({ username, password })
      setAdminToken(token)
      setAdminRole(role)
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
            <span className="logo-3d flex size-14 items-center justify-center rounded-2xl text-primary-foreground">
              <HavenMark className="logo-mark size-7" />
            </span>
            <div className="space-y-1">
              <span className="wordmark-premium text-2xl leading-none" data-text={siteName}>{siteName}</span>
              <p className="login-subtitle text-sm">Sign in to manage your platform</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="login-label">Username</Label>
              <div className="login-field flex items-center gap-2.5 rounded-xl px-3.5">
                <User className="size-4 shrink-0 opacity-60" />
                <Input
                  id="username"
                  autoComplete="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="admin"
                  className="login-input h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="login-label">Password</Label>
              <div className="login-field flex items-center gap-2.5 rounded-xl px-3.5">
                <Lock className="size-4 shrink-0 opacity-60" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="login-input h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
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
