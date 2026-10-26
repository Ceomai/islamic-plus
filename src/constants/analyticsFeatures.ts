/** Maps React Navigation route names → analytics feature_id */
export const SCREEN_TO_FEATURE: Record<string, string> = {
  Home: 'home',
  HomeLauncherEdit: 'home_launcher',
  Quran: 'quran',
  QuranReader: 'quran_reader',
  Hadith: 'hadith',
  Qibla: 'qibla',
  Places: 'places',
  Tasbih: 'tasbih',
  Calendar: 'calendar',
  Education: 'education',
  EducationDetail: 'education_detail',
  Habits: 'habits',
  Duties: 'duties',
  NotificationSettings: 'notifications',
  Settings: 'settings',
  Duas: 'duas',
  DuaDetail: 'dua_detail',
  AIAssistant: 'ai_assistant',
  Statistics: 'statistics',
  FamilyMode: 'family_mode',
  Widgets: 'widgets',
  Themes: 'themes',
  CloudSync: 'cloud_sync',
  AdvancedReminders: 'advanced_reminders',
  HomeTab: 'tab_home',
  WorshipTab: 'tab_worship',
  LearnTab: 'tab_learn',
  MoreTab: 'tab_more',
};

export function featureIdForScreen(screenName: string): string {
  return SCREEN_TO_FEATURE[screenName] ?? screenName.toLowerCase();
}
