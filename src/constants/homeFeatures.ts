import type { RootStackParamList } from '../navigation/types';
import type { HomeCategory } from '../theme/tokens';
import type { HomeFeatureId } from '../types';

export type HomeFeatureRoute = keyof RootStackParamList;

export interface HomeFeatureDef {
  id: HomeFeatureId;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  titleKey: string;
  subtitleKey?: string;
  route?: HomeFeatureRoute;
  routeParams?: RootStackParamList[HomeFeatureRoute];
  isModule?: boolean;
  /** Groups the launcher icon colors (reading / worship / tracking / tools) */
  category: HomeCategory;
}

export const HOME_FEATURE_CATALOG: HomeFeatureDef[] = [
  { id: 'module_prayer_times', icon: 'time', titleKey: 'launcher.prayerModule', isModule: true, category: 'worship' },
  { id: 'module_widget', icon: 'apps', titleKey: 'launcher.widgetModule', isModule: true, category: 'tools' },
  { id: 'quran', icon: 'book', titleKey: 'nav.quran', subtitleKey: 'home.quranSub', route: 'Quran', category: 'reading' },
  { id: 'hadith', icon: 'document-text', titleKey: 'nav.hadith', subtitleKey: 'home.hadithSub', route: 'Hadith', category: 'reading' },
  { id: 'duas', icon: 'hand-left', titleKey: 'nav.duas', subtitleKey: 'home.duasSub', route: 'Duas', category: 'reading' },
  { id: 'qibla', icon: 'compass', titleKey: 'nav.qibla', subtitleKey: 'home.qiblaSub', route: 'Qibla', category: 'worship' },
  { id: 'tasbih', icon: 'ellipse-outline', titleKey: 'nav.tasbih', subtitleKey: 'home.tasbihSub', route: 'Tasbih', category: 'worship' },
  { id: 'calendar', icon: 'calendar', titleKey: 'nav.calendar', subtitleKey: 'home.calendarSub', route: 'Calendar', category: 'worship' },
  { id: 'imsakiye', icon: 'moon', titleKey: 'nav.imsakiye', subtitleKey: 'home.imsakiyeSub', route: 'Imsakiye', category: 'worship' },
  { id: 'kaza', icon: 'checkmark-done-circle', titleKey: 'nav.kaza', subtitleKey: 'home.kazaSub', route: 'Kaza', category: 'tracking' },
  { id: 'education', icon: 'school', titleKey: 'nav.education', subtitleKey: 'home.educationSub', route: 'Education', category: 'reading' },
  { id: 'habits', icon: 'heart', titleKey: 'nav.habits', subtitleKey: 'home.habitsSub', route: 'Habits', category: 'tracking' },
  { id: 'duties', icon: 'calculator', titleKey: 'nav.duties', subtitleKey: 'home.dutiesSub', route: 'Duties', category: 'tools' },
  { id: 'places_mosque', icon: 'business', titleKey: 'places.mosque', subtitleKey: 'home.mosquesSub', route: 'Places', routeParams: { type: 'mosque' }, category: 'worship' },
  { id: 'places_halal', icon: 'restaurant', titleKey: 'places.halal_restaurant', subtitleKey: 'home.halalSub', route: 'Places', routeParams: { type: 'halal_restaurant' }, category: 'tools' },
  { id: 'notifications', icon: 'notifications', titleKey: 'nav.notifications', subtitleKey: 'home.notifSub', route: 'NotificationSettings', category: 'tools' },
  { id: 'advanced_reminders', icon: 'alarm', titleKey: 'nav.advancedReminders', subtitleKey: 'home.remindersSub', route: 'AdvancedReminders', category: 'tools' },
  { id: 'ai_assistant', icon: 'sparkles', titleKey: 'nav.ai', subtitleKey: 'home.aiSub', route: 'AIAssistant', category: 'tools' },
  { id: 'statistics', icon: 'analytics', titleKey: 'nav.stats', subtitleKey: 'home.statsSub', route: 'Statistics', category: 'tracking' },
  { id: 'family_mode', icon: 'people', titleKey: 'nav.family', subtitleKey: 'home.familySub', route: 'FamilyMode', category: 'tracking' },
  { id: 'themes', icon: 'color-palette', titleKey: 'nav.themes', subtitleKey: 'home.themesSub', route: 'Themes', category: 'tools' },
  { id: 'cloud_sync', icon: 'cloud-upload', titleKey: 'nav.cloudSync', subtitleKey: 'home.syncSub', route: 'CloudSync', category: 'tools' },
  { id: 'widgets', icon: 'grid', titleKey: 'nav.widgets', subtitleKey: 'home.widgetsSub', route: 'Widgets', category: 'tools' },
  { id: 'settings', icon: 'settings', titleKey: 'nav.settings', subtitleKey: 'home.settingsSub', route: 'Settings', category: 'tools' },
];

export const DEFAULT_HOME_LAUNCHER_ORDER: HomeFeatureId[] = [
  'module_prayer_times',
  'quran',
  'hadith',
  'duas',
  'qibla',
  'tasbih',
  'module_widget',
  'duties',
  'places_mosque',
  'ai_assistant',
  'statistics',
  'calendar',
  'imsakiye',
  'kaza',
  'habits',
  'notifications',
  'settings',
];

export function getHomeFeature(id: HomeFeatureId): HomeFeatureDef | undefined {
  return HOME_FEATURE_CATALOG.find((f) => f.id === id);
}
