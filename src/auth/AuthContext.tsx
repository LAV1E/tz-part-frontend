import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { api, logoutRequest } from '../api/client'
import { clearSession, hasSession, saveTokens, SESSION_CLEARED } from '../api/session'
import type { CurrentUser } from './types'

type TokenPair = {
  accessToken: string
  refreshToken: string
}

type AuthContextValue = {
  user: CurrentUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateUser: (next: CurrentUser) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(hasSession())

  useEffect(() => {
    const onCleared = () => {
      setUser(null)
      setLoading(false)
    }
    window.addEventListener(SESSION_CLEARED, onCleared)
    return () => window.removeEventListener(SESSION_CLEARED, onCleared)
  }, [])

  useEffect(() => {
    if (!hasSession()) return
    let cancelled = false
    api<CurrentUser>('/api/dashboard/auth/me')
      .then((result) => {
        if (!cancelled) setUser(result.data)
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (email, password) => {
        const tokens = await api<TokenPair>('/api/dashboard/auth/login', {
          auth: false,
          body: { email, password },
        })
        saveTokens(tokens.data.accessToken, tokens.data.refreshToken)
        try {
          const profile = await api<CurrentUser>('/api/dashboard/auth/me')
          setUser(profile.data)
          setLoading(false)
        } catch (error) {
          clearSession()
          throw error
        }
      },
      logout: async () => {
        await logoutRequest()
      },
      updateUser: (next) => {
        setUser(next)
      },
    }),
    [loading, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
