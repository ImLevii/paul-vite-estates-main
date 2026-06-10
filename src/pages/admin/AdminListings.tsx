import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, Eye, Search, Star, MapPin, Bed, Bath } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { type Property } from '@/lib/supabase'
import { api } from '@/lib/api'
import { useLiveData } from '@/hooks/use-live-data'
import { PROPERTY_TYPES, getPropertyImage } from '@/lib/constants'
import { toast } from 'sonner'

export function AdminListings() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    loadProperties()
  }, [])

  useLiveData(() => loadProperties())

  async function loadProperties() {
    try {
      const data = await api.admin.properties.list()
      setProperties(data || [])
    } catch {
      setProperties([])
    } finally {
      setLoading(false)
    }
  }

  async function toggleActive(id: string, current: boolean) {
    try {
      await api.admin.properties.update(id, { is_active: !current })
      setProperties(ps => ps.map(p => p.id === id ? { ...p, is_active: !current } : p))
      toast.success(`Property ${!current ? 'activated' : 'deactivated'}`)
    } catch {
      toast.error('Failed to update property')
    }
  }

  async function toggleFeatured(id: string, current: boolean) {
    try {
      await api.admin.properties.update(id, { is_featured: !current })
      setProperties(ps => ps.map(p => p.id === id ? { ...p, is_featured: !current } : p))
      toast.success(`Property ${!current ? 'featured' : 'unfeatured'}`)
    } catch {
      toast.error('Failed to update property')
    }
  }

  async function deleteProperty() {
    if (!deleteId) return
    try {
      await api.admin.properties.delete(deleteId)
      setProperties(ps => ps.filter(p => p.id !== deleteId))
      toast.success('Property deleted')
    } catch {
      toast.error('Cannot delete property with existing bookings')
    }
    setDeleteId(null)
  }

  const filtered = properties.filter(p => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.city.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || p.property_type === typeFilter
    return matchSearch && matchType
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">Listings</h1>
          <p className="text-sm text-muted-foreground">{properties.length} properties managed</p>
        </div>
        <Button asChild>
          <Link to="/admin/listings/new">
            <Plus className="size-4" /> Add Listing
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search listings..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {PROPERTY_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-4xl mb-3">🏠</p>
            <h3 className="font-semibold">No listings found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {search || typeFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first property listing to get started'}
            </p>
            {!search && typeFilter === 'all' && (
              <Button className="mt-4" asChild><Link to="/admin/listings/new"><Plus className="size-4" /> Add your first listing</Link></Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(property => (
            <Card key={property.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex gap-4 p-4">
                  <img
                    src={getPropertyImage(property.property_type)}
                    alt={property.title}
                    className="size-20 shrink-0 rounded-lg object-cover"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-semibold">{property.title}</h3>
                          {property.is_featured && <Badge variant="secondary" className="text-xs shrink-0">Featured</Badge>}
                          {!property.is_active && <Badge variant="outline" className="text-xs shrink-0 text-muted-foreground">Inactive</Badge>}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="size-3 shrink-0" />
                          <span className="truncate">{property.address}, {property.city}, {property.state}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="font-bold">${property.price_per_night.toFixed(0)}</span>
                        <span className="text-xs text-muted-foreground">/night</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="capitalize">{property.property_type}</span>
                      <span className="flex items-center gap-1"><Bed className="size-3" /> {property.bedrooms === 0 ? 'Studio' : `${property.bedrooms}bd`}</span>
                      <span className="flex items-center gap-1"><Bath className="size-3" /> {property.bathrooms}ba</span>
                      {property.rating_avg > 0 && (
                        <span className="flex items-center gap-1"><Star className="size-3 fill-current text-yellow-500" />{property.rating_avg.toFixed(1)} ({property.review_count})</span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Active</span>
                        <Switch
                          checked={property.is_active}
                          onCheckedChange={() => toggleActive(property.id, property.is_active)}
                          size="sm"
                        />
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Featured</span>
                        <Switch
                          checked={property.is_featured}
                          onCheckedChange={() => toggleFeatured(property.id, property.is_featured)}
                          size="sm"
                        />
                      </div>
                      <div className="ml-auto flex items-center gap-1">
                        <Button variant="ghost" size="icon-sm" asChild>
                          <Link to={`/property/${property.id}`} target="_blank">
                            <Eye className="size-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon-sm" asChild>
                          <Link to={`/admin/listings/${property.id}`}>
                            <Pencil className="size-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(property.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this property?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The property and all its data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={deleteProperty}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
