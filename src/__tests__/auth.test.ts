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
