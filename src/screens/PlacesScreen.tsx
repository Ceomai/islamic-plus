import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Platform, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { RootStackParamList } from '../navigation/types';
import { fetchNearbyPlaces } from '../services/places';
import type { NearbyPlace } from '../types';
import { AppText, Button, Chip, IconBadge, Surface } from '../ui';

type Props = NativeStackScreenProps<RootStackParamList, 'Places'>;

const RADII = [2000, 5000, 10000];

function openDirections(p: NearbyPlace) {
  const label = encodeURIComponent(p.name);
  const url =
    Platform.OS === 'ios'
      ? `https://maps.apple.com/?daddr=${p.latitude},${p.longitude}&q=${label}`
      : Platform.OS === 'android'
        ? `geo:${p.latitude},${p.longitude}?q=${p.latitude},${p.longitude}(${label})`
        : `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`;
  void Linking.openURL(url).catch(() =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}`)
  );
}

export function PlacesScreen({ route, navigation }: Props) {
  const { type } = route.params;
  const { location, refreshLocation } = useApp();
  const { colors, space } = useTheme();
  const { t, lang } = useTranslation();
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'noLocation'>('loading');
  const [radius, setRadius] = useState(5000);

  useEffect(() => {
    navigation.setOptions({ title: t(`places.${type}`) });
  }, [navigation, t, type]);

  // Ask for a location once if none is cached; the search below reruns when it arrives
  useEffect(() => {
    if (!location) void refreshLocation();
  }, []);

  const search = useCallback(async () => {
    if (!location) {
      setStatus('noLocation');
      return;
    }
    setStatus('loading');
    try {
      setPlaces(await fetchNearbyPlaces(location.latitude, location.longitude, type, radius));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [location?.latitude, location?.longitude, type, radius]);

  useEffect(() => {
    void search();
  }, [search]);

  const distance = (km: number) =>
    km < 1 ? `${Math.round(km * 1000)} m` : `${km.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')} km`;

  const header = (
    <View style={{ marginBottom: space[4] }}>
      <View style={{ flexDirection: 'row', gap: space[2] }}>
        {RADII.map((r) => (
          <Chip key={r} label={`${r / 1000} km`} selected={radius === r} onPress={() => setRadius(r)} />
        ))}
      </View>
      {/* Free OSM sources are incomplete and sometimes slow; say so up front */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1], marginTop: space[2] }}>
        <AppText variant="overline" tone="brand">
          BETA
        </AppText>
        <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
          {t('places.beta')}
        </AppText>
      </View>
    </View>
  );

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
        <AppText variant="caption" tone="muted" align="center" style={{ marginTop: space[3], paddingHorizontal: space[6] }}>
          {t('places.loading')}
        </AppText>
      </View>
    );
  }

  if (status === 'error' || status === 'noLocation') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[6], backgroundColor: colors.background }}>
        <IconBadge name={status === 'error' ? 'cloud-offline-outline' : 'location-outline'} size="lg" tone="neutral" />
        <AppText variant="body" tone="secondary" align="center" style={{ marginVertical: space[4] }}>
          {status === 'error' ? t('places.error') : t('qibla.enableLocation')}
        </AppText>
        <Button
          label={status === 'error' ? t('common.retry') : t('qibla.useLocation')}
          icon={status === 'error' ? 'refresh' : 'locate'}
          onPress={status === 'error' ? search : refreshLocation}
          variant="secondary"
        />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: space[4], paddingBottom: space[8] }}
      data={places}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <Surface variant="muted">
          <AppText variant="callout" tone="secondary" align="center">
            {t('places.empty')}
          </AppText>
        </Surface>
      }
      ListFooterComponent={
        places.length > 0 ? (
          <AppText variant="caption" tone="muted" style={{ marginTop: space[2] }}>
            {places[0]?.source === 'google' ? t('places.googleNote') : t('places.osmNote')}
          </AppText>
        ) : undefined
      }
      renderItem={({ item }) => (
        <Surface
          onPress={() => openDirections(item)}
          accessibilityLabel={`${item.name}, ${distance(item.distanceKm)}`}
          style={{ marginBottom: space[3], flexDirection: 'row', alignItems: 'center', gap: space[3] }}
        >
          <IconBadge name={type === 'halal_restaurant' ? 'restaurant-outline' : 'business-outline'} />
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong">{item.name}</AppText>
            <AppText variant="caption" tone="secondary">
              {distance(item.distanceKm)}
              {item.address ? ` · ${item.address}` : ''}
            </AppText>
          </View>
          <Ionicons name="navigate-outline" size={18} color={colors.primary} />
        </Surface>
      )}
    />
  );
}
