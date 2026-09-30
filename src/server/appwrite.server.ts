/**
 * Everything that touches Appwrite credentials lives here.
 *
 * The `.server.ts` suffix makes TanStack Start refuse to bundle this file for
 * the browser, so the API key and the session secret cannot leak into client
 * JavaScript by accident.
 */

import { getCookie } from '@tanstack/react-start/server'
import { Account, AppwriteException, Client, Functions } from 'node-appwrite'

export const SESSION_COOKIE = 'hauz_session'
/** The Appwrite user id between "send code" and "verify code". */
export const PENDING_USER_COOKIE = 'hauz_pending_user'

function env(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable ${name}. See README.md.`)
  }
  return value
}

function baseClient() {
  return new Client()
    .setEndpoint(env('APPWRITE_ENDPOINT'))
    .setProject(env('APPWRITE_PROJECT_ID'))
}

/** Acts as the server itself. Only used to start and finish email sign-in. */
export function adminClient() {
  return baseClient().setKey(env('APPWRITE_API_KEY'))
}

/**
 * Acts as the signed-in person. Appwrite sees their session, so the Function
 * receives their id in `x-appwrite-user-id`. Never use the API key here: an
 * execution made with a key has no user, and the Function answers 401.
 */
export function sessionClient(secret: string) {
  return baseClient().setSession(secret)
}

export function readSessionSecret(): string | undefined {
  return getCookie(SESSION_COOKIE) || undefined
}

export const cookieDefaults = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
} as const

export function isUnauthorized(error: unknown) {
  return error instanceof AppwriteException && error.code === 401
}

export { Account, AppwriteException, Functions }
