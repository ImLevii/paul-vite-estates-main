import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Home, Lock, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { api } from '@/lib/api'
import { setAdminToken } from '@/lib/admin-auth'
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="absolute inset-0 -z-10 bg-grid mask-fade-b opacity-60" />
      <div className="absolute inset-0 -z-10 bg-linear-to-br from-foreground/4 via-background to-background" />
      <div className="absolute -top-24 -right-24 -z-10 size-96 rounded-full bg-foreground/5 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 -z-10 size-96 rounded-full bg-foreground/3 blur-3xl" />

      <div className="w-full max-w-sm">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to site
        </Link>

        <Card className="glass-strong shadow-elevated">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Home className="size-6" />
            </div>
            <div>
              <CardTitle className="text-2xl tracking-tight">{siteName} Admin</CardTitle>
              <CardDescription>Sign in to manage your platform</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  autoComplete="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="admin"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? <><Loader2 className="size-4 animate-spin" /> Signing in...</>
                  : <><Lock className="size-4" /> Sign in</>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
