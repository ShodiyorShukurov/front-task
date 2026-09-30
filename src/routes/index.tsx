import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const { session } = Route.useRouteContext()

  return (
    <main>
      <h1>HAUZ</h1>
      {session?.account ? (
        <p>
          Welcome back, {session.account.firstName}. <Link to="/profile">Your profile</Link>
        </p>
      ) : (
        <p>Real estate in Uzbekistan.</p>
      )}
    </main>
  )
}
