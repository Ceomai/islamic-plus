import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { LocationBlockedNotice } from '../components/LocationBlockedNotice';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { getDistanceToKaaba, getQiblaBearing } from '../services/qibla';
import { AppText, Button, Screen, Surface } from '../ui';
import { announce } from '../utils/announce';

const DIAL = 260;
const KAABA_MARKER = 36;
const DIAL_HUB = 12;
const ALIGN_TOLERANCE_DEG = 5;
// Compass letters in the app language (Kuzey/Doğu/Güney/Batı in Turkish)
const CARDINALS = [
  { key: 'n', tr: 'K', en: 'N', deg: 0 },
  { key: 'e', tr: 'D', en: 'E', deg: 90 },
  { key: 's', tr: 'G', en: 'S', deg: 180 },
  { key: 'w', tr: 'B', en: 'W', deg: 270 },
] as const;

/** Signed shortest turn from `from` to `to`, in degrees (-180..180). Positive = turn right. */
function turnDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

export function QiblaScreen() {
  const { location, refreshLocation } = useApp();
  const { colors, space } = useTheme();
  const { t, lang } = useTranslation();
  const [heading, setHeading] = useState<number | null>(null);
  const [compassUnavailable, setCompassUnavailable] = useState(false);
  const wasAligned = useRef(false);
  const [locationTries, setLocationTries] = useState(0);
  const retryLocation = async () => {
    await refreshLocation();
    setLocationTries((n) => n + 1);
  };

  useEffect(() => {
    // Keep a city chosen by hand; the list's coordinates are close enough for the Qibla bearing
    if (!location?.cityId) void refreshLocation();
  }, []);

  // OS heading is tilt-compensated and, when location is known, referenced to true north
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    Location.watchHeadingAsync((h) => {
      const value = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
      setHeading(value);
    })
      .then((s) => {
        if (cancelled) s.remove();
        else sub = s;
      })
      .catch(() => setCompassUnavailable(true));
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  const qiblaBearing = location ? getQiblaBearing(location.latitude, location.longitude) : null;
  const distance = location ? getDistanceToKaaba(location.latitude, location.longitude) : null;
  const delta = qiblaBearing !== null && heading !== null ? turnDelta(heading, qiblaBearing) : null;
  const aligned = delta !== null && Math.abs(delta) <= ALIGN_TOLERANCE_DEG;

  useEffect(() => {
    if (aligned && !wasAligned.current) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    wasAligned.current = aligned;
  }, [aligned]);

  // The degree text changes with every compass reading, so a live region would talk non-stop.
  // Screen readers hear only the changes that matter: aligned, or which way to turn.
  const guidance = delta === null ? null : aligned ? 'aligned' : delta > 0 ? 'right' : 'left';
  const lastGuidance = useRef<string | null>(null);
  useEffect(() => {
    if (!guidance || delta === null || guidance === lastGuidance.current) return;
    lastGuidance.current = guidance;
    const d = String(Math.round(Math.abs(delta)));
    announce(
      guidance === 'aligned' ? t('qibla.aligned') : guidance === 'right' ? t('qibla.turnRight', { d }) : t('qibla.turnLeft', { d }),
      { hasLiveRegion: false }
    );
  }, [guidance, delta, t]);

  if (!location) {
    return (
      <Screen contentStyle={{ alignItems: 'center', paddingTop: space[10] }}>
        <Ionicons name="location-outline" size={40} color={colors.textMuted} />
        <AppText variant="body" tone="secondary" align="center" style={{ marginVertical: space[4] }}>
          {t('qibla.enableLocation')}
        </AppText>
        <Button label={t('qibla.useLocation')} icon="locate" onPress={retryLocation} />
        <LocationBlockedNotice recheckKey={locationTries} />
      </Screen>
    );
  }

  // The dial turns so that its "N" tracks real north; the Kaaba marker sits at the qibla bearing on the dial
  const dialRotation = heading !== null ? -heading : 0;
  const ringColor = aligned ? colors.success : colors.border;

  const status = compassUnavailable
    ? t('qibla.noCompass')
    : delta === null
      ? t('qibla.calibrating')
      : aligned
        ? t('qibla.aligned')
        : delta > 0
          ? t('qibla.turnRight', { d: String(Math.round(Math.abs(delta))) })
          : t('qibla.turnLeft', { d: String(Math.round(Math.abs(delta))) });

  return (
    <Screen contentStyle={{ alignItems: 'center' }}>
      <AppText variant="title" tone={aligned ? 'success' : 'default'} align="center" style={{ marginTop: space[2] }}>
        {status}
      </AppText>
      <AppText variant="callout" tone="secondary" align="center" style={{ marginTop: space[1], marginBottom: space[6] }}>
        {t('qibla.qibla')}: {Math.round(qiblaBearing!)}°{heading !== null ? ` · ${t('qibla.heading')}: ${Math.round(heading)}°` : ''}
      </AppText>

      {/* Purely visual: the status line above already says where to turn */}
      <View
        style={{ width: DIAL, height: DIAL, alignItems: 'center', justifyContent: 'center' }}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {/* Fixed pointer: the direction the phone faces */}
        <View
          style={{
            position: 'absolute',
            top: -14,
            width: 0,
            height: 0,
            borderLeftWidth: 10,
            borderRightWidth: 10,
            borderBottomWidth: 14,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: aligned ? colors.success : colors.text,
            zIndex: 2,
          }}
        />
        <View
          style={{
            width: DIAL,
            height: DIAL,
            borderRadius: DIAL / 2,
            borderWidth: 6,
            borderColor: ringColor,
            backgroundColor: colors.surface,
            transform: [{ rotate: `${dialRotation}deg` }],
          }}
        >
          {CARDINALS.map((c) => (
            <View
              key={c.key}
              style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', transform: [{ rotate: `${c.deg}deg` }] }}
            >
              <AppText
                variant="captionStrong"
                tone={c.key === 'n' ? 'danger' : 'secondary'}
                style={{ marginTop: space[2], transform: [{ rotate: `${-c.deg - dialRotation}deg` }] }}
              >
                {lang === 'tr' ? c.tr : c.en}
              </AppText>
            </View>
          ))}
          {/* Kaaba marker on the rim at the qibla bearing */}
          <View
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', transform: [{ rotate: `${qiblaBearing}deg` }] }}
          >
            <View
              style={{
                marginTop: space[6],
                width: KAABA_MARKER,
                height: KAABA_MARKER,
                borderRadius: KAABA_MARKER / 2,
                backgroundColor: aligned ? colors.success : colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ rotate: `${-(qiblaBearing ?? 0) - dialRotation}deg` }],
              }}
            >
              <Ionicons name="cube" size={18} color={colors.onPrimary} />
            </View>
            <View style={{ width: 3, height: DIAL / 2 - 70, backgroundColor: aligned ? colors.success : colors.primary, opacity: 0.35 }} />
          </View>
        </View>
        <View style={{ position: 'absolute', width: DIAL_HUB, height: DIAL_HUB, borderRadius: DIAL_HUB / 2, backgroundColor: colors.text }} />
      </View>

      <Surface style={{ alignSelf: 'stretch', marginTop: space[8], flexDirection: 'row' }}>
        <View style={{ flex: 1 }}>
          <AppText variant="caption" tone="secondary">
            {t('qibla.distance')}
          </AppText>
          <AppText variant="heading">
            {Math.round(distance!).toLocaleString()} {t('qibla.km')}
          </AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="caption" tone="secondary">
            {t('home.yourLocation')}
          </AppText>
          <AppText variant="heading" numberOfLines={1}>
            {location.city ?? `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`}
          </AppText>
        </View>
      </Surface>

      <AppText variant="caption" tone="muted" align="center" style={{ marginTop: space[4], paddingHorizontal: space[4] }}>
        {t('qibla.tip')}
      </AppText>
    </Screen>
  );
}
