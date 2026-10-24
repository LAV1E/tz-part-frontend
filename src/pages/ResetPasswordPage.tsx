import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { api, errorMessage } from '../api/client'
import { clearSession } from '../api/session'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/Button'
import { TextField } from '../components/TextField'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password !== confirmPassword) {
      toast.warning('Passwords do not match')
      return
    }
    setSubmitting(true)
    try {
      const result = await api<undefined>('/api/dashboard/auth/reset-password', {
        auth: false,
        body: { token, password },
      })
      clearSession()
      setDone(true)
      toast.success(result.message ?? 'Password updated')
    } catch (caught) {
      toast.error(errorMessage(caught))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Reset password">
      {!token ? (
        <p role="alert" className="font-sans text-sm text-error">
          This reset link is missing a token.
        </p>
      ) : done ? null : (
        <form className="space-y-md" onSubmit={onSubmit}>
          <TextField
            id="password"
            label="New password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <TextField
            id="confirm-password"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      )}
      <p className="mt-md text-center">
        <Link to="/login" className="font-sans text-sm font-medium text-gold-link hover:text-gold-hover">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
