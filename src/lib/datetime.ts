const FALLBACK_TIME_ZONE = 'America/Chicago'

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value)
}

export function getAppTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return tz || FALLBACK_TIME_ZONE
  } catch {
    return FALLBACK_TIME_ZONE
  }
}

export function formatDateInAppTimeZone(
  value: string | Date,
  options?: { withYear?: boolean; withWeekday?: boolean },
): string {
  const date = toDate(value)
  if (Number.isNaN(date.getTime())) return 'Invalid date'
  const { withYear = true, withWeekday = false } = options ?? {}
  return new Intl.DateTimeFormat(undefined, {
    timeZone: getAppTimeZone(),
    weekday: withWeekday ? 'long' : undefined,
    month: 'short',
    day: 'numeric',
    year: withYear ? 'numeric' : undefined,
  }).format(date)
}

export function formatDateTimeInAppTimeZone(value: string | Date): string {
  const date = toDate(value)
  if (Number.isNaN(date.getTime())) return 'Invalid date'
  return new Intl.DateTimeFormat(undefined, {
    timeZone: getAppTimeZone(),
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

export function formatClockTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim())
  if (!match) return value
  const rawHour = parseInt(match[1], 10)
  const minute = match[2]
  if (Number.isNaN(rawHour) || rawHour < 0 || rawHour > 23) return value
  const hour12 = rawHour % 12 || 12
  const meridiem = rawHour >= 12 ? 'PM' : 'AM'
  return `${hour12}:${minute} ${meridiem}`
}
