import type { AppLanguage, AssistantAction, AssistantTarget } from '../../types';
import type { SurahName } from '../../data/surahs';
import type { AssistantContext, ChatLang, Feature, Text } from './types';

/** Reply templates, one per chat language; {placeholders} are filled by fill() */
export const T = {
  empty: { tr: 'Lütfen bir şey yazın.', en: 'Please type something.', ar: 'من فضلك اكتب سؤالك.', de: 'Bitte schreib etwas.', fr: 'Écris quelque chose, s’il te plaît.' },
  greeting: {
    tr: 'Ve aleyküm selam! Size nasıl yardımcı olabilirim? Bir sure, bir dua ya da bir sayfa isteyebilirsiniz.',
    en: 'Wa alaikum assalam! How can I help? Ask for a surah, a dua or any page in the app.',
    ar: 'وعليكم السلام! كيف أستطيع مساعدتك؟ اطلب سورة أو دعاءً أو أي صفحة في التطبيق.',
    de: 'Wa alaikum assalam! Wie kann ich helfen? Frag nach einer Sure, einem Bittgebet oder einer Seite der App.',
    fr: 'Wa alaykoum salam ! Comment puis-je aider ? Demande une sourate, une invocation ou une page de l’application.',
  },
  help: {
    tr: 'Türkçe, İngilizce, Arapça, Almanca ve Fransızca anlıyorum. Şunları yapabilirim:\n• Sayfa açmak: “Kıbleyi göster”, “Tesbihi aç”\n• Sure açmak: “Yasin suresini aç”, “Âyetü’l-Kürsî”\n• Amaca göre dua bulup açıklamak: “Yolculuk duası”, “Borç için dua”\n• Konu özetlemek: “Orucu bozan şeyler nedir?”\n• Sıradaki namaz vaktini söylemek',
    en: 'I understand English, Turkish, Arabic, German and French. I can:\n• Open pages: “Show qibla”, “Open tasbih”\n• Open surahs: “Open Surah Yasin”, “Ayat al-Kursi”\n• Find and explain duas by purpose: “dua for travel”, “dua for debt”\n• Summarise topics: “What breaks the fast?”\n• Tell you the next prayer time',
    ar: 'أفهم العربية والتركية والإنجليزية والألمانية والفرنسية. أستطيع:\n• فتح الصفحات: «افتح القبلة»\n• فتح السور: «افتح سورة يس»، «آية الكرسي»\n• إيجاد الأدعية وشرحها: «دعاء السفر»، «دعاء قضاء الدين»\n• تلخيص المواضيع: «ما هي مبطلات الصيام؟»\n• إخبارك بموعد الصلاة القادمة',
    de: 'Ich verstehe Deutsch, Türkisch, Englisch, Arabisch und Französisch. Ich kann:\n• Seiten öffnen: „Zeig die Qibla“\n• Suren öffnen: „Öffne Sure Yasin“, „Ayat al-Kursi“\n• Bittgebete finden und erklären: „Bittgebet für die Reise“\n• Themen zusammenfassen: „Was bricht das Fasten?“\n• Dir das nächste Gebet nennen',
    fr: 'Je comprends le français, le turc, l’anglais, l’arabe et l’allemand. Je peux :\n• Ouvrir des pages : « Montre la qibla »\n• Ouvrir des sourates : « Ouvre la sourate Yasin », « Ayat al-Kursi »\n• Trouver et expliquer des invocations : « invocation pour le voyage »\n• Résumer des sujets : « Qu’est-ce qui rompt le jeûne ? »\n• Te donner la prochaine prière',
  },
  opening: { tr: '{name} sayfasını açıyorum.', en: 'Opening {name}.', ar: 'سأفتح صفحة {name}.', de: 'Ich öffne {name}.', fr: 'J’ouvre {name}.' },
  canOpen: { tr: 'Bunun için {name} sayfası var.', en: '{name} is the place for this.', ar: 'يمكنك ذلك من صفحة {name}.', de: 'Dafür gibt es die Seite {name}.', fr: 'La page {name} est faite pour cela.' },
  duaFound: { tr: '“{title}” duasını buldum.', en: 'I found “{title}”.', ar: 'وجدت هذا الدعاء: «{title}»', de: 'Ich habe dieses Bittgebet gefunden: „{title}“.', fr: 'J’ai trouvé cette invocation : « {title} ».' },
  duaGoing: {
    tr: 'Arapçası, okunuşu ve sesi için seni dua sayfasına götürüyorum.',
    en: 'Taking you to the dua page for the Arabic, transliteration and audio.',
    ar: 'سأنقلك إلى صفحة الدعاء لقراءة النص والاستماع إليه.',
    de: 'Ich bringe dich zur Seite mit arabischem Text, Umschrift und Audio.',
    fr: 'Je t’emmène à la page avec le texte arabe, la translittération et l’audio.',
  },
  duaPick: { tr: 'Açmak istediğin duaya dokun.', en: 'Tap a dua to open it.', ar: 'اضغط على الدعاء لفتحه.', de: 'Tippe auf ein Bittgebet, um es zu öffnen.', fr: 'Touche une invocation pour l’ouvrir.' },
  repeat: { tr: '{n} kez okunur.', en: 'Recited {n} times.', ar: 'يُقرأ {n} مرات.', de: 'Wird {n}-mal gesprochen.', fr: 'À réciter {n} fois.' },
  others: { tr: 'Benzer dualar da aşağıda.', en: 'Related duas are below.', ar: 'أدعية مشابهة بالأسفل.', de: 'Ähnliche Bittgebete findest du unten.', fr: 'D’autres invocations sont ci-dessous.' },
  meaningEn: { tr: '', en: '', ar: '(المعنى بالإنجليزية)', de: '(Bedeutung auf Englisch)', fr: '(sens en anglais)' },
  surahOpening: { tr: '{name} suresini açıyorum ({n}. sure).', en: 'Opening Surah {name} (surah {n}).', ar: 'سأفتح سورة {name} (رقم {n}).', de: 'Ich öffne Sure {name} (Nr. {n}).', fr: 'J’ouvre la sourate {name} (n° {n}).' },
  surahOffer: { tr: '{name} suresini mi arıyorsun? ({n}. sure)', en: 'Looking for Surah {name}? (surah {n})', ar: 'هل تبحث عن سورة {name}؟ (رقم {n})', de: 'Suchst du Sure {name}? (Nr. {n})', fr: 'Tu cherches la sourate {name} ? (n° {n})' },
  ayatKursi: {
    tr: 'Âyetü’l-Kürsî, Bakara suresinin 255. ayetidir. Seni o ayete götürüyorum.',
    en: 'Ayat al-Kursi is verse 255 of Al-Baqarah. Taking you there.',
    ar: 'آية الكرسي هي الآية 255 من سورة البقرة. سأنقلك إليها.',
    de: 'Ayat al-Kursi ist Vers 255 der Sure Al-Baqara. Ich bringe dich dorthin.',
    fr: 'Ayat al-Kursi est le verset 255 de la sourate Al-Baqara. Je t’y emmène.',
  },
  topic: { tr: '“{title}” konusunun özeti:', en: 'Summary of “{title}”:', ar: 'ملخص موضوع «{title}»:', de: 'Zusammenfassung von „{title}“:', fr: 'Résumé de « {title} » :' },
  topicMore: { tr: 'Konunun tamamı Öğren sekmesinde.', en: 'The full topic is in Learn.', ar: 'الموضوع كاملاً في قسم «تعلّم» (بالإنجليزية).', de: 'Das ganze Thema steht unter „Lernen“ (auf Englisch).', fr: 'Le sujet complet est dans « Apprendre » (en anglais).' },
  nextPrayer: { tr: 'Sıradaki vakit {name}: {time}.', en: 'Next prayer: {name} at {time}.', ar: 'الصلاة القادمة {name} الساعة {time}.', de: 'Nächstes Gebet: {name} um {time}.', fr: 'Prochaine prière : {name} à {time}.' },
  noLocation: { tr: 'Vakitleri hesaplamak için konum izni gerekiyor; ana sayfadan konumunu paylaşabilirsin.', en: 'I need your location to calculate prayer times; you can share it on Home.', ar: 'أحتاج إلى موقعك لحساب مواقيت الصلاة، يمكنك مشاركته من الصفحة الرئيسية.', de: 'Für die Gebetszeiten brauche ich deinen Standort; du kannst ihn auf der Startseite freigeben.', fr: 'J’ai besoin de ta position pour calculer les horaires ; tu peux la partager sur l’accueil.' },
  fallback: {
    tr: 'Bunu tam anlayamadım. Şöyle deneyebilirsin: “Yasin suresini aç”, “Sınav duası”, “Kıbleyi göster”, “Zekât kimlere farzdır?”. Tüm liste için “yardım” yaz.',
    en: 'I didn’t quite get that. Try: “Open Surah Yasin”, “dua for exams”, “show qibla”, “who must pay zakat?”. Type “help” for everything I can do.',
    ar: 'لم أفهم تماماً. جرّب: «افتح سورة يس»، «دعاء الامتحان»، «افتح القبلة». اكتب «مساعدة» لمعرفة كل ما أستطيع فعله.',
    de: 'Das habe ich nicht ganz verstanden. Versuch: „Öffne Sure Yasin“, „Bittgebet für Prüfung“, „Zeig die Qibla“. Schreib „Hilfe“ für alles, was ich kann.',
    fr: 'Je n’ai pas bien compris. Essaie : « Ouvre la sourate Yasin », « invocation pour l’examen », « montre la qibla ». Écris « aide » pour tout ce que je sais faire.',
  },
  openTopic: { tr: 'Konuyu aç', en: 'Open topic', ar: 'افتح الموضوع', de: 'Thema öffnen', fr: 'Ouvrir le sujet' },
} satisfies Record<string, Text>;

