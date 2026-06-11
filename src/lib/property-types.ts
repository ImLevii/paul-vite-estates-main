/**
 * Live, shared property categories. These are configured from the admin
 * dashboard and persisted server-side, so every device sees the same list.
 * A static fallback keeps the public site working before the first fetch (or
 * if the API is unavailable).
 */
import { useEffect, useState } from 'react'
import { api, type PropertyType } from '@/lib/api'
import { useLiveData } from '@/hooks/use-live-data'
import { PROPERTY_TYPES as FALLBACK } from '@/lib/constants'

export type PropertyTypeOption = { value: string; label: string; icon: string }

const FALLBACK_OPTIONS: PropertyTypeOption[] = FALLBACK.map(t => ({
  value: t.value,
  label: t.label,
  icon: t.value,
}))

/** Module-level cache so multiple components share one fetch result. */
let cache: PropertyTypeOption[] = FALLBACK_OPTIONS

function toOptions(rows: PropertyType[]): PropertyTypeOption[] {
  return rows.map(r => ({ value: r.value, label: r.label, icon: r.icon || 'other' }))
}

/**
 * Returns the active property categories, kept fresh across tabs/devices.
 * Falls back to the built-in list until the first successful fetch.
 */
export function usePropertyTypes(): PropertyTypeOption[] {
  const [types, setTypes] = useState<PropertyTypeOption[]>(cache)

  const load = () => {
    api.propertyTypes
      .list()
      .then(rows => {
        const opts = rows.length > 0 ? toOptions(rows) : FALLBACK_OPTIONS
        cache = opts
        setTypes(opts)
      })
      .catch(() => {
        /* keep current/fallback */
      })
  }

  useEffect(load, [])
  useLiveData(load)

  return types
}
