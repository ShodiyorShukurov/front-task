import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link, useRouter, useRouterState } from '@tanstack/react-router'

import { sessionQuery } from '#/lib/session'
import { signOut } from '#/server/auth'

export function Header() {
  // Already in the cache from the root beforeLoad, on the server and after
  // hydration, so this never suspends and never flashes "Sign in".
  const { data: session } = useSuspenseQuery(sessionQuery)
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <header style={{ display: 'flex', gap: '1rem', alignItems: 'baseline' }}>
      <Link to="/">
        <strong>HAUZ</strong>
      </Link>
      <span style={{ flex: 1 }} />
      {session ? (
        <>
          <Link to="/profile">{session.account?.firstName ?? session.email}</Link>
          <LogOutButton />
        </>
      ) : (
        <Link
          to="/sign-in"
          search={pathname === '/' || pathname === '/sign-in' ? {} : { redirect: pathname }}
        >
          Sign in
        </Link>
      )}
    </header>
  )
}

function LogOutButton() {
  const queryClient = useQueryClient()
  const router = useRouter()

  const logOut = useMutation({
    mutationFn: () => signOut(),
    onSuccess: async () => {
      queryClient.setQueryData(sessionQuery.queryKey, null)
      await router.navigate({ to: '/' })
      // Re-run route guards with the signed-out session.
      await router.invalidate()
    },
  })

  return (
    <button type="button" onClick={() => logOut.mutate()} disabled={logOut.isPending}>
      {logOut.isPending ? 'Logging out…' : 'Log out'}
    </button>
  )
}
