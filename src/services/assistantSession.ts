import type { AIChatMessage, AppLanguage, AssistantAction, AssistantTarget, PrayerName } from '../types';
import { askAssistant, type ChatLang } from './aiAssistant';
import { askRemoteAssistant, isRemoteAssistantAvailable } from './assistantRemote';
import { trackFeatureAction } from './cloudAnalytics';
import { fireAndForget } from './fireAndForget';

export interface ReplyContext {
  appLang: AppLanguage;
  quranEdition: string;
  nextPrayer: { name: PrayerName; time: string } | null;
  /** YYYY-MM-DD on this device */
  today: string;
  /** The chat so far (empty messages left out), for the server assistant */
  history: AIChatMessage[];
  /** Appended to the on-device answer when the server's daily limit was reached */
  limitedNote: string;
}

export interface SessionReply {
  text: string;
  actions: AssistantAction[];
  /** Page to open on its own once the reply has been read */
  autoNavigate?: AssistantTarget;
  /** The question was already posted (before the server was asked); only the reply is left to add */
  questionPosted: boolean;
}

export interface AssistantBackends {
  remoteAvailable: () => Promise<boolean>;
  askRemote: typeof askRemoteAssistant;
  askLocal: typeof askAssistant;
  trackUnmatched: (lang: ChatLang) => void;
}

const defaultBackends: AssistantBackends = {
  remoteAvailable: isRemoteAssistantAvailable,
  askRemote: askRemoteAssistant,
  askLocal: askAssistant,
  trackUnmatched: (lang) => fireAndForget(trackFeatureAction('ai', 'unmatched', { lang }), 'ai.unmatched'),
};

/**
 * Answers one question: the server assistant when it is on (signed-in users), otherwise, or when it
 * fails, the on-device one. `onRemoteStart` runs before the server is asked, so the screen can show
 * the question and a "thinking" bubble while it waits.
 */
export async function getReply(
  text: string,
  ctx: ReplyContext,
  onRemoteStart: () => Promise<void>,
  backends: AssistantBackends = defaultBackends
): Promise<SessionReply> {
  const localCtx = { appLang: ctx.appLang, quranEdition: ctx.quranEdition, nextPrayer: ctx.nextPrayer };
  if (!(await backends.remoteAvailable())) {
    const local = backends.askLocal(text, localCtx);
    // Unanswered questions show which words the on-device vocabulary still lacks
    if (local.matched === false) backends.trackUnmatched(local.lang);
    return { text: local.text, actions: local.actions, autoNavigate: local.autoNavigate, questionPosted: false };
  }

  await onRemoteStart();
  const remote = await backends.askRemote(text, ctx.history, {
    appLang: ctx.appLang,
    quranEdition: ctx.quranEdition,
    nextPrayer: ctx.nextPrayer,
    today: ctx.today,
  });
  if (remote && !remote.limited) {
    return { text: remote.text, actions: remote.actions, autoNavigate: remote.autoNavigate, questionPosted: true };
  }
  const local = backends.askLocal(text, localCtx);
  const note = remote?.limited ? `\n\n${ctx.limitedNote}` : '';
  return { text: local.text + note, actions: local.actions, autoNavigate: local.autoNavigate, questionPosted: true };
}

/** Reply text for a screen reader: without the bold and code marks. */
export const spokenReply = (text: string) => text.replace(/\*\*|`/g, '');
