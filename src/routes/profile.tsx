import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { sessionQuery } from '#/lib/session'
import { ROLE_LABELS, type PersonalAccount } from '#/lib/types'
import { updateAccount } from '#/server/profile'

export const Route = createFileRoute('/profile')({
  beforeLoad: ({ context }) => {
    if (!context.session) {
      throw redirect({ to: '/sign-in', search: { redirect: '/profile' } })
    }
    if (!context.session.account) {
      throw redirect({ to: '/onboarding', search: { redirect: '/profile' } })
    }
  },
  component: Profile,
})

function Profile() {
  const { data: session } = useSuspenseQuery(sessionQuery)
  // The guard above ran, but the session can change under us (log out).
  if (!session?.account) return null

  return <ProfileForm account={session.account} />
}

function ProfileForm({ account }: { account: PersonalAccount }) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [firstName, setFirstName] = useState(account.firstName)
  const [lastName, setLastName] = useState(account.lastName)
  const [contactEmail, setContactEmail] = useState(account.contactEmail ?? '')
  const [bio, setBio] = useState(account.bio ?? '')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setPending(true)
    setSaved(false)
    setError(null)

    try {
      // No user id: the server knows who is signed in from the session cookie.
      // Empty contact email or bio is turned into null on the server.
      const result = await updateAccount({ data: { firstName, lastName, contactEmail, bio } })

      if (result.ok) {
        queryClient.setQueryData(sessionQuery.queryKey, (session) =>
          session ? { ...session, account: result.account } : session,
        )
        // Show what was actually stored (trimmed, cleared fields empty).
        setFirstName(result.account.firstName)
        setLastName(result.account.lastName)
        setContactEmail(result.account.contactEmail ?? '')
        setBio(result.account.bio ?? '')
        setSaved(true)
        return
      }

      if (result.failure.status === 401) {
        queryClient.setQueryData(sessionQuery.queryKey, null)
        await router.navigate({ to: '/sign-in', search: { redirect: '/profile' } })
        return
      }

      setError(
        result.failure.issues?.map((issue) => `${issue.field}: ${issue.message}`).join(' ') ??
          result.failure.message,
      )
    } catch (error) {
      console.error(error)
      setError('Could not save. Check the fields and try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main>
      <div className="card card--wide">
        <div className="profile-head">
          <span className="avatar" aria-hidden>
            {account.firstName.charAt(0).toUpperCase()}
          </span>
          <div>
            <h1>
              {account.firstName} {account.lastName}
            </h1>
            <span className="badge">{ROLE_LABELS[account.role]}</span>
          </div>
        </div>
        <form onSubmit={onSubmit}>
          <div className="row">
            <label>
              First name
              <input
                required
                maxLength={100}
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
            </label>
            <label>
              Last name
              <input
                required
                maxLength={100}
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
            </label>
          </div>
          <label>
            <span>
              Contact email <span className="optional">(optional)</span>
            </span>
            <input
              type="email"
              maxLength={254}
              placeholder="Shown to people who contact you"
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
            />
          </label>
          <label>
            <span>
              Bio <span className="optional">(optional)</span>
            </span>
            <textarea
              rows={5}
              maxLength={2000}
              placeholder="A few words about you"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          {saved && <p role="status">Saved.</p>}
          <button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </main>
  )
}
