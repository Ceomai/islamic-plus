import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import {
  HADITH_LIBRARY,
  fetchHadithSection,
  hadithCollectionName,
  hadithEdition,
  sectionOfHadith,
  type HadithItem,
  type HadithSection,
} from '../services/hadithApi';
import { addHadithBookmark, updateHadithLastRead } from '../services/readingProgress';
import { AppText, Button, Chip, IconBadge, Screen, Surface } from '../ui';

const fold = (s: string) => s.toLocaleLowerCase('tr').replace(/ı/g, 'i');

export function HadithScreen() {
  const { settings, hadithProgress, refreshReadingProgress } = useApp();
  const { colors, radius, space, type } = useTheme();
  const { t, lang } = useTranslation();
  const lastRead = hadithProgress.lastRead;
  const memberId = settings.activeFamilyMemberId;

  const [collectionId, setCollectionId] = useState(
    lastRead && HADITH_LIBRARY.some((c) => c.id === lastRead.collectionId) ? lastRead.collectionId : HADITH_LIBRARY[0].id
  );
  const collection = HADITH_LIBRARY.find((c) => c.id === collectionId) ?? HADITH_LIBRARY[0];
  const collectionName = hadithCollectionName(collection, lang);
  // Single-chapter collections (the forty-hadith books) open straight into their text
  const [section, setSection] = useState<HadithSection | null>(null);
  const [query, setQuery] = useState('');
  const [showArabic, setShowArabic] = useState(false);
  const [items, setItems] = useState<HadithItem[]>([]);
  const [arabic, setArabic] = useState<Record<number, string>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [reload, setReload] = useState(0);

  const openSection = section ?? (collection.sections.length === 1 ? collection.sections[0] : null);

  useEffect(() => {
    if (!openSection) return;
    let alive = true;
    setStatus('loading');
    fetchHadithSection(hadithEdition(collection, lang), openSection.n)
      .then((list) => {
        if (!alive) return;
        setItems(list);
        setStatus('ready');
      })
      .catch(() => alive && setStatus('error'));
    return () => {
      alive = false;
    };
  }, [collection.id, openSection?.n, lang, reload]);

  useEffect(() => {
    if (!openSection || !showArabic) return;
    let alive = true;
    fetchHadithSection(hadithEdition(collection, 'ara'), openSection.n)
      .then((list) => alive && setArabic(Object.fromEntries(list.map((h) => [h.number, h.text]))))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [collection.id, openSection?.n, showArabic]);

  const sections = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return collection.sections;
    return collection.sections.filter((s) => fold(`${s.n} ${s.name}`).includes(q) || String(s.first) === q);
  }, [collection, query]);

  const bookmarked = useMemo(
    () => new Set(hadithProgress.bookmarks.filter((b) => b.collectionId === collection.id).map((b) => b.itemIndex)),
    [hadithProgress.bookmarks, collection.id]
  );

  const chooseCollection = (id: string) => {
    setCollectionId(id);
    setSection(null);
    setQuery('');
    setItems([]);
    setArabic({});
  };

  const resume = () => {
    if (!lastRead) return;
    const c = HADITH_LIBRARY.find((x) => x.id === lastRead.collectionId);
    if (!c) return;
    setCollectionId(c.id);
    setSection(sectionOfHadith(c, lastRead.itemIndex) ?? null);
  };

  // Progress is recorded only when the reader actually opens or bookmarks a hadith
  const markRead = async (number: number) => {
    await updateHadithLastRead(memberId, collection.id, collectionName, number);
    await refreshReadingProgress();
  };
  const bookmark = async (number: number, text: string) => {
    await addHadithBookmark(memberId, collection.id, collectionName, number, text.slice(0, 40));
    await refreshReadingProgress();
  };

  const header = (
    <>
      {settings.sectPreference === 'shia' && (
        <Surface variant="muted" padding={space[3]} style={{ flexDirection: 'row', gap: space[2], marginBottom: space[3] }}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          <AppText variant="caption" tone="secondary" style={{ flex: 1 }}>
            {t('hadith.shiaNote')}
          </AppText>
        </Surface>
      )}

      {lastRead && !openSection && (
        <Surface variant="soft" onPress={resume} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], marginBottom: space[4] }}>
          <IconBadge name="bookmark" />
          <View style={{ flex: 1 }}>
            <AppText variant="caption" tone="brand" style={{ fontWeight: '600' }}>
              {t('reading.continueHadith')}
            </AppText>
            <AppText variant="bodyStrong">
              {lastRead.collectionName} · {lastRead.itemIndex}
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.onPrimarySoft} />
        </Surface>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -space[4], marginBottom: space[3] }}
        contentContainerStyle={{ paddingHorizontal: space[4], gap: space[2] }}
      >
        {HADITH_LIBRARY.map((c) => (
          <Chip key={c.id} label={hadithCollectionName(c, lang)} selected={collection.id === c.id} onPress={() => chooseCollection(c.id)} />
        ))}
      </ScrollView>
    </>
  );

  // ─── Chapter list ───
  if (!openSection) {
    return (
      <Screen>
        {header}
        <AppText variant="caption" tone="secondary" style={{ marginBottom: space[2] }}>
          {t('hadith.collectionInfo', { n: collection.total.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US'), s: String(collection.sections.length) })}
          {lang === 'tr' && !collection.tr ? ` · ${t('hadith.englishOnly')}` : ''}
        </AppText>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: radius.md,
            paddingHorizontal: space[3],
            marginBottom: space[3],
          }}
        >
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('hadith.searchChapters')}
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            style={[type.body, { flex: 1, color: colors.text, paddingVertical: space[3], marginLeft: space[2] }]}
          />
        </View>
        <Surface padding={0} style={{ paddingHorizontal: space[4] }}>
          {sections.map((s, i) => (
            <Pressable
              key={s.n}
              onPress={() => setSection(s)}
              accessibilityRole="button"
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: space[3],
                paddingVertical: space[3],
                borderBottomWidth: i < sections.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <AppText variant="caption" tone="muted" style={{ width: 28 }}>
                {s.n}
              </AppText>
              <View style={{ flex: 1 }}>
                <AppText variant="body">{s.name}</AppText>
                <AppText variant="caption" tone="muted">
                  {t('hadith.range', { a: String(s.first), b: String(s.last) })}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          ))}
        </Surface>
        <AppText variant="caption" tone="muted" style={{ marginTop: space[3] }}>
          {t('hadith.source')}
        </AppText>
      </Screen>
    );
  }

  // ─── Hadiths of one chapter ───
  return (
    <Screen>
      {header}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], marginBottom: space[3] }}>
        {collection.sections.length > 1 && (
          <Pressable onPress={() => setSection(null)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('hadith.chapters')}>
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong" numberOfLines={2}>
            {collection.sections.length > 1 ? `${openSection.n}. ${openSection.name}` : collectionName}
          </AppText>
        </View>
        <Chip label={t('hadith.arabic')} icon="language-outline" selected={showArabic} onPress={() => setShowArabic((v) => !v)} />
      </View>

      {status === 'loading' && <ActivityIndicator color={colors.primary} style={{ marginTop: space[6] }} />}
      {status === 'error' && (
        <Surface variant="muted" style={{ alignItems: 'center', gap: space[3] }}>
          <AppText tone="secondary" align="center">
            {t('hadith.loadError')}
          </AppText>
          <Button label={t('common.retry')} icon="refresh" variant="secondary" onPress={() => setReload((r) => r + 1)} />
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
                <Pressable
                  onPress={() => bookmark(h.number, h.text)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={t('reading.bookmark')}
                  accessibilityState={{ selected: marked }}
                >
                  <Ionicons name={marked ? 'bookmark' : 'bookmark-outline'} size={20} color={colors.primary} />
                </Pressable>
              </View>
              {showArabic && arabic[h.number] ? (
                <AppText style={[type.arabic, { fontSize: 22, lineHeight: 40, textAlign: 'right', marginTop: space[2] }]}>
                  {arabic[h.number]}
                </AppText>
              ) : null}
              <AppText variant="body" style={{ fontSize: 17, lineHeight: 27, marginTop: space[2] }}>
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
    </Screen>
  );
}
