const ACCESS_KEY = 'tzpart.accessToken'
const REFRESH_KEY = 'tzpart.refreshToken'

export const SESSION_CLEARED = 'tzpart-session-cleared'

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function saveTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_KEY, accessToken)
  localStorage.setItem(REFRESH_KEY, refreshToken)
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  window.dispatchEvent(new Event(SESSION_CLEARED))
}

export function hasSession(): boolean {
  return Boolean(getAccessToken() || getRefreshToken())
}
