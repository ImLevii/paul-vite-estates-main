import { useEffect, useState } from 'react'
import {
  Plus, Tags, Trash2, Pencil, Loader2, ArrowUp, ArrowDown, Eye, EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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
import { PropertyTypeIcon, PROPERTY_TYPE_ICON_KEYS } from '@/components/layout/PropertyTypeIcon'
import { api, type PropertyType } from '@/lib/api'
import { toast } from 'sonner'

type TypeForm = {
  value: string
  label: string
  icon: string
  is_active: boolean
}

const EMPTY_FORM: TypeForm = { value: '', label: '', icon: 'other', is_active: true }

export function AdminCategories() {
  const [types, setTypes] = useState<PropertyType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<PropertyType | null>(null)
  const [form, setForm] = useState<TypeForm>(EMPTY_FORM)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => { loadTypes() }, [])

  async function loadTypes() {
    setLoading(true)
    try {
      const data = await api.admin.propertyTypes.list()
      setTypes([...data].sort((a, b) => a.sort_order - b.sort_order))
    } catch {
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(t: PropertyType) {
    setEditing(t)
    setForm({ value: t.value, label: t.label, icon: t.icon || 'other', is_active: t.is_active })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.label.trim()) {
      toast.error('Enter a category name')
      return
    }
    if (!editing && !form.value.trim()) {
      toast.error('Enter a category value')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await api.admin.propertyTypes.update(editing.id, {
          label: form.label,
          icon: form.icon,
          is_active: form.is_active,
        })
        toast.success('Category updated')
      } else {
        await api.admin.propertyTypes.create({
          value: form.value,
          label: form.label,
          icon: form.icon,
          is_active: form.is_active,
          sort_order: types.length,
        })
        toast.success('Category created')
      }
      setDialogOpen(false)
      await loadTypes()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(t: PropertyType) {
    try {
      await api.admin.propertyTypes.update(t.id, { is_active: !t.is_active })
      await loadTypes()
    } catch {
      toast.error('Failed to update category')
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const next = index + dir
    if (next < 0 || next >= types.length) return
    const reordered = [...types]
    const [item] = reordered.splice(index, 1)
    reordered.splice(next, 0, item)
    setTypes(reordered)
    try {
      await Promise.all(
        reordered.map((t, i) =>
          t.sort_order === i ? null : api.admin.propertyTypes.update(t.id, { sort_order: i }),
        ),
      )
    } catch {
      toast.error('Failed to reorder')
      loadTypes()
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await api.admin.propertyTypes.delete(deleteId)
      toast.success('Category deleted')
      setDeleteId(null)
      await loadTypes()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete category')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Configure the property type filters shown on the homepage
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Add Category
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : types.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Tags className="size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No categories yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {types.map((t, i) => (
            <Card key={t.id} className={t.is_active ? '' : 'opacity-60'}>
              <CardContent className="flex items-center gap-4 py-3">
                <div className="flex flex-col">
                  <Button variant="ghost" size="icon" className="size-6" onClick={() => move(i, -1)} disabled={i === 0}>
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-6" onClick={() => move(i, 1)} disabled={i === types.length - 1}>
                    <ArrowDown className="size-3.5" />
                  </Button>
                </div>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-muted">
                  <PropertyTypeIcon type={t.icon || 'other'} className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{t.label}</span>
                    {!t.is_active && <Badge variant="secondary">Hidden</Badge>}
                  </div>
                  <span className="block truncate text-xs text-muted-foreground">{t.value}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => toggleActive(t)} title={t.is_active ? 'Hide' : 'Show'}>
                  {t.is_active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(t.id)}>
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
            <DialogTitle>{editing ? 'Edit Category' : 'New Category'}</DialogTitle>
            <DialogDescription>
              Categories appear as filter pills on the homepage and as the property type options.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="Beach House"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Value {editing && <span className="text-xs text-muted-foreground">(cannot be changed)</span>}</Label>
              <Input
                value={form.value}
                disabled={!!editing}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                placeholder="beach-house"
              />
              <p className="text-xs text-muted-foreground">
                A short identifier (lowercase, no spaces). Used internally to tag listings.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <Select value={form.icon} onValueChange={v => setForm(f => ({ ...f, icon: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPE_ICON_KEYS.map(key => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <PropertyTypeIcon type={key} className="size-4" />
                        <span className="capitalize">{key}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Visible</Label>
                <p className="text-xs text-muted-foreground">Show this category on the public site</p>
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
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the category from filters. Existing listings keep their type value but
              it will no longer appear as a filter option.
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
