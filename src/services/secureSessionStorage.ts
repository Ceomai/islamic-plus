import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Supabase auth storage backed by the OS keychain / keystore.
 * SecureStore values are limited to ~2 KB, so a session is split into chunks:
 *   <key>.n   → chunk count
 *   <key>.0…  → chunk contents
 * Sessions saved by older builds in AsyncStorage are moved here on first read.
 */
const CHUNK_SIZE = 1800;
const isWeb = Platform.OS === 'web';

function safeKey(key: string): string {
  // SecureStore keys may only contain alphanumerics, ".", "-" and "_"
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

async function readChunks(key: string): Promise<string | null> {
  const base = safeKey(key);
  const countRaw = await SecureStore.getItemAsync(`${base}.n`);
  if (countRaw == null) return null;
  const count = parseInt(countRaw, 10);
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const part = await SecureStore.getItemAsync(`${base}.${i}`);
    if (part == null) return null;
    parts.push(part);
  }
  return parts.join('');
}

async function removeChunks(key: string): Promise<void> {
  const base = safeKey(key);
  const countRaw = await SecureStore.getItemAsync(`${base}.n`);
  const count = countRaw ? parseInt(countRaw, 10) : 0;
  for (let i = 0; i < count; i++) {
    await SecureStore.deleteItemAsync(`${base}.${i}`);
  }
  await SecureStore.deleteItemAsync(`${base}.n`);
}

async function writeChunks(key: string, value: string): Promise<void> {
  await removeChunks(key);
  const base = safeKey(key);
  const count = Math.ceil(value.length / CHUNK_SIZE);
  for (let i = 0; i < count; i++) {
    await SecureStore.setItemAsync(`${base}.${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
  }
  await SecureStore.setItemAsync(`${base}.n`, String(count));
}

// Chunked writes are multi-step; serialize operations so a token refresh can't interleave with a read
let queue: Promise<unknown> = Promise.resolve();
function serialized<T>(op: () => Promise<T>): Promise<T> {
  const next = queue.then(op, op);
  queue = next.catch(() => undefined);
  return next;
}

export const secureSessionStorage = {
  getItem(key: string): Promise<string | null> {
    if (isWeb) return AsyncStorage.getItem(key);
    return serialized(async () => {
      const stored = await readChunks(key);
      if (stored != null) return stored;
      const legacy = await AsyncStorage.getItem(key);
      if (legacy != null) {
        await writeChunks(key, legacy);
        await AsyncStorage.removeItem(key);
      }
      return legacy;
    });
  },
  setItem(key: string, value: string): Promise<void> {
    if (isWeb) return AsyncStorage.setItem(key, value);
    return serialized(() => writeChunks(key, value));
  },
  removeItem(key: string): Promise<void> {
    if (isWeb) return AsyncStorage.removeItem(key);
    return serialized(async () => {
      await removeChunks(key);
      await AsyncStorage.removeItem(key);
    });
  },
};
