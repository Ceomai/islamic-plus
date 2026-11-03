import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthRetryableFetchError } from '@supabase/supabase-js';

// What supabase.auth.getSession() answers in each test
let mockGetSession: () => Promise<{ data: { session: unknown }; error: unknown }> = async () => ({ data: { session: null }, error: null });
jest.mock('../config/supabase', () => ({
  isSupabaseConfigured: true,
  getSupabase: () => ({ auth: { getSession: () => mockGetSession() } }),
}));

import { getAuthSession } from '../services/auth';
import { setLocalAuthSession } from '../services/localAuth';

const signedIn = { userId: 'user-1', isGuest: false, pseudonym: 'a•••b@x.com' };

describe('restoring the session at start-up (Y4)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await setLocalAuthSession(signedIn);
  });

  it('keeps a signed-in account when the token cannot be refreshed offline', async () => {
    mockGetSession = async () => ({ data: { session: null }, error: new AuthRetryableFetchError('Failed to fetch', 0) });
    const session = await getAuthSession();
    expect(session?.userId).toBe('user-1');
  });

  it('signs out when the server says there is no session', async () => {
    mockGetSession = async () => ({ data: { session: null }, error: null });
    expect(await getAuthSession()).toBeNull();
  });
});

describe('guest data after creating an account (Y3)', () => {
  it('copies the guest bucket into the new account without overwriting anything', async () => {
    const { copyScopeIfMissing } = require('../services/storage') as typeof import('../services/storage');
    await AsyncStorage.clear();
    await AsyncStorage.setItem('@islamic/kaza@@guest', '{"fajr":3}');
    await AsyncStorage.setItem('@islamic/tasbih@@guest', '{"count":5}');
    await AsyncStorage.setItem('@islamic/tasbih@@new-user', '{"count":9}');
    expect(await copyScopeIfMissing('guest', 'new-user')).toBe(1);
    expect(await AsyncStorage.getItem('@islamic/kaza@@new-user')).toBe('{"fajr":3}');
    expect(await AsyncStorage.getItem('@islamic/tasbih@@new-user')).toBe('{"count":9}');
    expect(await AsyncStorage.getItem('@islamic/kaza@@guest')).toBe('{"fajr":3}');
  });
});
