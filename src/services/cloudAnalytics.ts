import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import { featureIdForScreen } from '../constants/analyticsFeatures';
import { getSupabase } from '../config/supabase';
import { isCloudUserActive } from './cloudUser';

let aiChatSessionId: string | null = null;

function platformMeta(): Record<string, string> {
  return { platform: Platform.OS };
}

async function isTrackingEnabled(): Promise<boolean> {
  return isCloudUserActive();
}

export function getAIChatSessionId(): string {
  if (!aiChatSessionId) {
    aiChatSessionId = Crypto.randomUUID();
  }
  return aiChatSessionId;
}

export function resetAIChatSessionId(): void {
  aiChatSessionId = Crypto.randomUUID();
}

export async function trackAppOpen(): Promise<void> {
  if (!(await isTrackingEnabled())) return;
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.rpc('log_activity_event', {
    p_event_type: 'app_open',
    p_feature_id: 'app',
    p_screen_name: null,
    p_duration_ms: null,
    p_metadata: platformMeta(),
  });
  if (error) console.warn('[analytics] app_open failed:', error.message);
}

export async function trackScreenEnter(screenName: string): Promise<void> {
  if (!(await isTrackingEnabled())) return;
  const supabase = getSupabase();
  if (!supabase) return;

  const featureId = featureIdForScreen(screenName);
  const { error } = await supabase.rpc('log_activity_event', {
    p_event_type: 'screen_enter',
    p_feature_id: featureId,
    p_screen_name: screenName,
    p_duration_ms: null,
    p_metadata: platformMeta(),
  });
  if (error) console.warn('[analytics] screen_enter failed:', error.message);
}

export async function trackScreenLeave(screenName: string, durationMs: number): Promise<void> {
  if (!(await isTrackingEnabled())) return;
  if (durationMs < 500) return;

  const supabase = getSupabase();
  if (!supabase) return;

  const featureId = featureIdForScreen(screenName);
  const { error } = await supabase.rpc('log_activity_event', {
    p_event_type: 'screen_leave',
    p_feature_id: featureId,
    p_screen_name: screenName,
    p_duration_ms: Math.round(durationMs),
    p_metadata: platformMeta(),
  });
  if (error) console.warn('[analytics] screen_leave failed:', error.message);
}

export async function trackFeatureAction(
  featureId: string,
  action: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  if (!(await isTrackingEnabled())) return;
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.rpc('log_activity_event', {
    p_event_type: 'feature_action',
    p_feature_id: featureId,
    p_screen_name: null,
    p_duration_ms: null,
    p_metadata: { action, ...platformMeta(), ...metadata },
  });
  if (error) console.warn('[analytics] feature_action failed:', error.message);
}

export async function logAIChatMessage(
  role: 'user' | 'assistant',
  message: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  if (!(await isTrackingEnabled())) return;
  const trimmed = message.trim();
  if (!trimmed) return;

  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.rpc('log_ai_chat_message', {
    p_chat_session_id: getAIChatSessionId(),
    p_role: role,
    p_message: trimmed.slice(0, 4000),
    p_metadata: { ...platformMeta(), ...metadata },
  });
  if (error) console.warn('[analytics] ai_chat failed:', error.message);
}

export async function logAIChatExchange(userText: string, assistantText: string): Promise<void> {
  if (userText.trim()) {
    await logAIChatMessage('user', userText);
  }
  if (assistantText.trim()) {
    await logAIChatMessage('assistant', assistantText);
  }
}