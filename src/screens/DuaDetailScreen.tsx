import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { DUAS, getDuaAudioUrl } from '../data/duas';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { downloadAudioForOffline, isAudioAvailable, isAudioDownloaded, playDuaAudio, stopAudio } from '../services/audio';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'DuaDetail'>;

export function DuaDetailScreen({ route, navigation }: Props) {
  const { duaId } = route.params;
  const dua = DUAS.find((d) => d.id === duaId);
  const { settings, markDuaRead } = useApp();
  const { colors } = useTheme();
  const { t, appLanguage: lang } = useTranslation();
  const [playing, setPlaying] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: dua ? t(dua.titleKey) : t('nav.duas') });
    if (dua) void markDuaRead(dua.id);
    return () => {
      void stopAudio();
    };
  }, [dua, navigation, t, markDuaRead]);

  useEffect(() => {
    if (dua) void isAudioDownloaded(dua.id).then(setDownloaded);
  }, [dua]);

  if (!dua) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>{t('duas.notFound')}</Text>
      </View>
    );
  }

  const translation = lang === 'tr' ? dua.translationTr : dua.translationEn;
  const audioUrl = dua.audioUrl ?? getDuaAudioUrl(dua.id);

  const handlePlay = async () => {
    if (!isAudioAvailable()) return;
    setLoadingAudio(true);
    try {
      setPlaying(true);
      await playDuaAudio(dua.id, audioUrl);
    } finally {
      setLoadingAudio(false);
    }
  };

  const handleDownload = async () => {
    if (!audioUrl || !settings.offlineAudioEnabled) return;
    setLoadingAudio(true);
    try {
      await downloadAudioForOffline(dua.id, audioUrl);
      setDownloaded(true);
    } finally {
      setLoadingAudio(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.arabicBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.arabic, { color: colors.primary }]}>{dua.arabic}</Text>
      </View>
      <Text style={[styles.translit, { color: colors.textSecondary }]}>{dua.transliteration}</Text>
      <Text style={[styles.translation, { color: colors.text }]}>{translation}</Text>
      {dua.repeat && dua.repeat > 1 ? (
        <Text style={{ color: colors.accent, marginTop: 8, fontWeight: '600' }}>
          {t('duas.repeat')}: {dua.repeat}×
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          onPress={handlePlay}
          style={[styles.btn, { backgroundColor: colors.primary }]}
          disabled={loadingAudio}
        >
          {loadingAudio ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name={playing ? 'pause' : 'play'} size={22} color="#fff" />
              <Text style={styles.btnText}>{t('duas.listen')}</Text>
            </>
          )}
        </Pressable>
        {audioUrl && settings.offlineAudioEnabled ? (
          <Pressable
            onPress={handleDownload}
            style={[styles.btnOutline, { borderColor: colors.primary }]}
            disabled={downloaded || loadingAudio}
          >
            <Ionicons name={downloaded ? 'checkmark-circle' : 'download'} size={22} color={colors.primary} />
            <Text style={[styles.btnOutlineText, { color: colors.primary }]}>
              {downloaded ? t('duas.downloaded') : t('duas.download')}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  arabicBox: { borderRadius: 20, padding: 24, borderWidth: 1, marginBottom: 16 },
  arabic: { fontSize: 28, lineHeight: 48, textAlign: 'center', fontWeight: '600' },
  translit: { fontSize: 16, fontStyle: 'italic', textAlign: 'center', marginBottom: 12 },
  translation: { fontSize: 17, lineHeight: 26, textAlign: 'center' },
  actions: { marginTop: 32, gap: 12 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 14 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 2 },
  btnOutlineText: { fontSize: 15, fontWeight: '600' },
});
