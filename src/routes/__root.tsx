import type { QueryClient } from '@tanstack/react-query'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouter,
} from '@tanstack/react-router'

import { Header } from '#/components/Header'
import { sessionQuery } from '#/lib/session'
import appCss from '../styles.css?url'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'HAUZ' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  // Runs on the server for the first request, so the header and the route
  // guards below know who is signed in before any HTML is sent.
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(sessionQuery)
    return { session }
  },
  shellComponent: RootDocument,
  component: RootLayout,
  errorComponent: RootError,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function RootLayout() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  )
}

/**
 * Loading the session failed for a reason other than being signed out, for
 * example Appwrite being unreachable. The cookie is kept; retrying is the fix.
 */
function RootError() {
  const router = useRouter()
  return (
    <main>
      <div className="card">
        <h1>Something went wrong</h1>
        <p className="muted">We could not reach our servers. Your sign-in is kept.</p>
        <button type="button" onClick={() => router.invalidate()}>
          Try again
        </button>
      </div>
    </main>
  )
}
