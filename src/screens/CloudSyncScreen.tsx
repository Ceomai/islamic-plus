import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { payloadToJson } from '../services/cloudSync';
import { AppText, Button, IconBadge, Screen, SectionHeader, Surface } from '../ui';
import { localDateKey } from '../utils/date';

export function CloudSyncScreen() {
  const { settings, syncNow, exportSyncPayload } = useApp();
  const { backend, isGuest } = useAuth();
  const { colors, space } = useTheme();
  const { t, lang } = useTranslation();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const cloud = backend === 'supabase' && !isGuest;
  const locale = lang === 'tr' ? 'tr-TR' : 'en-US';

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const result = await syncNow();
      setMessage({ text: t('sync.syncedAt', { time: new Date(result.mergedAt).toLocaleString(locale) }), ok: true });
    } catch {
      setMessage({ text: t('sync.errorMsg'), ok: false });
    } finally {
      setSyncing(false);
    }
  };

  /** Writes a JSON backup to a temp file and opens the share sheet (Files, Drive, mail…). */
  const handleExport = async () => {
    setMessage(null);
    try {
      const json = payloadToJson(await exportSyncPayload());
      const uri = `${FileSystem.cacheDirectory}islamic-plus-backup-${localDateKey()}.json`;
      await FileSystem.writeAsStringAsync(uri, json);
      if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: t('sync.export') });
      } else {
        setMessage({ text: t('sync.exportUnavailable'), ok: false });
      }
    } catch {
      setMessage({ text: t('sync.exportError'), ok: false });
    }
  };

  const lastSync = settings.cloudSync.lastSyncAt
    ? new Date(settings.cloudSync.lastSyncAt).toLocaleString(locale)
    : t('sync.never');

  return (
    <Screen>
      <Surface style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
        <IconBadge name={cloud ? 'cloud-done-outline' : 'cloud-offline-outline'} size="lg" tone={cloud ? 'brand' : 'neutral'} />
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong">{cloud ? t('sync.autoTitle') : t('sync.localTitle')}</AppText>
          <AppText variant="caption" tone="secondary">
            {cloud ? t('sync.autoBody') : t('sync.localBody')}
          </AppText>
        </View>
      </Surface>

      {cloud && (
        <>
          <SectionHeader title={t('sync.lastSync')} />
          <Surface>
            <AppText variant="heading">{lastSync}</AppText>
            <Button
              label={t('sync.syncNow')}
              icon="sync-outline"
              onPress={handleSync}
              loading={syncing}
              fullWidth
              style={{ marginTop: space[4] }}
            />
          </Surface>
        </>
      )}

      <SectionHeader title={t('sync.backupTitle')} />
      <Surface>
        <AppText variant="callout" tone="secondary" style={{ marginBottom: space[4] }}>
          {t('sync.backupBody')}
        </AppText>
        <Button label={t('sync.export')} icon="share-outline" onPress={handleExport} variant="secondary" fullWidth />
      </Surface>

      {message && (
        <AppText variant="callout" color={message.ok ? colors.success : colors.error} style={{ marginTop: space[3] }}>
          {message.text}
        </AppText>
      )}
    </Screen>
  );
}
