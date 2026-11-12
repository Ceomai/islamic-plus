import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { SkeletonBlock, SkeletonGroup } from '../ui';
import { DAILY_PRAYERS, prayerStripStyles } from './prayer/TodayPrayersModule';

/** Loading placeholder heights: the next-prayer card and one prayer slot */
const SKELETON_HERO = 132;
const SKELETON_SLOT = 76;

/** Loading placeholder in the shape of the home screen: header, next-prayer card and the five prayers. */
export function HomeSkeleton({ label }: { label: string }) {
  const { colors, radius, space } = useTheme();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <SkeletonGroup accessibilityLabel={label} style={{ paddingHorizontal: space[4], paddingTop: space[3] }}>
        <SkeletonBlock width="35%" height={space[4]} />
        <SkeletonBlock width="60%" height={space[6]} style={{ marginTop: space[2], marginBottom: space[5] }} />
        <SkeletonBlock height={SKELETON_HERO} radius={radius.lg} style={{ marginBottom: space[3] }} />
        <View style={[prayerStripStyles.strip, { gap: space[2] }]}>
          {DAILY_PRAYERS.map((p) => (
            <SkeletonBlock key={p} width="auto" height={SKELETON_SLOT} radius={radius.md} style={prayerStripStyles.grow} />
          ))}
        </View>
      </SkeletonGroup>
    </SafeAreaView>
  );
}
