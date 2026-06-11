import { useEffect, useState } from 'react'
import {
  Plus, Users, Trash2, Pencil, Loader2, ShieldCheck, ShieldAlert, User as UserIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { api, type AdminUser, type AdminRole } from '@/lib/api'
import { toast } from 'sonner'

type UserForm = {
  username: string
  password: string
  full_name: string
  email: string
  role: AdminRole
  is_active: boolean
}

const EMPTY_FORM: UserForm = {
  username: '', password: '', full_name: '', email: '', role: 'guest', is_active: true,
}

const ROLE_LABEL: Record<AdminRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  guest: 'Guest',
}

const ROLE_DESC: Record<AdminRole, string> = {
  admin: 'Full access — can manage users, categories and all content',
  manager: 'Can manage listings, bookings and hero content',
  guest: 'Read-only access to the dashboard',
}

function initials(name: string, username: string) {
  const src = name.trim() || username
  return src.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'U'
}

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [form, setForm] = useState<UserForm>(EMPTY_FORM)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      const data = await api.admin.users.list()
      setUsers(data)
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(u: AdminUser) {
    setEditing(u)
    setForm({
      username: u.username,
      password: '',
      full_name: u.full_name,
      email: u.email,
      role: u.role,
      is_active: u.is_active,
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!editing && !form.username.trim()) {
      toast.error('Enter a username')
      return
    }
    if (!editing && !form.password) {
      toast.error('Enter a password')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await api.admin.users.update(editing.id, {
          full_name: form.full_name,
          email: form.email,
          role: form.role,
          is_active: form.is_active,
          ...(form.password ? { password: form.password } : {}),
        })
        toast.success('User updated')
      } else {
        await api.admin.users.create({
          username: form.username,
          password: form.password,
          full_name: form.full_name,
          email: form.email,
          role: form.role,
          is_active: form.is_active,
        })
        toast.success('User created')
      }
      setDialogOpen(false)
      await loadUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await api.admin.users.delete(deleteId)
      toast.success('User deleted')
      setDeleteId(null)
      await loadUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete user')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            Manage who can access the admin dashboard and their roles
          </p>
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus className="size-4" /> Add User
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Users className="size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No users yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {users.map(u => (
            <Card key={u.id} className={u.is_active ? '' : 'opacity-60'}>
              <CardContent className="flex items-center gap-2 py-3 sm:gap-4">
                <Avatar className="size-10">
                  <AvatarFallback className="admin-medallion text-xs font-semibold">
                    {initials(u.full_name, u.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{u.full_name || u.username}</span>
                    {!u.is_active && <Badge variant="secondary" className="shrink-0">Disabled</Badge>}
                  </div>
                  <span className="block truncate text-xs text-muted-foreground">
                    @{u.username}{u.email ? ` · ${u.email}` : ''}
                  </span>
                </div>
                <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="shrink-0 gap-1">
                  {u.role === 'admin'
                    ? <ShieldCheck className="size-3" />
                    : u.role === 'manager'
                      ? <ShieldAlert className="size-3" />
                      : <UserIcon className="size-3" />}
                  {ROLE_LABEL[u.role]}
                </Badge>
                <div className="flex shrink-0 items-center">
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(u)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => setDeleteId(u.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit User' : 'New User'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update this account. Leave the password blank to keep it unchanged.'
                : 'Create an account that can sign in to the admin dashboard.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Username</Label>
                <Input
                  value={form.username}
                  disabled={!!editing}
                  autoComplete="off"
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="jdoe"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{editing ? 'New Password' : 'Password'}</Label>
                <Input
                  type="password"
                  value={form.password}
                  autoComplete="new-password"
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder={editing ? 'Leave blank to keep' : '••••••••'}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="jane@example.com"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as AdminRole }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['admin', 'manager', 'guest'] as AdminRole[]).map(r => (
                    <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{ROLE_DESC[form.role]}</p>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Disabled users cannot sign in</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="size-4 animate-spin" /> Saving...</> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the account. They will no longer be able to sign in.
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
