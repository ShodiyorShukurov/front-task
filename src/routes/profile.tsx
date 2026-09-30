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
  const [status, setStatus] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setPending(true)
    setStatus(null)

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
        setStatus('Saved.')
        return
      }

      if (result.failure.status === 401) {
        queryClient.setQueryData(sessionQuery.queryKey, null)
        await router.navigate({ to: '/sign-in', search: { redirect: '/profile' } })
        return
      }

      setStatus(
        result.failure.issues?.map((issue) => `${issue.field}: ${issue.message}`).join(' ') ??
          result.failure.message,
      )
    } catch {
      setStatus('Could not save. Check the fields and try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main>
      <h1>Your profile</h1>
      <p>Role: {ROLE_LABELS[account.role]}</p>
      <form onSubmit={onSubmit}>
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
        <label>
          Contact email (optional)
          <input
            type="email"
            maxLength={254}
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
          />
        </label>
        <label>
          Bio (optional)
          <textarea
            rows={5}
            maxLength={2000}
            value={bio}
            onChange={(event) => setBio(event.target.value)}
          />
        </label>
        {status && <p role="status">{status}</p>}
        <button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </button>
      </form>
    </main>
  )
}
