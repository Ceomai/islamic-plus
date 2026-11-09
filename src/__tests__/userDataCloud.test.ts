import { describe, expect, it, jest } from '@jest/globals';
import { DEFAULT_SETTINGS } from '../constants/defaults';
import type { SyncPayload } from '../services/cloudSync';

// The cloud copy, and a hook that runs while the pull request is "in flight"
let mockRemote: SyncPayload | null = null;
let mockDuringPull: () => void = () => undefined;
let mockDuringPush: () => void = () => undefined;
const mockRpc = jest.fn(async (name: string, _args: unknown) => {
  if (name === 'get_user_app_data') {
    mockDuringPull();
    return { data: mockRemote ? [{ payload: mockRemote }] : [], error: null };
  }
  mockDuringPush();
  return { data: null, error: null };
});
jest.mock('../config/supabase', () => ({ isSupabaseConfigured: true, getSupabase: () => ({ rpc: mockRpc }) }));
jest.mock('../services/cloudUser', () => ({ isCloudUserActive: async () => true }));

import { cancelUserDataCloudSync, notifyAppDataChanged, registerAppDataPayloadBuilder, syncUserDataFromCloud } from '../services/userDataCloud';

const STATS = { tasbihTotal: 0, habitsCompletedTotal: 0, duasReadCount: 0, quranSessions: 0, prayerStreakDays: 0, lastActiveDate: '', weeklyActivity: [0, 0, 0, 0, 0, 0, 0] };

function payload(habitTitles: string[]): SyncPayload {
  return {
    version: 2,
    exportedAt: '2026-11-03T10:00:00.000Z',
    profileScope: 'default',
    darkMode: false,
    settings: { ...DEFAULT_SETTINGS, onboardingDone: true },
    habits: habitTitles.map((title) => ({ id: title, title, targetPerWeek: 7, completedDates: [], category: 'other' as const })),
    family: [],
    stats: STATS,
    tasbih: { count: 0, total: 0, sessions: [] },
    duaProgress: {},
    prayerCompletions: [],
    educationProgress: [],
    zakatHistory: [],
    locationPref: null,
  };
}

describe('pulling from the cloud at start-up (Y2)', () => {
  it('keeps a change made while the request was in flight and pushes the merged result', async () => {
    let localHabits = ['a'];
    registerAppDataPayloadBuilder(async () => payload(localHabits));
    mockRemote = payload(['cloud']);
    mockDuringPull = () => {
      localHabits = ['a', 'added-during-sync'];
    };

    const { payload: merged, ok } = await syncUserDataFromCloud({ ...DEFAULT_SETTINGS }, [], [], STATS, false, null);

    expect(ok).toBe(true);
    expect(merged.habits.map((h) => h.id).sort()).toEqual(['a', 'added-during-sync', 'cloud']);
    const push = mockRpc.mock.calls.find(([name]) => name === 'sync_user_app_data');
    const pushed = (push?.[1] as { p_payload: SyncPayload; p_profile_scope: string });
    expect(pushed.p_profile_scope).toBe('default');
    expect(pushed.p_payload.habits.map((h) => h.id).sort()).toEqual(['a', 'added-during-sync', 'cloud']);
  });

  it('uses one cloud scope for app data whichever family member is active (Y8)', async () => {
    mockRpc.mockClear();
    registerAppDataPayloadBuilder(async () => payload(['a']));
    mockRemote = null;
    await syncUserDataFromCloud({ ...DEFAULT_SETTINGS, activeFamilyMemberId: 'child-1' }, [], [], STATS, false, null);
    const scopes = mockRpc.mock.calls.map(([, args]) => (args as { p_profile_scope: string }).p_profile_scope);
    expect(new Set(scopes)).toEqual(new Set(['default']));
  });

  it('does not roll back a change made while the merged result was being pushed', async () => {
    let localHabits = ['a'];
    registerAppDataPayloadBuilder(async () => payload(localHabits));
    mockRemote = payload(['cloud']);
    mockDuringPull = () => undefined;
    mockDuringPush = () => {
      localHabits = ['a', 'added-during-push'];
      notifyAppDataChanged();
    };

    const { payload: result } = await syncUserDataFromCloud({ ...DEFAULT_SETTINGS }, [], [], STATS, false, null);
    mockDuringPush = () => undefined;
    cancelUserDataCloudSync();

    expect(result.habits.map((h) => h.id).sort()).toEqual(['a', 'added-during-push', 'cloud']);
  });
});
