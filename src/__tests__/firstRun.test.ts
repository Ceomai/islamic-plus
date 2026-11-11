import { beforeEach, describe, expect, it } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasPriorAppData, initialRoute, isFirstRunDone, markFirstRunDone } from '../services/firstRun';
import { migrateLegacyStorage, setStorageUser } from '../services/storage';

const guest = { userId: 'guest-1', isGuest: true, pseudonym: 'Guest' };
const account = { userId: 'user-1', isGuest: false, pseudonym: 'a•••b@x.com' };

describe('where the app opens', () => {
  it('starts a guest session on the very first launch', () => {
    expect(initialRoute({ session: null, firstRunDone: false, onboardingDone: false })).toBe('startGuest');
  });

  it('shows the sign-in screen to someone who signed out on a used device', () => {
    expect(initialRoute({ session: null, firstRunDone: true, onboardingDone: true })).toBe('auth');
  });

  it('opens the introduction until it is finished, for guests and accounts alike', () => {
    expect(initialRoute({ session: guest, firstRunDone: true, onboardingDone: false })).toBe('onboarding');
    expect(initialRoute({ session: account, firstRunDone: false, onboardingDone: false })).toBe('onboarding');
  });

  it('leaves signed-in users who finished the introduction at home', () => {
    expect(initialRoute({ session: account, firstRunDone: true, onboardingDone: true })).toBe('home');
    expect(initialRoute({ session: guest, firstRunDone: false, onboardingDone: true })).toBe('home');
  });
});

describe('first-run flag', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    setStorageUser(null);
  });

  it('is unset on a fresh install and set once marked', async () => {
    expect(await isFirstRunDone()).toBe(false);
    await markFirstRunDone();
    expect(await isFirstRunDone()).toBe(true);
  });

  it('treats an install from before the flag as already used', async () => {
    await AsyncStorage.setItem('@islamic/kaza@@user-1', '{}');
    expect(await isFirstRunDone()).toBe(true);
  });

  it('recognises earlier data but not device-only leftovers', () => {
    expect(hasPriorAppData(['@islamic/auth/users'])).toBe(true);
    expect(hasPriorAppData(['@islamic/settings'])).toBe(true);
    expect(hasPriorAppData(['@islamic/deviceLanguage', '@islamic/auth/session'])).toBe(false);
  });

  it('stays device-wide when legacy data is handed to an account', async () => {
    await markFirstRunDone();
    await migrateLegacyStorage('user-1');
    expect(await AsyncStorage.getItem('@islamic/firstRunDone')).toBe('1');
    expect(await AsyncStorage.getItem('@islamic/firstRunDone@@user-1')).toBeNull();
  });
});
