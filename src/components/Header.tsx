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
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="brand">
          HA<span>U</span>Z
        </Link>
        <span className="spacer" />
        {session ? (
          <>
            <Link to="/profile" className="user-chip">
              <span className="avatar" aria-hidden>
                {(session.account?.firstName ?? session.email).charAt(0).toUpperCase()}
              </span>
              {session.account?.firstName ?? session.email}
            </Link>
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
      </div>
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
    <button
      type="button"
      className="btn-secondary"
      onClick={() => logOut.mutate()}
      disabled={logOut.isPending}
    >
      {logOut.isPending ? 'Logging out…' : 'Log out'}
    </button>
  )
}
