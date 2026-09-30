import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { z } from 'zod'

import { safeRedirect } from '#/lib/redirect'
import { sessionQuery } from '#/lib/session'
import { ROLES, ROLE_LABELS, type Role } from '#/lib/types'
import { createAccount } from '#/server/profile'

export const Route = createFileRoute('/onboarding')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: ({ context, search }) => {
    if (!context.session) {
      throw redirect({ to: '/sign-in', search: { redirect: search.redirect } })
    }
    // Someone who already has an account skips this page.
    if (context.session.account) {
      throw redirect({ href: safeRedirect(search.redirect) })
    }
  },
  component: Onboarding,
})

function Onboarding() {
  const search = Route.useSearch()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState<Role | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // `disabled={pending}` only takes effect after React re-renders, and two
  // fast clicks can both land before that. A ref is updated synchronously.
  // The Function is idempotent too (200 on a repeat), so this is about not
  // sending the extra request, not about correctness.
  const submitting = useRef(false)

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (submitting.current || !role) return
    submitting.current = true
    setPending(true)
    setError(null)

    try {
      const result = await createAccount({ data: { firstName, lastName, role } })

      if (result.ok) {
        queryClient.setQueryData(sessionQuery.queryKey, (session) =>
          session ? { ...session, account: result.account } : session,
        )
        await router.navigate({ href: safeRedirect(search.redirect) })
        return
      }

      if (result.failure.status === 401) {
        queryClient.setQueryData(sessionQuery.queryKey, null)
        await router.navigate({ to: '/sign-in', search: { redirect: search.redirect } })
        return
      }

      // 409: an account already exists with the other role, for example
      // created from another tab. The role cannot change, so say so.
      setError(
        result.failure.status === 409
          ? 'You already have an account with a different role. Reload the page to continue.'
          : (result.failure.issues?.map((issue) => issue.message).join(' ') ??
              result.failure.message),
      )
    } catch (error) {
      console.error(error)
      setError('Something went wrong. Please try again.')
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  return (
    <main>
      <h1>Tell us about you</h1>
      <form onSubmit={onSubmit}>
        <label>
          First name
          <input
            required
            maxLength={100}
            autoComplete="given-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
        </label>
        <label>
          Last name
          <input
            required
            maxLength={100}
            autoComplete="family-name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
        </label>
        <fieldset style={{ marginTop: '0.75rem' }}>
          <legend>I am a</legend>
          {ROLES.map((value) => (
            <label key={value} style={{ display: 'inline', marginRight: '1rem' }}>
              <input
                type="radio"
                name="role"
                required
                value={value}
                checked={role === value}
                onChange={() => setRole(value)}
                style={{ display: 'inline', width: 'auto' }}
              />{' '}
              {ROLE_LABELS[value]}
            </label>
          ))}
          <p>This cannot be changed later.</p>
        </fieldset>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </main>
  )
}
