import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { strokeWidth?: number }

function Svg({ strokeWidth = 1.5, children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

/* Listings — a precision estate facade with portal */
export function ListingsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3 21 9.2" />
      <path d="M12 3 3 9.2" />
      <path d="M5 10v9.5h14V10" />
      <path d="M3.5 19.5h17" />
      <path d="M9.6 19.5v-4a2.4 2.4 0 0 1 4.8 0v4" />
    </Svg>
  )
}

/* Bookings — a calendar with a confirmed mark */
export function BookingsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.4" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v3.4" />
      <path d="M16 3v3.4" />
      <path d="m9 14.4 2 2 4-4.2" />
    </Svg>
  )
}

/* Revenue — a stacked coin / treasure column */
export function RevenueIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <ellipse cx="12" cy="6" rx="7" ry="2.8" />
      <path d="M5 6v5c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8V6" />
      <path d="M5 11v5c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8v-5" />
    </Svg>
  )
}

/* Rating — a faceted star with laurel accents */
export function RatingIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4.5 14 9.4l5.3.4-4 3.5 1.2 5.2L12 15.8 7.5 18.5l1.2-5.2-4-3.5 5.3-.4Z" />
    </Svg>
  )
}
