import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View, type ScrollViewInstance } from 'react-native';
import { useApp } from '../context/AppContext';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { RootStackParamList } from '../navigation/types';
import { askAssistant, getAIWelcome } from '../services/aiAssistant';
import { askRemoteAssistant, isRemoteAssistantAvailable } from '../services/assistantRemote';
import { trackFeatureAction } from '../services/cloudAnalytics';
import { formatClock, getNextPrayer } from '../services/prayerTimes';
import type { AssistantAction, AssistantTarget } from '../types';
import { AppText, Chip } from '../ui';
import { localDateKey } from '../utils/date';

const SUGGESTIONS: Record<'tr' | 'en', string[]> = {
  tr: ['Yasin suresini aç', 'Yolculuk duasını açıkla', 'Sıradaki namaz ne zaman?', 'Orucu bozan şeyler nedir?', 'Kıbleyi göster', 'دعاء قبل النوم'],
  en: ['Open Surah Yasin', 'Explain the travel dua', 'When is the next prayer?', 'What breaks the fast?', 'Show qibla', 'Bittgebet vor dem Schlafen'],
};

/** Screens that only live in the Learn tab; everything else is in the Home stack. */
const LEARN_ONLY = new Set(['Education', 'EducationDetail']);
const AUTO_NAVIGATE_DELAY = 1200;

export function AIAssistantScreen() {
  const { aiMessages, sendAIMessage, clearAIChat, settings, location } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { canAccess } = useFeatureAccess();
  const { colors, radius, space, type } = useTheme();
  const { t, lang } = useTranslation();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const pendingNav = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (aiMessages.length === 0) void sendAIMessage('', getAIWelcome(settings.appLanguage));
    return () => {
      if (pendingNav.current) clearTimeout(pendingNav.current);
    };
  }, []);

  // The assistant screen is mounted in several stacks; open the target in this stack when it
  // exists here, otherwise in the tab that owns it.
  const open = (target: AssistantTarget) => {
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
  };

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    setInput('');
    const next = location ? getNextPrayer(location.latitude, location.longitude, settings.calculationMethod, settings.madhab) : null;
    const nextPrayer = next ? { name: next.name, time: formatClock(next.time, lang) } : null;
    const scrollDown = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    let reply: { text: string; actions: AssistantAction[]; autoNavigate?: AssistantTarget } | null = null;
    let note = '';
    if (await isRemoteAssistantAvailable()) {
      // Show the question right away; the server answer can take a few seconds
      const history = aiMessages.filter((m) => m.content.length > 0);
      await sendAIMessage(text, '');
      scrollDown();
      setBusy(true);
      const remote = await askRemoteAssistant(text, history, {
        appLang: lang,
        quranEdition: settings.quranEditionId,
        nextPrayer,
        today: localDateKey(),
      });
      setBusy(false);
      if (remote?.limited) note = `\n\n${t('ai.limited')}`;
      else if (remote) reply = remote;
      if (!reply) {
        const local = askAssistant(text, { appLang: lang, quranEdition: settings.quranEditionId, nextPrayer });
        reply = { ...local, text: local.text + note };
      }
      await sendAIMessage('', reply.text, reply.actions);
    } else {
      const local = askAssistant(text, { appLang: lang, quranEdition: settings.quranEditionId, nextPrayer });
      // Unanswered questions show which words the on-device vocabulary still lacks
      if (local.matched === false) void trackFeatureAction('ai', 'unmatched', { lang: local.lang });
      reply = local;
      await sendAIMessage(text, reply.text, reply.actions);
    }
    scrollDown();
    // Let the reply be read for a moment, then open the page; the chat stays when coming back
    const target = reply.autoNavigate;
    if (target) pendingNav.current = setTimeout(() => open(target), AUTO_NAVIGATE_DELAY);
  };

  if (!canAccess('ai_assistant')) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[6], backgroundColor: colors.background }}>
        <AppText tone="secondary" align="center">
          {t('auth.guestBanner')}
        </AppText>
      </View>
    );
  }

  const messages = aiMessages.filter((m) => m.content.length > 0);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={{ flexDirection: 'row', gap: space[2], padding: space[3], backgroundColor: colors.surfaceMuted }}>
        <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
        <AppText variant="caption" tone="secondary" style={{ flex: 1 }}>
          {t('ai.disclaimer')}
        </AppText>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: space[4], gap: space[3] }} keyboardShouldPersistTaps="handled">
        {messages.map((m) => {
          const mine = m.role === 'user';
          // Arabic replies read right to left
          const rtl = !mine && /[؀-ۿ]/.test(m.content.slice(0, 40));
          return (
            <View key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
              <View
                style={{
                  backgroundColor: mine ? colors.primary : colors.surface,
                  borderColor: colors.border,
                  borderWidth: mine ? 0 : 1,
                  borderRadius: radius.lg,
                  borderBottomRightRadius: mine ? 4 : radius.lg,
                  borderBottomLeftRadius: mine ? radius.lg : 4,
                  paddingHorizontal: space[4],
                  paddingVertical: space[3],
                }}
              >
                <AppText variant="body" color={mine ? colors.onPrimary : colors.text} style={rtl ? { writingDirection: 'rtl', textAlign: 'right' } : undefined}>
                  {m.content}
                </AppText>
              </View>
              {m.actions?.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[2] }}>
                  {m.actions.map((a, i) => (
                    <Chip
                      key={`${a.target.screen}-${i}`}
                      label={a.label}
                      icon={(a.icon as keyof typeof Ionicons.glyphMap | undefined) ?? 'arrow-forward'}
                      selected={i === 0}
                      onPress={() => open(a.target)}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
        {busy && (
          <View
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

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: space[2],
          padding: space[3],
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <Pressable onPress={clearAIChat} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('ai.clear')} style={{ padding: space[2] }}>
          <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
        </Pressable>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={t('ai.placeholder')}
          placeholderTextColor={colors.textMuted}
          multiline
          blurOnSubmit
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
          style={[
            type.body,
            {
              flex: 1,
              maxHeight: 120,
              color: colors.text,
              backgroundColor: colors.background,
              borderRadius: radius.md,
              paddingHorizontal: space[3],
              paddingVertical: space[2],
            },
          ]}
        />
        <Pressable
          onPress={() => send(input)}
          accessibilityRole="button"
          accessibilityLabel={t('ai.send')}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? colors.primaryPressed : colors.primary,
            opacity: input.trim() && !busy ? 1 : 0.5,
          })}
        >
          <Ionicons name="arrow-up" size={20} color={colors.onPrimary} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
