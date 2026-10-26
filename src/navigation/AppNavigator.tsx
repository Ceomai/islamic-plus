import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useNavigationAnalytics } from '../hooks/useNavigationAnalytics';
import { withGuestGate } from '../components/GuestGate';
import { AdvancedRemindersScreen as AdvancedRemindersScreenBase } from '../screens/AdvancedRemindersScreen';
import { AIAssistantScreen as AIAssistantScreenBase } from '../screens/AIAssistantScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { DeleteAccountScreen } from '../screens/DeleteAccountScreen';
import { CloudSyncScreen as CloudSyncScreenBase } from '../screens/CloudSyncScreen';
import { DutiesScreen } from '../screens/DutiesScreen';
import { DuaDetailScreen } from '../screens/DuaDetailScreen';
import { DuasScreen } from '../screens/DuasScreen';
import { EducationDetailScreen } from '../screens/EducationDetailScreen';
import { EducationScreen } from '../screens/EducationScreen';
import { FamilyModeScreen as FamilyModeScreenBase } from '../screens/FamilyModeScreen';
import { HabitsScreen } from '../screens/HabitsScreen';
import { HadithScreen } from '../screens/HadithScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { HomeLauncherEditScreen } from '../screens/HomeLauncherEditScreen';
import { NotificationSettingsScreen } from '../screens/NotificationSettingsScreen';
import { PlacesScreen } from '../screens/PlacesScreen';
import { QiblaScreen } from '../screens/QiblaScreen';
import { QuranReaderScreen } from '../screens/QuranReaderScreen';
import { QuranScreen } from '../screens/QuranScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { StatisticsScreen as StatisticsScreenBase } from '../screens/StatisticsScreen';
import { TasbihScreen } from '../screens/TasbihScreen';
import { ThemesScreen as ThemesScreenBase } from '../screens/ThemesScreen';
import { WidgetsScreen as WidgetsScreenBase } from '../screens/WidgetsScreen';
import type { RootStackParamList } from './types';

// Guest restrictions enforced per screen, not only on the home launcher
const AIAssistantScreen = withGuestGate('ai_assistant', AIAssistantScreenBase);
const CloudSyncScreen = withGuestGate('cloud_sync', CloudSyncScreenBase);
const FamilyModeScreen = withGuestGate('family_mode', FamilyModeScreenBase);
const StatisticsScreen = withGuestGate('statistics', StatisticsScreenBase);
const AdvancedRemindersScreen = withGuestGate('advanced_reminders', AdvancedRemindersScreenBase);
const ThemesScreen = withGuestGate('themes', ThemesScreenBase);
const WidgetsScreen = withGuestGate('widgets', WidgetsScreenBase);

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function LearnStack() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Stack.Navigator screenOptions={{ headerShown: true, headerTintColor: colors.primary }}>
      <Stack.Screen name="Education" component={EducationScreen} options={{ title: t('nav.education') }} />
      <Stack.Screen name="EducationDetail" component={EducationDetailScreen} options={{ title: t('nav.topic') }} />
      <Stack.Screen name="Duas" component={DuasScreen} options={{ title: t('nav.duas') }} />
      <Stack.Screen name="DuaDetail" component={DuaDetailScreen} options={{ title: t('nav.duaDetail') }} />
      <Stack.Screen name="AIAssistant" component={AIAssistantScreen} options={{ title: t('nav.ai') }} />
    </Stack.Navigator>
  );
}

