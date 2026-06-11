import { useEffect, useState } from 'react'
import {
  Plus, Images, Trash2, Pencil, Loader2, GripVertical,
  ArrowUp, ArrowDown, Eye, EyeOff, MapPin, ImageOff, Type, Quote,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { api } from '@/lib/api'
import { type HeroSlide } from '@/lib/supabase'
import { useSettings, saveSettings, type Settings } from '@/lib/settings'
import { toast } from 'sonner'

type SlideForm = {
  image: string
  location: string
  tagline: string
  is_active: boolean
}

const EMPTY_FORM: SlideForm = { image: '', location: '', tagline: '', is_active: true }

export function AdminHero() {
  const settings = useSettings()
  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<HeroSlide | null>(null)
  const [form, setForm] = useState<SlideForm>(EMPTY_FORM)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [headline, setHeadline] = useState({
    heroEyebrow: settings.heroEyebrow,
    heroTitle: settings.heroTitle,
    heroTitleAccent: settings.heroTitleAccent,
    heroSubtitle: settings.heroSubtitle,
  })
  const [slogan, setSlogan] = useState({
    footerTagline: settings.footerTagline,
    footerNote: settings.footerNote,
  })

  useEffect(() => {
    setHeadline({
      heroEyebrow: settings.heroEyebrow,
      heroTitle: settings.heroTitle,
      heroTitleAccent: settings.heroTitleAccent,
      heroSubtitle: settings.heroSubtitle,
    })
  }, [settings.heroEyebrow, settings.heroTitle, settings.heroTitleAccent, settings.heroSubtitle])

  useEffect(() => {
    setSlogan({
      footerTagline: settings.footerTagline,
      footerNote: settings.footerNote,
    })
  }, [settings.footerTagline, settings.footerNote])

  const headlineDirty =
    headline.heroEyebrow !== settings.heroEyebrow ||
    headline.heroTitle !== settings.heroTitle ||
    headline.heroTitleAccent !== settings.heroTitleAccent ||
    headline.heroSubtitle !== settings.heroSubtitle

  const sloganDirty =
    slogan.footerTagline !== settings.footerTagline ||
    slogan.footerNote !== settings.footerNote

  async function saveHeadline() {
    try {
      await saveSettings({ ...(settings as Settings), ...headline })
      toast.success('Headline updated')
    } catch {
      toast.error('Failed to update headline')
    }
  }

  async function saveSlogan() {
    try {
      await saveSettings({ ...(settings as Settings), ...slogan })
      toast.success('Slogan updated')
    } catch {
      toast.error('Failed to update slogan')
    }
  }

  useEffect(() => { loadSlides() }, [])

  async function loadSlides() {
    setLoading(true)
    try {
      const data = await api.admin.heroSlides.list()
      setSlides([...data].sort((a, b) => a.sort_order - b.sort_order))
    } catch {
      toast.error('Failed to load hero slides')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(slide: HeroSlide) {
    setEditing(slide)
    setForm({
      image: slide.image,
      location: slide.location,
      tagline: slide.tagline,
      is_active: slide.is_active,
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.image.trim() || !form.location.trim()) {
      toast.error('Image URL and location are required')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        const updated = await api.admin.heroSlides.update(editing.id, form)
        setSlides(s => s.map(x => x.id === updated.id ? updated : x))
        toast.success('Slide updated')
      } else {
        const created = await api.admin.heroSlides.create({
          ...form,
          sort_order: slides.length,
        })
        setSlides(s => [...s, created])
        toast.success('Slide added')
      }
      setDialogOpen(false)
    } catch {
      toast.error('Failed to save slide')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(slide: HeroSlide) {
    try {
      const updated = await api.admin.heroSlides.update(slide.id, { is_active: !slide.is_active })
      setSlides(s => s.map(x => x.id === updated.id ? updated : x))
      toast.success(updated.is_active ? 'Slide shown' : 'Slide hidden')
    } catch {
      toast.error('Failed to update slide')
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= slides.length) return
    const reordered = [...slides]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(target, 0, moved)
    setSlides(reordered)
    try {
      await Promise.all(
        reordered.map((s, i) =>
          s.sort_order === i ? null : api.admin.heroSlides.update(s.id, { sort_order: i }),
        ),
      )
      setSlides(reordered.map((s, i) => ({ ...s, sort_order: i })))
    } catch {
      toast.error('Failed to reorder')
      loadSlides()
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await api.admin.heroSlides.delete(deleteId)
      setSlides(s => s.filter(x => x.id !== deleteId))
      toast.success('Slide deleted')
    } catch {
      toast.error('Failed to delete slide')
    }
    setDeleteId(null)
  }

  const activeCount = slides.filter(s => s.is_active).length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 scroll-m-20 text-2xl font-bold tracking-tight">
            <Images className="size-6 text-primary" /> Hero Section
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage the rotating slides shown at the top of your homepage
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Add Slide
        </Button>
      </div>

      {/* Headline editor */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <Type className="size-5 text-primary" />
            <div>
              <p className="font-semibold leading-none">Headline</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The title, accent word and subtitle shown over the hero
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Eyebrow</Label>
              <Input
                placeholder="Curated Escapes"
                value={headline.heroEyebrow}
                onChange={e => setHeadline(h => ({ ...h, heroEyebrow: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Small label above the title. Leave empty to hide.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Accent word</Label>
              <Input
                placeholder="Escape"
                value={headline.heroTitleAccent}
                onChange={e => setHeadline(h => ({ ...h, heroTitleAccent: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Shown on its own line with a metallic finish.</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              placeholder="Find Your Perfect"
              value={headline.heroTitle}
              onChange={e => setHeadline(h => ({ ...h, heroTitle: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Subtitle</Label>
            <Textarea
              rows={2}
              placeholder="Discover handpicked rentals..."
              value={headline.heroSubtitle}
              onChange={e => setHeadline(h => ({ ...h, heroSubtitle: e.target.value }))}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={saveHeadline} disabled={!headlineDirty}>
              Save Headline
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Slogan editor */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <Quote className="size-5 text-primary" />
            <div>
              <p className="font-semibold leading-none">Slogan</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The brand blurb and footer note shown across the site footer
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Brand tagline</Label>
            <Textarea
              rows={2}
              placeholder="Discover extraordinary places to stay..."
              value={slogan.footerTagline}
              onChange={e => setSlogan(s => ({ ...s, footerTagline: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">Appears beneath the logo in the footer.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Footer note</Label>
            <Input
              placeholder="Crafted with precision."
              value={slogan.footerNote}
              onChange={e => setSlogan(s => ({ ...s, footerNote: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">Small line next to the copyright.</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={saveSlogan} disabled={!sloganDirty}>
              Save Slogan
            </Button>
          </div>
        </CardContent>
      </Card>

      {!loading && (
        <div className="flex flex-wrap gap-3 text-sm">
          <Badge variant="secondary" className="gap-1.5">
            <Images className="size-3.5" /> {slides.length} total
          </Badge>
          <Badge variant="secondary" className="gap-1.5">
            <Eye className="size-3.5" /> {activeCount} visible
          </Badge>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : slides.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
              <ImageOff className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No hero slides yet</p>
              <p className="text-sm text-muted-foreground">Add your first slide to customize the homepage.</p>
            </div>
            <Button onClick={openCreate}><Plus className="size-4" /> Add Slide</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {slides.map((slide, i) => (
            <Card key={slide.id} className="group overflow-hidden pt-0">
              <div className="relative aspect-video overflow-hidden bg-muted">
                <img
                  src={slide.image}
                  alt={slide.location}
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2' }}
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                  <div className="flex items-center gap-1 text-sm font-semibold">
                    <MapPin className="size-3.5" /> {slide.location}
                  </div>
                  {slide.tagline && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-white/80">{slide.tagline}</p>
                  )}
                </div>
                <div className="absolute left-2 top-2 flex items-center gap-1.5">
                  <Badge className="gap-1 bg-black/60 text-white backdrop-blur-sm">
                    <GripVertical className="size-3" /> #{i + 1}
                  </Badge>
                  {!slide.is_active && (
                    <Badge variant="secondary" className="gap-1">
                      <EyeOff className="size-3" /> Hidden
                    </Badge>
                  )}
                </div>
              </div>
              <CardContent className="flex items-center justify-between gap-2 px-3">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="size-8" disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8" disabled={i === slides.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown className="size-4" />
                  </Button>
                  <Switch
                    className="ml-1"
                    checked={slide.is_active}
                    onCheckedChange={() => toggleActive(slide)}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(slide)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(slide.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Slide' : 'Add Slide'}</DialogTitle>
            <DialogDescription>
              Slides rotate automatically on the homepage hero.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {form.image && (
              <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
                <img
                  src={form.image}
                  alt="Preview"
                  className="size-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2' }}
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                  <div className="flex items-center gap-1 text-sm font-semibold">
                    <MapPin className="size-3.5" /> {form.location || 'Location'}
                  </div>
                  {form.tagline && <p className="text-xs text-white/80">{form.tagline}</p>}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Image URL</Label>
              <Input
                placeholder="https://images.unsplash.com/..."
                value={form.image}
                onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input
                placeholder="Sheboygan, Wisconsin"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tagline</Label>
              <Input
                placeholder="Sandy dunes & lakefront living"
                value={form.tagline}
                onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Visible on homepage</p>
                <p className="text-xs text-muted-foreground">Hidden slides are saved but not shown</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))}
              />
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

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this slide?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the slide from your homepage hero.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
