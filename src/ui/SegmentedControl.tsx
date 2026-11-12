import React, { useEffect, useRef, useState } from 'react';
import { Animated, I18nManager, Pressable, View, type LayoutChangeEvent } from 'react-native';
import { useAnimatedValue } from '../hooks/useAnimatedValue';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useTheme } from '../hooks/useTheme';
import { AppText } from './AppText';
import { settle } from './motion';

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Spoken name of the whole group */
  accessibilityLabel?: string;
}

/**
 * Two-to-four option switcher (sign in / create account, collections, filters). The selected pill
 * slides to the new option (spring, native driver); with Reduce Motion it jumps.
 */
export function SegmentedControl<T extends string>({ options, value, onChange, accessibilityLabel }: Props<T>) {
  const { colors, radius, space, layout } = useTheme();
  const reduced = useReducedMotion();
  const [trackWidth, setTrackWidth] = useState(0);
  const offset = useAnimatedValue(0);
  const placed = useRef(false);

  const inset = space[1];
  const segmentWidth = trackWidth > 0 ? (trackWidth - inset * 2) / options.length : 0;
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const direction = I18nManager.isRTL ? -1 : 1;

  useEffect(() => {
    if (segmentWidth === 0) return;
    const to = index * segmentWidth * direction;
    // The first placement (and a resize) is not a change of selection: no slide
    if (!placed.current || reduced) {
      offset.stopAnimation();
      offset.setValue(to);
      placed.current = true;
      return;
    }
    settle(offset, to).start();
  }, [index, segmentWidth, direction, reduced, offset]);

  const onLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width !== trackWidth) {
      placed.current = false;
      setTrackWidth(width);
    }
  };

  const innerRadius = radius.md - inset; // inner radius = outer radius minus the track padding
  const measured = segmentWidth > 0;

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      onLayout={onLayout}
      style={{ flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: inset }}
    >
      {measured && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: inset,
            bottom: inset,
            start: inset,
            width: segmentWidth,
            borderRadius: innerRadius,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            transform: [{ translateX: offset }],
          }}
        />
      )}
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              // The track adds space[1] on each side, so the whole control reaches the platform minimum
              minHeight: layout.minTouch - space[2],
              paddingVertical: space[2],
              borderRadius: innerRadius,
              // Until the track is measured the selected option draws its own pill
              backgroundColor: selected && !measured ? colors.surface : 'transparent',
              borderWidth: selected && !measured ? 1 : 0,
              borderColor: colors.border,
            }}
          >
            <AppText variant="calloutStrong" tone={selected ? 'default' : 'secondary'}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