export const fill = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));

/** Content (titles, meanings) exists in tr and en; other chat languages read English. */
export const contentLang = (lang: ChatLang): AppLanguage => (lang === 'tr' ? 'tr' : 'en');

export function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20))}…`;
}

export const featureAction = (f: Feature, lang: ChatLang): AssistantAction => ({ label: f.name[lang], icon: f.icon, target: f.target });

export function surahTarget(s: SurahName, ctx: AssistantContext, lang: ChatLang, startAyah?: number): AssistantTarget {
  const name = lang === 'tr' ? s.tr : lang === 'ar' ? s.ar : s.en;
  return { screen: 'QuranReader', params: { surahNumber: s.number, edition: ctx.quranEdition, surahName: name, ...(startAyah ? { startAyah } : {}) } };
}

export function getAIWelcome(lang: AppLanguage): string {
  return lang === 'tr'
    ? 'Selamün aleyküm! Ben Islamic+ asistanıyım. Bir sayfayı, sureyi ya da amaca uygun bir duayı isteyin; sizi doğrudan oraya götüreyim. Türkçe, İngilizce, Arapça, Almanca ve Fransızca yazabilirsiniz. Kişisel fetva vermem.'
    : 'Assalamu alaikum! I’m the Islamic+ assistant. Ask for a page, a surah or a dua for any purpose and I’ll take you straight there. You can write in English, Turkish, Arabic, German or French. I don’t give personal fatwas.';
}
