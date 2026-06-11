import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import dotenv from 'dotenv'

const envFile = resolve(process.cwd(), '.env.local')
let raw

try {
  raw = readFileSync(envFile, 'utf8')
} catch {
  console.error('Missing .env.local. Add the required env vars there before syncing to Vercel.')
  process.exit(1)
}

const parsed = dotenv.parse(raw)

const keys = [
  'DATABASE_URL',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD',
  'ADMIN_JWT_SECRET',
  // VITE_API_URL is intentionally omitted: it is environment-specific
  // (localhost in dev, same-origin /api in production) and should be set
  // per-environment in the Vercel dashboard, not synced from .env.local.
  'VITE_STRIPE_PUBLISHABLE_KEY',
  'VITE_PAYPAL_CLIENT_ID',
  // Server-side payment secrets — required for live payment authorization.
  // Never expose these to the client; they are read only by the API server.
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_SECRET',
  'PAYPAL_ENV',
]

const targets = ['production']
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx'

const entries = keys
  .map((key) => {
    const value = parsed[key] ?? process.env[key]
    return value && value.trim().length > 0 ? [key, value] : null
  })
  .filter(Boolean)

if (entries.length === 0) {
  console.log('No deployable env vars found in .env.local.')
  process.exit(0)
}

for (const entry of entries) {
  const [key, value] = entry
  // Wrap the value in double quotes so shells treat metacharacters like & as
  // literal; escape any embedded double quotes for the platform.
  const quotedValue = process.platform === 'win32'
    ? `"${value.replace(/"/g, '""')}"`
    : `'${value.replace(/'/g, `'\\''`)}'`

  for (const target of targets) {
    const command = [
      npxCommand,
      '--yes',
      'vercel',
      'env',
      'add',
      key,
      target,
      '--value',
      quotedValue,
      '--yes',
      '--force',
    ].join(' ')

    const result = spawnSync(command, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    })

    if (result.status !== 0) {
      process.stderr.write(result.stdout ?? '')
      process.stderr.write(result.stderr ?? '')
      throw new Error(`Failed to sync ${key} to Vercel ${target}`)
    }

    process.stdout.write(result.stdout ?? '')
  }
}

console.log('Vercel environment variables synced from .env.local.')