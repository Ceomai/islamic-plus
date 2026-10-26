import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { HomeAppIcon } from '../components/HomeAppIcon';
import { HOME_FEATURE_CATALOG, getHomeFeature } from '../constants/homeFeatures';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { HomeFeatureId } from '../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'HomeLauncherEdit'>;

export function HomeLauncherEditScreen({ navigation }: Props) {
  const { settings, updateHomeLauncher } = useApp();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [order, setOrder] = useState<HomeFeatureId[]>([...settings.homeLauncher.order]);

  const available = useMemo(
    () => HOME_FEATURE_CATALOG.filter((f) => !order.includes(f.id)),
    [order]
  );

  const save = async () => {
    await updateHomeLauncher(order);
    navigation.goBack();
  };

  const remove = (id: HomeFeatureId) => setOrder((o) => o.filter((x) => x !== id));
  const add = (id: HomeFeatureId) => setOrder((o) => [...o, id]);
  const move = (index: number, dir: -1 | 1) => {
    const next = [...order];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('launcher.addApps')}</Text>

      {order.length === 0 ? (
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginVertical: 20 }}>{t('launcher.empty')}</Text>
      ) : (
        order.map((id, index) => {
          const def = getHomeFeature(id);
          if (!def) return null;
          const title = t(def.titleKey);
          return (
            <View key={id} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <HomeAppIcon icon={def.icon} label={title} color={def.color} onPress={() => {}} />
              <View style={styles.rowActions}>
                <Pressable onPress={() => move(index, -1)} style={styles.iconBtn}>
                  <Ionicons name="arrow-up" size={20} color={colors.primary} />
                </Pressable>
                <Pressable onPress={() => move(index, 1)} style={styles.iconBtn}>
                  <Ionicons name="arrow-down" size={20} color={colors.primary} />
                </Pressable>
                <Pressable onPress={() => remove(id)} style={styles.iconBtn}>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </Pressable>
              </View>
            </View>
          );
        })
      )}

      <Text style={[styles.section, { color: colors.text }]}>{t('launcher.library')}</Text>
      <View style={styles.libraryGrid}>
        {available.map((def) => (
          <HomeAppIcon
            key={def.id}
            icon={def.icon}
            label={t(def.titleKey)}
            color={def.color}
            onPress={() => add(def.id)}
          />
        ))}
      </View>

      <Pressable style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={save}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{t('common.save')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  hint: { marginBottom: 16, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 8, marginBottom: 10 },
  rowActions: { flexDirection: 'row', marginLeft: 'auto', gap: 4 },
  iconBtn: { padding: 8 },
  section: { fontSize: 17, fontWeight: '700', marginTop: 20, marginBottom: 12 },
  libraryGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  saveBtn: { marginTop: 24, padding: 16, borderRadius: 14, alignItems: 'center' },
});
