import { clearSession, getAccessToken, getRefreshToken, saveTokens } from './session'

export const API_BASE = 'http://localhost:8000'

type Envelope<T> = {
  success: boolean
  message?: string
  data?: T
  errors?: string[]
}

export class ApiError extends Error {
  status: number
  errors?: string[]

  constructor(message: string, status: number, errors?: string[]) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

type RequestOptions = {
  method?: string
  body?: unknown
  auth?: boolean
  retry?: boolean
}

let refreshInFlight: Promise<boolean> | null = null

async function readEnvelope<T>(response: Response): Promise<Envelope<T> | null> {
  return (await response.json().catch(() => null)) as Envelope<T> | null
}

function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = rotateRefreshToken().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

async function rotateRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false

  const response = await fetch(`${API_BASE}/api/dashboard/auth/refresh`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  const payload = await readEnvelope<{ accessToken: string; refreshToken: string }>(response)
  if (!response.ok || !payload?.success || !payload.data?.accessToken || !payload.data.refreshToken) {
    return false
  }
  saveTokens(payload.data.accessToken, payload.data.refreshToken)
  return true
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<{ message?: string; data: T }> {
  const auth = options.auth !== false
  const retry = options.retry !== false
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getAccessToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (response.status === 401 && auth && retry) {
    const refreshed = await refreshSession()
    if (refreshed) return api<T>(path, { ...options, retry: false })
    clearSession()
    throw new ApiError('Your session has ended. Sign in again.', 401)
  }

  const payload = await readEnvelope<T>(response)
  if (!response.ok || !payload?.success) {
    throw new ApiError(payload?.message ?? 'Request failed', response.status, payload?.errors)
  }
  return { message: payload.message, data: payload.data as T }
}

export async function fetchOpenApiDocument(): Promise<Record<string, unknown>> {
  const load = async (retry: boolean): Promise<Record<string, unknown>> => {
    const token = getAccessToken()
    const response = await fetch(`${API_BASE}/openapi.json`, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

    if (response.status === 401 && retry) {
      const refreshed = await refreshSession()
      if (refreshed) return load(false)
      clearSession()
      throw new ApiError('Your session has ended. Sign in again.', 401)
    }

    const payload = (await response.json().catch(() => null)) as { message?: string } | Record<string, unknown> | null
    if (!response.ok || !payload || !('openapi' in payload)) {
      throw new ApiError(
        payload && 'message' in payload && payload.message ? payload.message : 'Could not load the API reference',
        response.status,
      )
    }
    return payload
  }

  return load(true)
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.errors && error.errors.length > 0) return error.errors.join(' ')
    return error.message
  }
  return 'Something went wrong. Try again.'
}

export async function logoutRequest(): Promise<void> {
  const refreshToken = getRefreshToken()
  try {
    if (refreshToken) {
      await fetch(`${API_BASE}/api/dashboard/auth/logout`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
    }
  } finally {
    clearSession()
  }
}
