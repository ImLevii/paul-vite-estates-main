import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, MapPin, Star, Bed, Bath, Users, SlidersHorizontal, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PropertyTypeIcon, NoResultsIcon, FlourishIcon } from '@/components/layout/PropertyTypeIcon'
import { type Property, type HeroSlide } from '@/lib/supabase'
import { api } from '@/lib/api'
import { useLiveData } from '@/hooks/use-live-data'
import { useSettings } from '@/lib/settings'
import { PROPERTY_TYPES, getPropertyImage } from '@/lib/constants'

const FALLBACK_HERO: Pick<HeroSlide, 'image' | 'location' | 'tagline'>[] = [
  {
    image: 'https://images.unsplash.com/photo-1717097902827-9cccce31954a?w=1800&q=80',
    location: 'Sheboygan, Wisconsin',
    tagline: 'Sandy dunes & lakefront living on Lake Michigan',
  },
  {
    image: 'https://images.unsplash.com/photo-1664580534860-2c0c909644d8?w=1800&q=80',
    location: 'Lake Michigan Shore, Wisconsin',
    tagline: 'Miles of untouched Great Lakes beaches',
  },
  {
    image: 'https://images.unsplash.com/photo-1713576325516-f21e4e6b9677?w=1800&q=80',
    location: 'Chicago Lakefront, Illinois',
    tagline: 'Prairie blooms meet skyline & marina views',
  },
]

