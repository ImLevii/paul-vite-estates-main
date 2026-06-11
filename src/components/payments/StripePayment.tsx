import { useEffect, useState } from 'react'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { toast } from 'sonner'

// Stripe.js must be loaded once per publishable key.
const stripeCache = new Map<string, Promise<Stripe | null>>()
function getStripe(publishableKey: string) {
  let promise = stripeCache.get(publishableKey)
  if (!promise) {
    promise = loadStripe(publishableKey)
    stripeCache.set(publishableKey, promise)
  }
  return promise
}

type StripePaymentProps = {
  publishableKey: string
  amount: number
  metadata?: Record<string, string>
  buttonLabel: string
  /** Validate guest fields before charging. Return false to abort. */
  onBeforePay?: () => boolean
  /** Called with the confirmed PaymentIntent id after a successful charge. */
  onPaid: (paymentIntentId: string) => void
}

export function StripePayment({
  publishableKey,
  amount,
  metadata,
  buttonLabel,
  onBeforePay,
  onPaid,
}: StripePaymentProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const metaKey = JSON.stringify(metadata ?? {})
  useEffect(() => {
    let active = true
    setClientSecret(null)
    setError(null)
    api.payments
      .stripeIntent({ amount, currency: 'usd', metadata })
      .then((r) => {
        if (active) setClientSecret(r.clientSecret)
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Failed to initialize payment')
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, metaKey])

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }
  if (!clientSecret) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <Elements
      stripe={getStripe(publishableKey)}
      options={{ clientSecret, appearance: { theme: 'stripe' } }}
    >
      <StripePaymentInner buttonLabel={buttonLabel} onBeforePay={onBeforePay} onPaid={onPaid} />
    </Elements>
  )
}

function StripePaymentInner({
  buttonLabel,
  onBeforePay,
  onPaid,
}: Pick<StripePaymentProps, 'buttonLabel' | 'onBeforePay' | 'onPaid'>) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)

  async function handlePay() {
    if (onBeforePay && !onBeforePay()) return
    if (!stripe || !elements) return
    setProcessing(true)
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })
    if (error) {
      toast.error(error.message ?? 'Payment failed')
      setProcessing(false)
      return
    }
    if (
      paymentIntent &&
      (paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_capture')
    ) {
      onPaid(paymentIntent.id)
    } else {
      toast.error('Payment was not completed')
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      <PaymentElement />
      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={!stripe || processing}
        onClick={handlePay}
      >
        {processing ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Processing payment...
          </>
        ) : (
          buttonLabel
        )}
      </Button>
    </div>
  )
}
