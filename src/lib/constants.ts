export const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'villa', label: 'Villa' },
  { value: 'condo', label: 'Condo' },
  { value: 'studio', label: 'Studio' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'cabin', label: 'Cabin' },
  { value: 'cottage', label: 'Cottage' },
  { value: 'other', label: 'Other' },
]

export const AMENITIES_LIST = [
  'WiFi',
  'Air Conditioning',
  'Heating',
  'Kitchen',
  'Full Kitchen',
  'Washer/Dryer',
  'Parking',
  'Pool',
  'Hot Tub',
  'Gym Access',
  'Beach Access',
  'Lakefront',
  'Mountain View',
  'Ocean View',
  'City View',
  'Garden',
  'BBQ Grill',
  'Fire Pit',
  'Fireplace',
  'Smart TV',
  'Workspace',
  'Pet Friendly',
  'Elevator',
  'Security System',
  'Bike Rental',
  'Kayaks',
  'Ski Storage',
  'Private Dock',
  'Wine Cellar',
  'Outdoor Dining',
  'Coffee Maker',
  'Hiking Trails',
  'Fishing Equipment',
]

export const BOOKING_STATUSES = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
}

export const PAYMENT_STATUSES = {
  unpaid: { label: 'Unpaid', color: 'bg-muted text-muted-foreground' },
  authorized: { label: 'Authorized', color: 'bg-yellow-100 text-yellow-800' },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-800' },
  refunded: { label: 'Refunded', color: 'bg-orange-100 text-orange-800' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800' },
}

export const DEMO_IMAGES: Record<string, string[]> = {
  villa: [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
    'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&q=80',
  ],
  apartment: [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
  ],
  cabin: [
    'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800&q=80',
    'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800&q=80',
    'https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800&q=80',
  ],
  house: [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
    'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80',
  ],
  cottage: [
    'https://images.unsplash.com/photo-1471115853179-bb1d604434e0?w=800&q=80',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
    'https://images.unsplash.com/photo-1505916349660-8d91a99f389e?w=800&q=80',
  ],
  studio: [
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80',
  ],
}

export function getPropertyImage(type: string, index = 0): string {
  const images = DEMO_IMAGES[type] || DEMO_IMAGES.apartment
  return images[index % images.length]
}
