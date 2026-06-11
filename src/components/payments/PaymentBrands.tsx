import { cn } from '@/lib/utils'

/**
 * Brand marks for the supported payment providers. These use each provider's
 * official wordmark styling and brand colors to clearly identify the accepted
 * payment method.
 */

export function StripeMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex select-none items-center rounded-md bg-[#635BFF] px-2 py-1 text-[13px] font-bold lowercase leading-none tracking-tight text-white',
        className,
      )}
      aria-label="Stripe"
    >
      stripe
    </span>
  )
}

export function PayPalMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex select-none items-center rounded-md bg-white px-2 py-1 text-[13px] font-extrabold italic leading-none ring-1 ring-black/10',
        className,
      )}
      aria-label="PayPal"
    >
      <span className="text-[#003087]">Pay</span>
      <span className="text-[#0070E0]">Pal</span>
    </span>
  )
}
