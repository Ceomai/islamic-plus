import type { Ionicons } from '@expo/vector-icons';
import type { AppLanguage } from '../types';
import { getEducationTopics } from './education';

/**
 * Learn library: Category → Subcategory → Topic → sections of text.
 * Rulings follow the Hanafi school and Diyanet practice common in Türkiye; notable differences
 * between schools are mentioned in the text. Content is educational, not a personal fatwa.
 */
type Text = Record<AppLanguage, string>;

export interface LearnSection {
  heading?: Text;
  text?: Text;
  bullets?: Record<AppLanguage, string[]>;
}

export interface LearnTopic {
  id: string;
  title: Text;
  summary: Text;
  sections: LearnSection[];
  /** Extra search words */
  tags?: Record<AppLanguage, string[]>;
}

export interface LearnSubcategory {
  id: string;
  title: Text;
  topics: LearnTopic[];
}

export interface LearnCategory {
  id: string;
  title: Text;
  icon: keyof typeof Ionicons.glyphMap;
  subcategories: LearnSubcategory[];
}

const L = (tr: string, en: string): Text => ({ tr, en });
const B = (tr: string[], en: string[]) => ({ tr, en });

const CATEGORIES: LearnCategory[] = [
  {
    id: 'faith',
    title: L('İman ve İslam', 'Faith and Islam'),
    icon: 'sparkles-outline',
    subcategories: [
      {
        id: 'faith-basics',
        title: L('Temel esaslar', 'Foundations'),
        topics: [
          {
            id: 'iman-sartlari',
            title: L('İmanın şartları', 'The articles of faith'),
            summary: L('Bir Müslümanın inandığı altı temel esas.', 'The six things every Muslim believes in.'),
            sections: [
              {
                bullets: B(
                  [
                    "Allah'a iman: Allah'ın varlığına, birliğine ve eşi benzeri olmadığına inanmak.",
                    'Meleklere iman: Allah’ın emirlerini yerine getiren, nurdan yaratılmış varlıklara inanmak.',
                    'Kitaplara iman: Tevrat, Zebur, İncil ve Kur’an başta olmak üzere ilahi kitaplara inanmak.',
                    'Peygamberlere iman: Hz. Âdem’den Hz. Muhammed’e kadar bütün peygamberlere inanmak.',
                    'Ahiret gününe iman: Ölümden sonra dirilişe, hesaba, cennet ve cehenneme inanmak.',
                    'Kadere iman: Hayrın ve şerrin Allah’ın ilmi ve takdiriyle olduğuna inanmak.',
                  ],
                  [
                    'Belief in Allah: His existence, oneness and that nothing is like Him.',
                    'Belief in the angels, created from light, who carry out Allah’s commands.',
                    'Belief in the revealed books: the Torah, the Psalms, the Gospel and the Quran.',
                    'Belief in all the prophets, from Adam to Muhammad (peace be upon them).',
                    'Belief in the Last Day: resurrection, judgement, Paradise and Hell.',
                    'Belief in divine decree: that good and evil happen within Allah’s knowledge and will.',
                  ]
                ),
              },
              {
                text: L(
                  'Bu esaslar "Âmentü" olarak bilinen metinde toplanır ve Cibrîl hadisinde Hz. Peygamber tarafından sayılmıştır.',
                  'These articles are summarised in the creed known as "Amantu" and were listed by the Prophet in the Hadith of Jibril.'
                ),
              },
            ],
            tags: { tr: ['amentü', 'akaid', 'inanç'], en: ['creed', 'aqidah', 'belief'] },
          },
          {
            id: 'islamin-sartlari',
            title: L("İslam'ın şartları", 'The pillars of Islam'),
            summary: L('İslam’ın üzerine bina edildiği beş temel ibadet.', 'The five acts of worship Islam is built upon.'),
            sections: [
              {
                bullets: B(
                  [
                    'Kelime-i şehadet getirmek: Allah’tan başka ilah olmadığına ve Muhammed’in O’nun elçisi olduğuna şahitlik etmek.',
                    'Namaz kılmak: Günde beş vakit farz namazı kılmak.',
                    'Oruç tutmak: Ramazan ayında oruç tutmak.',
                    'Zekât vermek: Zengin olan Müslümanın malının belirli bir kısmını ihtiyaç sahiplerine vermesi.',
                    'Hacca gitmek: Gücü yeten kişinin ömründe bir defa Kâbe’yi ziyaret etmesi.',
                  ],
                  [
                    'The testimony of faith: there is no god but Allah and Muhammad is His Messenger.',
                    'Prayer: the five daily obligatory prayers.',
                    'Fasting in the month of Ramadan.',
                    'Zakat: a wealthy Muslim giving a set portion of wealth to those in need.',
                    'Hajj: pilgrimage to the Kaaba once in a lifetime for those able.',
                  ]
                ),
              },
            ],
            tags: { tr: ['beş şart', 'erkân'], en: ['five pillars', 'arkan'] },
          },
        ],
      },
    ],
  },
  {
    id: 'purification',
    title: L('Temizlik (Taharet)', 'Purification (Taharah)'),
    icon: 'water-outline',
    subcategories: [
      {
        id: 'wudu',
        title: L('Abdest', 'Wudu'),
        topics: [
          {
            id: 'abdest-farzlari',
            title: L('Abdestin farzları ve sünnetleri', 'Obligatory and recommended acts of wudu'),
            summary: L('Abdestin geçerli olması için yapılması gerekenler.', 'What must be done for wudu to be valid.'),
            sections: [
              {
                heading: L('Farzları (Hanefi)', 'Obligatory acts (Hanafi)'),
                bullets: B(
                  [
                    'Yüzü bir kere yıkamak (alın saç bitiminden çene altına, iki kulak yumuşağı arasına kadar).',
                    'Kolları dirseklerle birlikte bir kere yıkamak.',
                    'Başın dörtte birini meshetmek.',
                    'Ayakları topuklarla birlikte bir kere yıkamak.',
                  ],
                  [
                    'Washing the face once (from the hairline to below the chin, ear to ear).',
                    'Washing the arms up to and including the elbows once.',
                    'Wiping a quarter of the head.',
                    'Washing the feet up to and including the ankles once.',
                  ]
                ),
              },
              {
                text: L(
                  "Şâfiî mezhebinde bunlara niyet ve tertip (sırayla yapmak) da eklenir; böylece farzlar altıya çıkar.",
                  'In the Shafi’i school, intention and doing the acts in order are also obligatory, making six.'
                ),
              },
              {
                heading: L('Başlıca sünnetleri', 'Main sunnah acts'),
                bullets: B(
                  [
                    'Niyet etmek ve besmele ile başlamak.',
                    'Elleri bileklere kadar yıkamak, ağza ve burna üçer kez su vermek.',
                    'Misvak kullanmak veya dişleri temizlemek.',
                    'Organları üçer kez yıkamak, başın tamamını ve kulakları meshetmek.',
                    'Sırayla ve ara vermeden yapmak, sağdan başlamak.',
                  ],
                  [
                    'Making intention and beginning with Bismillah.',
                    'Washing the hands to the wrists; rinsing the mouth and nose three times each.',
                    'Using a miswak or cleaning the teeth.',
                    'Washing each limb three times; wiping the whole head and the ears.',
                    'Keeping the order without long pauses and starting from the right.',
                  ]
                ),
              },
            ],
            tags: { tr: ['abdest almak', 'mesh'], en: ['ablution', 'wiping'] },
          },
          {
            id: 'abdesti-bozanlar',
            title: L('Abdesti bozan durumlar', 'What breaks wudu'),
            summary: L('Hangi durumlarda abdestin yenilenmesi gerekir?', 'When must wudu be renewed?'),
            sections: [
              {
                bullets: B(
                  [
                    'Ön ve arka yoldan herhangi bir şeyin çıkması (idrar, dışkı, yel vb.).',
                    'Vücudun bir yerinden kan, irin gibi bir akıntının çıkıp yayılması (Hanefi).',
                    'Ağız dolusu kusmak (Hanefi).',
                    'Bayılmak, sarhoş olmak veya aklın gitmesi.',
                    'Yaslanarak ya da uzanarak uyumak.',
                    'Rükûlu ve secdeli bir namazda yanındakilerin duyacağı şekilde gülmek (Hanefi).',
                  ],
                  [
                    'Anything leaving the front or back passage (urine, stool, wind).',
                    'Blood or pus flowing from the body (Hanafi).',
                    'Vomiting a mouthful (Hanafi).',
                    'Fainting, intoxication or losing consciousness.',
                    'Sleeping while lying down or leaning.',
                    'Laughing audibly during a prayer with bowing and prostration (Hanafi).',
                  ]
                ),
              },
              {
                text: L(
                  'Şâfiî mezhebinde kan akması ve kusmak abdesti bozmaz; buna karşılık namahrem bir kadın ile erkeğin tenlerinin doğrudan değmesi abdesti bozar.',
                  'In the Shafi’i school, bleeding and vomiting do not break wudu, while direct skin contact between a man and a non-mahram woman does.'
                ),
              },
            ],
          },
        ],
      },
      {
        id: 'ghusl-tayammum',
        title: L('Gusül ve teyemmüm', 'Ghusl and tayammum'),
        topics: [
          {
            id: 'gusul',
            title: L('Gusül (boy abdesti)', 'Ghusl (full bath)'),
            summary: L('Gusül ne zaman gerekir ve nasıl alınır?', 'When ghusl is required and how it is done.'),
            sections: [
              {
                heading: L('Gerektiren durumlar', 'When it is required'),
                bullets: B(
                  ['Cünüplük (cinsel ilişki veya ihtilam).', 'Kadınlarda hayız (adet) ve lohusalığın sona ermesi.'],
                  ['Major ritual impurity (intercourse or a wet dream).', 'The end of menstruation and post-natal bleeding.']
                ),
              },
              {
                heading: L('Farzları (Hanefi)', 'Obligatory acts (Hanafi)'),
                bullets: B(
                  ['Ağza bol su vermek.', 'Burna su vermek.', 'Bütün bedeni kuru yer kalmayacak şekilde yıkamak.'],
                  ['Rinsing the mouth thoroughly.', 'Rinsing the nose.', 'Washing the whole body so that no part stays dry.']
                ),
              },
              {
                text: L(
                  'Şâfiî ve Mâlikî mezheplerinde ağız ve burna su vermek sünnettir; niyet ise farzdır.',
                  'In the Shafi’i and Maliki schools, rinsing the mouth and nose is sunnah while the intention is obligatory.'
                ),
              },
            ],
            tags: { tr: ['boy abdesti', 'cünüp'], en: ['bath', 'janabah'] },
          },
          {
            id: 'teyemmum',
            title: L('Teyemmüm', 'Tayammum (dry ablution)'),
            summary: L('Su bulunamadığında veya kullanılamadığında temizlenme.', 'Purification when water is unavailable or cannot be used.'),
            sections: [
              {
                text: L(
                  'Su bulunmaması, suyun sağlığa zarar vermesi gibi durumlarda abdest ve gusül yerine teyemmüm yapılır. Toprak veya toprak cinsinden temiz bir yüzey kullanılır.',
                  'When there is no water or using it would harm one’s health, tayammum replaces wudu and ghusl. Clean earth or an earth-like surface is used.'
                ),
              },
              {
                heading: L('Yapılışı', 'How it is done'),
                bullets: B(
                  [
                    'Abdest ya da gusül yerine teyemmüme niyet edilir.',
                    'Eller temiz toprağa vurulup silkelenir ve yüz meshedilir.',
                    'Eller tekrar toprağa vurulur ve kollar dirseklerle birlikte meshedilir.',
                  ],
                  [
                    'Intend tayammum in place of wudu or ghusl.',
                    'Strike the hands on clean earth, shake them and wipe the face.',
                    'Strike again and wipe the arms up to the elbows.',
                  ]
                ),
              },
              {
                text: L('Suyu bulunca veya kullanma engeli kalkınca teyemmüm bozulur.', 'Tayammum ends once water is found or the obstacle to using it is gone.'),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'prayer',
    title: L('Namaz', 'Prayer (Salah)'),
    icon: 'moon-outline',
    subcategories: [
      {
        id: 'prayer-basics',
        title: L('Namazın esasları', 'Essentials of prayer'),
        topics: [
          {
            id: 'namazin-farzlari',
            title: L('Namazın farzları', 'Obligatory parts of prayer'),
            summary: L('Namazın dışındaki 6 şart ve içindeki 6 rükün.', 'The six conditions and six pillars of prayer.'),
            sections: [
              {
                heading: L('Şartları (namazın dışındaki farzlar)', 'Conditions (before prayer)'),
                bullets: B(
                  [
                    'Hadesten taharet: Abdestli olmak, gerekiyorsa gusletmiş olmak.',
                    'Necasetten taharet: Beden, elbise ve namaz kılınan yerin temiz olması.',
                    'Setr-i avret: Örtülmesi gereken yerlerin örtülmesi.',
                    'İstikbal-i kıble: Kıbleye yönelmek.',
                    'Vakit: Namazı vaktinde kılmak.',
                    'Niyet: Hangi namazı kıldığını kalben bilmek.',
                  ],
                  [
                    'Being in a state of wudu (and ghusl if needed).',
                    'Cleanliness of body, clothing and place of prayer.',
                    'Covering the body as required.',
                    'Facing the qibla.',
                    'Praying within the prayer’s time.',
                    'Intention: knowing in the heart which prayer one is offering.',
                  ]
                ),
              },
              {
                heading: L('Rükünleri (namazın içindeki farzlar)', 'Pillars (within prayer)'),
                bullets: B(
                  [
                    'İftitah tekbiri: "Allâhu ekber" diyerek namaza başlamak.',
                    'Kıyam: Gücü yetenin ayakta durması.',
                    "Kıraat: Kur'an'dan bir miktar okumak.",
                    'Rükû: Eğilmek.',
                    'Sücud: Secdeye varmak.',
                    "Ka'de-i âhîre: Son oturuşta Tahiyyât okuyacak kadar oturmak.",
                  ],
                  [
                    'The opening takbir ("Allahu akbar").',
                    'Standing, for those able.',
                    'Recitation from the Quran.',
                    'Bowing (ruku’).',
                    'Prostration (sujud).',
                    'The final sitting long enough to recite the Tashahhud.',
                  ]
                ),
              },
            ],
            tags: { tr: ['12 farz', 'rükün', 'şart'], en: ['pillars', 'conditions'] },
          },
          {
            id: 'vakit-rekatlar',
            title: L('Beş vakit namaz ve rekâtları', 'The five prayers and their units'),
            summary: L('Her vaktin sünnet, farz ve vacip rekât sayıları (Hanefi).', 'Sunnah, fard and wajib units for each prayer (Hanafi).'),
            sections: [
              {
                bullets: B(
                  [
                    'Sabah: 2 rekât sünnet, 2 rekât farz.',
                    'Öğle: 4 rekât ilk sünnet, 4 rekât farz, 2 rekât son sünnet.',
                    'İkindi: 4 rekât sünnet, 4 rekât farz.',
                    'Akşam: 3 rekât farz, 2 rekât sünnet.',
                    'Yatsı: 4 rekât ilk sünnet, 4 rekât farz, 2 rekât son sünnet, 3 rekât vitir.',
                  ],
                  [
                    'Fajr: 2 sunnah, 2 fard.',
                    'Dhuhr: 4 sunnah before, 4 fard, 2 sunnah after.',
                    'Asr: 4 sunnah, 4 fard.',
                    'Maghrib: 3 fard, 2 sunnah.',
                    'Isha: 4 sunnah before, 4 fard, 2 sunnah after, 3 witr.',
                  ]
                ),
              },
              {
                text: L(
                  'Vitir namazı Hanefi mezhebinde vacip, diğer mezheplerde sünnettir. İkindi ve yatsının ilk sünnetleri gayr-i müekkede sünnettir.',
                  'Witr is wajib in the Hanafi school and sunnah in the others. The sunnah before Asr and Isha is non-emphasised.'
                ),
              },
            ],
            tags: { tr: ['rekat', 'vitir', 'sünnet'], en: ['rakat', 'witr', 'sunnah'] },
          },
        ],
      },
      {
        id: 'special-prayers',
        title: L('Özel namazlar', 'Special prayers'),
        topics: [
          {
            id: 'cuma-namazi',
            title: L('Cuma namazı', 'Friday prayer (Jumu’ah)'),
            summary: L('Kimlere farzdır ve nasıl kılınır?', 'Who must attend and how it is prayed.'),
            sections: [
              {
                text: L(
                  'Cuma namazı; hür, akıllı, ergen, mukim ve sağlıklı Müslüman erkeklere farzdır. Öğle vaktinde, hutbeyle birlikte cemaatle kılınır ve o günün öğle namazının yerine geçer.',
                  'Friday prayer is obligatory on free, sane, adult, resident and healthy Muslim men. It is prayed in congregation at Dhuhr time with a sermon and replaces that day’s Dhuhr.'
                ),
              },
              {
                heading: L('Türkiye’deki uygulama', 'Practice in Türkiye'),
                bullets: B(
                  ['4 rekât ilk sünnet', 'Hutbe', '2 rekât farz (cemaatle)', '4 rekât son sünnet'],
                  ['4 units of sunnah before', 'The sermon (khutbah)', '2 units of fard in congregation', '4 units of sunnah after']
                ),
              },
            ],
          },
          {
            id: 'bayram-namazi',
            title: L('Bayram namazı', 'Eid prayer'),
            summary: L('Ramazan ve Kurban bayramlarında kılınan namaz.', 'The prayer of Eid al-Fitr and Eid al-Adha.'),
            sections: [
              {
                text: L(
                  'Bayram namazı Hanefi mezhebinde vacip, diğer mezheplerde sünnettir. Güneş doğup kerahat vakti çıktıktan sonra iki rekât olarak cemaatle kılınır ve hutbe namazdan sonra okunur.',
                  'Eid prayer is wajib in the Hanafi school and sunnah in others. It is two units prayed in congregation after sunrise, with the sermon after the prayer.'
                ),
              },
              {
                text: L(
                  "Her rekâtta fazladan üçer tekbir (zevâid tekbirleri) alınır. Kurban Bayramı'nda arefe sabahından bayramın dördüncü günü ikindiye kadar farz namazların ardından teşrik tekbiri getirilir.",
                  'Three extra takbirs are said in each unit. During Eid al-Adha, the tashriq takbir is said after each obligatory prayer from the dawn of Arafah until Asr on the fourth day.'
                ),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ramadan',
    title: L('Ramazan', 'Ramadan'),
    icon: 'moon',
    subcategories: [
      {
        id: 'fasting',
        title: L('Oruç', 'Fasting'),
        topics: [
          {
            id: 'orucun-farziyeti',
            title: L('Orucun farz oluşu ve niyet', 'The obligation of fasting and intention'),
            summary: L('Oruç kimlere farzdır, niyet ne zaman yapılır?', 'Who must fast and when to make the intention.'),
            sections: [
              {
                text: L(
                  'Ramazan orucu, akıllı ve ergenlik çağına girmiş her Müslümana farzdır (Bakara 2:183-185). Oruç; imsak vaktinden iftar vaktine kadar yemek, içmek ve cinsel ilişkiden uzak durmaktır.',
                  'Fasting Ramadan is obligatory for every sane adult Muslim (Quran 2:183-185). It means abstaining from food, drink and marital relations from dawn (imsak) until sunset (iftar).'
                ),
              },
              {
                heading: L('Niyet', 'Intention'),
                text: L(
                  'Niyet kalple yapılır; sahura kalkmak da niyet yerine geçer. Hanefi mezhebinde Ramazan orucuna gece veya ertesi gün öğleden önceki belirli vakte (dahve-i kübra) kadar niyet edilebilir. Şâfiî mezhebinde niyetin geceden yapılması gerekir.',
                  'The intention is in the heart; getting up for suhoor counts as intention. In the Hanafi school, one may intend at night or the next morning until before midday (dahwa al-kubra). The Shafi’i school requires the intention at night.'
                ),
              },
            ],
            tags: { tr: ['ramazan orucu', 'imsak', 'iftar', 'niyet'], en: ['sawm', 'imsak', 'iftar'] },
          },
          {
            id: 'orucu-bozanlar',
            title: L('Orucu bozan ve bozmayan durumlar', 'What breaks and doesn’t break the fast'),
            summary: L('Kaza ve kefaret gerektiren durumlar.', 'Cases that require making up or expiation.'),
            sections: [
              {
                heading: L('Bozan ve kaza gerektirenler', 'Breaks the fast; make-up required'),
                bullets: B(
                  [
                    'Ağız dolusu kasten kusmak.',
                    'Abdest alırken istemeden boğaza su kaçması.',
                    'İftar vakti girdi sanıp vakit girmeden yemek.',
                    'Besleyici olmayan bir şeyi (taş, kâğıt vb.) yutmak.',
                  ],
                  [
                    'Deliberately vomiting a mouthful.',
                    'Water accidentally going down the throat during wudu.',
                    'Eating before sunset while thinking it had come.',
                    'Swallowing something non-nutritive (a stone, paper, etc.).',
                  ]
                ),
              },
              {
                heading: L('Hem kaza hem kefaret gerektirenler (Hanefi)', 'Make-up and expiation (Hanafi)'),
                text: L(
                  'Ramazan orucunu meşru bir mazeret olmadan kasten yemek, içmek veya cinsel ilişki ile bozmak. Kefaret, kesintisiz altmış gün oruç tutmaktır; buna gücü yetmeyen altmış fakiri doyurur. Şâfiî mezhebinde kefaret yalnızca cinsel ilişki ile bozmada gerekir.',
                  'Deliberately breaking a Ramadan fast by eating, drinking or intercourse without valid excuse. The expiation is sixty consecutive days of fasting, or feeding sixty poor people if unable. In the Shafi’i school, expiation applies only to intercourse.'
                ),
              },
              {
                heading: L('Bozmayanlar', 'Does not break the fast'),
                bullets: B(
                  [
                    'Unutarak yemek veya içmek (hatırlayınca hemen bırakılır).',
                    'Elde olmadan kusmak.',
                    'Diş fırçalamak (su ve macun yutulmamak kaydıyla), misvak kullanmak.',
                    "Diyanet'e göre besleyici olmayan iğne ve aşılar.",
                  ],
                  [
                    'Eating or drinking forgetfully (stop as soon as you remember).',
                    'Vomiting involuntarily.',
                    'Brushing the teeth without swallowing; using a miswak.',
                    'According to Diyanet, non-nutritive injections and vaccines.',
                  ]
                ),
              },
            ],
            tags: { tr: ['kaza', 'kefaret', 'bozar mı'], en: ['qada', 'kaffarah'] },
          },
          {
            id: 'oruc-tutamayanlar',
            title: L('Oruç tutamayanlar: kaza ve fidye', 'Those unable to fast: make-up and fidya'),
            summary: L('Hasta, yolcu, hamile ve yaşlılar için ruhsatlar.', 'Concessions for the sick, travellers, the pregnant and the elderly.'),
            sections: [
              {
                text: L(
                  'Hasta ve yolcu olanlar oruç tutmayabilir; tutamadıkları günleri sonra kaza ederler (Bakara 2:184-185). Hamile ve emziren kadınlar da kendilerine veya çocuklarına zarar gelmesinden korkarlarsa oruç tutmayıp sonra kaza ederler.',
                  'The sick and travellers may skip fasting and make up the days later (Quran 2:184-185). Pregnant and nursing women who fear harm to themselves or the child may do the same.'
                ),
              },
              {
                heading: L('Fidye', 'Fidya'),
                text: L(
                  'İyileşme ümidi olmayan hastalar ve oruca gücü yetmeyen yaşlılar, tutamadıkları her gün için bir fakiri doyuracak miktarda fidye verirler. Miktar her yıl fitre ile birlikte Diyanet tarafından açıklanır.',
                  'Those with a chronic illness with no hope of recovery and the very elderly pay fidya: feeding one poor person for each missed day. Diyanet announces the amount each year alongside fitra.'
                ),
              },
            ],
            tags: { tr: ['hasta', 'yolcu', 'hamile', 'yaşlı', 'fidye'], en: ['sick', 'travel', 'pregnant', 'elderly'] },
          },
          {
            id: 'sahur-iftar',
            title: L('Sahur ve iftar adabı', 'Suhoor and iftar etiquette'),
            summary: L('Sünnete uygun sahur ve iftar.', 'Suhoor and iftar according to the Sunnah.'),
            sections: [
              {
                bullets: B(
                  [
                    'Sahura kalkmak sünnettir; Hz. Peygamber sahurda bereket olduğunu bildirmiştir.',
                    'Sahuru imsak vaktine yakın yapmak, iftarı ise vakit girince geciktirmeden açmak sünnettir.',
                    'İftarı hurma ile, bulunmazsa su ile açmak tavsiye edilir.',
                    'İftarda dua etmek; "Zehebe’z-zameü..." duası bunlardandır (Dualar bölümüne bakın).',
                  ],
                  [
                    'Eating suhoor is sunnah; the Prophet said there is blessing in it.',
                    'Delay suhoor until close to imsak and break the fast promptly at sunset.',
                    'Break the fast with dates, or water if none are available.',
                    'Make dua at iftar, such as "Dhahaba’z-zama’u..." (see Duas).',
                  ]
                ),
              },
            ],
          },
        ],
      },
      {
        id: 'ramadan-worship',
        title: L('Ramazan ibadetleri', 'Ramadan worship'),
        topics: [
          {
            id: 'teravih',
            title: L('Teravih namazı', 'Tarawih prayer'),
            summary: L('Ramazan gecelerinde yatsıdan sonra kılınan namaz.', 'The night prayer after Isha in Ramadan.'),
            sections: [
              {
                text: L(
                  'Teravih, Ramazan ayına özgü, yatsı namazından sonra ve vitirden önce kılınan bir namazdır. Hanefi mezhebinde 20 rekât olup sünnet-i müekkededir ve genellikle iki ya da dört rekâtta bir selam verilerek kılınır. Bazı âlimler sekiz rekât olarak kılınabileceğini de belirtmiştir.',
                  'Tarawih is a prayer particular to Ramadan, prayed after Isha and before witr. In the Hanafi school it is 20 units and an emphasised sunnah, usually prayed in sets of two or four. Some scholars also accept eight units.'
                ),
              },
            ],
          },
          {
            id: 'kadir-itikaf',
            title: L('Kadir Gecesi ve itikâf', 'Laylat al-Qadr and i’tikaf'),
            summary: L('Bin aydan hayırlı gece ve son on günün ibadeti.', 'The night better than a thousand months and the last ten days.'),
            sections: [
              {
                text: L(
                  "Kur'an'ın indirilmeye başlandığı Kadir Gecesi bin aydan hayırlıdır (Kadr Suresi). Hz. Peygamber bu geceyi Ramazan'ın son on gecesinde, özellikle tek gecelerde aramayı tavsiye etmiştir. Türkiye'de 27. gece Kadir Gecesi olarak ihya edilir.",
                  'Laylat al-Qadr, when the Quran began to be revealed, is better than a thousand months (Surah al-Qadr). The Prophet advised seeking it in the last ten nights of Ramadan, especially the odd nights. In Türkiye the 27th night is observed.'
                ),
              },
              {
                heading: L('İtikâf', 'I’tikaf'),
                text: L(
                  "İtikâf, ibadet niyetiyle mescitte kalmaktır. Ramazan'ın son on gününde yapılan itikâf Hanefi mezhebinde sünnet-i kifâyedir.",
                  'I’tikaf is staying in the mosque with the intention of worship. In the Hanafi school, i’tikaf in the last ten days of Ramadan is a communal sunnah.'
                ),
              },
            ],
          },
        ],
      },
      {
        id: 'fitr',
        title: L('Fitre (Fıtır sadakası)', 'Zakat al-Fitr'),
        topics: [
          {
            id: 'fitre',
            title: L('Fitre kimlere vaciptir?', 'Who must pay zakat al-fitr?'),
            summary: L('Bayramdan önce verilen sadaka.', 'The charity given before Eid.'),
            sections: [
              {
                text: L(
                  "Hanefi mezhebinde temel ihtiyaçlarından fazla nisab miktarı mala sahip olan Müslümanın kendisi ve velayeti altındaki küçük çocukları için fitre vermesi vaciptir. Zekâttan farklı olarak üzerinden bir yıl geçmesi şartı yoktur. Şâfiî mezhebinde bayram günü kendisinin ve bakmakla yükümlü olduklarının bir günlük yiyeceğinden fazlası olan herkes fitre verir.",
                  'In the Hanafi school, a Muslim who owns wealth above the nisab beyond basic needs must pay fitra for themselves and their minor children; unlike zakat, a full year is not required. In the Shafi’i school, anyone with more than a day’s food for their household on Eid pays it.'
                ),
              },
              {
                text: L(
                  "Fitrenin bayram namazından önce verilmesi sünnettir; Ramazan'ın içinde verilmesi de caizdir. Zekât verilebilen kimselere verilir. Miktarı her yıl Diyanet tarafından açıklanır.",
                  'It is sunnah to give fitra before the Eid prayer, and giving it during Ramadan is permitted. It goes to those eligible for zakat. Diyanet announces the amount each year.'
                ),
              },
            ],
            tags: { tr: ['fıtır', 'sadaka-i fıtır', 'bayram'], en: ['fitra', 'fitrana', 'eid'] },
          },
        ],
      },
    ],
  },
  {
    id: 'charity',
    title: L('Zekât, sadaka ve kurban', 'Zakat, charity and sacrifice'),
    icon: 'gift-outline',
    subcategories: [
      {
        id: 'zakat',
        title: L('Zekât', 'Zakat'),
        topics: [
          {
            id: 'zekat-kimlere-farz',
            title: L('Zekât kimlere farzdır?', 'Who must pay zakat?'),
            summary: L('Nisab, havl ve zekâta tabi mallar.', 'Nisab, the lunar year and zakatable wealth.'),
            sections: [
              {
                text: L(
                  'Akıllı, ergen, hür ve temel ihtiyaçlarından ve borcundan fazla nisab miktarı mala sahip olan Müslümana, bu mal üzerinden bir kameri yıl geçince zekât farz olur. Oran malın kırkta biridir (%2,5).',
                  'Zakat is obligatory on a sane, adult, free Muslim who owns wealth above the nisab beyond basic needs and debts, once a lunar year has passed over it. The rate is one fortieth (2.5%).'
                ),
              },
              {
                heading: L('Nisab', 'Nisab'),
                text: L(
                  'Nisab, altın için 20 miskal, gümüş için 200 dirhemdir. Diyanet altın nisabını 80,18 gram olarak esas alır; bazı çağdaş kurumlar 85 gram kullanır. Uygulamadaki zekât hesaplayıcı Diyanet (80,18 g), 85 g altın ve 595 g gümüş seçeneklerini sunar.',
                  'The nisab is 20 mithqal of gold or 200 dirhams of silver. Diyanet uses 80.18 g of gold; some contemporary bodies use 85 g. The in-app calculator offers Diyanet (80.18 g), 85 g gold and 595 g silver.'
                ),
              },
              {
                heading: L('Zekâta tabi mallar', 'Zakatable wealth'),
                bullets: B(
                  ['Nakit para ve banka hesapları', 'Altın ve gümüş', 'Ticaret malları', 'Belirli şartlarla büyükbaş ve küçükbaş hayvanlar', 'Toprak ürünleri (öşür: %10 veya sulama masraflıysa %5)'],
                  ['Cash and bank balances', 'Gold and silver', 'Trade goods', 'Livestock under certain conditions', 'Crops (ushr: 10%, or 5% when irrigated at cost)']
                ),
              },
            ],
            tags: { tr: ['nisab', 'havl', 'kırkta bir'], en: ['nisab', 'hawl'] },
          },
          {
            id: 'zekat-verilecekler',
            title: L('Zekât kimlere verilir?', 'Who can receive zakat?'),
            summary: L('Tevbe Suresi 60. ayette sayılan sekiz sınıf.', 'The eight categories in Quran 9:60.'),
            sections: [
              {
                bullets: B(
                  [
                    'Fakirler: Nisab miktarı malı olmayanlar.',
                    'Miskinler: Hiçbir şeyi olmayan yoksullar.',
                    'Zekât toplamakla görevli olanlar.',
                    'Kalpleri İslam’a ısındırılmak istenenler (müellefe-i kulûb).',
                    'Esaretten kurtulmak isteyenler.',
                    'Borçlular.',
                    'Allah yolunda olanlar.',
                    'Yolda kalmışlar.',
                  ],
                  [
                    'The poor (below the nisab).',
                    'The destitute.',
                    'Those employed to collect zakat.',
                    'Those whose hearts are to be reconciled.',
                    'Those seeking freedom from bondage.',
                    'Those in debt.',
                    'In the cause of Allah.',
                    'The stranded traveller.',
                  ]
                ),
              },
              {
                heading: L('Verilemeyenler', 'Who cannot receive it'),
                text: L(
                  'Kişinin kendi anne-babası, dedeleri ve nineleri, çocukları ve torunları ile eşine zekât verilmez; çünkü bunların nafakası zaten kişiye aittir. Zenginlere de zekât verilmez. Kardeşlere, amcalara, teyzelere ihtiyaç sahibiyse zekât verilebilir.',
                  'Zakat may not be given to one’s parents, grandparents, children, grandchildren or spouse, whose support is already one’s duty, nor to the wealthy. Siblings, uncles and aunts in need may receive it.'
                ),
              },
            ],
          },
        ],
      },
      {
        id: 'sadaqa',
        title: L('Sadaka', 'Sadaqah'),
        topics: [
          {
            id: 'sadaka-cesitleri',
            title: L('Sadaka ve sadaka-i câriye', 'Charity and ongoing charity'),
            summary: L('Gönüllü iyilik ve sevabı süren hayırlar.', 'Voluntary giving and charity whose reward continues.'),
            sections: [
              {
                text: L(
                  'Sadaka, Allah rızası için gönüllü olarak yapılan her türlü iyiliktir; yalnızca para değil, güler yüz, yardım ve faydalı söz de sadakadır.',
                  'Sadaqah is any voluntary good done for Allah’s sake; not only money but a smile, help and a kind word are charity too.'
                ),
              },
              {
                text: L(
                  'Hz. Peygamber, insan öldüğünde amelinin kesildiğini, ancak üç şeyin devam ettiğini bildirmiştir: sadaka-i câriye (cami, çeşme, okul gibi kalıcı hayırlar), faydalanılan ilim ve kendisine dua eden hayırlı evlat (Müslim).',
                  'The Prophet said that when a person dies their deeds end except three: ongoing charity (a mosque, well or school), beneficial knowledge, and a righteous child who prays for them (Muslim).'
                ),
              },
            ],
          },
        ],
      },
      {
        id: 'qurban',
        title: L('Kurban', 'Sacrifice (Qurban)'),
        topics: [
          {
            id: 'kurban',
            title: L('Kurban kimlere vaciptir ve şartları', 'Who must offer qurban and its conditions'),
            summary: L('Kurban Bayramı’nda kesilen kurbanla ilgili temel bilgiler.', 'Basics of the Eid al-Adha sacrifice.'),
            sections: [
              {
                text: L(
                  'Hanefi mezhebinde kurban; akıllı, ergen, mukim ve temel ihtiyaçlarından fazla nisab miktarı mala sahip Müslümana vaciptir. Diğer mezheplerde sünnet-i müekkededir.',
                  'In the Hanafi school, qurban is wajib on a sane, adult, resident Muslim who owns wealth above the nisab beyond basic needs. In other schools it is an emphasised sunnah.'
                ),
              },
              {
                heading: L('Kesim zamanı', 'Time'),
                text: L('Bayramın birinci günü bayram namazından sonra başlar, üçüncü günün akşamına kadar sürer.', 'From after the Eid prayer on the first day until sunset on the third day.'),
              },
              {
                heading: L('Hayvanlar ve yaşları', 'Animals and ages'),
                bullets: B(
                  [
                    'Koyun ve keçi: Bir yaşını doldurmuş olmalı (altı ayını doldurmuş, bir yaşındaki kadar iri koyun da olur).',
                    'Sığır ve manda: İki yaşını doldurmuş olmalı.',
                    'Deve: Beş yaşını doldurmuş olmalı.',
                    'Sığır ve deveye yedi kişiye kadar ortak olunabilir; koyun ve keçi tek kişiliktir.',
                  ],
                  [
                    'Sheep and goats: at least one year old (a large sheep of six months is also accepted).',
                    'Cattle and buffalo: at least two years old.',
                    'Camels: at least five years old.',
                    'Up to seven people may share a cow or camel; a sheep or goat counts for one.',
                  ]
                ),
              },
            ],
            tags: { tr: ['kurban bayramı', 'udhiye', 'hisse'], en: ['udhiyah', 'eid al-adha', 'share'] },
          },
        ],
      },
    ],
  },
  {
    id: 'hajj',
    title: L('Hac ve umre', 'Hajj and Umrah'),
    icon: 'navigate-outline',
    subcategories: [
      {
        id: 'hajj-basics',
        title: L('Hac', 'Hajj'),
        topics: [
          {
            id: 'hac-farzlari',
            title: L('Haccın farziyeti ve farzları', 'The obligation and pillars of Hajj'),
            summary: L('Ömürde bir defa, gücü yetene.', 'Once in a lifetime for those able.'),
            sections: [
              {
                text: L(
                  'Hac; akıllı, ergen, hür, sağlıklı ve yolculuk masraflarını karşılayacak maddi imkâna sahip Müslümana ömründe bir defa farzdır (Âl-i İmrân 3:97).',
                  'Hajj is obligatory once in a lifetime on a sane, adult, free, healthy Muslim who can afford the journey (Quran 3:97).'
                ),
              },
              {
                heading: L('Farzları (Hanefi)', 'Pillars (Hanafi)'),
                bullets: B(
                  ['İhram (şart)', "Arafat'ta vakfe", 'Ziyaret tavafı'],
                  ['Ihram (condition)', 'Standing at Arafat', 'Tawaf al-ziyarah']
                ),
              },
              {
                text: L(
                  "Müzdelife'de vakfe, Safa ile Merve arasında sa'y, şeytan taşlama ve tıraş olmak haccın vaciplerindendir.",
                  'Staying at Muzdalifah, sa’y between Safa and Marwa, stoning the pillars and shaving or trimming the hair are among its wajib acts.'
                ),
              },
            ],
          },
          {
            id: 'umre',
            title: L('Umre', 'Umrah'),
            summary: L('Yılın her zamanı yapılabilen ziyaret.', 'The visit that can be made at any time of year.'),
            sections: [
              {
                text: L(
                  "Umre; ihrama girip Kâbe'yi tavaf etmek, Safa ile Merve arasında sa'y yapmak ve tıraş olup ihramdan çıkmaktan oluşur. Hanefi mezhebinde ömürde bir defa yapılması sünnet-i müekkededir; Şâfiî ve Hanbelî mezheplerinde farzdır. Arefe günü ve bayram günlerinde umre yapmak mekruhtur.",
                  'Umrah consists of entering ihram, circling the Kaaba (tawaf), walking between Safa and Marwa (sa’y) and shaving or trimming the hair. It is an emphasised sunnah once in a lifetime in the Hanafi school and obligatory in the Shafi’i and Hanbali schools. It is disliked on the day of Arafah and the days of Eid al-Adha.'
                ),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'quran-sunnah',
    title: L("Kur'an ve sünnet", 'Quran and Sunnah'),
    icon: 'book-outline',
    subcategories: [
      {
        id: 'quran-info',
        title: L("Kur'an-ı Kerim", 'The Quran'),
        topics: [
          {
            id: 'kuran-genel',
            title: L("Kur'an hakkında temel bilgiler", 'Basic facts about the Quran'),
            summary: L('Sure, ayet, cüz ve iniş süreci.', 'Surahs, ayahs, juz and revelation.'),
            sections: [
              {
                bullets: B(
                  [
                    "Kur'an, Hz. Muhammed'e yaklaşık 23 yılda Cebrâil aracılığıyla indirilmiştir.",
                    'İlk inen ayetler Alak Suresi’nin ilk beş ayetidir.',
                    '114 sure ve yaygın Kûfe sayımına göre 6236 ayetten oluşur; 30 cüze ayrılır.',
                    "Hicretten önce inen surelere Mekkî, sonra inenlere Medenî denir.",
                    "Hz. Ebû Bekir döneminde tek mushafta toplanmış, Hz. Osman döneminde çoğaltılmıştır.",
                  ],
                  [
                    'The Quran was revealed to Muhammad through Jibril over about 23 years.',
                    'The first verses revealed were the opening five of Surah al-Alaq.',
                    'It has 114 surahs and, by the common Kufan count, 6236 ayahs, divided into 30 juz.',
                    'Surahs revealed before the Hijrah are Makki; those after are Madani.',
                    'It was compiled into one volume under Abu Bakr and copies were distributed under Uthman.',
                  ]
                ),
              },
            ],
          },
          {
            id: 'tecvid-temel',
            title: L('Tecvide giriş', 'Introduction to tajwid'),
            summary: L("Kur'an'ı doğru okumanın temel kuralları.", 'Basic rules for reciting the Quran correctly.'),
            sections: [
              {
                text: L(
                  "Tecvid, Kur'an harflerini mahreçlerinden (çıkış yerlerinden) ve sıfatlarına uygun okumak demektir. Sakin nun ve tenvinden sonra gelen harfe göre izhar, idgam, iklab ve ihfa kuralları uygulanır; med harflerinden sonra ses uzatılır.",
                  'Tajwid means pronouncing each letter from its point of articulation with its proper qualities. After a silent nun or tanwin, the rules of izhar, idgham, iqlab and ikhfa apply; vowels are lengthened after the madd letters.'
                ),
              },
              {
                text: L(
                  'Tecvid en sağlıklı şekilde bir hocadan dinleyerek öğrenilir. Kur’an okuyucudaki ayet ayet dinleme özelliği, okuyuşu karşılaştırmak için kullanılabilir.',
                  'Tajwid is best learned by listening to a teacher. The ayah-by-ayah audio in the Quran reader can help you compare your recitation.'
                ),
              },
            ],
          },
        ],
      },
      {
        id: 'hadith-info',
        title: L('Hadis ve sünnet', 'Hadith and Sunnah'),
        topics: [
          {
            id: 'hadis-turleri',
            title: L('Hadis türleri ve temel kaynaklar', 'Types of hadith and main collections'),
            summary: L('Sahih, hasen, zayıf ve Kütüb-i Sitte.', 'Sahih, hasan, da’if and the Six Books.'),
            sections: [
              {
                bullets: B(
                  [
                    'Sahih: Râvileri güvenilir ve senedi kesintisiz olan hadis.',
                    'Hasen: Sahihin şartlarını taşıyan ancak râvilerinin hafızası biraz daha zayıf olan hadis.',
                    'Zayıf: Sahih ve hasen şartlarını taşımayan hadis; hüküm çıkarmada kullanılmaz.',
                  ],
                  [
                    'Sahih: reliable narrators and an unbroken chain.',
                    'Hasan: meets sahih conditions but with narrators of slightly weaker memory.',
                    'Da’if: does not meet these conditions; not used to derive rulings.',
                  ]
                ),
              },
              {
                heading: L('Kütüb-i Sitte', 'The Six Books'),
                text: L(
                  'Buhârî, Müslim, Ebû Dâvûd, Tirmizî, Nesâî ve İbn Mâce’nin derlediği altı temel hadis kitabıdır. Bunlardan Buhârî ve Müslim’in Sahih’leri en güvenilir kabul edilir.',
                  'The six major collections by al-Bukhari, Muslim, Abu Dawud, al-Tirmidhi, al-Nasa’i and Ibn Majah. The Sahih collections of al-Bukhari and Muslim are regarded as the most reliable.'
                ),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'daily-life',
    title: L('Ahlak ve günlük hayat', 'Character and daily life'),
    icon: 'heart-outline',
    subcategories: [
      {
        id: 'halal-haram',
        title: L('Helal ve haram', 'Halal and haram'),
        topics: [
          {
            id: 'helal-gida',
            title: L('Helal ve haram yiyecekler', 'Halal and haram food'),
            summary: L("Kur'an'da açıkça yasaklananlar ve mezhep farkları.", 'What the Quran forbids and differences between schools.'),
            sections: [
              {
                text: L(
                  "Kur'an'da leş, akıtılan kan, domuz eti ve Allah'tan başkası adına kesilen hayvanların eti haram kılınmıştır (Bakara 2:173). Sarhoşluk veren içkiler de haramdır (Mâide 5:90).",
                  'The Quran forbids carrion, flowing blood, pork and animals slaughtered in a name other than Allah’s (2:173). Intoxicants are also forbidden (5:90).'
                ),
              },
              {
                text: L(
                  'Hanefi mezhebinde denizden yalnızca balık helaldir; diğer mezheplerde karides, midye gibi deniz ürünleri de helal kabul edilir. Helal sertifikası, işlenmiş gıdalarda içerik ve kesim şartlarını takip etmeyi kolaylaştırır.',
                  'In the Hanafi school only fish is permitted from the sea; the other schools also permit seafood such as shrimp and mussels. Halal certification helps with processed foods and slaughter conditions.'
                ),
              },
            ],
            tags: { tr: ['domuz', 'alkol', 'deniz ürünleri', 'kesim'], en: ['pork', 'alcohol', 'seafood'] },
          },
        ],
      },
      {
        id: 'rights',
        title: L('Haklar ve ilişkiler', 'Rights and relationships'),
        topics: [
          {
            id: 'anne-baba-hakki',
            title: L('Anne baba hakkı', 'Rights of parents'),
            summary: L('Ebeveyne iyilik ve saygı.', 'Kindness and respect towards parents.'),
            sections: [
              {
                text: L(
                  "Kur'an, Allah'a kulluktan hemen sonra anne babaya iyilik etmeyi emreder; onlara \"öf\" bile denmemesini, güzel söz söylenmesini ve onlar için \"Rabbim, beni küçükken yetiştirdikleri gibi Sen de onlara merhamet et\" diye dua edilmesini öğütler (İsrâ 17:23-24).",
                  'The Quran commands kindness to parents right after the worship of Allah: not to say even "uff" to them, to speak to them gently, and to pray "My Lord, have mercy on them as they raised me when I was small" (17:23-24).'
                ),
              },
            ],
          },
          {
            id: 'komsu-hakki',
            title: L('Komşu hakkı', 'Rights of neighbours'),
            summary: L('İslam’da komşuluk ilişkileri.', 'Neighbourliness in Islam.'),
            sections: [
              {
                text: L(
                  'Hz. Peygamber, Cebrâil’in kendisine komşu hakkında o kadar çok tavsiyede bulunduğunu, komşunun komşuya mirasçı kılınacağını sandığını bildirmiştir (Buhârî, Müslim). Komşunun halini sormak, ikramda bulunmak ve ona eziyet etmemek imanın gereği sayılmıştır.',
                  'The Prophet said Jibril kept advising him about the neighbour until he thought the neighbour would be made an heir (Bukhari, Muslim). Checking on neighbours, being generous and not harming them are signs of faith.'
                ),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'holy-days',
    title: L('Mübarek gün ve geceler', 'Holy days and nights'),
    icon: 'star-outline',
    subcategories: [
      {
        id: 'kandil',
        title: L('Kandiller', 'Blessed nights'),
        topics: [
          {
            id: 'kandiller',
            title: L('Kandil geceleri', 'The kandil nights'),
            summary: L('Türkiye’de ihya edilen mübarek geceler.', 'Blessed nights observed in Türkiye.'),
            sections: [
              {
                bullets: B(
                  [
                    'Mevlid Kandili: Hz. Peygamber’in doğumu (12 Rebîülevvel gecesi).',
                    'Regaib Kandili: Recep ayının ilk cuma gecesi.',
                    'Miraç Kandili: 27 Recep gecesi; namazın farz kılındığı Miraç olayı anılır.',
                    'Berat Kandili: 15 Şaban gecesi.',
                    'Kadir Gecesi: Ramazan’ın son on gecesinde; Türkiye’de 27. gece ihya edilir.',
                  ],
                  [
                    'Mawlid: the birth of the Prophet (night of 12 Rabi’ al-awwal).',
                    'Raghaib: the first Friday night of Rajab.',
                    'Mi’raj: night of 27 Rajab, remembering the Ascension when prayer was made obligatory.',
                    'Bara’ah: night of 15 Sha’ban.',
                    'Laylat al-Qadr: in the last ten nights of Ramadan; observed on the 27th in Türkiye.',
                  ]
                ),
              },
              {
                text: L(
                  'Bu gecelerin namaz, Kur’an, dua ve tövbe ile ihya edilmesi tavsiye edilir. Yaklaşan tarihleri Takvim bölümünde görebilirsiniz.',
                  'Spending these nights in prayer, Quran, dua and repentance is recommended. See upcoming dates in the Calendar.'
                ),
              },
            ],
          },
          {
            id: 'bayramlar',
            title: L('Ramazan ve Kurban bayramları', 'Eid al-Fitr and Eid al-Adha'),
            summary: L('Bayramların anlamı ve sünnetleri.', 'Meaning and sunnahs of the two Eids.'),
            sections: [
              {
                text: L(
                  'Ramazan Bayramı Şevval ayının ilk üç günü, Kurban Bayramı Zilhicce ayının 10-13. günleri arasındaki dört gündür. Bayram sabahı gusletmek, temiz ve güzel giyinmek, Ramazan Bayramı’nda namazdan önce tatlı bir şey yemek, akrabaları ziyaret etmek ve küsleri barıştırmak sünnettir.',
                  'Eid al-Fitr is the first three days of Shawwal; Eid al-Adha is the four days of 10-13 Dhu al-Hijjah. On Eid morning it is sunnah to take a bath, wear clean good clothes, eat something sweet before the Eid al-Fitr prayer, visit relatives and reconcile.'
                ),
              },
            ],
          },
        ],
      },
    ],
  },
];

/** Comparative topics from the original education data, kept with their perspectives */
function comparativeCategory(): LearnCategory {
  const tr = getEducationTopics('tr');
  const en = getEducationTopics('en');
  return {
    id: 'comparative',
    title: L('Mezhepler arası karşılaştırma', 'Comparing the schools'),
    icon: 'git-compare-outline',
    subcategories: [
      {
        id: 'comparative-topics',
        title: L('Farklı yaklaşımlar', 'Different approaches'),
        topics: en.map((e) => {
          const t = tr.find((x) => x.id === e.id) ?? e;
          return {
            id: e.id,
            title: L(t.title, e.title),
            summary: L(t.summary, e.summary),
            sections: e.perspectives.map((p, i) => ({
              heading: L(t.perspectives[i]?.sect ?? p.sect, p.sect),
              text: L(t.perspectives[i]?.approach ?? p.approach, p.approach),
            })),
          };
        }),
      },
    ],
  };
}

export const LEARN_CATEGORIES: LearnCategory[] = [...CATEGORIES, comparativeCategory()];

export interface LearnEntry {
  category: LearnCategory;
  subcategory: LearnSubcategory;
  topic: LearnTopic;
}

export const LEARN_ENTRIES: LearnEntry[] = LEARN_CATEGORIES.flatMap((category) =>
  category.subcategories.flatMap((subcategory) => subcategory.topics.map((topic) => ({ category, subcategory, topic })))
);

export function findLearnTopic(id: string): LearnEntry | undefined {
  return LEARN_ENTRIES.find((e) => e.topic.id === id);
}

function fold(text: string): string {
  return text
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ç/g, 'c')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/[âà]/g, 'a')
    .replace(/[îì]/g, 'i')
    .replace(/[ûù]/g, 'u');
}

/** Plain text of a topic in one language, for search */
export function topicText(entry: LearnEntry, lang: AppLanguage): string {
  const { category, subcategory, topic } = entry;
  const parts = [
    category.title[lang],
    subcategory.title[lang],
    topic.title[lang],
    topic.summary[lang],
    ...(topic.tags?.[lang] ?? []),
    ...topic.sections.flatMap((s) => [s.heading?.[lang] ?? '', s.text?.[lang] ?? '', ...(s.bullets?.[lang] ?? [])]),
  ];
  return parts.join(' ');
}

/** Every query word must appear somewhere in the topic (title matches rank first). */
export function searchLearn(entries: LearnEntry[], query: string, lang: AppLanguage): LearnEntry[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return entries;
  return entries
    .map((e) => {
      const title = fold(`${e.topic.title[lang]} ${e.subcategory.title[lang]}`);
      const body = fold(topicText(e, lang));
      if (!words.every((w) => body.includes(w))) return null;
      return { e, score: words.filter((w) => title.includes(w)).length };
    })
    .filter((x): x is { e: LearnEntry; score: number } => x !== null)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.e);
}
