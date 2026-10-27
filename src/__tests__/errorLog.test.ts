import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

// The server answer for every insert; switched per test
let mockInsertResult: { error: unknown } = { error: null };
const mockInsert = jest.fn(async () => mockInsertResult);
jest.mock('../config/supabase', () => ({ getSupabase: () => ({ from: () => ({ insert: mockInsert }) }) }));

import { flushPendingErrors, logError } from '../services/errorLog';

const pending = async () => JSON.parse((await AsyncStorage.getItem('@islamic/error-pending')) ?? '[]') as unknown[];
const settle = () => new Promise((r) => setTimeout(r, 0));

describe('error reports sent while offline', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockInsert.mockClear();
  });

  it('queues a report the server did not accept and sends it on the next start', async () => {
    mockInsertResult = { error: new Error('Network request failed') };
    await logError(new Error('offline crash'), 'global');
    await settle();
    expect(await pending()).toHaveLength(1);

    mockInsertResult = { error: null };
    await flushPendingErrors();
    expect(mockInsert).toHaveBeenCalledTimes(2);
    expect(await pending()).toHaveLength(0);
  });

  it('keeps the queue when the retry fails too', async () => {
    mockInsertResult = { error: new Error('still offline') };
    await logError(new Error('second crash'), 'render');
    await settle();
    await flushPendingErrors();
    expect(await pending()).toHaveLength(1);
  });

  it('drops a report the server keeps rejecting after three tries', async () => {
    mockInsertResult = { error: new Error('rate limit') };
    await logError(new Error('rejected crash'), 'global');
    await settle();
    await flushPendingErrors();
    await flushPendingErrors();
    expect(await pending()).toHaveLength(1);
    await flushPendingErrors();
    expect(await pending()).toHaveLength(0);
  });
});
