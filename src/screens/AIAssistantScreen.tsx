import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View, type ScrollViewInstance } from 'react-native';
import { ChatBubble } from '../components/assistant/ChatBubble';
import { ChatComposer } from '../components/assistant/ChatComposer';
import { useAIChat, useAppLocation, useSettings } from '../context/AppContext';
import { useEventCallback } from '../hooks/useEventCallback';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { RootStackParamList } from '../navigation/types';
import { getAIWelcome } from '../services/aiAssistant';
import { getReply, spokenReply } from '../services/assistantSession';
import { formatClock, getNextPrayer } from '../services/prayerTimes';
import type { AssistantTarget } from '../types';
import { AppText, Chip } from '../ui';
import { announce } from '../utils/announce';
import { localDateKey } from '../utils/date';
import { confirmDestructive } from '../utils/confirm';

const SUGGESTIONS: Record<'tr' | 'en', string[]> = {
  tr: ['Yasin suresini aç', 'Yolculuk duasını açıkla', 'Sıradaki namaz ne zaman?', 'Orucu bozan şeyler nedir?', 'Kıbleyi göster', 'دعاء قبل النوم'],
  en: ['Open Surah Yasin', 'Explain the travel dua', 'When is the next prayer?', 'What breaks the fast?', 'Show qibla', 'Bittgebet vor dem Schlafen'],
};

/** Screens that only live in the Learn tab; everything else is in the Home stack. */
const LEARN_ONLY = new Set(['Education', 'EducationDetail']);
const AUTO_NAVIGATE_DELAY = 1200;

export function AIAssistantScreen() {
  const { aiMessages, sendAIMessage, clearAIChat } = useAIChat();
  const { settings } = useSettings();
  const { location } = useAppLocation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { canAccess } = useFeatureAccess();
  const { colors, radius, space, layout } = useTheme();
  const reduced = useReducedMotion();
  const headerHeight = useHeaderHeight();
  const { t, lang } = useTranslation();
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const pendingNav = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against a double tap sending the same question twice (busy is only set later)
  const sending = useRef(false);
  // Messages already in the chat when the screen opened appear in place; new ones fade up
  const [initialIds] = useState(() => new Set(aiMessages.map((m) => m.id)));

  // Leaving the screen cancels a pending jump, so the user is not pulled to a page from elsewhere
  useEffect(
    () =>
      navigation.addListener('blur', () => {
        if (pendingNav.current) clearTimeout(pendingNav.current);
        pendingNav.current = null;
      }),
    [navigation]
  );

  useEffect(() => {
    if (aiMessages.length === 0) void sendAIMessage('', getAIWelcome(settings.appLanguage));
    return () => {
      if (pendingNav.current) clearTimeout(pendingNav.current);
    };
  }, []);

  // The assistant screen is mounted in several stacks; open the target in this stack when it
  // exists here, otherwise in the tab that owns it.
  const open = useEventCallback((target: AssistantTarget) => {
    if (pendingNav.current) clearTimeout(pendingNav.current);
    // Targets come from stored chat JSON, so the route/params pairing is checked by the assistant, not the type system
    const nav = navigation as unknown as { navigate: (screen: string, params?: object) => void };
    if (navigation.getState().routeNames.includes(target.screen as keyof RootStackParamList)) {
      nav.navigate(target.screen, target.params);
      return;
    }
    const tab = LEARN_ONLY.has(target.screen) ? 'LearnTab' : 'HomeTab';
    const parent = navigation.getParent() as unknown as typeof nav | undefined;
    // initial: false keeps the tab's first screen underneath, so the back button returns to it
    parent?.navigate(tab, { screen: target.screen, params: target.params, initial: false });
  });

  /** Starts answering; false when the question is not taken (empty, or another is on its way) */
  const send = (raw: string): boolean => {
    const text = raw.trim();
    if (!text || busy || sending.current) return false;
    sending.current = true;
    void sendNow(text).finally(() => {
      sending.current = false;
    });
    return true;
  };

  const sendNow = async (text: string) => {
    const next = location ? getNextPrayer(location.latitude, location.longitude, settings.calculationMethod, settings.madhab) : null;
    const ctx = {
      appLang: lang,
      quranEdition: settings.quranEditionId,
      nextPrayer: next ? { name: next.name, time: formatClock(next.time, lang) } : null,
      today: localDateKey(),
      history: aiMessages.filter((m) => m.content.length > 0),
      limitedNote: t('ai.limited'),
    };
    const reply = await getReply(text, ctx, async () => {
      // Show the question right away; the server answer can take a few seconds
      await sendAIMessage(text, '');
      setBusy(true);
      // Android reads the "thinking" bubble through its live region
      announce(t('ai.thinking'));
    });
    setBusy(false);
    await sendAIMessage(reply.questionPosted ? '' : text, reply.text, reply.actions);
    // The new reply is not in a live region (the whole chat would be re-read), so announce it
    announce(spokenReply(reply.text), { hasLiveRegion: false });
    // Let the reply be read for a moment, then open the page; the chat stays when coming back
    const target = reply.autoNavigate;
    if (target && navigation.isFocused()) {
      pendingNav.current = setTimeout(() => {
        pendingNav.current = null;
        if (navigation.isFocused()) open(target);
      }, AUTO_NAVIGATE_DELAY);
    }
  };

  const clearChat = async () => {
    const ok = await confirmDestructive({ title: t('ai.clearTitle'), message: t('ai.clearBody'), confirm: t('ai.clear'), cancel: t('account.cancel') });
    if (ok) await clearAIChat();
  };

  const messages = useMemo(() => aiMessages.filter((m) => m.content.length > 0), [aiMessages]);

  if (!canAccess('ai_assistant')) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[6], backgroundColor: colors.background }}>
        <AppText tone="secondary" align="center">
          {t('auth.guestBanner')}
        </AppText>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      // The native header sits above this view; its height differs per device and orientation
      keyboardVerticalOffset={headerHeight}
    >
      <View style={{ flexDirection: 'row', gap: space[2], padding: space[3], backgroundColor: colors.surfaceMuted }}>
        <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
        <AppText variant="caption" tone="secondary" style={{ flex: 1 }}>
          {t('ai.disclaimer')}
        </AppText>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: space[4], gap: space[3], width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}
        keyboardShouldPersistTaps="handled"
        // Follows the chat to its newest message once it is laid out (no timer guessing when that is)
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: !reduced })}
      >
        {messages.map((m) => (
          <ChatBubble key={m.id} message={m} animate={!initialIds.has(m.id)} onOpen={open} />
        ))}
        {busy && (
          <View
            accessible
            accessibilityLiveRegion="polite"
            accessibilityLabel={t('ai.thinking')}
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: space[2],
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: radius.lg,
              borderBottomLeftRadius: 4,
              paddingHorizontal: space[4],
              paddingVertical: space[3],
            }}
          >
            <ActivityIndicator size="small" color={colors.primary} />
            <AppText variant="callout" tone="secondary">
              {t('ai.thinking')}
            </AppText>
          </View>
        )}
        {messages.length <= 1 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[2] }}>
            {SUGGESTIONS[lang].map((s) => (
              <Chip key={s} label={s} icon="chatbubble-ellipses-outline" onPress={() => send(s)} />
            ))}
          </View>
        )}
      </ScrollView>

      <ChatComposer busy={busy} onSend={send} onClear={() => void clearChat()} />
    </KeyboardAvoidingView>
  );
}
