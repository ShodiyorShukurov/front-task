import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const { session } = Route.useRouteContext()

  return (
    <main>
      <section className="hero">
        {session?.account ? (
          <>
            <h1>Welcome back, {session.account.firstName}</h1>
            <p>Your next home in Uzbekistan is a few clicks away.</p>
            <Link to="/profile" className="cta">
              View your profile
            </Link>
          </>
        ) : (
          <>
            <h1>Real estate in Uzbekistan</h1>
            <p>Buy, sell and rent homes with owners and realtors you can trust.</p>
            <Link to="/sign-in" className="cta">
              Get started
            </Link>
          </>
        )}
      </section>
    </main>
  )
}
