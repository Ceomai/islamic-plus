import type { AppLanguage, AssistantAction, AssistantTarget, PrayerName } from '../../types';

/** Languages the assistant understands and answers in */
export type ChatLang = 'tr' | 'en' | 'ar' | 'de' | 'fr';
export type Words = Record<ChatLang, string[]>;
export type Text = Record<ChatLang, string>;

export interface AssistantContext {
  appLang: AppLanguage;
  quranEdition: string;
  nextPrayer?: { name: PrayerName; time: string } | null;
}

export interface AssistantReply {
  lang: ChatLang;
  text: string;
  actions: AssistantAction[];
  /** Navigate without waiting for a tap */
  autoNavigate?: AssistantTarget;
  /** false when nothing matched and the reply is the generic "try asking…" answer */
  matched?: boolean;
}

/** A page of the app the assistant can explain and open */
export interface Feature {
  id: string;
  target: AssistantTarget;
  icon: string;
  name: Text;
  keywords: Words;
  /** APP_KNOWLEDGE entry with a how-to text (tr/en) */
  knowledgeId?: string;
}

