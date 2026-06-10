import type { SVGProps } from 'react'

/**
 * HavenMark — bespoke architectural monogram.
 *
 * A precision-drawn luxury villa: twin roof ridges form a sharp peak, a
 * machined keystone sits at the apex, and an arched portal anchors the base.
 * Drawn on a 24×24 grid with `currentColor` strokes so the metallic plinth
 * (.logo-3d) supplies the dimensional lighting. Crisp, geometric, cinematic.
 */
export function HavenMark({
  className,
  strokeWidth = 1.6,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {/* Roof ridge — sharp twin-slope peak */}
      <path d="M12 2.6 20.4 9.4" />
      <path d="M12 2.6 3.6 9.4" />
      {/* Keystone accent at the apex */}
      <path d="m12 2.6 0 2.9" opacity="0.9" />
      {/* Eaves / structure body */}
      <path d="M5 10.6V20.6H19V10.6" />
      {/* Base plinth */}
      <path d="M3.4 20.6H20.6" />
      {/* Arched portal */}
      <path d="M9.4 20.6v-4.3a2.6 2.6 0 0 1 5.2 0v4.3" />
      {/* Portal threshold detail */}
      <path d="M12 16.3v2.1" opacity="0.65" />
    </svg>
  )
}
