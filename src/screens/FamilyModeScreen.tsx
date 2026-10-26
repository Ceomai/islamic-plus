import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Pressable, Switch, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { FamilyMember } from '../types';
import { AppText, Button, Chip, ListRow, Screen, SectionHeader, Surface, TextField } from '../ui';

const EMOJIS = ['👨', '👩', '👦', '👧', '🧑', '👴', '👵'];
const ROLES: FamilyMember['role'][] = ['parent', 'child', 'spouse', 'other'];

export function FamilyModeScreen() {
  const { family, addFamilyMember, removeFamilyMember, settings, updateSettings, setActiveFamilyMember } = useApp();
  const { colors, radius, space } = useTheme();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('👨');
  const [role, setRole] = useState<FamilyMember['role']>('parent');
  const activeId = settings.activeFamilyMemberId;

  const handleAdd = () => {
    if (!name.trim()) return;
    void addFamilyMember({ name: name.trim(), avatarEmoji: emoji, role });
    setName('');
  };

  const confirmRemove = (m: FamilyMember) =>
    Alert.alert(t('family.removeTitle'), t('family.removeBody', { name: m.name }), [
      { text: t('account.cancel'), style: 'cancel' },
      { text: t('family.remove'), style: 'destructive', onPress: () => void removeFamilyMember(m.id) },
    ]);

  return (
    <Screen>
      <AppText variant="callout" tone="secondary" style={{ marginBottom: space[4] }}>
        {t('family.intro')}
      </AppText>

      <Surface padding={0} style={{ paddingHorizontal: space[4] }}>
        <ListRow
          icon="people-outline"
          title={t('family.enable')}
          trailing={
            <Switch
              value={settings.familyModeEnabled}
              onValueChange={(v) => updateSettings({ familyModeEnabled: v })}
              trackColor={{ true: colors.primary, false: colors.borderStrong }}
            />
          }
        />
      </Surface>

      {settings.familyModeEnabled && (
        <>
          <SectionHeader title={t('family.whoIsReading')} />
          <Surface padding={0} style={{ paddingHorizontal: space[4] }}>
            <ListRow
              icon="person-outline"
              title={t('family.me')}
              subtitle={t('family.meHint')}
              onPress={() => setActiveFamilyMember(null)}
              showChevron={false}
              trailing={activeId === null ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : <View />}
              divider={family.length > 0}
            />
            {family.map((m, i) => (
              <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Pressable
                  onPress={() => setActiveFamilyMember(m.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activeId === m.id }}
                  style={({ pressed }) => ({
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space[3],
                    paddingVertical: space[3],
                    opacity: pressed ? 0.6 : 1,
                    borderBottomWidth: i < family.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  })}
                >
                  <AppText style={{ fontSize: 26, lineHeight: 32 }}>{m.avatarEmoji}</AppText>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong">{m.name}</AppText>
                    <AppText variant="caption" tone="secondary">
                      {t(`family.role.${m.role}`)}
                    </AppText>
                  </View>
                  {activeId === m.id ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
                </Pressable>
                <Pressable onPress={() => confirmRemove(m)} hitSlop={10} style={{ paddingLeft: space[3] }} accessibilityLabel={t('family.remove')}>
                  <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            ))}
          </Surface>
          <AppText variant="caption" tone="muted" style={{ marginTop: space[2] }}>
            {t('family.scopeNote')}
          </AppText>

          <SectionHeader title={t('family.addMember')} />
          <Surface>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginBottom: space[4] }}>
              {EMOJIS.map((e) => (
                <Pressable
                  key={e}
                  onPress={() => setEmoji(e)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: emoji === e }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: radius.md,
                    borderWidth: emoji === e ? 2 : 1,
                    borderColor: emoji === e ? colors.primary : colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppText style={{ fontSize: 22, lineHeight: 28 }}>{e}</AppText>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginBottom: space[4] }}>
              {ROLES.map((r) => (
                <Chip key={r} label={t(`family.role.${r}`)} selected={role === r} onPress={() => setRole(r)} />
              ))}
            </View>
            <TextField label={t('family.nameLabel')} placeholder={t('family.namePlaceholder')} value={name} onChangeText={setName} />
            <Button label={t('family.add')} icon="person-add-outline" onPress={handleAdd} disabled={!name.trim()} fullWidth />
          </Surface>
        </>
      )}
    </Screen>
  );
}
