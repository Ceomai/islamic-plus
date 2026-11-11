import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { Animated, useAnimatedValue, View } from 'react-native';
import { LocationBlockedNotice } from '../components/LocationBlockedNotice';
import { useAppLocation } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { nextAligned, smoothHeading, turnDelta, wrap360 } from '../services/compass';
import { getDistanceToKaaba, getQiblaBearing } from '../services/qibla';
import { AppText, Button, Screen, Surface } from '../ui';
import { timing } from '../ui/motion';
import { announce } from '../utils/announce';

const DIAL = 260;
const KAABA_MARKER = 36;
const DIAL_HUB = 12;
const DIAL_RING = 6;
/** Aligned within 5 degrees, and stays aligned until 8 degrees off, so a wobbling hand doesn't flicker */
const ALIGN_ENTER_DEG = 5;
const ALIGN_EXIT_DEG = 8;
/** Low-pass factor for the compass reading (smaller = calmer, slower) */
const HEADING_SMOOTHING = 0.2;
const ALIGN_HAPTIC_COOLDOWN_MS = 1500;
// Compass letters in the app language (Kuzey/Doğu/Güney/Batı in Turkish)
const CARDINALS = [
  { key: 'n', tr: 'K', en: 'N', deg: 0 },
  { key: 'e', tr: 'D', en: 'E', deg: 90 },
  { key: 's', tr: 'G', en: 'S', deg: 180 },
  { key: 'w', tr: 'B', en: 'W', deg: 270 },
] as const;

