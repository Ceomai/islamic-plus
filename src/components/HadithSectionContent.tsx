import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import {
  fetchHadithSection,
  hadithCollectionName,
  hadithEdition,
  hadithSectionName,
  type HadithCollectionInfo,
  type HadithItem,
  type HadithSection,
} from '../services/hadithApi';
import { addHadithBookmark, removeHadithBookmark, updateHadithLastRead } from '../services/readingProgress';
import { AppText, Button, Chip, IconButton, Surface } from '../ui';

interface Props {
  collection: HadithCollectionInfo;
  section: HadithSection;
}

/** The hadiths of one chapter: loading, error and empty states, Arabic toggle, bookmarks and progress. */
export function HadithSectionContent({ collection, section }: Props) {
  const { settings, hadithProgress, refreshReadingProgress } = useApp();
  const { colors, space } = useTheme();
  const { t, lang } = useTranslation();
  const memberId = settings.activeFamilyMemberId;
  const lastRead = hadithProgress.lastRead;
  const collectionName = hadithCollectionName(collection, lang);

  const [showArabic, setShowArabic] = useState(false);
  const [items, setItems] = useState<HadithItem[]>([]);
  const [arabic, setArabic] = useState<Record<number, string>>({});
  const [arabicFailed, setArabicFailed] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    fetchHadithSection(hadithEdition(collection, lang), section.n)
      .then((list) => {
        if (!alive) return;
        setItems(list);
        setStatus('ready');
      })
      .catch(() => alive && setStatus('error'));
    return () => {
      alive = false;
    };
  }, [collection, section.n, lang, reload]);

  useEffect(() => {
    if (!showArabic) return;
    let alive = true;
    setArabicFailed(false);
    fetchHadithSection(hadithEdition(collection, 'ara'), section.n)
      .then((list) => alive && setArabic(Object.fromEntries(list.map((h) => [h.number, h.text]))))
      .catch(() => alive && setArabicFailed(true));
    return () => {
      alive = false;
    };
  }, [collection, section.n, showArabic]);

  const bookmarked = useMemo(
    () => new Set(hadithProgress.bookmarks.filter((b) => b.collectionId === collection.id).map((b) => b.itemIndex)),
    [hadithProgress.bookmarks, collection.id]
  );

  // Progress is recorded only when the reader actually opens or bookmarks a hadith
  const markRead = async (number: number) => {
    await updateHadithLastRead(memberId, collection.id, collectionName, number);
    await refreshReadingProgress();
  };
  // The bookmark button toggles: a second tap removes the bookmark
  const bookmark = async (number: number, text: string) => {
    if (bookmarked.has(number)) await removeHadithBookmark(memberId, collection.id, number);
    else await addHadithBookmark(memberId, collection.id, collectionName, number, text.slice(0, 40));
    await refreshReadingProgress();
  };

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], marginBottom: space[3] }}>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong" numberOfLines={2}>
            {collection.sections.length > 1 ? `${section.n}. ${hadithSectionName(section, lang)}` : collectionName}
          </AppText>
        </View>
        <Chip label={t('hadith.arabic')} icon="language-outline" selected={showArabic} onPress={() => setShowArabic((v) => !v)} />
      </View>

      {showArabic && arabicFailed && (
        <Surface variant="muted" padding={space[3]} style={{ flexDirection: 'row', gap: space[2], marginBottom: space[3] }}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
          <AppText variant="caption" tone="secondary" style={{ flex: 1 }} accessibilityLiveRegion="polite">
            {t('hadith.arabicError')}
          </AppText>
        </Surface>
      )}

      {status === 'loading' && (
        <ActivityIndicator color={colors.primary} style={{ marginTop: space[6] }} accessibilityLabel={t('common.loading')} />
      )}
      {status === 'error' && (
        <Surface variant="muted" style={{ alignItems: 'center', gap: space[3] }}>
          <AppText tone="secondary" align="center">
            {t('hadith.loadError')}
          </AppText>
          <Button label={t('common.retry')} icon="refresh" variant="secondary" onPress={() => setReload((r) => r + 1)} />
        </Surface>
      )}
      {status === 'ready' && items.length === 0 && (
        <Surface variant="muted" style={{ alignItems: 'center' }}>
          <AppText tone="secondary" align="center">
            {t('hadith.empty')}
          </AppText>
        </Surface>
      )}

      {status === 'ready' &&
        items.map((h) => {
          const marked = bookmarked.has(h.number);
          const isLast = lastRead?.collectionId === collection.id && lastRead.itemIndex === h.number;
          const grade = h.grades[0];
          return (
            <Surface
              key={h.number}
              onPress={() => markRead(h.number)}
              style={{ marginBottom: space[3], borderColor: isLast ? colors.primary : colors.border }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <AppText variant="overline" tone="brand">
                  {collectionName} · {h.number}
                </AppText>
                <IconButton
                  name={marked ? 'bookmark' : 'bookmark-outline'}
                  size={20}
                  onPress={() => bookmark(h.number, h.text)}
                  accessibilityLabel={marked ? t('reading.removeBookmark') : t('reading.bookmark')}
                  accessibilityState={{ selected: marked }}
                  // Keeps the card's text aligned while the touch area stays full size
                  style={{ marginVertical: -space[2], marginRight: -space[2] }}
                />
              </View>
              {showArabic && arabic[h.number] ? (
                <AppText variant="arabicDua" style={{ marginTop: space[2] }}>
                  {arabic[h.number]}
                </AppText>
              ) : null}
              <AppText variant="body" style={{ marginTop: space[2] }}>
                {h.text}
              </AppText>
              {grade ? (
                <AppText variant="caption" tone="muted" style={{ marginTop: space[2] }}>
                  {t('hadith.grade', { grade: grade.grade, by: grade.name })}
                </AppText>
              ) : null}
            </Surface>
          );
        })}
      <AppText variant="caption" tone="muted" style={{ marginTop: space[2] }}>
        {t('hadith.source')}
      </AppText>
    </>
  );
}
