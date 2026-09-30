/**
 * The `redirect` search param comes from the URL, so anyone can write it.
 * Following it blindly makes us an open redirect: a phishing link to our real
 * sign-in page could forward people to a look-alike site right after they
 * sign in. Only same-site paths are allowed; anything else goes home.
 */
export function safeRedirect(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string') return fallback

  // "/foo" is ours. "//evil.com" and "/\evil.com" are other hosts to a browser.
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return fallback
  }

  // Control characters (tab, newline) are stripped by URL parsers and can turn
  // "/\t/evil.com" into "//evil.com".
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback

  // Sending someone back to sign-in after signing in would loop.
  if (value === '/sign-in' || value.startsWith('/sign-in?')) return fallback

  return value
}
