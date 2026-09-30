import { queryOptions } from '@tanstack/react-query'

import { getSession } from '#/server/auth'

/**
 * One cached answer to "who is signed in". The root route loads it during
 * server rendering, so the header is right on first paint, and the SSR query
 * integration hands the same data to the browser without a second request.
 */
export const sessionQuery = queryOptions({
  queryKey: ['session'],
  queryFn: () => getSession(),
})
