const TOKEN_KEY = 'haven_admin_token'

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAdminToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAdminToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function isAdminAuthed(): boolean {
  return !!getAdminToken()
}

/** Thrown by the API layer when an admin request is rejected (401/403). */
export class AdminUnauthorizedError extends Error {
  constructor(message = 'Your session has expired. Please sign in again.') {
    super(message)
    this.name = 'AdminUnauthorizedError'
  }
}
