/** Everything the home-screen widget shows; it can't compute anything itself (see expo-widgets). */
export interface PrayerWidgetProps {
  city: string;
  hijri: string;
  /** "Sıradaki vakit" / "Next prayer" */
  nextLabel: string;
  nextName: string;
  nextTime: string;
  /** The five daily prayers, already formatted */
  times: { name: string; time: string; isNext: boolean }[];
}

export const EMPTY_WIDGET_PROPS: PrayerWidgetProps = {
  city: 'Islamic+',
  hijri: '',
  nextLabel: '',
  nextName: '',
  nextTime: '',
  times: [],
};
