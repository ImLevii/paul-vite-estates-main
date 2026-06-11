import { useEffect, useState } from 'react'
import {
  Plus, Link2, Trash2, Pencil, Loader2, ArrowUp, ArrowDown, Eye, EyeOff, ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { api, type NavLink } from '@/lib/api'
import { toast } from 'sonner'

type LinkForm = {
  label: string
  href: string
  new_tab: boolean
  is_active: boolean
}

const EMPTY_FORM: LinkForm = { label: '', href: '', new_tab: false, is_active: true }

export function AdminNavigation() {
  const [links, setLinks] = useState<NavLink[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<NavLink | null>(null)
  const [form, setForm] = useState<LinkForm>(EMPTY_FORM)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => { loadLinks() }, [])

  async function loadLinks() {
    setLoading(true)
    try {
      const data = await api.admin.navLinks.list()
      setLinks([...data].sort((a, b) => a.sort_order - b.sort_order))
    } catch {
      toast.error('Failed to load navigation links')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(l: NavLink) {
    setEditing(l)
    setForm({ label: l.label, href: l.href, new_tab: l.new_tab, is_active: l.is_active })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.label.trim()) {
      toast.error('Enter a link label')
      return
    }
    if (!form.href.trim()) {
      toast.error('Enter a link URL')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await api.admin.navLinks.update(editing.id, {
          label: form.label,
          href: form.href,
          new_tab: form.new_tab,
          is_active: form.is_active,
        })
        toast.success('Link updated')
      } else {
        await api.admin.navLinks.create({
          label: form.label,
          href: form.href,
          new_tab: form.new_tab,
          is_active: form.is_active,
          sort_order: links.length,
        })
        toast.success('Link created')
      }
      setDialogOpen(false)
      await loadLinks()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save link')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(l: NavLink) {
    try {
      await api.admin.navLinks.update(l.id, { is_active: !l.is_active })
      await loadLinks()
    } catch {
      toast.error('Failed to update link')
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const next = index + dir
    if (next < 0 || next >= links.length) return
    const reordered = [...links]
    const [item] = reordered.splice(index, 1)
    reordered.splice(next, 0, item)
    setLinks(reordered)
    try {
      await Promise.all(
        reordered.map((l, i) =>
          l.sort_order === i ? null : api.admin.navLinks.update(l.id, { sort_order: i }),
        ),
      )
    } catch {
      toast.error('Failed to reorder')
      loadLinks()
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await api.admin.navLinks.delete(deleteId)
      toast.success('Link deleted')
      setDeleteId(null)
      await loadLinks()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete link')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">Navigation</h1>
          <p className="text-sm text-muted-foreground">
            Configure the links shown in the site header menu
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Add Link
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : links.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Link2 className="size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No navigation links yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {links.map((l, i) => (
            <Card key={l.id} className={l.is_active ? '' : 'opacity-60'}>
              <CardContent className="flex items-center gap-4 py-3">
                <div className="flex flex-col">
                  <Button variant="ghost" size="icon" className="size-6" onClick={() => move(i, -1)} disabled={i === 0}>
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-6" onClick={() => move(i, 1)} disabled={i === links.length - 1}>
                    <ArrowDown className="size-3.5" />
                  </Button>
                </div>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-muted">
                  <Link2 className="size-5" />
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{l.label}</span>
                    {l.new_tab && <Badge variant="secondary" className="gap-1"><ExternalLink className="size-3" />New tab</Badge>}
                    {!l.is_active && <Badge variant="secondary">Hidden</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground">{l.href}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => toggleActive(l)} title={l.is_active ? 'Hide' : 'Show'}>
                  {l.is_active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => openEdit(l)}>
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(l.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Link' : 'New Link'}</DialogTitle>
            <DialogDescription>
              Links appear in the header navigation menu on every page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="About Us"
              />
            </div>
            <div className="space-y-1.5">
              <Label>URL</Label>
              <Input
                value={form.href}
                onChange={e => setForm(f => ({ ...f, href: e.target.value }))}
                placeholder="/about or https://example.com"
              />
              <p className="text-xs text-muted-foreground">
                Use a path like <code>/about</code> for internal pages, or a full URL for external sites.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Open in new tab</Label>
                <p className="text-xs text-muted-foreground">Recommended for external links</p>
              </div>
              <Switch checked={form.new_tab} onCheckedChange={v => setForm(f => ({ ...f, new_tab: v }))} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Visible</Label>
                <p className="text-xs text-muted-foreground">Show this link in the menu</p>
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
            <AlertDialogTitle>Delete link?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the link from the header navigation menu.
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
