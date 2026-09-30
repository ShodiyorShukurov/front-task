export const ROLES = ['property_owner', 'realtor'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  property_owner: 'Property Owner',
  realtor: 'Realtor',
}

/** What the personal-account Function returns. */
export type PersonalAccount = {
  personalAccountId: string
  firstName: string
  lastName: string
  role: Role
  contactEmail: string | null
  bio: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Who is looking at the page. `account` is null until onboarding is done.
 * Deliberately no session secret in here: this object is sent to the browser.
 */
export type Session = {
  userId: string
  email: string
  account: PersonalAccount | null
}
