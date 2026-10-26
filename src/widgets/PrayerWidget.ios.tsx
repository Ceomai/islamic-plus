import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { PrayerWidgetProps } from './types';

// Runs inside the widget extension: no hooks, no outside variables, all data from props
const PrayerWidget = (props: PrayerWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const brand = '#0F5C4A';
  const small = environment.widgetFamily === 'systemSmall';
  return (
    <VStack alignment="leading" spacing={6} modifiers={[containerBackground('#F6F4EE', 'widget')]}>
      <HStack>
        <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(brand)]}>{props.city}</Text>
        <Spacer />
        {small ? null : <Text modifiers={[font({ size: 11 }), foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>{props.hijri}</Text>}
      </HStack>
      <Text modifiers={[font({ size: 11 }), foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>{props.nextLabel}</Text>
      <Text modifiers={[font({ size: small ? 22 : 26, weight: 'bold' }), foregroundStyle('#1B2A24')]}>
        {props.nextName} {props.nextTime}
      </Text>
      {small ? null : (
        <HStack spacing={12}>
          {props.times.map((t) => (
            <VStack key={t.name} spacing={2}>
              <Text modifiers={[font({ size: 11 }), foregroundStyle(t.isNext ? brand : '#4A5A53')]}>{t.name}</Text>
              <Text modifiers={[font({ size: 13, weight: t.isNext ? 'bold' : 'regular' }), foregroundStyle(t.isNext ? brand : '#1B2A24')]}>
                {t.time}
              </Text>
            </VStack>
          ))}
        </HStack>
      )}
    </VStack>
  );
};

export default createWidget('PrayerWidget', PrayerWidget, {
  city: 'Islamic+',
  hijri: '',
  nextLabel: '',
  nextName: '',
  nextTime: '',
  times: [],
});
