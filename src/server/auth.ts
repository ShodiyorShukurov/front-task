/**
 * Sign-in, session and sign-out, as server functions.
 *
 * The handlers run only on the server. The browser gets an RPC stub, so it
 * can ask "who am I" or "sign me out" but never sees the session secret,
 * which lives in an httpOnly cookie that JavaScript cannot read.
 */

import { createServerFn } from '@tanstack/react-start'
import { deleteCookie, getCookie, setCookie } from '@tanstack/react-start/server'
import { ID } from 'node-appwrite'
import { z } from 'zod'

import type { Session } from '#/lib/types'
import {
  Account,
  AppwriteException,
  PENDING_USER_COOKIE,
  SESSION_COOKIE,
  adminClient,
  cookieDefaults,
  isUnauthorized,
  readSessionSecret,
  sessionClient,
} from './appwrite.server'
import { callPersonalAccount } from './personal-account.server'

export type ActionResult = { ok: true } | { ok: false; message: string }

function clearSession() {
  deleteCookie(SESSION_COOKIE, cookieDefaults)
}

/**
 * Who is signed in, and their personal account if they have one.
 *
 * Only a 401 means the session is gone (expired, revoked, deleted user); then
 * the cookie is useless and is cleared. Any other failure is Appwrite or the
 * network having a bad moment, and signing the person out for that would be
 * wrong, so it is thrown and the page shows an error instead.
 */
export const getSession = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Session | null> => {
    const secret = readSessionSecret()
    if (!secret) {
      return null
    }

    try {
      const [user, result] = await Promise.all([
        new Account(sessionClient(secret)).get(),
        callPersonalAccount(secret, 'GET'),
      ])

      if (!result.ok && result.failure.status !== 404) {
        throw new Error(`Loading the personal account failed: ${result.failure.error}`)
      }

      return {
        userId: user.$id,
        email: user.email,
        account: result.ok ? result.account : null,
      }
    } catch (error) {
      if (isUnauthorized(error)) {
        clearSession()
        return null
      }
      throw error
    }
  },
)

/** Step 1: email the person a six digit code. */
export const sendCode = createServerFn({ method: 'POST' })
  .validator(z.object({ email: z.email().max(254) }))
  .handler(async ({ data }): Promise<ActionResult> => {
    try {
      // For an email Appwrite already knows, the fresh id is ignored and the
      // existing user's id comes back. New and returning people look the same.
      const token = await new Account(adminClient()).createEmailToken({
        userId: ID.unique(),
        email: data.email,
      })

      // Kept server side so step 2 only needs the code from the browser.
      setCookie(PENDING_USER_COOKIE, token.userId, {
        ...cookieDefaults,
        maxAge: 15 * 60, // Appwrite codes expire after 15 minutes.
      })
      return { ok: true }
    } catch (error) {
      if (error instanceof AppwriteException && error.code === 429) {
        return { ok: false, message: 'Too many attempts. Wait a minute and try again.' }
      }
      throw error
    }
  })

/** Step 2: trade the code for a session and store it in an httpOnly cookie. */
export const verifyCode = createServerFn({ method: 'POST' })
  .validator(z.object({ code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6 digit code.') }))
  .handler(async ({ data }): Promise<ActionResult> => {
    const userId = getCookie(PENDING_USER_COOKIE)
    if (!userId) {
      return { ok: false, message: 'Your code has expired. Ask for a new one.' }
    }

    try {
      const session = await new Account(adminClient()).createSession({
        userId,
        secret: data.code,
      })

      setCookie(SESSION_COOKIE, session.secret, {
        ...cookieDefaults,
        expires: new Date(session.expire),
      })
      deleteCookie(PENDING_USER_COOKIE, cookieDefaults)
      return { ok: true }
    } catch (error) {
      if (error instanceof AppwriteException && (error.code === 401 || error.code === 400)) {
        return { ok: false, message: 'That code is wrong or has expired.' }
      }
      if (error instanceof AppwriteException && error.code === 429) {
        return { ok: false, message: 'Too many attempts. Wait a minute and try again.' }
      }
      throw error
    }
  })

/** Ends the session in Appwrite as well, not only in this browser. */
export const signOut = createServerFn({ method: 'POST' }).handler(async () => {
  const secret = readSessionSecret()
  if (secret) {
    try {
      await new Account(sessionClient(secret)).deleteSession({ sessionId: 'current' })
    } catch {
      // Already gone on Appwrite's side. The cookie still has to go.
    }
  }
  clearSession()
})
