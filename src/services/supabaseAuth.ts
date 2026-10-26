import { Platform } from 'react-native';
import type { AuthSession } from '../types';
import { getSupabase, isSupabaseConfigured } from '../config/supabase';
import { hashEmail, pseudonymFromEmail } from './authCrypto';
import { setLocalAuthSession } from './localAuth';
import { isValidEmail, mapSupabaseAuthError, normalizeEmail, validateAuthInput } from './authValidation';

export type AuthLogEvent =
  | 'sign_up'
  | 'sign_in'
  | 'sign_out'
  | 'sign_in_failed'
  | 'guest_start';

async function logAuthEvent(
  eventType: AuthLogEvent,
  userId: string | null,
  pseudonym: string | null,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const payload = { platform: Platform.OS, ...metadata };

  const { error: rpcError } = await supabase.rpc('log_auth_event', {
    p_event_type: eventType,
    p_pseudonym: pseudonym,
    p_metadata: payload,
  });

  if (rpcError) {
    console.warn('[auth] log_auth_event rpc failed:', rpcError.message);
    // RLS only accepts rows tied to the signed-in user
    if (!userId) return;
    const { error: insertError } = await supabase.from('auth_logs').insert({
      user_id: userId,
      event_type: eventType,
      pseudonym,
      metadata: payload,
    });
    if (insertError) {
      console.warn('[auth] auth_logs insert failed:', insertError.message);
    }
  }
}

async function upsertProfile(userId: string, emailHash: string, pseudonym: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error: rpcError } = await supabase.rpc('upsert_user_profile', {
    p_email_hash: emailHash,
    p_pseudonym: pseudonym,
  });

  if (rpcError) {
    console.warn('[auth] upsert_user_profile rpc failed:', rpcError.message);
    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      email_hash: emailHash,
      pseudonym,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.warn('[auth] profile upsert failed:', error.message);
    }
  }
}

function sessionFromUser(userId: string, pseudonym: string): AuthSession {
  return { userId, isGuest: false, pseudonym };
}

async function completeAuthenticatedUser(
  userId: string,
  email: string,
  pseudonym: string
): Promise<AuthSession> {
  const emailHash = await hashEmail(email);
  await upsertProfile(userId, emailHash, pseudonym);
  const session = sessionFromUser(userId, pseudonym);
  await setLocalAuthSession(session);
  return session;
}

export async function restoreSupabaseSession(): Promise<AuthSession | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return null;
  const user = data.session.user;
  const pseudonym =
    (user.user_metadata?.pseudonym as string) ||
    pseudonymFromEmail(user.email ?? 'user@local.app');
  const session = sessionFromUser(user.id, pseudonym);
  await setLocalAuthSession(session);
  return session;
}

export async function registerSupabaseUser(
  email: string,
  password: string
): Promise<{ ok: true; session: AuthSession } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'not_configured' };

  const validated = validateAuthInput(email, password, 'new');
  if (!validated.ok) return { ok: false, error: validated.error };

  const normalized = validated.email;
  const emailHash = await hashEmail(normalized);
  const pseudonym = pseudonymFromEmail(normalized);

  const { data, error } = await supabase.auth.signUp({
    email: normalized,
    password,
    options: {
      data: { email_hash: emailHash, pseudonym },
    },
  });

  if (error) {
    const mapped = mapSupabaseAuthError(error.message, 'register');
    await logAuthEvent('sign_in_failed', null, pseudonym, { reason: error.message, flow: 'register' });
    return { ok: false, error: mapped };
  }

  if (!data.user) {
    return { ok: false, error: 'unknown' };
  }

  // Supabase: mevcut e-posta ile kayıtta hata vermez, identities boş döner
  if (!data.user.identities?.length) {
    return { ok: false, error: 'exists' };
  }

  // Oturum hemen geldiyse (e-posta onayı kapalı)
  if (data.session?.user) {
    await logAuthEvent('sign_up', data.user.id, pseudonym);
    const session = await completeAuthenticatedUser(data.user.id, normalized, pseudonym);
    return { ok: true, session };
  }

  // Oturum yok — e-posta onayı açık olabilir; yine de giriş dene (onay kapalı projelerde)
  const signInAttempt = await supabase.auth.signInWithPassword({
    email: normalized,
    password,
  });

  if (signInAttempt.data.session?.user) {
    await logAuthEvent('sign_up', signInAttempt.data.user.id, pseudonym);
    const session = await completeAuthenticatedUser(
      signInAttempt.data.user.id,
      normalized,
      pseudonym
    );
    return { ok: true, session };
  }

  if (signInAttempt.error) {
    const signInError = mapSupabaseAuthError(signInAttempt.error.message, 'login');
    if (signInError === 'email_not_confirmed') {
      await logAuthEvent('sign_up', data.user.id, pseudonym, { pendingConfirmation: true });
      return { ok: false, error: 'email_confirmation_sent' };
    }
  }

  // Kayıt oluştu ama giriş yapılamadı — büyük olasılıkla e-posta onayı bekleniyor
  await logAuthEvent('sign_up', data.user.id, pseudonym, { pendingConfirmation: true });
  return { ok: false, error: 'email_confirmation_sent' };
}

