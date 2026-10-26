import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_LANGUAGES, CALCULATION_METHODS, MADHABS } from '../constants/defaults';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { requestNotificationPermissions } from '../services/notifications';
import type { CalculationMethodId, Madhab } from '../types';
import { AppText, Button, Chip, IconBadge, Surface } from '../ui';

type Step = 'welcome' | 'prayer' | 'location' | 'notifications';
const STEPS: Step[] = ['welcome', 'prayer', 'location', 'notifications'];
type Permission = 'unknown' | 'granted' | 'denied';

/**
 * First run after sign-in: language, how prayer times are calculated, and why the app asks for
 * location and notifications. Every step can be skipped and changed later in Settings.
 */
export function OnboardingScreen() {
  const { settings, updateSettings, refreshLocation, location } = useApp();
  const { colors, space } = useTheme();
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('welcome');
  const [locationState, setLocationState] = useState<Permission>(location ? 'granted' : 'unknown');
  const [notifState, setNotifState] = useState<Permission>('unknown');
  const [busy, setBusy] = useState(false);

  const index = STEPS.indexOf(step);
  const next = () => {
    if (index < STEPS.length - 1) setStep(STEPS[index + 1]);
    else void updateSettings({ onboardingDone: true });
  };

  const askLocation = async () => {
    setBusy(true);
    await refreshLocation();
    // refreshLocation falls back to the last saved place when refused, so read the real answer
    const { status } = await Location.getForegroundPermissionsAsync();
    setBusy(false);
    setLocationState(status === 'granted' ? 'granted' : 'denied');
  };

  const askNotifications = async () => {
    setBusy(true);
    const ok = await requestNotificationPermissions();
    setBusy(false);
    setNotifState(ok ? 'granted' : 'denied');
  };

  const chooseLanguage = (code: 'tr' | 'en') => {
    // Turkish users almost always follow Diyanet's times and translation
    void updateSettings(
      code === 'tr'
        ? { appLanguage: 'tr', calculationMethod: 'turkey', quranEditionId: 'tr.diyanet' }
        : { appLanguage: 'en', calculationMethod: settings.calculationMethod === 'turkey' ? 'muslimWorldLeague' : settings.calculationMethod, quranEditionId: 'en.sahih' }
    );
  };

  const chooseMadhab = (m: Madhab) => {
    void updateSettings(m === 'jafari' ? { madhab: m, calculationMethod: 'tehran' } : { madhab: m });
  };

  const permissionNote = (state: Permission, deniedKey: string) =>
    state === 'unknown' ? null : (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[3] }}>
        <Ionicons
          name={state === 'granted' ? 'checkmark-circle' : 'alert-circle-outline'}
          size={18}
          color={state === 'granted' ? colors.primary : colors.textSecondary}
        />
        <AppText variant="callout" tone={state === 'granted' ? 'brand' : 'secondary'} style={{ flex: 1 }}>
          {state === 'granted' ? t('onboarding.granted') : t(deniedKey)}
        </AppText>
      </View>
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: space[5] }} keyboardShouldPersistTaps="handled">
        {/* Progress */}
        <View style={{ flexDirection: 'row', gap: space[2], marginBottom: space[6] }}>
          {STEPS.map((s, i) => (
            <View key={s} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= index ? colors.primary : colors.surfaceMuted }} />
          ))}
        </View>

        {step === 'welcome' && (
          <View style={{ flex: 1 }}>
            <IconBadge name="moon" size="lg" />
            <AppText variant="display" style={{ marginTop: space[4] }}>
              {t('onboarding.welcomeTitle')}
            </AppText>
            <AppText variant="body" tone="secondary" style={{ marginTop: space[2] }}>
              {t('onboarding.welcomeBody')}
            </AppText>
            <AppText variant="overline" tone="muted" style={{ marginTop: space[6], marginBottom: space[2] }}>
              {t('settings.appLanguage')}
            </AppText>
            <View style={{ flexDirection: 'row', gap: space[2] }}>
              {APP_LANGUAGES.map((l) => (
                <Chip key={l.code} label={l.label} selected={settings.appLanguage === l.code} onPress={() => chooseLanguage(l.code)} />
              ))}
            </View>
          </View>
        )}

        {step === 'prayer' && (
          <View style={{ flex: 1 }}>
            <IconBadge name="time-outline" size="lg" />
            <AppText variant="title" style={{ marginTop: space[4] }}>
              {t('onboarding.prayerTitle')}
            </AppText>
            <AppText variant="body" tone="secondary" style={{ marginTop: space[2] }}>
              {t('onboarding.prayerBody')}
            </AppText>
            <AppText variant="overline" tone="muted" style={{ marginTop: space[5], marginBottom: space[2] }}>
              {t('settings.madhab')}
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
              {MADHABS.map((m) => (
                <Chip key={m.id} label={t(`madhab.${m.id}`)} selected={settings.madhab === m.id} onPress={() => chooseMadhab(m.id as Madhab)} />
              ))}
            </View>
            <AppText variant="caption" tone="muted" style={{ marginTop: space[2] }}>
              {t('onboarding.madhabHint')}
            </AppText>
            <AppText variant="overline" tone="muted" style={{ marginTop: space[5], marginBottom: space[2] }}>
              {t('settings.calculation')}
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
              {CALCULATION_METHODS.map((c) => (
                <Chip
                  key={c.id}
                  label={t(`calcMethod.${c.id}`)}
                  selected={settings.calculationMethod === c.id}
                  onPress={() => void updateSettings({ calculationMethod: c.id as CalculationMethodId })}
                />
              ))}
            </View>
          </View>
        )}

        {step === 'location' && (
          <View style={{ flex: 1 }}>
            <IconBadge name="location-outline" size="lg" />
            <AppText variant="title" style={{ marginTop: space[4] }}>
              {t('onboarding.locationTitle')}
            </AppText>
            <AppText variant="body" tone="secondary" style={{ marginTop: space[2] }}>
              {t('onboarding.locationBody')}
            </AppText>
            <Surface variant="muted" padding={space[3]} style={{ marginTop: space[4] }}>
              <AppText variant="callout" tone="secondary">
                {t('onboarding.locationPrivacy')}
              </AppText>
            </Surface>
            <Button label={t('onboarding.allowLocation')} icon="navigate" onPress={askLocation} loading={busy} style={{ marginTop: space[5] }} />
            {permissionNote(locationState, 'onboarding.locationDenied')}
          </View>
        )}

        {step === 'notifications' && (
          <View style={{ flex: 1 }}>
            <IconBadge name="notifications-outline" size="lg" />
            <AppText variant="title" style={{ marginTop: space[4] }}>
              {t('onboarding.notifTitle')}
            </AppText>
            <AppText variant="body" tone="secondary" style={{ marginTop: space[2] }}>
              {t('onboarding.notifBody')}
            </AppText>
            {Platform.OS === 'web' ? (
              <AppText variant="callout" tone="muted" style={{ marginTop: space[4] }}>
                {t('onboarding.notifWeb')}
              </AppText>
            ) : (
              <Button label={t('onboarding.allowNotif')} icon="notifications" onPress={askNotifications} loading={busy} style={{ marginTop: space[5] }} />
            )}
            {permissionNote(notifState, 'onboarding.notifDenied')}
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: space[3], marginTop: space[6] }}>
          {index > 0 && (
            <Button label={t('onboarding.back')} variant="secondary" onPress={() => setStep(STEPS[index - 1])} style={{ flex: 1 }} />
          )}
          <Button
            label={index === STEPS.length - 1 ? t('onboarding.start') : step === 'location' || step === 'notifications' ? t('onboarding.continue') : t('onboarding.next')}
            onPress={next}
            style={{ flex: 2 }}
          />
        </View>
        {(step === 'location' || step === 'notifications') && (
          <AppText variant="caption" tone="muted" align="center" style={{ marginTop: space[3] }}>
            {t('onboarding.later')}
          </AppText>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
