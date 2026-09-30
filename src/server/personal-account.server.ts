/**
 * Calls the personal-account Function as the signed-in person.
 *
 * The Function learns who is calling from the session, never from the body,
 * so nothing here sends a user id.
 */

import { ExecutionMethod } from 'node-appwrite'

import { Functions, sessionClient } from './appwrite.server'
import type { PersonalAccount } from '#/lib/types'

export type FunctionFailure = {
  status: number
  error: string
  message: string
  issues?: Array<{ field: string; message: string }>
}

export type FunctionResult =
  | { ok: true; status: number; account: PersonalAccount }
  | { ok: false; failure: FunctionFailure }

export async function callPersonalAccount(
  secret: string,
  method: 'GET' | 'POST' | 'PATCH',
  body?: unknown,
): Promise<FunctionResult> {
  const functions = new Functions(sessionClient(secret))

  const execution = await functions.createExecution({
    functionId: process.env.APPWRITE_FUNCTION_ID ?? 'personal-account',
    xpath: '/personal-account',
    method: ExecutionMethod[method],
    body: body === undefined ? '' : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
    async: false,
  })

  const status = execution.responseStatusCode
  let parsed: unknown = null
  try {
    parsed = execution.responseBody ? JSON.parse(execution.responseBody) : null
  } catch {
    // A crash or timeout inside the runtime leaves no JSON behind.
  }

  if (status >= 200 && status < 300 && parsed) {
    return { ok: true, status, account: parsed as PersonalAccount }
  }

  const error = (parsed ?? {}) as Partial<FunctionFailure>
  return {
    ok: false,
    failure: {
      // Status 0 means the execution itself failed (timeout, build error).
      status: status || 502,
      error: error.error ?? 'internal_error',
      message: error.message ?? 'The profile service did not answer.',
      issues: error.issues,
    },
  }
}
