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
  'VITE_API_URL',
  'VITE_STRIPE_PUBLISHABLE_KEY',
  'VITE_PAYPAL_CLIENT_ID',
]

const targets = ['production', 'preview']
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
  for (const target of targets) {
    const result = spawnSync(
      npxCommand,
      ['--yes', 'vercel', 'env', 'add', key, target, '--force'],
      {
        input: `${value}\n`,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    )

    if (result.status !== 0) {
      process.stderr.write(result.stdout ?? '')
      process.stderr.write(result.stderr ?? '')
      throw new Error(`Failed to sync ${key} to Vercel ${target}`)
    }

    process.stdout.write(result.stdout ?? '')
  }
}

console.log('Vercel environment variables synced from .env.local.')