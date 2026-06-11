import { useState } from 'react'
import { Save, CreditCard, Bell, Globe, Shield, Key, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { StripeMark, PayPalMark } from '@/components/payments/PaymentBrands'
import { toast } from 'sonner'
import { type Settings, loadSettings, saveSettings } from '@/lib/settings'

export function AdminSettings() {
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Settings>(loadSettings)

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings(current => ({ ...current, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await saveSettings(settings)
      toast.success('Settings saved successfully')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Configure your platform settings</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="size-4 animate-spin" /> Saving...</> : <><Save className="size-4" /> Save Changes</>}
        </Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="flex w-full max-w-full justify-start overflow-x-auto md:w-auto">
          <TabsTrigger value="general" className="shrink-0 whitespace-nowrap md:flex-none"><Globe className="size-3.5 mr-1.5" />General</TabsTrigger>
          <TabsTrigger value="payments" className="shrink-0 whitespace-nowrap md:flex-none"><CreditCard className="size-3.5 mr-1.5" />Payments</TabsTrigger>
          <TabsTrigger value="notifications" className="shrink-0 whitespace-nowrap md:flex-none"><Bell className="size-3.5 mr-1.5" />Notifications</TabsTrigger>
          <TabsTrigger value="security" className="shrink-0 whitespace-nowrap md:flex-none"><Shield className="size-3.5 mr-1.5" />Security</TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Site Information</CardTitle>
              <CardDescription>Basic configuration for your rental platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Site Name</Label>
                  <Input value={settings.siteName} onChange={e => set('siteName', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Brand Tagline</Label>
                  <Input value={settings.brandTagline} onChange={e => set('brandTagline', e.target.value)} placeholder="Private Estates" />
                </div>
                <div className="space-y-1.5">
                  <Label>Site URL</Label>
                  <Input value={settings.siteUrl} onChange={e => set('siteUrl', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Contact Email</Label>
                  <Input type="email" value={settings.contactEmail} onChange={e => set('contactEmail', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Select value={settings.currency} onValueChange={v => set('currency', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD – US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR – Euro</SelectItem>
                      <SelectItem value="GBP">GBP – British Pound</SelectItem>
                      <SelectItem value="CAD">CAD – Canadian Dollar</SelectItem>
                      <SelectItem value="AUD">AUD – Australian Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Listing Defaults</CardTitle>
              <CardDescription>Default values applied to new property listings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Default Service Fee (%)</Label>
                  <Input type="number" value={settings.defaultServiceFee} onChange={e => set('defaultServiceFee', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Default Cleaning Fee ($)</Label>
                  <Input type="number" value={settings.defaultCleaningFee} onChange={e => set('defaultCleaningFee', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Default Min Stay (nights)</Label>
                  <Input type="number" min={1} value={settings.defaultMinStay} onChange={e => set('defaultMinStay', e.target.value)} />
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Default Check-in Time</Label>
                  <Input type="time" value={settings.defaultCheckIn} onChange={e => set('defaultCheckIn', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Default Check-out Time</Label>
                  <Input type="time" value={settings.defaultCheckOut} onChange={e => set('defaultCheckOut', e.target.value)} />
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Auto-confirm Bookings</p>
                  <p className="text-xs text-muted-foreground">Automatically confirm bookings without manual review</p>
                </div>
                <Switch
                  checked={settings.autoConfirmBookings}
                  onCheckedChange={v => set('autoConfirmBookings', v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Allow Guest Reviews</p>
                  <p className="text-xs text-muted-foreground">Guests can leave reviews after their stay</p>
                </div>
                <Switch
                  checked={settings.allowGuestReviews}
                  onCheckedChange={v => set('allowGuestReviews', v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StripeMark />
                Stripe Configuration
              </CardTitle>
              <CardDescription>Enable credit card payments via Stripe</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Enable Stripe Payments</p>
                  <p className="text-xs text-muted-foreground">Accept Visa, Mastercard, Amex, and more</p>
                </div>
                <Switch
                  checked={settings.stripeEnabled}
                  onCheckedChange={v => set('stripeEnabled', v)}
                />
              </div>
              {settings.stripeEnabled && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-2">
                        <Key className="size-3.5" /> Publishable Key
                        <Badge variant="secondary" className="text-xs">Public</Badge>
                      </Label>
                      <Input
                        placeholder="pk_live_..."
                        value={settings.stripePublicKey}
                        onChange={e => set('stripePublicKey', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-2">
                        <Key className="size-3.5" /> Secret Key
                        <Badge variant="destructive" className="text-xs">Server only</Badge>
                      </Label>
                      <Input
                        type="password"
                        placeholder="sk_live_..."
                        value={settings.stripeSecretKey}
                        onChange={e => set('stripeSecretKey', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Store this in your edge function environment variables, never in client code.</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PayPalMark />
                PayPal Configuration
              </CardTitle>
              <CardDescription>Enable PayPal checkout for guests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Enable PayPal</p>
                  <p className="text-xs text-muted-foreground">Guests can pay using their PayPal balance or cards</p>
                </div>
                <Switch
                  checked={settings.paypalEnabled}
                  onCheckedChange={v => set('paypalEnabled', v)}
                />
              </div>
              {settings.paypalEnabled && (
                <>
                  <Separator />
                  <div className="space-y-1.5">
                    <Label>Client ID</Label>
                    <Input
                      placeholder="AXxxxxxxxx..."
                      value={settings.paypalClientId}
                      onChange={e => set('paypalClientId', e.target.value)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Configure when automated emails are sent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'emailNotifications', label: 'Email Notifications', desc: 'Master toggle for all email notifications' },
                { key: 'bookingConfirmations', label: 'Booking Confirmations', desc: 'Send confirmation emails to guests upon booking' },
                { key: 'cancellationAlerts', label: 'Cancellation Alerts', desc: 'Notify when a booking is cancelled' },
                { key: 'newListingReviews', label: 'New Reviews', desc: 'Alert when a guest leaves a review' },
              ].map((n, i) => (
                <div key={n.key}>
                  {i > 0 && <Separator className="my-3" />}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{n.label}</p>
                      <p className="text-xs text-muted-foreground">{n.desc}</p>
                    </div>
                    <Switch
                      checked={settings[n.key as keyof typeof settings] as boolean}
                      onCheckedChange={v => set(n.key as keyof Settings, v)}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Access & Security</CardTitle>
              <CardDescription>Control platform access and authentication requirements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Require Email Verification</p>
                  <p className="text-xs text-muted-foreground">Users must verify email before booking</p>
                </div>
                <Switch
                  checked={settings.requireEmailVerification}
                  onCheckedChange={v => set('requireEmailVerification', v)}
                />
              </div>
              <Separator />
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm font-medium">Security Recommendations</p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> API keys are stored in environment variables</li>
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Row Level Security (RLS) enabled on all database tables</li>
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Payment data processed by Stripe/PayPal (PCI compliant)</li>
                  <li className="flex items-center gap-2"><span className="text-yellow-500">⚠</span> Configure production API keys before going live</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
