import { useCallback, useMemo } from 'react';
import { useRefState } from '../../hooks/useRefState';
import { logAIChatExchange, resetAIChatSessionId } from '../../services/cloudAnalytics';
import { fireAndForget } from '../../services/fireAndForget';
import { setJson, storageKeys } from '../../services/storage';
import type { AIChatMessage, AssistantAction } from '../../types';
import type { AIChatSlice } from './slices';

/** Messages kept in the assistant chat (oldest dropped first) */
const AI_CHAT_MAX = 200;

/** Appends a question and/or a reply to the chat, keeping it bounded. */
export function appendChatMessages(
  messages: AIChatMessage[],
  userText: string,
  assistantText: string,
  at: string,
  actions?: AssistantAction[]
): AIChatMessage[] {
  const next = [...messages];
  if (userText) next.push({ id: `${at}-u`, role: 'user', content: userText, timestamp: at });
  if (assistantText) {
    next.push({ id: `${at}-a`, role: 'assistant', content: assistantText, timestamp: at, ...(actions?.length ? { actions } : {}) });
  }
  // Keep the chat bounded (it grew without limit and was rendered in full)
  return next.slice(-AI_CHAT_MAX);
}

/** The assistant chat, stored on the device. */
export function useAIChatState() {
  const [aiMessages, setAiMessages, aiMessagesRef] = useRefState<AIChatMessage[]>([]);

  const sendAIMessage = useCallback(
    async (text: string, reply: string, actions?: AssistantAction[]) => {
      const userText = text.trim();
      const assistantText = reply.trim();
      const kept = setAiMessages(appendChatMessages(aiMessagesRef.current, userText, assistantText, new Date().toISOString(), actions));
      fireAndForget(setJson(storageKeys.aiChat, kept), 'aiChat.save');
      if (userText || assistantText) fireAndForget(logAIChatExchange(userText, assistantText), 'aiChat.log');
    },
    [aiMessagesRef, setAiMessages]
  );

  const clearAIChat = useCallback(async () => {
    setAiMessages([]);
    await setJson(storageKeys.aiChat, []);
    resetAIChatSessionId();
  }, [setAiMessages]);

  const aiChatValue = useMemo<AIChatSlice>(() => ({ aiMessages, sendAIMessage, clearAIChat }), [aiMessages, sendAIMessage, clearAIChat]);

  return { setAiMessages, aiChatValue };
}
