import { getSupabase, isSupabaseConfigured } from '../config/supabase';
import { getLocalAuthSession } from './localAuth';

export async function isCloudUserActive(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const session = await getLocalAuthSession();
  if (!session || session.isGuest) return false;
  const supabase = getSupabase();
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session?.user);
}

export function profileScope(memberId: string | null): string {
  return memberId ?? 'default';
}
