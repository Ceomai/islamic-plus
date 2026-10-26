import type { RootStackParamList } from '../navigation/types';
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
  color?: string;
}

export const HOME_FEATURE_CATALOG: HomeFeatureDef[] = [
  { id: 'module_prayer_times', icon: 'time', titleKey: 'launcher.prayerModule', isModule: true, color: '#0D3B2E' },
  { id: 'module_widget', icon: 'apps', titleKey: 'launcher.widgetModule', isModule: true, color: '#1A5C47' },
  { id: 'quran', icon: 'book', titleKey: 'nav.quran', subtitleKey: 'home.quranSub', route: 'Quran', color: '#0D3B2E' },
  { id: 'hadith', icon: 'document-text', titleKey: 'nav.hadith', subtitleKey: 'home.hadithSub', route: 'Hadith', color: '#2E6B5A' },
  { id: 'duas', icon: 'hand-left', titleKey: 'nav.duas', subtitleKey: 'home.duasSub', route: 'Duas', color: '#3D7A68' },
  { id: 'qibla', icon: 'compass', titleKey: 'nav.qibla', subtitleKey: 'home.qiblaSub', route: 'Qibla', color: '#0D3B2E' },
  { id: 'tasbih', icon: 'ellipse-outline', titleKey: 'nav.tasbih', subtitleKey: 'home.tasbihSub', route: 'Tasbih', color: '#C9A227' },
  { id: 'calendar', icon: 'calendar', titleKey: 'nav.calendar', subtitleKey: 'home.calendarSub', route: 'Calendar', color: '#1A5C47' },
  { id: 'imsakiye', icon: 'moon', titleKey: 'nav.imsakiye', subtitleKey: 'home.imsakiyeSub', route: 'Imsakiye', color: '#0F5C4A' },
  { id: 'kaza', icon: 'checkmark-done-circle', titleKey: 'nav.kaza', subtitleKey: 'home.kazaSub', route: 'Kaza', color: '#2E6B5A' },
  { id: 'education', icon: 'school', titleKey: 'nav.education', subtitleKey: 'home.educationSub', route: 'Education', color: '#2E7D5A' },
  { id: 'habits', icon: 'heart', titleKey: 'nav.habits', subtitleKey: 'home.habitsSub', route: 'Habits', color: '#B8860B' },
  { id: 'duties', icon: 'calculator', titleKey: 'nav.duties', subtitleKey: 'home.dutiesSub', route: 'Duties', color: '#0D3B2E' },
  { id: 'places_mosque', icon: 'business', titleKey: 'places.mosque', subtitleKey: 'home.mosquesSub', route: 'Places', routeParams: { type: 'mosque' }, color: '#1A5C47' },
  { id: 'places_halal', icon: 'restaurant', titleKey: 'places.halal_restaurant', subtitleKey: 'home.halalSub', route: 'Places', routeParams: { type: 'halal_restaurant' }, color: '#2E6B5A' },
  { id: 'notifications', icon: 'notifications', titleKey: 'nav.notifications', subtitleKey: 'home.notifSub', route: 'NotificationSettings', color: '#0D3B2E' },
  { id: 'advanced_reminders', icon: 'alarm', titleKey: 'nav.advancedReminders', subtitleKey: 'home.remindersSub', route: 'AdvancedReminders', color: '#C9A227' },
  { id: 'ai_assistant', icon: 'sparkles', titleKey: 'nav.ai', subtitleKey: 'home.aiSub', route: 'AIAssistant', color: '#8B6914' },
  { id: 'statistics', icon: 'analytics', titleKey: 'nav.stats', subtitleKey: 'home.statsSub', route: 'Statistics', color: '#1A5C47' },
  { id: 'family_mode', icon: 'people', titleKey: 'nav.family', subtitleKey: 'home.familySub', route: 'FamilyMode', color: '#2E7D5A' },
  { id: 'themes', icon: 'color-palette', titleKey: 'nav.themes', subtitleKey: 'home.themesSub', route: 'Themes', color: '#C9A227' },
  { id: 'cloud_sync', icon: 'cloud-upload', titleKey: 'nav.cloudSync', subtitleKey: 'home.syncSub', route: 'CloudSync', color: '#0D3B2E' },
  { id: 'widgets', icon: 'grid', titleKey: 'nav.widgets', subtitleKey: 'home.widgetsSub', route: 'Widgets', color: '#1A5C47' },
  { id: 'settings', icon: 'settings', titleKey: 'nav.settings', subtitleKey: 'home.settingsSub', route: 'Settings', color: '#5A6F68' },
];

export const DEFAULT_HOME_LAUNCHER_ORDER: HomeFeatureId[] = [
  'module_prayer_times',
  'quran',
  'hadith',
  'duas',
  'qibla',
  'tasbih',
  'module_widget',
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
