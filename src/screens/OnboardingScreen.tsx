import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_LANGUAGES, CALCULATION_METHODS, MADHABS } from '../constants/defaults';
import { searchCities } from '../data/cities';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { requestNotificationPermissions, schedulePrayerNotifications } from '../services/notifications';
import type { CalculationMethodId, Madhab } from '../types';
import { AppText, Button, Chip, Enter, IconBadge, Surface, TextField } from '../ui';

type Step = 'welcome' | 'prayer' | 'location' | 'notifications' | 'account';
const BASE_STEPS: Step[] = ['welcome', 'prayer', 'location', 'notifications'];
/** Guests get one last, skippable offer to create an account for cloud backup */
const GUEST_STEPS: Step[] = [...BASE_STEPS, 'account'];
type Permission = 'unknown' | 'granted' | 'denied';

/**
 * First run (as a guest or after sign-in): language, how prayer times are calculated, and why the app
 * asks for location and notifications. Every step can be skipped and changed later in Settings.
 */
export function OnboardingScreen() {
  const { settings, updateSettings, refreshLocation, setManualLocation, location } = useApp();
  const { isGuest, logout } = useAuth();
  const STEPS = isGuest ? GUEST_STEPS : BASE_STEPS;
  const [cityQuery, setCityQuery] = useState('');
  const [showCities, setShowCities] = useState(false);
  const { colors, radius, space, motion } = useTheme();
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('welcome');
  // Which way the last step change went: the new step slides in from that side (none on first open)
  const [direction, setDirection] = useState<1 | -1 | 0>(0);
  const [locationState, setLocationState] = useState<Permission>(location ? 'granted' : 'unknown');
  const [notifState, setNotifState] = useState<Permission>('unknown');
  const [busy, setBusy] = useState(false);

  const index = STEPS.indexOf(step);
  const goTo = (target: Step) => {
    setDirection(STEPS.indexOf(target) > index ? 1 : -1);
    setStep(target);
  };

  // Android's back button returns to the previous step instead of closing the app mid-setup
  useEffect(() => {
    if (index === 0) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setDirection(-1);
      setStep(STEPS[index - 1]);
      return true;
    });
    return () => sub.remove();
  }, [index, STEPS]);
  const next = () => {
    if (index < STEPS.length - 1) goTo(STEPS[index + 1]);
    else void updateSettings({ onboardingDone: true });
  };

  // Finish the introduction first, so the guest data copied into a new account opens at home
  const goToAccount = async () => {
    setBusy(true);
    try {
      await updateSettings({ onboardingDone: true });
      await logout();
    } finally {
      setBusy(false);
    }
  };

  const askLocation = async () => {
    setBusy(true);
    try {
      const ok = await refreshLocation();
      // Permission can be granted while no position arrives (location services off): offer the list
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationState(ok && status === 'granted' ? 'granted' : 'denied');
    } catch {
      setLocationState('denied');
    } finally {
      setBusy(false);
    }
  };

  const askNotifications = async () => {
    setBusy(true);
    const ok = await requestNotificationPermissions();
    setBusy(false);
    setNotifState(ok ? 'granted' : 'denied');
    // Scheduling never asks for permission, so what was skipped at start-up is scheduled now
    if (ok && location) void schedulePrayerNotifications(location.latitude, location.longitude, settings);
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
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={t('onboarding.progress', { n: String(index + 1), total: String(STEPS.length) })}
          accessibilityValue={{ min: 1, max: STEPS.length, now: index + 1 }}
          style={{ flexDirection: 'row', gap: space[2], marginBottom: space[6] }}
        >
          {STEPS.map((s, i) => (
            <View key={s} style={{ flex: 1, height: 4, borderRadius: radius.pill, backgroundColor: i <= index ? colors.primary : colors.surfaceMuted }} />
          ))}
        </View>

        <Enter
          key={step}
          animate={direction !== 0}
          duration={motion.duration.base}
          offsetX={direction * motion.enterOffset.step}
          style={{ flex: 1 }}
        >
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
              {location?.city && (locationState === 'granted' || location.cityId) && (
                <AppText variant="callout" tone="brand" style={{ marginTop: space[2] }}>
                  {location.city}
                </AppText>
              )}
              {/* No GPS or no permission: pick the city from a list that works offline */}
              <Button label={t('city.choose')} icon="list" variant="ghost" onPress={() => setShowCities((v) => !v)} style={{ marginTop: space[3] }} />
              {showCities && (
                <View style={{ marginTop: space[2] }}>
                  <TextField
                    label={t('city.search')}
                    value={cityQuery}
                    onChangeText={setCityQuery}
                    placeholder={t('city.searchPlaceholder')}
                    autoCorrect={false}
                    maxLength={40}
                  />
                  {searchCities(cityQuery).slice(0, 8).map((c) => (
                    <Pressable
                      key={c.id}
                      onPress={async () => {
                        await setManualLocation(c);
                        // No permission was given; the chosen city is shown instead of "permission granted"
                        setLocationState('unknown');
                        setShowCities(false);
                        setCityQuery('');
                      }}
                      accessibilityRole="button"
                      style={({ pressed }) => ({
                        minHeight: 48,
                        justifyContent: 'center',
                        paddingHorizontal: space[3],
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                        backgroundColor: pressed ? colors.surfaceMuted : 'transparent',
                      })}
                    >
                      <AppText variant="body">{settings.appLanguage === 'tr' ? c.tr : c.en}</AppText>
                    </Pressable>
                  ))}
                </View>
              )}
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

          {step === 'account' && (
            <View style={{ flex: 1 }}>
              <IconBadge name="cloud-upload-outline" size="lg" />
              <AppText variant="title" style={{ marginTop: space[4] }}>
                {t('onboarding.accountTitle')}
              </AppText>
              <AppText variant="body" tone="secondary" style={{ marginTop: space[2] }}>
                {t('onboarding.accountBody')}
              </AppText>
              <Button
                label={t('auth.signInOrRegister')}
                icon="log-in-outline"
                variant="secondary"
                onPress={goToAccount}
                loading={busy}
                style={{ marginTop: space[5] }}
              />
            </View>
          )}

        </Enter>

        <View style={{ flexDirection: 'row', gap: space[3], marginTop: space[6] }}>
          {index > 0 && (
            <Button label={t('onboarding.back')} variant="secondary" onPress={() => goTo(STEPS[index - 1])} style={{ flex: 1 }} />
          )}
          <Button
            label={
              step === 'account'
                ? t('onboarding.notNow')
                : index === STEPS.length - 1
                  ? t('onboarding.start')
                  : step === 'location' || step === 'notifications'
                    ? t('onboarding.continue')
                    : t('onboarding.next')
            }
            onPress={next}
            disabled={busy && step === 'account'}
            style={{ flex: 2 }}
          />
        </View>
        {(step === 'location' || step === 'notifications') && (
          <AppText variant="caption" tone="muted" align="center" style={{ marginTop: space[3] }}>
            {t('onboarding.later')}
          </AppText>
        )}
        {step === 'account' && (
          <AppText variant="caption" tone="muted" align="center" style={{ marginTop: space[3] }}>
            {t('onboarding.accountLater')}
          </AppText>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
