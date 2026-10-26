import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { askAI, getAIWelcome } from '../services/aiAssistant';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';

export function AIAssistantScreen() {
  const { aiMessages, sendAIMessage, clearAIChat, settings } = useApp();
  const { canAccess } = useFeatureAccess();
  const { colors } = useTheme();
  const { t, appLanguage: lang } = useTranslation();
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollViewInstance>(null);

  useEffect(() => {
    if (aiMessages.length === 0) {
      const welcome = getAIWelcome(settings.appLanguage);
      void sendAIMessage('', welcome);
    }
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    const reply = askAI(text, lang);
    await sendAIMessage(text, reply);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const displayMessages = aiMessages.filter((m) => m.content.length > 0);

  if (!canAccess('ai_assistant')) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, textAlign: 'center', padding: 24 }}>{t('auth.guestBanner')}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={[styles.banner, { backgroundColor: colors.primary + '18' }]}>
        <Ionicons name="sparkles" size={20} color={colors.primary} />
        <Text style={[styles.bannerText, { color: colors.textSecondary }]}>{t('ai.disclaimer')}</Text>
      </View>
      <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messagesContent}>
        {displayMessages.map((m) => (
          <View
            key={m.id}
            style={[
              styles.bubble,
              m.role === 'user'
                ? [styles.userBubble, { backgroundColor: colors.primary }]
                : [styles.botBubble, { backgroundColor: colors.surface, borderColor: colors.border }],
            ]}
          >
            <Text style={{ color: m.role === 'user' ? '#fff' : colors.text, lineHeight: 22 }}>{m.content}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={[styles.inputRow, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <Pressable onPress={clearAIChat} style={styles.clearBtn}>
          <Ionicons name="trash-outline" size={22} color={colors.textSecondary} />
        </Pressable>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={t('ai.placeholder')}
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { color: colors.text, backgroundColor: colors.background }]}
          multiline
        />
        <Pressable onPress={handleSend} style={[styles.sendBtn, { backgroundColor: colors.primary }]}>
          <Ionicons name="send" size={20} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginHorizontal: 16, marginTop: 8, borderRadius: 12 },
  bannerText: { flex: 1, fontSize: 12, lineHeight: 18 },
  messages: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 8 },
  bubble: { maxWidth: '88%', padding: 14, borderRadius: 18, marginBottom: 10 },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  botBubble: { alignSelf: 'flex-start', borderWidth: 1, borderBottomLeftRadius: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, gap: 8 },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100, fontSize: 16 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  clearBtn: { padding: 8 },
});
