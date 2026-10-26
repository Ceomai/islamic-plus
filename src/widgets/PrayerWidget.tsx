import type { PrayerWidgetProps } from './types';

/** Web and tests: there is no home-screen widget, so updates do nothing. */
const PrayerWidget = {
  updateSnapshot(_props: PrayerWidgetProps): void {},
  updateTimeline(_entries: { date: Date; props: PrayerWidgetProps }[]): void {},
};

export default PrayerWidget;
