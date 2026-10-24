import { ApiReferenceReact } from '@scalar/api-reference-react'
import '@scalar/api-reference-react/style.css'
import { useEffect, useState } from 'react'

import { errorMessage, fetchOpenApiDocument } from '../api/client'
import { getAccessToken } from '../api/session'

export function ApiDocsPage() {
  const accessToken = getAccessToken()
  const [spec, setSpec] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchOpenApiDocument()
      .then((document) => {
        if (!cancelled) setSpec(document)
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(errorMessage(caught))
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return <div className="flex h-svh items-center justify-center px-6 font-sans text-sm text-ink">{error}</div>
  }

  if (!spec || !accessToken) {
    return <div className="h-svh bg-page" />
  }

  return (
    <div className="h-svh [&>div]:h-full">
      <ApiReferenceReact
        configuration={{
          content: spec,
          authentication: {
            preferredSecurityScheme: 'bearerAuth',
            securitySchemes: {
              bearerAuth: { token: accessToken },
            },
          },
        }}
      />
    </div>
  )
}
