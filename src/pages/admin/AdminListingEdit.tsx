import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, Plus, X, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { type Property } from '@/lib/supabase'
import { api } from '@/lib/api'
import { PROPERTY_TYPES, AMENITIES_LIST } from '@/lib/constants'
import { toast } from 'sonner'

const DEFAULT_FORM: Partial<Property> = {
  title: '',
  description: '',
  address: '',
  city: '',
  state: '',
  country: 'US',
  zip_code: '',
  price_per_night: 100,
  cleaning_fee: 50,
  service_fee_percent: 12,
  bedrooms: 1,
  bathrooms: 1,
  max_guests: 2,
  property_type: 'apartment',
  amenities: [],
  rules: { no_smoking: true, no_pets: false, no_parties: false },
  check_in_time: '15:00',
  check_out_time: '11:00',
  min_stay_nights: 1,
  max_stay_nights: 365,
  is_active: true,
  is_featured: false,
}

export function AdminListingEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id

  const [form, setForm] = useState<Partial<Property>>(DEFAULT_FORM)
  const [photoUrls, setPhotoUrls] = useState<string[]>([''])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (id) loadProperty(id)
  }, [id])

  async function loadProperty(propertyId: string) {
    try {
      const data = await api.admin.properties.get(propertyId)
      if (data) {
        const { photos, ...property } = data
        setForm(property)
        if (photos && photos.length > 0) {
          setPhotoUrls([...photos].sort((a, b) => a.sort_order - b.sort_order).map(p => p.url))
        }
      }
    } catch {
      // ignore — form keeps defaults
    } finally {
      setLoading(false)
    }
  }

  function setField<K extends keyof Property>(key: K, value: Property[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function toggleAmenity(amenity: string) {
    const current = (form.amenities as string[]) || []
    if (current.includes(amenity)) {
      setField('amenities', current.filter(a => a !== amenity) as Property['amenities'])
    } else {
      setField('amenities', [...current, amenity] as Property['amenities'])
    }
  }

  function toggleRule(rule: string) {
    const current = (form.rules as Record<string, boolean>) || {}
    setField('rules', { ...current, [rule]: !current[rule] } as Property['rules'])
  }

  async function handleSave() {
    if (!form.title || !form.city || !form.price_per_night) {
      toast.error('Please fill in all required fields')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...form,
        owner_id: form.owner_id || '00000000-0000-0000-0000-000000000000',
        updated_at: new Date().toISOString(),
      }
      delete (payload as Record<string, unknown>).id
      delete (payload as Record<string, unknown>).created_at
      delete (payload as Record<string, unknown>).nights

      let savedId = id

      if (isNew) {
        const created = await api.admin.properties.create(payload)
        savedId = created.id
      } else {
        await api.admin.properties.update(id!, payload)
      }

      // Save photos
      if (savedId) {
        const validPhotos = photoUrls.filter(url => url.trim())
        await api.admin.properties.savePhotos(
          savedId,
          validPhotos.map((url, i) => ({
            url,
            is_primary: i === 0,
            sort_order: i,
          })),
        )
      }

      toast.success(isNew ? 'Property created!' : 'Changes saved!')
      navigate('/admin/listings')
    } catch (err) {
      console.error(err)
      toast.error('Failed to save. Please check your inputs.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const amenities = (form.amenities as string[]) || []
  const rules = (form.rules as Record<string, boolean>) || {}

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link to="/admin/listings"><ChevronLeft className="size-5" /></Link>
          </Button>
          <div>
            <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">
              {isNew ? 'New Listing' : 'Edit Listing'}
            </h1>
            <p className="text-sm text-muted-foreground">{isNew ? 'Configure your new property' : form.title}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="size-4 animate-spin" /> Saving...</> : <><Check className="size-4" /> {isNew ? 'Create Listing' : 'Save Changes'}</>}
        </Button>
      </div>

      <Tabs defaultValue="basics">
        <TabsList className="grid w-full grid-cols-4 md:w-auto md:grid-cols-none md:flex">
          <TabsTrigger value="basics">Basics</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="amenities">Amenities</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
        </TabsList>

        {/* Basics Tab */}
        <TabsContent value="basics" className="mt-6 space-y-6">
          <Card>
            <CardHeader><CardTitle>Property Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g. Stunning Beachfront Villa"
                  value={form.title || ''}
                  onChange={e => setField('title', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your property in detail..."
                  rows={5}
                  value={form.description || ''}
                  onChange={e => setField('description', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Property Type</Label>
                  <Select value={form.property_type || 'apartment'} onValueChange={v => setField('property_type', v as Property['property_type'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maxGuests">Max Guests</Label>
                  <Input
                    id="maxGuests"
                    type="number"
                    min={1}
                    max={20}
                    value={form.max_guests || 2}
                    onChange={e => setField('max_guests', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="bedrooms">Bedrooms</Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    min={0}
                    max={20}
                    value={form.bedrooms ?? 1}
                    onChange={e => setField('bedrooms', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bathrooms">Bathrooms</Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    min={0.5}
                    max={20}
                    step={0.5}
                    value={form.bathrooms ?? 1}
                    onChange={e => setField('bathrooms', parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Location</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="address">Street Address *</Label>
                <Input
                  id="address"
                  placeholder="123 Main St"
                  value={form.address || ''}
                  onChange={e => setField('address', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="city">City *</Label>
                  <Input id="city" value={form.city || ''} onChange={e => setField('city', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" value={form.state || ''} onChange={e => setField('state', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input id="zip" value={form.zip_code || ''} onChange={e => setField('zip_code', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" value={form.country || 'US'} onChange={e => setField('country', e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="mt-6 space-y-6">
          <Card>
            <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="price">Nightly Rate ($) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min={1}
                    value={form.price_per_night || ''}
                    onChange={e => setField('price_per_night', parseFloat(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cleaning">Cleaning Fee ($)</Label>
                  <Input
                    id="cleaning"
                    type="number"
                    min={0}
                    value={form.cleaning_fee ?? 0}
                    onChange={e => setField('cleaning_fee', parseFloat(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="service">Service Fee (%)</Label>
                  <Input
                    id="service"
                    type="number"
                    min={0}
                    max={30}
                    value={form.service_fee_percent ?? 12}
                    onChange={e => setField('service_fee_percent', parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Booking Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="checkIn">Check-in Time</Label>
                  <Input
                    id="checkIn"
                    type="time"
                    value={form.check_in_time || '15:00'}
                    onChange={e => setField('check_in_time', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="checkOut">Check-out Time</Label>
                  <Input
                    id="checkOut"
                    type="time"
                    value={form.check_out_time || '11:00'}
                    onChange={e => setField('check_out_time', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="minStay">Min Stay (nights)</Label>
                  <Input
                    id="minStay"
                    type="number"
                    min={1}
                    value={form.min_stay_nights ?? 1}
                    onChange={e => setField('min_stay_nights', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maxStay">Max Stay (nights)</Label>
                  <Input
                    id="maxStay"
                    type="number"
                    min={1}
                    value={form.max_stay_nights ?? 365}
                    onChange={e => setField('max_stay_nights', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Active Listing</p>
                  <p className="text-sm text-muted-foreground">Visible to guests on the platform</p>
                </div>
                <Switch
                  checked={form.is_active ?? true}
                  onCheckedChange={v => setField('is_active', v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Featured Listing</p>
                  <p className="text-sm text-muted-foreground">Highlighted on the home page</p>
                </div>
                <Switch
                  checked={form.is_featured ?? false}
                  onCheckedChange={v => setField('is_featured', v)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>House Rules</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { key: 'no_smoking', label: 'No Smoking', desc: 'Smoking is not allowed on the property' },
                { key: 'no_pets', label: 'No Pets', desc: 'Pets are not permitted' },
                { key: 'no_parties', label: 'No Parties', desc: 'No events or large gatherings' },
              ].map(rule => (
                <div key={rule.key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{rule.label}</p>
                    <p className="text-xs text-muted-foreground">{rule.desc}</p>
                  </div>
                  <Switch
                    checked={!!(rules[rule.key])}
                    onCheckedChange={() => toggleRule(rule.key)}
                    size="sm"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Amenities Tab */}
        <TabsContent value="amenities" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Amenities & Features</CardTitle>
              <p className="text-sm text-muted-foreground">{amenities.length} selected</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                {AMENITIES_LIST.map(amenity => {
                  const isSelected = amenities.includes(amenity)
                  return (
                    <button
                      key={amenity}
                      onClick={() => toggleAmenity(amenity)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors text-left ${
                        isSelected
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border hover:border-foreground/50 hover:bg-muted'
                      }`}
                    >
                      {isSelected && <Check className="size-3.5 shrink-0" />}
                      <span className={isSelected ? '' : 'pl-5'}>{amenity}</span>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Photos Tab */}
        <TabsContent value="photos" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Property Photos</CardTitle>
              <p className="text-sm text-muted-foreground">Add URLs for your property images. The first photo will be the primary listing image.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {photoUrls.map((url, i) => (
                <div key={i} className="flex gap-2">
                  <div className="relative flex-1">
                    {i === 0 && (
                      <Badge className="absolute -top-2 left-2 text-xs z-10">Primary</Badge>
                    )}
                    <Input
                      placeholder="https://example.com/photo.jpg"
                      value={url}
                      onChange={e => {
                        const newUrls = [...photoUrls]
                        newUrls[i] = e.target.value
                        setPhotoUrls(newUrls)
                      }}
                      className={i === 0 ? 'mt-2' : ''}
                    />
                  </div>
                  {url && (
                    <img src={url} alt="" className="size-9 rounded-md object-cover border" onError={e => (e.currentTarget.style.display = 'none')} />
                  )}
                  {photoUrls.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground"
                      onClick={() => setPhotoUrls(urls => urls.filter((_, j) => j !== i))}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPhotoUrls(urls => [...urls, ''])}
                className="gap-2"
              >
                <Plus className="size-4" /> Add Photo URL
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="size-4 animate-spin" /> Saving...</> : <><Check className="size-4" /> {isNew ? 'Create Listing' : 'Save Changes'}</>}
        </Button>
        <Button variant="outline" asChild>
          <Link to="/admin/listings">Cancel</Link>
        </Button>
      </div>
    </div>
  )
}
