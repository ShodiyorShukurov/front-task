/**
 * Personal account writes. They go through the Function, never the table.
 *
 * Neither function accepts a user id. The Function identifies the caller from
 * the session, so a user id in the request could only ever be ignored or, if
 * trusted, let one person edit another's profile.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { ROLES, type PersonalAccount } from '#/lib/types'
import { readSessionSecret } from './appwrite.server'
import { callPersonalAccount, type FunctionFailure } from './personal-account.server'

export type ProfileResult =
  | { ok: true; account: PersonalAccount }
  | { ok: false; failure: FunctionFailure }

const signedOut: ProfileResult = {
  ok: false,
  failure: { status: 401, error: 'unauthorized', message: 'You are signed out.' },
}

export const createAccount = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      firstName: z.string().trim().min(1).max(100),
      lastName: z.string().trim().min(1).max(100),
      role: z.enum(ROLES),
    }),
  )
  .handler(async ({ data }): Promise<ProfileResult> => {
    const secret = readSessionSecret()
    if (!secret) return signedOut

    // 201 created, 200 already existed with this role: both are success, which
    // is what makes a double submit harmless.
    const result = await callPersonalAccount(secret, 'POST', data)
    return result.ok ? { ok: true, account: result.account } : result
  })

/** An empty optional field means "remove it", which the Function spells null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? null : value))

export const updateAccount = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      firstName: z.string().trim().min(1).max(100),
      lastName: z.string().trim().min(1).max(100),
      contactEmail: optionalText(254).pipe(z.email().nullable()),
      bio: optionalText(2000),
    }),
  )
  .handler(async ({ data }): Promise<ProfileResult> => {
    const secret = readSessionSecret()
    if (!secret) return signedOut

    const result = await callPersonalAccount(secret, 'PATCH', data)
    return result.ok ? { ok: true, account: result.account } : result
  })