export function QiblaScreen() {
  const { location, refreshLocation } = useAppLocation();
  const { colors, space, motion } = useTheme();
  const { t, lang } = useTranslation();
  // Rounded values for the text: React re-renders only when a whole degree changes, not per reading
  const [reading, setReading] = useState<{ heading: number; delta: number | null } | null>(null);
  const [aligned, setAligned] = useState(false);
  const [compassUnavailable, setCompassUnavailable] = useState(false);
  const [locationTries, setLocationTries] = useState(0);
  const retryLocation = async () => {
    await refreshLocation();
    setLocationTries((n) => n + 1);
  };

  // Once on open. Keep a city chosen by hand; the list's coordinates are close enough for the Qibla bearing
  const refreshOnOpen = useEffectEvent(() => {
    if (!location?.cityId) void refreshLocation();
  });
  useEffect(() => {
    refreshOnOpen();
  }, []);

  const qiblaBearing = location ? getQiblaBearing(location.latitude, location.longitude) : null;
  const distance = location ? getDistanceToKaaba(location.latitude, location.longitude) : null;

  // The dial turns by -heading. The heading lives in an Animated value set straight from the sensor
  // callback (no React render per reading), unwrapped so crossing north never spins the dial around
  const dialRotation = useAnimatedValue(0);
  const alignedGlow = useAnimatedValue(0);
  const compass = useRef({ heading: null as number | null, aligned: false, lastHapticAt: 0, bearing: qiblaBearing });
  useEffect(() => {
    compass.current.bearing = qiblaBearing;
  }, [qiblaBearing]);
  // Hand the angle to the native driver once: from then on each setValue goes straight to the view
  useEffect(() => {
    timing(dialRotation, 0, 0).start();
  }, [dialRotation]);

  // OS heading is tilt-compensated and, when location is known, referenced to true north.
  // The sensor runs only while the screen is in front
  useFocusEffect(
    useCallback(() => {
      let sub: Location.LocationSubscription | null = null;
      let cancelled = false;
      const state = compass.current;
      Location.watchHeadingAsync((h) => {
        const raw = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
        state.heading = smoothHeading(state.heading, raw, HEADING_SMOOTHING);
        dialRotation.setValue(-state.heading);

        const heading = wrap360(state.heading);
        const delta = state.bearing === null ? null : turnDelta(heading, state.bearing);
        const nowAligned = delta !== null && nextAligned(state.aligned, delta, ALIGN_ENTER_DEG, ALIGN_EXIT_DEG);
        if (nowAligned !== state.aligned) {
          state.aligned = nowAligned;
          setAligned(nowAligned);
          const now = Date.now();
          if (nowAligned && now - state.lastHapticAt >= ALIGN_HAPTIC_COOLDOWN_MS) {
            state.lastHapticAt = now;
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }

        const rounded = { heading: Math.round(heading) % 360, delta: delta === null ? null : Math.round(delta) };
        setReading((prev) => (prev?.heading === rounded.heading && prev.delta === rounded.delta ? prev : rounded));
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
    }, [dialRotation])
  );

  // The aligned ring color fades in and out instead of switching
  useEffect(() => {
    timing(alignedGlow, aligned ? 1 : 0, motion.duration.medium).start();
  }, [aligned, alignedGlow, motion.duration.medium]);

  // The dial turns so that its "N" tracks real north; the Kaaba marker sits at the qibla bearing on it.
  // Derived rotations (native driver): the dial, and the letters and marker turned back to stay upright
  const rotate = useMemo(() => {
    const by = (offset: number, sign: 1 | -1) =>
      dialRotation.interpolate({
        inputRange: [0, 360],
        outputRange: [`${offset}deg`, `${offset + sign * 360}deg`],
        extrapolate: 'extend',
      });
    return {
      dial: by(0, 1),
      letters: CARDINALS.map((c) => by(-c.deg, -1)),
      kaaba: by(-(qiblaBearing ?? 0), -1),
    };
  }, [dialRotation, qiblaBearing]);

  const delta = reading?.delta ?? null;

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

  const status = compassUnavailable
    ? t('qibla.noCompass')
    : delta === null
      ? t('qibla.calibrating')
      : aligned
        ? t('qibla.aligned')
        : delta > 0
          ? t('qibla.turnRight', { d: String(Math.abs(delta)) })
          : t('qibla.turnLeft', { d: String(Math.abs(delta)) });

  return (
    <Screen contentStyle={{ alignItems: 'center' }}>
      <AppText variant="title" tone={aligned ? 'success' : 'default'} align="center" style={{ marginTop: space[2] }}>
        {status}
      </AppText>
      <AppText variant="callout" tone="secondary" align="center" style={{ marginTop: space[1], marginBottom: space[6] }}>
        {t('qibla.qibla')}: {Math.round(qiblaBearing!)}°{reading ? ` · ${t('qibla.heading')}: ${reading.heading}°` : ''}
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
        <Animated.View
          style={{
            width: DIAL,
            height: DIAL,
            borderRadius: DIAL / 2,
            borderWidth: DIAL_RING,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            transform: [{ rotate: rotate.dial }],
          }}
        >
          {CARDINALS.map((c, i) => (
            <View
              key={c.key}
              style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', transform: [{ rotate: `${c.deg}deg` }] }}
            >
              <Animated.View style={{ marginTop: space[2], transform: [{ rotate: rotate.letters[i] }] }}>
                <AppText variant="captionStrong" tone={c.key === 'n' ? 'danger' : 'secondary'}>
                  {lang === 'tr' ? c.tr : c.en}
                </AppText>
              </Animated.View>
            </View>
          ))}
          {/* Kaaba marker on the rim at the qibla bearing */}
          <View
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', transform: [{ rotate: `${qiblaBearing}deg` }] }}
          >
            <Animated.View
              style={{
                marginTop: space[6],
                width: KAABA_MARKER,
                height: KAABA_MARKER,
                borderRadius: KAABA_MARKER / 2,
                backgroundColor: aligned ? colors.success : colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ rotate: rotate.kaaba }],
              }}
            >
              <Ionicons name="cube" size={18} color={colors.onPrimary} />
            </Animated.View>
            <View style={{ width: 3, height: DIAL / 2 - 70, backgroundColor: aligned ? colors.success : colors.primary, opacity: 0.35 }} />
          </View>
        </Animated.View>
        {/* Aligned ring: the same ring in the success color, faded in over the plain one */}
        <Animated.View
          style={{
            position: 'absolute',
            width: DIAL,
            height: DIAL,
            borderRadius: DIAL / 2,
            borderWidth: DIAL_RING,
            borderColor: colors.success,
            opacity: alignedGlow,
          }}
        />
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
