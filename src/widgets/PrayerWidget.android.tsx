import { Column, Row, Spacer, Text } from '@expo/ui/jetpack-compose';
import { background, fillMaxSize, paddingAll } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget } from 'expo-widgets';
import type { PrayerWidgetProps } from './types';

// Runs as a Glance widget: only the supported Compose subset, no hooks, all data from props
const PrayerWidget = (props: PrayerWidgetProps) => {
  'widget';
  return (
    <Column modifiers={[fillMaxSize(), background('#F6F4EE'), paddingAll(12)]}>
      <Text color="#0F5C4A" style={{ fontSize: 12, fontWeight: 'bold' }}>
        {props.city}
      </Text>
      <Text color="#4A5A53" style={{ fontSize: 11 }}>
        {props.nextLabel} · {props.hijri}
      </Text>
      <Text color="#1B2A24" style={{ fontSize: 22, fontWeight: 'bold' }}>
        {props.nextName} {props.nextTime}
      </Text>
      <Row>
        {props.times.map((t) => (
          <Column key={t.name} modifiers={[paddingAll(4)]}>
            <Text color={t.isNext ? '#0F5C4A' : '#4A5A53'} style={{ fontSize: 11 }}>
              {t.name}
            </Text>
            <Text color={t.isNext ? '#0F5C4A' : '#1B2A24'} style={{ fontSize: 13, fontWeight: t.isNext ? 'bold' : 'normal' }}>
              {t.time}
            </Text>
          </Column>
        ))}
      </Row>
      <Spacer />
    </Column>
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
