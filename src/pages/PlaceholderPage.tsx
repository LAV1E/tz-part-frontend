import { useLocation } from 'react-router-dom'

import { titleForPath } from '../navigation'

export function PlaceholderPage() {
  const { pathname } = useLocation()
  const title = titleForPath(pathname)

  return (
    <section>
      <h2 className="font-display text-h2 text-ink">{title}</h2>
      <p className="mt-sm font-sans text-body-sm text-muted">This section is not built yet.</p>
    </section>
  )
}
