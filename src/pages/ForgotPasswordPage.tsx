import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { toast } from 'sonner'

import { api, errorMessage } from '../api/client'
import { hasSession } from '../api/session'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/Button'
import { TextField } from '../components/TextField'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (hasSession()) return <Navigate to="/" replace />

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const result = await api<undefined>('/api/dashboard/auth/forgot-password', {
        auth: false,
        body: { email },
      })
      toast.success(result.message ?? 'If an account exists for that email, a reset link has been sent')
    } catch (caught) {
      toast.error(errorMessage(caught))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Forgot password">
      <form className="space-y-md" onSubmit={onSubmit}>
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
      <p className="mt-md text-center">
        <Link to="/login" className="font-sans text-sm font-medium text-gold-link hover:text-gold-hover">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
