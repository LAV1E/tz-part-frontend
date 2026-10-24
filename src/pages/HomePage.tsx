import { useAuth } from '../auth/AuthContext'

export function HomePage() {
  const { user } = useAuth()
  const name = user?.name || user?.email || 'there'

  return (
    <section>
      <h2 className="font-display text-h2 text-ink">Welcome, {name}</h2>
      <p className="mt-sm font-sans text-body-sm text-muted">You are signed in to the TZ Part dashboard.</p>
    </section>
  )
}
