import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'

import { safeRedirect } from '#/lib/redirect'
import { sessionQuery } from '#/lib/session'
import { sendCode, verifyCode } from '#/server/auth'

export const Route = createFileRoute('/sign-in')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: ({ context, search }) => {
    if (context.session) {
      throw redirect({ href: nextStep(Boolean(context.session.account), search.redirect) })
    }
  },
  component: SignIn,
})

/** Where to go once signed in: onboarding first if there is no account yet. */
export function nextStep(hasAccount: boolean, redirectParam: string | undefined) {
  const target = safeRedirect(redirectParam)
  if (hasAccount) return target
  return target === '/' ? '/onboarding' : `/onboarding?redirect=${encodeURIComponent(target)}`
}

function SignIn() {
  const search = Route.useSearch()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function run(action: () => Promise<void>) {
    setPending(true)
    setError(null)
    try {
      await action()
    } catch (error) {
      console.error(error)
      setError('Something went wrong. Please try again.')
    } finally {
      setPending(false)
    }
  }

  const onSendCode = (event: React.FormEvent) => {
    event.preventDefault()
    run(async () => {
      const result = await sendCode({ data: { email: email.trim() } })
      if (!result.ok) return setError(result.message)
      setCode('')
      setStep('code')
    })
  }

  const onVerify = (event: React.FormEvent) => {
    event.preventDefault()
    run(async () => {
      const result = await verifyCode({ data: { code } })
      if (!result.ok) return setError(result.message)

      // The cookie is set now. Ask the server who we are, bypassing the cache.
      const session = await queryClient.fetchQuery({ ...sessionQuery, staleTime: 0 })
      await router.navigate({ href: nextStep(Boolean(session?.account), search.redirect) })
    })
  }

  if (step === 'email') {
    return (
      <main>
        <h1>Sign in</h1>
        <form onSubmit={onSendCode}>
          <label>
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <button type="submit" disabled={pending}>
            {pending ? 'Sending…' : 'Send code'}
          </button>
        </form>
      </main>
    )
  }

  return (
    <main>
      <h1>Check your email</h1>
      <p>We sent a 6 digit code to {email}. It may take a minute, and may land in spam.</p>
      <form onSubmit={onVerify}>
        <label>
          Code
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            autoFocus
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={pending}>
          {pending ? 'Checking…' : 'Sign in'}
        </button>
      </form>
      <p>
        <button type="button" onClick={() => setStep('email')} disabled={pending}>
          Use a different email
        </button>{' '}
        <button type="button" onClick={onSendCode} disabled={pending}>
          Send a new code
        </button>
      </p>
    </main>
  )
}
