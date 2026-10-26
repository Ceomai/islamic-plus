import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HOME_FEATURE_CATALOG, getHomeFeature } from '../constants/homeFeatures';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { RootStackParamList } from '../navigation/types';
import type { HomeFeatureId } from '../types';
import { AppText, Button, IconBadge, Screen, SectionHeader, Surface } from '../ui';

type Props = NativeStackScreenProps<RootStackParamList, 'HomeLauncherEdit'>;

export function HomeLauncherEditScreen({ navigation }: Props) {
  const { settings, updateHomeLauncher } = useApp();
  const { colors, space } = useTheme();
  const { t } = useTranslation();
  const [order, setOrder] = useState<HomeFeatureId[]>([...settings.homeLauncher.order]);
  const available = useMemo(() => HOME_FEATURE_CATALOG.filter((f) => !order.includes(f.id)), [order]);
  const dirty = order.join() !== settings.homeLauncher.order.join();

  const save = async () => {
    await updateHomeLauncher(order);
    navigation.goBack();
  };
  const remove = (id: HomeFeatureId) => setOrder((o) => o.filter((x) => x !== id));
  const add = (id: HomeFeatureId) => setOrder((o) => [...o, id]);
  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  };

  const iconButton = (icon: React.ComponentProps<typeof Ionicons>['name'], label: string, onPress: () => void, disabled = false, color = colors.primary) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ padding: space[2], opacity: disabled ? 0.3 : 1 }}
    >
      <Ionicons name={icon} size={20} color={color} />
    </Pressable>
  );

  return (
    <Screen>
      <AppText variant="callout" tone="secondary" style={{ marginBottom: space[4] }}>
        {t('launcher.intro')}
      </AppText>

      <SectionHeader title={t('home.myApps')} />
      {order.length === 0 ? (
        <Surface variant="muted">
          <AppText variant="callout" tone="secondary" align="center">
            {t('launcher.empty')}
          </AppText>
        </Surface>
      ) : (
        <Surface padding={0} style={{ paddingHorizontal: space[3] }}>
          {order.map((id, index) => {
            const def = getHomeFeature(id);
            if (!def) return null;
            const title = t(def.titleKey);
            return (
              <View
                key={id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space[2],
                  paddingVertical: space[2],
                  borderBottomWidth: index < order.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                }}
              >
                <IconBadge name={def.icon} size="sm" tone={def.isModule ? 'accent' : 'brand'} />
                <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                  {title}
                </AppText>
                {iconButton('arrow-up', `${t('launcher.moveUp')} ${title}`, () => move(index, -1), index === 0)}
                {iconButton('arrow-down', `${t('launcher.moveDown')} ${title}`, () => move(index, 1), index === order.length - 1)}
                {iconButton('remove-circle-outline', `${t('launcher.remove')} ${title}`, () => remove(id), false, colors.error)}
              </View>
            );
          })}
        </Surface>
      )}

      {available.length > 0 && (
        <>
          <SectionHeader title={t('launcher.library')} />
          <Surface padding={0} style={{ paddingHorizontal: space[3] }}>
            {available.map((def, i) => (
              <Pressable
                key={def.id}
                onPress={() => add(def.id)}
                accessibilityRole="button"
                accessibilityLabel={`${t('launcher.addApps')}: ${t(def.titleKey)}`}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space[2],
                  paddingVertical: space[3],
                  opacity: pressed ? 0.6 : 1,
                  borderBottomWidth: i < available.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                })}
              >
                <IconBadge name={def.icon} size="sm" tone="neutral" />
                <AppText variant="body" style={{ flex: 1 }}>
                  {t(def.titleKey)}
                </AppText>
                <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
              </Pressable>
            ))}
          </Surface>
        </>
      )}

      <Button label={t('common.save')} icon="checkmark" onPress={save} disabled={!dirty} size="lg" fullWidth style={{ marginTop: space[6] }} />
    </Screen>
  );
}
