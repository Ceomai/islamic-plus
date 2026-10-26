import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { DUAS, getDuaAudioUrl } from '../data/duas';
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
  const markedRef = useRef(false);

  useEffect(() => {
    navigation.setOptions({ title: dua ? t(dua.titleKey) : t('nav.duas') });
  }, [dua, navigation, t]);

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

  const translation = lang === 'tr' ? dua.translationTr : dua.translationEn;
  const audioUrl = dua.audioUrl ?? getDuaAudioUrl(dua.id);

  const togglePlay = async () => {
    setAudioError(false);
    if (playing) {
      await stopAudio();
      setPlaying(false);
      return;
    }
    setBusy('play');
    try {
      const ok = await playDuaAudio(dua.id, audioUrl);
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

      {dua.repeat && dua.repeat > 1 ? (
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: colors.accentSoft,
            borderRadius: radius.pill,
            paddingHorizontal: space[3],
            paddingVertical: space[1],
            marginTop: space[4],
          }}
        >
          <AppText variant="caption" color={colors.onAccentSoft} style={{ fontWeight: '600' }}>
            {t('duas.repeat')}: {dua.repeat}×
          </AppText>
        </View>
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
