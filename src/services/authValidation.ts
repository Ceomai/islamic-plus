const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const MIN_PASSWORD_LENGTH = 8;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

/**
 * `login` only checks presence so accounts created under the old 6-character rule can still sign in;
 * `new` (sign-up, password reset) enforces the current policy.
 */
export function validateAuthInput(
  email: string,
  password: string,
  purpose: 'login' | 'new' = 'login'
): { ok: true; email: string } | { ok: false; error: string } {
  const normalized = normalizeEmail(email);
  if (!normalized) return { ok: false, error: 'empty_email' };
  if (!EMAIL_RE.test(normalized)) return { ok: false, error: 'invalid_email' };
  if (!password) return { ok: false, error: 'empty_password' };
  if (purpose === 'new' && password.length < MIN_PASSWORD_LENGTH) return { ok: false, error: 'weak_password' };
  return { ok: true, email: normalized };
}

export function mapSupabaseAuthError(
  message: string,
  mode: 'login' | 'register'
): string {
  const msg = message.toLowerCase();

  if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
    return 'email_not_confirmed';
  }
  if (
    msg.includes('already registered') ||
    msg.includes('already been registered') ||
    msg.includes('user already registered') ||
    msg.includes('already exists')
  ) {
    return 'exists';
  }
  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return mode === 'login' ? 'wrong_credentials' : 'exists';
  }
  if (msg.includes('invalid') && msg.includes('email')) {
    return 'invalid_email';
  }
  if (
    msg.includes('password') &&
    (msg.includes('weak') || msg.includes('short') || msg.includes('least') || msg.includes('characters'))
  ) {
    return 'weak_password';
  }
  if (msg.includes('signup') && msg.includes('disabled')) {
    return 'signup_disabled';
  }
  if (msg.includes('rate limit') || msg.includes('too many') || msg.includes('429')) {
    return 'rate_limited';
  }
  if (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('failed to fetch') ||
    msg.includes('timeout')
  ) {
    return 'network';
  }
  if (msg.includes('invalid api key') || msg.includes('invalid jwt') || msg.includes('apikey')) {
    return 'invalid_api_key';
  }
  if (msg.includes('user not found')) {
    return 'not_found';
  }

  return 'unknown';
}