export async function loginSupabaseUser(
  email: string,
  password: string
): Promise<{ ok: true; session: AuthSession } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'not_configured' };

  const validated = validateAuthInput(email, password);
  if (!validated.ok) return { ok: false, error: validated.error };

  const normalized = validated.email;
  const pseudonym = pseudonymFromEmail(normalized);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalized,
    password,
  });

  if (error || !data.user) {
    const reason = error?.message ?? (data.session ? 'session without user' : 'no user');
    const mapped = mapSupabaseAuthError(error?.message ?? reason, 'login');
    await logAuthEvent('sign_in_failed', null, pseudonym, {
      reason: error?.message ?? 'no user',
      flow: 'login',
    });
    return { ok: false, error: mapped };
  }

  await logAuthEvent('sign_in', data.user.id, pseudonym);
  const session = await completeAuthenticatedUser(data.user.id, normalized, pseudonym);
  return { ok: true, session };
}

export async function logoutSupabaseUser(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { data } = await supabase.auth.getUser();
  const pseudonym = (data.user?.user_metadata?.pseudonym as string) ?? null;
  await logAuthEvent('sign_out', data.user?.id ?? null, pseudonym);
  await supabase.auth.signOut();
}

/** Re-verifies the password, then deletes the account and all its cloud data. */
export async function deleteSupabaseAccount(
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'not_configured' };
  if (!password) return { ok: false, error: 'empty_password' };

  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email;
  if (!email) return { ok: false, error: 'not_found' };

  const reauth = await supabase.auth.signInWithPassword({ email, password });
  if (reauth.error) return { ok: false, error: mapSupabaseAuthError(reauth.error.message, 'login') };

  const { error } = await supabase.rpc('delete_my_account');
  if (error) {
    console.warn('[auth] delete_my_account failed:', error.message);
    return { ok: false, error: mapSupabaseAuthError(error.message, 'login') };
  }

  // The server session no longer exists — only clear the local copy
  await supabase.auth.signOut({ scope: 'local' });
  return { ok: true };
}

/**
 * Sends a recovery e-mail containing a one-time code. Always reports success for valid input
 * so the screen can't be used to check which e-mails have accounts.
 */
export async function requestSupabasePasswordReset(
  email: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'not_configured' };
  const normalized = normalizeEmail(email);
  if (!normalized) return { ok: false, error: 'empty_email' };
  if (!isValidEmail(normalized)) return { ok: false, error: 'invalid_email' };

  const { error } = await supabase.auth.resetPasswordForEmail(normalized);
  if (error) {
    const mapped = mapSupabaseAuthError(error.message, 'login');
    if (mapped === 'rate_limited' || mapped === 'network' || mapped === 'invalid_api_key') {
      return { ok: false, error: mapped };
    }
    console.warn('[auth] resetPasswordForEmail failed:', error.message);
  }
  return { ok: true };
}

/** Verifies the e-mailed code, sets the new password and signs the user in. */
export async function confirmSupabasePasswordReset(
  email: string,
  code: string,
  newPassword: string
): Promise<{ ok: true; session: AuthSession } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'not_configured' };

  const validated = validateAuthInput(email, newPassword, 'new');
  if (!validated.ok) return { ok: false, error: validated.error };
  const token = code.replace(/\s/g, '');
  if (!/^\d{6,10}$/.test(token)) return { ok: false, error: 'invalid_code' };

  const { data, error } = await supabase.auth.verifyOtp({
    email: validated.email,
    token,
    type: 'recovery',
  });
  if (error || !data.user) {
    const msg = (error?.message ?? '').toLowerCase();
    if (msg.includes('expired') || msg.includes('invalid') || msg.includes('token')) {
      return { ok: false, error: 'invalid_code' };
    }
    return { ok: false, error: mapSupabaseAuthError(error?.message ?? 'unknown', 'login') };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    const mapped = mapSupabaseAuthError(updateError.message, 'register');
    // Recovery session must not linger if the new password was rejected
    await supabase.auth.signOut({ scope: 'local' });
    return { ok: false, error: mapped === 'exists' ? 'unknown' : mapped };
  }

  const pseudonym = pseudonymFromEmail(validated.email);
  await logAuthEvent('sign_in', data.user.id, pseudonym, { flow: 'password_reset' });
  const session = await completeAuthenticatedUser(data.user.id, validated.email, pseudonym);
  return { ok: true, session };
}

export async function logGuestStartSupabase(guestId: string): Promise<void> {
  await logAuthEvent('guest_start', null, 'Guest', { guestId });
}
