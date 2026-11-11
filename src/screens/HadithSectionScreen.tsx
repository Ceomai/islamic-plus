import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useLayoutEffect } from 'react';
import { HadithSectionContent } from '../components/HadithSectionContent';
import { useTranslation } from '../hooks/useTranslation';
import type { RootStackParamList } from '../navigation/types';
import { HADITH_LIBRARY, hadithCollectionName } from '../services/hadithApi';
import { AppText, Screen } from '../ui';

type Props = NativeStackScreenProps<RootStackParamList, 'HadithSection'>;

/** One chapter of a hadith collection, pushed from the chapter list. */
export function HadithSectionScreen({ navigation, route }: Props) {
  const { collectionId, sectionN } = route.params;
  const { t, lang } = useTranslation();
  const collection = HADITH_LIBRARY.find((c) => c.id === collectionId);
  const section = collection?.sections.find((s) => s.n === sectionN);

  useLayoutEffect(() => {
    if (collection) navigation.setOptions({ title: hadithCollectionName(collection, lang) });
  }, [navigation, collection, lang]);

  return (
    <Screen>
      {collection && section ? (
        <HadithSectionContent collection={collection} section={section} />
      ) : (
        <AppText tone="secondary" align="center">
          {t('hadith.empty')}
        </AppText>
      )}
    </Screen>
  );
}
