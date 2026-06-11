import type { SVGProps, ReactNode, ReactElement } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { strokeWidth?: number }

function Svg({ strokeWidth = 1.6, children, ...props }: IconProps & { children: ReactNode }) {
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

/* All — a refined estate key-mark / compass star */
function AllIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3 5 8.2V20h14V8.2L12 3Z" />
      <path d="M9.5 20v-4.5a2.5 2.5 0 0 1 5 0V20" />
      <path d="M12 3v2.4" />
    </Svg>
  )
}

/* Apartment — multi-storey block with windows */
function ApartmentIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 21V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21" />
      <path d="M4 21h16" />
      <path d="M9.5 7h.01M14.5 7h.01M9.5 11h.01M14.5 11h.01M9.5 15h.01M14.5 15h.01" />
      <path d="M10.5 21v-3h3v3" />
    </Svg>
  )
}

/* House — pitched roof with door */
function HouseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 11.5 12 5l8 6.5" />
      <path d="M6 10.5V20h12v-9.5" />
      <path d="M10.5 20v-5h3v5" />
    </Svg>
  )
}

/* Villa — twin-gabled luxury residence */
function VillaIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 11 7.5 6.5 12 11" />
      <path d="M12 11l4.5-4.5L21 11" />
      <path d="M5 11v9h14v-9" />
      <path d="M10.5 20v-4.5h3V20" />
      <path d="M5 20h14" />
    </Svg>
  )
}

/* Condo — tall tower with grid windows */
function CondoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 21V5.5A1.5 1.5 0 0 1 8.5 4h7A1.5 1.5 0 0 1 17 5.5V21" />
      <path d="M4 21h16" />
      <path d="M10 8h.01M14 8h.01M10 11.5h.01M14 11.5h.01M10 15h.01M14 15h.01" />
      <path d="M9 4V2.6M15 4V2.6" />
    </Svg>
  )
}

/* Studio — single open loft with skylight */
function StudioIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 11 12 5l8 6" />
      <path d="M6 10v10h12V10" />
      <path d="M9 20v-6h6v6" />
      <path d="M9 14h6" />
    </Svg>
  )
}

/* Townhouse — row of three joined homes */
function TownhouseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 10.5 6 8l3 2.5" />
      <path d="M9 10.5 12 8l3 2.5" />
      <path d="M15 10.5 18 8l3 2.5" />
      <path d="M4 10v10h16V10" />
      <path d="M11 20v-4h2v4" />
      <path d="M4 20h16" />
    </Svg>
  )
}

/* Cabin — A-frame with log accents */
function CabinIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4 4 20h16L12 4Z" />
      <path d="M7.2 13h9.6" />
      <path d="M10 20v-4.5h4V20" />
    </Svg>
  )
}

/* Cottage — cozy roof with chimney */
function CottageIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 12 12 5l8 7" />
      <path d="M6 11v9h12v-9" />
      <path d="M16 7.5V4.8h2V9" />
      <path d="M10.5 20v-4.5h3V20" />
    </Svg>
  )
}

/* Other — estate key */
function OtherIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="8" r="3.5" />
      <path d="m10.5 10.5 8 8" />
      <path d="m15.5 15.5 1.8-1.8" />
      <path d="m18 18 1.8-1.8" />
    </Svg>
  )
}

const ICONS: Record<string, (props: IconProps) => ReactElement> = {
  all: AllIcon,
  apartment: ApartmentIcon,
  house: HouseIcon,
  villa: VillaIcon,
  condo: CondoIcon,
  studio: StudioIcon,
  townhouse: TownhouseIcon,
  cabin: CabinIcon,
  cottage: CottageIcon,
  other: OtherIcon,
}

/** Icon keys selectable when configuring a property category. */
export const PROPERTY_TYPE_ICON_KEYS = Object.keys(ICONS)

export function PropertyTypeIcon({ type, ...props }: IconProps & { type: string }) {
  const Icon = ICONS[type] ?? OtherIcon
  return <Icon {...props} />
}

/* Empty state — an estate viewed through a search lens */
export function NoResultsIcon({ strokeWidth = 1.4, ...props }: IconProps) {  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* villa silhouette */}
      <path d="M10 24 21 15l11 9" />
      <path d="M13 22v13h16V22" />
      <path d="M18 35v-7h6v7" />
      <path d="M13 35h16" />
      {/* search lens overlapping lower-right */}
      <circle cx="31" cy="31" r="7.5" />
      <path d="m36.5 36.5 4 4" />
    </svg>
  )
}

/* Eyebrow flourish — a slim faceted diamond for the hero kicker */
export function FlourishIcon({ strokeWidth = 1.4, ...props }: IconProps) {
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
      <path d="M12 4 16 12 12 20 8 12Z" />
      <path d="M8 12h8" />
    </svg>
  )
}
