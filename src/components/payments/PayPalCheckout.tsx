import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import { api } from '@/lib/api'
import { toast } from 'sonner'

type PayPalCheckoutProps = {
  clientId: string
  amount: number
  disabled?: boolean
  /** Validate guest fields before opening PayPal. Return false to abort. */
  onBeforePay?: () => boolean
  /** Called with the capture id after a completed PayPal payment. */
  onPaid: (captureId: string) => void
}

export function PayPalCheckout({
  clientId,
  amount,
  disabled,
  onBeforePay,
  onPaid,
}: PayPalCheckoutProps) {
  return (
    <PayPalScriptProvider options={{ clientId, currency: 'USD', intent: 'capture' }}>
      <div className={disabled ? 'pointer-events-none opacity-50' : ''}>
        <PayPalButtons
          style={{ layout: 'vertical', shape: 'rect', label: 'pay' }}
          disabled={disabled}
          createOrder={async () => {
            if (onBeforePay && !onBeforePay()) {
              throw new Error('Please complete the required fields first')
            }
            const { orderId } = await api.payments.paypalCreateOrder({ amount, currency: 'USD' })
            return orderId
          }}
          onApprove={async (data) => {
            const res = await api.payments.paypalCaptureOrder({ orderId: data.orderID })
            if (res.status === 'COMPLETED') {
              onPaid(res.captureId ?? data.orderID)
            } else {
              toast.error('PayPal payment was not completed')
            }
          }}
          onError={() => toast.error('PayPal checkout failed. Please try again.')}
        />
      </div>
    </PayPalScriptProvider>
  )
}