function HomeStack() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const screenOpts = { headerShown: true as const, headerTintColor: colors.primary };
  return (
    <Stack.Navigator screenOptions={screenOpts}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="HomeLauncherEdit" component={HomeLauncherEditScreen} options={{ title: t('home.editLauncher') }} />
      <Stack.Screen name="Quran" component={QuranScreen} options={{ title: t('nav.quran') }} />
      <Stack.Screen name="QuranReader" component={QuranReaderScreen} options={{ title: t('nav.surah') }} />
      <Stack.Screen name="Hadith" component={HadithScreen} options={{ title: t('nav.hadith') }} />
      <Stack.Screen name="Qibla" component={QiblaScreen} options={{ title: t('nav.qibla') }} />
      <Stack.Screen name="Places" component={PlacesScreen} options={{ title: t('nav.nearby') }} />
      <Stack.Screen name="Tasbih" component={TasbihScreen} options={{ title: t('nav.tasbih') }} />
      <Stack.Screen name="Calendar" component={CalendarScreen} options={{ title: t('nav.calendar') }} />
      <Stack.Screen name="Habits" component={HabitsScreen} options={{ title: t('nav.habits') }} />
      <Stack.Screen name="Duties" component={DutiesScreen} options={{ title: t('nav.duties') }} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ title: t('nav.notifications') }} />
      <Stack.Screen name="AdvancedReminders" component={AdvancedRemindersScreen} options={{ title: t('nav.advancedReminders') }} />
      <Stack.Screen name="Statistics" component={StatisticsScreen} options={{ title: t('nav.stats') }} />
      <Stack.Screen name="Duas" component={DuasScreen} options={{ title: t('nav.duas') }} />
      <Stack.Screen name="DuaDetail" component={DuaDetailScreen} options={{ title: t('nav.duaDetail') }} />
      <Stack.Screen name="AIAssistant" component={AIAssistantScreen} options={{ title: t('nav.ai') }} />
      <Stack.Screen name="FamilyMode" component={FamilyModeScreen} options={{ title: t('nav.family') }} />
      <Stack.Screen name="Widgets" component={WidgetsScreen} options={{ title: t('nav.widgets') }} />
      <Stack.Screen name="Themes" component={ThemesScreen} options={{ title: t('nav.themes') }} />
      <Stack.Screen name="CloudSync" component={CloudSyncScreen} options={{ title: t('nav.cloudSync') }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t('nav.settings') }} />
      <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} options={{ title: t('account.deleteTitle') }} />
    </Stack.Navigator>
  );
}

function MoreStack() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const screenOpts = { headerShown: true as const, headerTintColor: colors.primary };
  return (
    <Stack.Navigator screenOptions={screenOpts}>
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t('nav.settings') }} />
      <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} options={{ title: t('account.deleteTitle') }} />
      <Stack.Screen name="Themes" component={ThemesScreen} options={{ title: t('nav.themes') }} />
      <Stack.Screen name="CloudSync" component={CloudSyncScreen} options={{ title: t('nav.cloudSync') }} />
      <Stack.Screen name="FamilyMode" component={FamilyModeScreen} options={{ title: t('nav.family') }} />
      <Stack.Screen name="Widgets" component={WidgetsScreen} options={{ title: t('nav.widgets') }} />
      <Stack.Screen name="AdvancedReminders" component={AdvancedRemindersScreen} options={{ title: t('nav.advancedReminders') }} />
      <Stack.Screen name="AIAssistant" component={AIAssistantScreen} options={{ title: t('nav.ai') }} />
      <Stack.Screen name="Statistics" component={StatisticsScreen} options={{ title: t('nav.stats') }} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ title: t('nav.notifications') }} />
    </Stack.Navigator>
  );
}

export function AppNavigator() {
  const { darkMode } = useApp();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { onNavigationStateChange } = useNavigationAnalytics();
  const navTheme = darkMode
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, primary: colors.accent, background: colors.background, card: colors.surface } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: colors.primary, background: colors.background, card: colors.surface } };

  return (
    <NavigationContainer theme={navTheme} onStateChange={onNavigationStateChange}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: '#888',
          tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.surface },
          tabBarIcon: ({ color, size }) => {
            const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
              HomeTab: 'home',
              WorshipTab: 'moon',
              LearnTab: 'book',
              MoreTab: 'sparkles',
            };
            return <Ionicons name={icons[route.name] ?? 'ellipse'} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="HomeTab" component={HomeStack} options={{ title: t('tabs.home') }} />
        <Tab.Screen
          name="WorshipTab"
          component={QiblaScreen}
          options={{ title: t('tabs.worship'), headerShown: true, headerTintColor: colors.primary }}
        />
        <Tab.Screen name="LearnTab" component={LearnStack} options={{ title: t('tabs.learn') }} />
        <Tab.Screen name="MoreTab" component={MoreStack} options={{ title: t('tabs.more') }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
