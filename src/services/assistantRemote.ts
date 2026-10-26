import { getSupabase } from '../config/supabase';
import type { AIChatMessage, AppLanguage, AssistantAction, AssistantTarget, PrayerName } from '../types';
import { isCloudUserActive } from './cloudUser';

/**
 * Server-side assistant (Supabase Edge Function "assistant", Claude). Turned on with
 * EXPO_PUBLIC_ASSISTANT_REMOTE=1 once the function is deployed; signed-in users only.
 * Returns null whenever the app should answer with the on-device assistant instead.
 */
const ENABLED = process.env.EXPO_PUBLIC_ASSISTANT_REMOTE === '1';
const TIMEOUT_MS = 30000;
const HISTORY = 12;

export interface RemoteReply {
  text: string;
  actions: AssistantAction[];
  autoNavigate?: AssistantTarget;
  /** The daily limit was reached; the caller may tell the user once */
  limited?: boolean;
}

export async function isRemoteAssistantAvailable(): Promise<boolean> {
  return ENABLED && (await isCloudUserActive());
}

const isTarget = (t: unknown): t is AssistantTarget =>
  !!t && typeof (t as AssistantTarget).screen === 'string';

export async function askRemoteAssistant(
  message: string,
  history: AIChatMessage[],
  ctx: { appLang: AppLanguage; quranEdition: string; nextPrayer: { name: PrayerName; time: string } | null; today: string }
): Promise<RemoteReply | null> {
  const supabase = getSupabase();
  if (!supabase || !(await isRemoteAssistantAvailable())) return null;
  try {
    const { data, error } = await supabase.functions.invoke('assistant', {
      body: {
        message,
        history: history.slice(-HISTORY).map((m) => ({ role: m.role, content: m.content })),
        appLang: ctx.appLang,
        quranEdition: ctx.quranEdition,
        nextPrayer: ctx.nextPrayer,
        today: ctx.today,
      },
      timeout: TIMEOUT_MS,
    });
    if (error) {
      // 429 = daily limit; anything else falls back silently
      const status = (error as { context?: { status?: number } }).context?.status;
      return status === 429 ? { text: '', actions: [], limited: true } : null;
    }
    if (!data || data.fallback || typeof data.text !== 'string') return null;
    const actions: AssistantAction[] = Array.isArray(data.actions)
      ? data.actions.filter((a: AssistantAction) => a && typeof a.label === 'string' && isTarget(a.target)).slice(0, 4)
      : [];
    return { text: data.text, actions, autoNavigate: isTarget(data.autoNavigate) ? data.autoNavigate : undefined };
  } catch {
    return null;
  }
}
