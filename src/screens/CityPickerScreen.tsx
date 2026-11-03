import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { View } from 'react-native';
import { CityPicker } from '../components/CityPicker';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { RootStackParamList } from '../navigation/types';
import { AppText, Button } from '../ui';

type Props = NativeStackScreenProps<RootStackParamList, 'CityPicker'>;

/** Choose the place prayer times are calculated for: the phone's location or a city from the list. */
export function CityPickerScreen({ navigation }: Props) {
  const { location, refreshLocation, setManualLocation } = useApp();
  const { colors, space } = useTheme();
  const { t } = useTranslation();
  const [locating, setLocating] = useState(false);
  const [failed, setFailed] = useState(false);

  const useGps = async () => {
    setLocating(true);
    setFailed(false);
    const ok = await refreshLocation();
    setLocating(false);
    if (ok) navigation.goBack();
    else setFailed(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <CityPicker
        selectedId={location?.cityId}
        onSelect={async (city) => {
          await setManualLocation(city);
          navigation.goBack();
        }}
        header={
          <View style={{ marginBottom: space[4] }}>
            <AppText variant="callout" tone="secondary" style={{ marginBottom: space[3] }}>
              {t('city.intro')}
            </AppText>
            <Button label={t('city.useGps')} icon="navigate" variant="secondary" onPress={useGps} loading={locating} />
            {failed && (
              <AppText variant="caption" tone="danger" style={{ marginTop: space[2] }}>
                {t('city.gpsFailed')}
              </AppText>
            )}
          </View>
        }
      />
    </View>
  );
}