export function HomePage() {
  const [searchParams] = useSearchParams()
  const settings = useSettings()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || 'all')
  const [sortBy, setSortBy] = useState('featured')
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([])
  const [heroIndex, setHeroIndex] = useState(0)

  useEffect(() => {
    loadProperties()
  }, [selectedType, sortBy])

  useEffect(() => {
    loadHeroSlides()
  }, [])

  function loadHeroSlides() {
    api.heroSlides.list().then(setHeroSlides).catch(() => setHeroSlides([]))
  }

  // Reflect admin changes live (broadcast + focus + poll).
  useLiveData(() => {
    loadProperties()
    loadHeroSlides()
  })

  useEffect(() => {
    if (heroSlides.length <= 1) return
    const timer = setInterval(
      () => setHeroIndex(i => (i + 1) % heroSlides.length),
      6000,
    )
    return () => clearInterval(timer)
  }, [heroSlides.length])

  async function loadProperties() {
    setLoading(true)
    try {
      const data = await api.properties.list({
        active: true,
        type: selectedType !== 'all' ? selectedType : undefined,
        sort: sortBy,
      })
      setProperties(data || [])
    } catch {
      setProperties([])
    } finally {
      setLoading(false)
    }
  }

  const filteredProperties = properties.filter(p =>
    !search ||
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.city.toLowerCase().includes(search.toLowerCase()) ||
    p.state.toLowerCase().includes(search.toLowerCase())
  )

  const featuredProperties = properties.filter(p => p.is_featured).slice(0, 3)

  const slides = heroSlides.length > 0 ? heroSlides : FALLBACK_HERO
  const safeIndex = slides.length > 0 ? heroIndex % slides.length : 0
  const activeSlide = slides[safeIndex]

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative isolate -mb-px overflow-hidden">
        {/* Rotating background images */}
        <div className="absolute inset-0 -z-10">
          {slides.map((slide, i) => (
            <div
              key={slide.image + i}
              className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out"
              style={{
                backgroundImage: `url('${slide.image}')`,
                opacity: i === safeIndex ? 1 : 0,
              }}
            />
          ))}
          <div className="absolute inset-0 bg-linear-to-b from-black/60 via-black/45 to-black/65" />
          <div className="absolute inset-0 bg-linear-to-tr from-black/20 via-transparent to-transparent" />
          {/* Fade the bottom edge into the page background for a seamless bleed */}
          <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-b from-transparent to-background" />
        </div>

        <div className="container relative mx-auto max-w-7xl px-4 py-24 md:py-36">
          <div className="mx-auto max-w-3xl text-center">
            {settings.heroEyebrow && (
              <div className="hero-eyebrow mx-auto mb-7 flex items-center justify-center gap-3">
                <span className="hero-eyebrow-rule" />
                <FlourishIcon className="size-3.5" />
                <span className="hero-eyebrow-text">{settings.heroEyebrow}</span>
                <FlourishIcon className="size-3.5" />
                <span className="hero-eyebrow-rule" />
              </div>
            )}
            <h1 className="hero-title text-balance text-5xl font-semibold tracking-tight text-white md:text-7xl">
              {settings.heroTitle}
              {settings.heroTitleAccent && (
                <span className="hero-accent block">{settings.heroTitleAccent}</span>
              )}
            </h1>
            <p className="hero-subtitle mx-auto mt-5 max-w-xl text-balance text-lg text-white/80">
              {settings.heroSubtitle}
            </p>

            {/* Search bar */}
            <div className="search-premium mt-9 flex flex-col gap-3 rounded-2xl p-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by location or property name..."
                  className="border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0 dark:bg-transparent"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <Separator orientation="vertical" className="hidden h-auto sm:block" />
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full border-0 bg-transparent shadow-none dark:bg-transparent dark:hover:bg-transparent sm:w-40">
                  <SelectValue placeholder="Property type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {PROPERTY_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="lg" className="search-cta w-full sm:w-auto">
                <Search className="size-4" /> Search
              </Button>
            </div>
          </div>

          {/* Slide caption + indicators */}
          {activeSlide && (
            <div className="mt-10 flex flex-col items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm text-white/90">
                <MapPin className="size-4" />
                <span className="font-medium">{activeSlide.location}</span>
                {activeSlide.tagline && (
                  <span className="hidden text-white/65 sm:inline">— {activeSlide.tagline}</span>
                )}
              </div>
              {slides.length > 1 && (
                <div className="flex items-center gap-2">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      aria-label={`Go to slide ${i + 1}`}
                      onClick={() => setHeroIndex(i)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === safeIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Category Filter Pills */}
      <section className="sticky top-16 z-40 border-b border-border/60 glass">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-none">
            {[{ value: 'all', label: 'All' }, ...PROPERTY_TYPES].map(type => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={`filter-pill flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium ${
                  selectedType === type.value ? 'filter-pill-active' : ''
                }`}
              >
                <PropertyTypeIcon type={type.value} className="size-4" />
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <main className="container mx-auto max-w-7xl px-4 py-8">
        {/* Featured Banner */}
        {!search && selectedType === 'all' && featuredProperties.length > 0 && (
          <section className="mb-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">Featured Properties</h2>
              <Button variant="ghost" size="sm" className="gap-1">
                View all <ChevronRight className="size-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {featuredProperties.map(property => (
                <FeaturedPropertyCard key={property.id} property={property} />
              ))}
            </div>
          </section>
        )}

        {/* All Listings */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
              {search ? `Results for "${search}"` : selectedType !== 'all' ? `${PROPERTY_TYPES.find(t => t.value === selectedType)?.label}s` : 'All Properties'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {loading ? 'Loading...' : `${filteredProperties.length} properties available`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-8 w-44 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Top Picks</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                <SelectItem value="price_desc">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <PropertyCardSkeleton key={i} />)
            : filteredProperties.map(property => (
                <PropertyCard key={property.id} property={property} />
              ))}
        </div>

        {!loading && filteredProperties.length === 0 && (
          <div className="empty-state mx-auto mt-6 flex max-w-md flex-col items-center rounded-2xl px-8 py-16 text-center">
            <span className="empty-medallion flex size-20 items-center justify-center rounded-full">
              <NoResultsIcon className="size-9" />
            </span>
            <h3 className="mt-6 text-lg font-semibold">No properties found</h3>
            <p className="mt-2 text-sm text-muted-foreground">Try adjusting your search or filters</p>
            <Button className="search-cta mt-6" onClick={() => { setSearch(''); setSelectedType('all') }}>
              Clear Filters
            </Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

function PropertyCard({ property }: { property: Property }) {
  return (
    <Link to={`/property/${property.id}`} className="group block">
      <div className="overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-foreground/15 hover:shadow-elevated">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={getPropertyImage(property.property_type)}
            alt={property.title}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          {property.is_featured && (
            <Badge className="absolute left-3 top-3 border-white/20 bg-black/40 text-white backdrop-blur-md">
              Featured
            </Badge>
          )}
          <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
            <Star className="size-3 fill-current text-amber-400" />
            {property.rating_avg > 0 ? property.rating_avg.toFixed(1) : 'New'}
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-semibold leading-snug">{property.title}</h3>
              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-3 shrink-0" />
                <span className="truncate">{property.city}, {property.state}</span>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Bed className="size-3" />{property.bedrooms === 0 ? 'Studio' : `${property.bedrooms} bed`}</span>
            <span className="flex items-center gap-1"><Bath className="size-3" />{property.bathrooms} bath</span>
            <span className="flex items-center gap-1"><Users className="size-3" />{property.max_guests} guests</span>
          </div>
          <Separator className="my-3" />
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-lg font-bold tracking-tight">${property.price_per_night.toFixed(0)}</span>
              <span className="text-sm text-muted-foreground"> / night</span>
            </div>
            {property.review_count > 0 && (
              <span className="text-xs text-muted-foreground">{property.review_count} reviews</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

function FeaturedPropertyCard({ property }: { property: Property }) {
  return (
    <Link to={`/property/${property.id}`} className="group block">
      <div className="relative h-56 overflow-hidden rounded-2xl border bg-muted shadow-elevated transition-all duration-300 hover:-translate-y-1">
        <img
          src={getPropertyImage(property.property_type)}
          alt={property.title}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/25 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <Badge variant="secondary" className="mb-2 border-white/20 bg-white/15 text-xs text-white capitalize backdrop-blur-md">{property.property_type}</Badge>
          <h3 className="font-semibold leading-tight">{property.title}</h3>
          <div className="mt-1 flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm opacity-90">
              <MapPin className="size-3" /> {property.city}, {property.state}
            </div>
            <div className="flex items-center gap-1 text-sm font-semibold">
              ${property.price_per_night.toFixed(0)}<span className="text-xs font-normal opacity-80">/night</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

function PropertyCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Skeleton className="aspect-[4/3] w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-5 w-1/3" />
      </div>
    </div>
  )
}
