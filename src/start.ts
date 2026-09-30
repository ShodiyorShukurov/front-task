import { createCsrfMiddleware, createStart } from '@tanstack/react-start'

/**
 * Server functions change state (send a code, sign in, sign out, save a
 * profile) and the session cookie rides along automatically. SameSite=Lax
 * already stops other sites from sending it on a cross-site POST; this also
 * rejects any server function call that the browser says came from another
 * origin. Page loads are left alone so links from other sites keep working.
 */
export const startInstance = createStart(() => ({
  requestMiddleware: [
    createCsrfMiddleware({
      filter: ({ request }) => new URL(request.url).pathname.startsWith('/_serverFn'),
    }),
  ],
}))
