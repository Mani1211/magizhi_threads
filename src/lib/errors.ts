/** Turns Appwrite and network errors into a sentence for a toast or form. */
export function errorMessage(e: unknown): string {
  const err = e as { code?: number; type?: string; message?: string } | null;
  const msg = err?.message ?? '';
  if (err?.type === 'user_invalid_credentials') return 'Email or password is incorrect.';
  if (err?.type === 'user_blocked') return 'This account is blocked. Unblock it in the Appwrite console.';
  if (err?.type === 'general_rate_limit_exceeded' || err?.code === 429) return 'Too many attempts. Wait a minute and try again.';
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg) || err?.code === 0)
    return 'Can’t reach the server. Check the internet connection and try again.';
  if (/Invalid Origin/i.test(msg))
    return 'This website isn’t registered in Appwrite yet. Add it as a Web platform in the Appwrite console.';
  if (err?.code === 401)
    return 'This account can’t open Magizhi data yet. Add it to the “staff” team in Appwrite, then sign in again.';
  if (err?.code === 404 && /database|table|collection|bucket/i.test(msg))
    return 'The Appwrite project isn’t set up yet. Run “npm run setup:appwrite” once.';
  return msg || 'Something went wrong. Try again.';
}
