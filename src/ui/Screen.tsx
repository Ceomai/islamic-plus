import React from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';

interface Props {
  children: React.ReactNode;
  /** Scrollable content (default) or a fixed view */
  scroll?: boolean;
  /** Apply safe-area insets; screens under a native header only need the bottom edge */
  edges?: Edge[];
  contentStyle?: ViewStyle;
}

/** Standard page: themed background, 16pt gutters, safe area. */
export function Screen({ children, scroll = true, edges = ['bottom'], contentStyle }: Props) {
  const { colors, space } = useTheme();
  const padding: ViewStyle = { paddingHorizontal: space[4], paddingTop: space[4], paddingBottom: space[8] };

  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.background }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[padding, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, padding, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}
