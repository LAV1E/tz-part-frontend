import type { ReactNode } from 'react'

export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="grid min-h-screen md:grid-cols-2">
      <aside className="flex items-center justify-center bg-black px-xl py-2xl">
        <img src="/tz-logo.jpg" alt="TZ Part" className="h-auto w-full max-w-[140px] md:max-w-[220px]" />
      </aside>
      <section className="flex items-center justify-center bg-surface px-lg py-2xl">
        <div className="w-full max-w-[420px]">
          <h1 className="font-display text-h2 text-ink">{title}</h1>
          <div className="mt-lg">{children}</div>
        </div>
      </section>
    </main>
  )
}
