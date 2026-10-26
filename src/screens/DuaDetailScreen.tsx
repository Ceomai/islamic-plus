import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { DUAS } from '../data/duas';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { RootStackParamList } from '../navigation/types';
import { downloadAudioForOffline, isAudioDownloaded, playDuaAudio, stopAudio } from '../services/audio';
import { AppText, Button, Screen, Surface } from '../ui';

type Props = NativeStackScreenProps<RootStackParamList, 'DuaDetail'>;

export function DuaDetailScreen({ route, navigation }: Props) {
  const { duaId } = route.params;
  const dua = DUAS.find((d) => d.id === duaId);
  const { settings, markDuaRead } = useApp();
  const { colors, radius, space, type } = useTheme();
  const { t, appLanguage: lang } = useTranslation();
  const [playing, setPlaying] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [busy, setBusy] = useState<'play' | 'download' | null>(null);
  const [audioError, setAudioError] = useState(false);
  const [counted, setCounted] = useState(0);
  const markedRef = useRef(false);

  useEffect(() => {
    navigation.setOptions({ title: dua ? dua.title[lang] : t('nav.duas') });
  }, [dua, navigation, t, lang]);

  // Count one read per visit, not per re-render
  useEffect(() => {
    if (dua && !markedRef.current) {
      markedRef.current = true;
      void markDuaRead(dua.id);
    }
  }, [dua, markDuaRead]);

  useEffect(() => {
    if (dua) void isAudioDownloaded(dua.id).then(setDownloaded);
    return () => {
      void stopAudio();
    };
  }, [dua]);

  if (!dua) {
    return (
      <Screen>
        <AppText tone="secondary" align="center">
          {t('duas.notFound')}
        </AppText>
      </Screen>
    );
  }

  const translation = dua.translation[lang];
  const audioUrl = dua.audioUrl;
  const repeat = dua.repeat ?? 1;
  const sourceLabel =
    dua.source.type === 'quran' ? `${t('duas.sourceQuran')} ${dua.source.ref}` : t('duas.sourceHisn');

  const togglePlay = async () => {
    setAudioError(false);
    if (playing) {
      await stopAudio();
      setPlaying(false);
      return;
    }
    setBusy('play');
    try {
      const ok = await playDuaAudio(dua.id, audioUrl, () => setPlaying(false));
      setPlaying(ok);
      if (!ok) setAudioError(true);
    } finally {
      setBusy(null);
    }
  };

  const download = async () => {
    if (!audioUrl) return;
    setAudioError(false);
    setBusy('download');
    try {
      await downloadAudioForOffline(dua.id, audioUrl);
      setDownloaded(true);
    } catch {
      setAudioError(true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <Surface padding={space[6]} style={{ marginBottom: space[5] }}>
        <AppText tone="brand" style={[type.arabic, { fontSize: 28, lineHeight: 50, textAlign: 'center' }]}>
          {dua.arabic}
        </AppText>
      </Surface>

      <AppText variant="overline" tone="muted" style={{ marginBottom: space[1] }}>
        {t('duas.transliteration')}
      </AppText>
      <AppText variant="body" tone="secondary" style={{ fontStyle: 'italic', marginBottom: space[5] }}>
        {dua.transliteration}
      </AppText>

      <AppText variant="overline" tone="muted" style={{ marginBottom: space[1] }}>
        {t('duas.meaning')}
      </AppText>
      <AppText variant="body" style={{ fontSize: 17, lineHeight: 26 }}>
        {translation}
      </AppText>

      <AppText variant="caption" tone="muted" style={{ marginTop: space[4] }}>
        {t('duas.source')}: {sourceLabel}
      </AppText>

      {/* Tap counter for duas that are recited several times */}
      {repeat > 1 ? (
        <Pressable
          onPress={() => setCounted((c) => (c >= repeat ? 1 : c + 1))}
          onLongPress={() => setCounted(0)}
          accessibilityRole="button"
          accessibilityLabel={`${counted} / ${repeat}`}
          accessibilityHint={t('duas.counterHint')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: counted >= repeat ? colors.successSoft : colors.accentSoft,
            borderRadius: radius.lg,
            padding: space[4],
            marginTop: space[4],
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <View>
            <AppText variant="caption" color={counted >= repeat ? colors.success : colors.onAccentSoft} style={{ fontWeight: '600' }}>
              {counted >= repeat ? t('duas.counterDone') : t('duas.repeat')}
            </AppText>
            <AppText variant="title" color={counted >= repeat ? colors.success : colors.onAccentSoft}>
              {counted} / {repeat}
            </AppText>
          </View>
          <AppText variant="caption" color={counted >= repeat ? colors.success : colors.onAccentSoft}>
            {t('duas.counterHint')}
          </AppText>
        </Pressable>
      ) : null}

      {audioUrl ? (
        <View style={{ marginTop: space[8], gap: space[3] }}>
          <Button
            label={playing ? t('duas.stop') : t('duas.listen')}
            icon={playing ? 'stop' : 'play'}
            onPress={togglePlay}
            loading={busy === 'play'}
            size="lg"
            fullWidth
          />
          {settings.offlineAudioEnabled && (
            <Button
              label={downloaded ? t('duas.downloaded') : t('duas.download')}
              icon={downloaded ? 'checkmark-circle' : 'download-outline'}
              onPress={download}
              variant="secondary"
              loading={busy === 'download'}
              disabled={downloaded}
              fullWidth
            />
          )}
          {audioError && (
            <AppText variant="caption" tone="danger" align="center">
              {t('duas.audioError')}
            </AppText>
          )}
        </View>
      ) : null}
    </Screen>
  );
}
