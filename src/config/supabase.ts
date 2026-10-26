import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { secureSessionStorage } from '../services/secureSessionStorage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

const hasValidKeyFormat = anonKey.startsWith('eyJ');
export const isSupabaseConfigured = Boolean(
  url && anonKey && !url.includes('YOUR_PROJECT') && hasValidKeyFormat
);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        storage: secureSessionStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
