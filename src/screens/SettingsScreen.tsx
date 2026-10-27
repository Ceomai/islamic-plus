import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import React, { useEffect, useState } from 'react';
import { Linking, Share, Switch, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { APP_LANGUAGES, CALCULATION_METHODS, MADHABS, QURAN_EDITIONS } from '../constants/defaults';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { RootStackParamList } from '../navigation/types';
import { appVersion, formatErrorReport, getErrorLog } from '../services/errorLog';
import type { CalculationMethodId, Madhab, SectPreference } from '../types';
import { AppText, Button, Chip, IconBadge, ListRow, Screen, SectionHeader, Surface } from '../ui';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const FEATURE_LINKS: { route: keyof RootStackParamList; icon: keyof typeof Ionicons.glyphMap; labelKey: string }[] = [
  { route: 'FamilyMode', icon: 'people-outline', labelKey: 'settings.familyLink' },
  { route: 'AdvancedReminders', icon: 'alarm-outline', labelKey: 'settings.advancedRemindersLink' },
  { route: 'Statistics', icon: 'analytics-outline', labelKey: 'settings.statsLink' },
  { route: 'AIAssistant', icon: 'sparkles-outline', labelKey: 'settings.aiLink' },
  { route: 'Widgets', icon: 'apps-outline', labelKey: 'settings.widgetsLink' },
  { route: 'CloudSync', icon: 'cloud-upload-outline', labelKey: 'settings.cloudLink' },
];

const SECTS: SectPreference[] = ['neutral', 'sunni', 'shia'];
const PRIVACY_URL =
  (Constants.expoConfig?.extra?.privacyPolicyUrl as string | undefined) ??
  'https://denizturkbayragii.github.io/Islamic/privacy/';

export function SettingsScreen({ navigation }: Props) {
  const { settings, updateSettings, darkMode, toggleDarkMode } = useApp();
  const { logout, isGuest, session, backend } = useAuth();
  const { colors, space } = useTheme();
  const { t } = useTranslation();

  const sectLabel = (s: SectPreference) =>
    s === 'sunni' ? t('settings.sectSunni') : s === 'shia' ? t('settings.sectShia') : t('settings.sectNeutral');

  const [errorCount, setErrorCount] = useState(0);
  useEffect(() => {
    const load = () => getErrorLog().then((log) => setErrorCount(log.length));
    void load();
    return navigation.addListener('focus', load);
  }, [navigation]);

  const shareErrorReport = async () => {
    await Share.share({ message: await formatErrorReport() });
  };

  const switchTrack = { true: colors.primary, false: colors.borderStrong };
  const check = <Ionicons name="checkmark" size={20} color={colors.primary} />;

  return (
    <Screen>
      {/* Account */}
      <Surface>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
          <IconBadge name={isGuest ? 'person-outline' : 'person'} size="lg" tone={isGuest ? 'neutral' : 'brand'} />
          <View style={{ flex: 1 }}>
            <AppText variant="heading" numberOfLines={1}>
              {isGuest ? t('auth.guestMode') : session?.pseudonym ?? '—'}
            </AppText>
            <AppText variant="caption" tone="secondary">
              {isGuest ? t('auth.guestBanner') : backend === 'supabase' ? t('auth.cloudAccount') : t('auth.localBackend')}
            </AppText>
          </View>
        </View>
        <Button
          label={isGuest ? t('auth.signInOrRegister') : t('auth.logout')}
          icon={isGuest ? 'log-in-outline' : 'log-out-outline'}
          variant={isGuest ? 'primary' : 'secondary'}
          onPress={logout}
          fullWidth
          style={{ marginTop: space[4] }}
        />
      </Surface>

      {/* Appearance */}
      <SectionHeader title={t('settings.appearance')} />
      <Surface padding={0} style={{ paddingHorizontal: space[4] }}>
        <ListRow
          icon="moon-outline"
          title={t('settings.darkMode')}
          divider
          trailing={<Switch value={darkMode} onValueChange={toggleDarkMode} trackColor={switchTrack} />}
        />
        <ListRow
          icon="color-palette-outline"
          title={t('settings.themesLink')}
          divider
          onPress={() => navigation.navigate('Themes')}
        />
        <ListRow icon="grid-outline" title={t('home.editLauncher')} onPress={() => navigation.navigate('HomeLauncherEdit')} />
      </Surface>

      {/* Language */}
      <SectionHeader title={t('settings.appLanguage')} />
      <View style={{ flexDirection: 'row', gap: space[2] }}>
        {APP_LANGUAGES.map((lang) => (
          <Chip
            key={lang.code}
            label={lang.label}
            selected={settings.appLanguage === lang.code}
            onPress={() => updateSettings({ appLanguage: lang.code })}
          />
        ))}
      </View>

      {/* Prayer times */}
      <SectionHeader title={t('settings.prayerSection')} />
      <AppText variant="caption" tone="secondary" style={{ marginBottom: space[2] }}>
        {t('settings.madhab')}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginBottom: space[4] }}>
        {MADHABS.map((m) => (
          <Chip
            key={m.id}
            label={t(`madhab.${m.id}`)}
            selected={settings.madhab === m.id}
            onPress={() => updateSettings({ madhab: m.id as Madhab })}
          />
        ))}
      </View>
      <AppText variant="caption" tone="secondary" style={{ marginBottom: space[2] }}>
        {t('settings.calculation')}
      </AppText>
      <Surface padding={0} style={{ paddingHorizontal: space[4] }}>
        {CALCULATION_METHODS.map((m, i) => (
          <ListRow
            key={m.id}
            title={t(`calcMethod.${m.id}`)}
            onPress={() => updateSettings({ calculationMethod: m.id as CalculationMethodId })}
            showChevron={false}
            trailing={settings.calculationMethod === m.id ? check : <View />}
            divider={i < CALCULATION_METHODS.length - 1}
          />
        ))}
      </Surface>
      <Surface padding={0} style={{ paddingHorizontal: space[4], marginTop: space[3] }}>
        <ListRow
          icon="notifications-outline"
          title={t('nav.notifications')}
          onPress={() => navigation.navigate('NotificationSettings')}
        />
      </Surface>

      {/* Quran and content */}
      <SectionHeader title={t('settings.contentSection')} />
      <AppText variant="caption" tone="secondary" style={{ marginBottom: space[2] }}>
        {t('settings.quranLanguage')}
      </AppText>
      <Surface padding={0} style={{ paddingHorizontal: space[4], marginBottom: space[4] }}>
        {QURAN_EDITIONS.map((edition, i) => (
          <ListRow
            key={edition.id}
            title={edition.name}
            subtitle={edition.translator}
            onPress={() => updateSettings({ quranEditionId: edition.id })}
            showChevron={false}
            trailing={settings.quranEditionId === edition.id ? check : <View />}
            divider={i < QURAN_EDITIONS.length - 1}
          />
        ))}
      </Surface>
      <AppText variant="caption" tone="secondary" style={{ marginBottom: space[2] }}>
        {t('settings.contentPref')}
      </AppText>
      <View style={{ flexDirection: 'row', gap: space[2], marginBottom: space[2] }}>
        {SECTS.map((s) => (
          <Chip key={s} label={sectLabel(s)} selected={settings.sectPreference === s} onPress={() => updateSettings({ sectPreference: s })} />
        ))}
      </View>
      <Surface padding={0} style={{ paddingHorizontal: space[4], marginTop: space[2] }}>
        <ListRow
          icon="download-outline"
          title={t('settings.offlineAudio')}
          trailing={
            <Switch
              value={settings.offlineAudioEnabled}
              onValueChange={(v) => updateSettings({ offlineAudioEnabled: v })}
              trackColor={switchTrack}
            />
          }
        />
      </Surface>

      {/* More features */}
      <SectionHeader title={t('settings.premiumSection')} />
      <Surface padding={0} style={{ paddingHorizontal: space[4] }}>
        {FEATURE_LINKS.map((link, i) => (
          <ListRow
            key={link.route}
            icon={link.icon}
            title={t(link.labelKey)}
            onPress={() => navigation.navigate(link.route as 'Themes')}
            divider={i < FEATURE_LINKS.length - 1}
          />
        ))}
      </Surface>

      {/* Test and support: error report for testers, privacy policy */}
      <SectionHeader title={t('settings.supportSection')} />
      <Surface padding={0} style={{ paddingHorizontal: space[4] }}>
        <ListRow icon="chatbox-ellipses-outline" title={t('settings.feedback')} onPress={() => navigation.navigate('Feedback')} divider />
        <ListRow
          icon="bug-outline"
          title={t('settings.shareErrors')}
          subtitle={t('settings.shareErrorsHint', { n: String(errorCount) })}
          onPress={shareErrorReport}
          divider
        />
        <ListRow icon="shield-checkmark-outline" title={t('settings.privacy')} onPress={() => void Linking.openURL(PRIVACY_URL)} divider />
        <ListRow icon="play-circle-outline" title={t('settings.replayIntro')} onPress={() => void updateSettings({ onboardingDone: false })} />
      </Surface>

      {!isGuest && (
        <>
          <SectionHeader title={t('auth.accountSection')} />
          <Surface padding={0} style={{ paddingHorizontal: space[4] }}>
            <ListRow
              icon="trash-outline"
              title={t('account.deleteTitle')}
              destructive
              onPress={() => navigation.navigate('DeleteAccount')}
            />
          </Surface>
        </>
      )}

      {Updates.isEnabled && <PendingUpdate />}

      <AppText variant="caption" tone="muted" align="center" style={{ marginTop: space[8] }}>
        {t('app.name')} · {t('settings.version', { v: appVersion() })}
      </AppText>
    </Screen>
  );
}

/**
 * An over-the-air update downloads in the background at launch and applies on the next cold
 * start; testers who never fully close the app can apply it here instead.
 */
function PendingUpdate() {
  const { t } = useTranslation();
  const { space } = useTheme();
  const { isUpdatePending } = Updates.useUpdates();
  if (!isUpdatePending) return null;
  return (
    <Button
      label={t('settings.applyUpdate')}
      icon="refresh"
      variant="secondary"
      onPress={() => void Updates.reloadAsync()}
      style={{ marginTop: space[6] }}
    />
  );
}
