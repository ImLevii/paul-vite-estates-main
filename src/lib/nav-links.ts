/**
 * Live, shared header navigation links. Configured from the admin dashboard
 * and persisted server-side, so every device sees the same menu. Updates
 * propagate across tabs and on focus via useLiveData.
 */
import { useEffect, useState } from 'react'
import { api, type NavLink } from '@/lib/api'
import { useLiveData } from '@/hooks/use-live-data'

let cache: NavLink[] = []

export function useNavLinks(): NavLink[] {
  const [links, setLinks] = useState<NavLink[]>(cache)

  const load = () => {
    api.navLinks
      .list()
      .then(rows => {
        cache = rows
        setLinks(rows)
      })
      .catch(() => {
        /* keep current */
      })
  }

  useEffect(load, [])
  useLiveData(load)

  return links
}
