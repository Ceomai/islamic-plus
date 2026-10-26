# Supabase setup (Islamic+)

## 1. Create project

1. Go to [supabase.com](https://supabase.com) → New project.
2. Copy **Project URL** and **anon public** key.

## 2. Environment variables

Create `Islamic/.env` (do not commit):

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
```

Restart Metro after changing `.env`.

## 3. Run database migrations

Supabase Dashboard → **SQL Editor** → New query → run **in order**:

1. [migrations/001_auth_profiles_logs.sql](./migrations/001_auth_profiles_logs.sql)
2. [migrations/002_analytics_rpc.sql](./migrations/002_analytics_rpc.sql)
3. [migrations/003_reading_progress.sql](./migrations/003_reading_progress.sql)
4. [migrations/004_user_app_data.sql](./migrations/004_user_app_data.sql)
5. [migrations/005_security_hardening.sql](./migrations/005_security_hardening.sql) — **zorunlu**: RPC yetkilerini kısıtlar, `admin_*` view'larını API'den gizler (bundan sonra yalnızca Dashboard / SQL Editor'den görülür)
6. [migrations/006_account_deletion.sql](./migrations/006_account_deletion.sql) — uygulama içi hesap silme (`delete_my_account`)
7. [migrations/007_assistant_and_places.sql](./migrations/007_assistant_and_places.sql) — YZ asistanı günlük kotası ve yakındaki yerler önbelleği (Edge Function'lar için, bkz. bölüm 8)

### Şifre sıfırlama ve şifre politikası

Uygulama şifre sıfırlamayı **e-postadaki tek kullanımlık kodla** yapar (derin link gerekmez).

1. **Authentication → Email Templates → Reset Password** şablonuna kodu ekleyin, örneğin:
   ```html
   <h2>Şifre sıfırlama</h2>
   <p>Islamic+ uygulamasına bu kodu girin: <strong>{{ .Token }}</strong></p>
   ```
2. **Authentication → Providers → Email → Minimum password length** değerini **8** yapın (uygulama da 8 karakter istiyor).
3. Canlıya çıkmadan önce **Authentication → SMTP Settings** ile kendi SMTP sağlayıcınızı bağlayın; varsayılan Supabase e-posta servisi saatte yalnızca birkaç e-postaya izin verir.

## 4. Auth settings

Dashboard → **Authentication** → **Providers** → enable **Email**.

**Beta test için önemli:** **Confirm email** → **OFF** → Save.

---

## 5. Verileri nerede görürsünüz?

| Ne arıyorsunuz? | Nerede? | Not |
|-----------------|---------|-----|
| Kayıtlı kullanıcılar (e-posta) | **Authentication → Users** | `auth.users` — Table Editor'de değil |
| Anonim profiller | **Table Editor → profiles** | `email_hash` + `pseudonym` |
| Giriş/kayıt logları | **Table Editor → auth_logs** | `sign_up`, `sign_in`, `sign_out`… |
| Ekran süreleri | **Table Editor → activity_logs** | veya view: `admin_feature_time` |
| AI sohbetleri | **Table Editor → ai_chat_logs** | veya view: `admin_ai_conversations` |
| Kur'an / Hadis ilerlemesi | **Table Editor → user_reading_progress** | veya view: `admin_reading_overview` |
| Tüm uygulama verisi özeti | **Table Editor → admin_app_data_overview** | namaz, tesbih, dua, eğitim, zekât |
| Özet pano | **Table Editor → admin_user_overview** | kullanıcı başına özet |

> **Table Editor boşsa:** Migration 002 çalıştırılmamış veya uygulama eski sürümle açılmış olabilir. Metro'yu `npx expo start -c` ile yeniden başlatın, çıkış yapıp tekrar giriş yapın.

---

## 6. What is stored

| Table | Content |
|-------|---------|
| `auth.users` | Supabase-managed login |
| `profiles` | `email_hash` (SHA-256), `pseudonym` — no plain email |
| `auth_logs` | Auth events |
| `activity_logs` | Screen enter/leave, time per feature, actions |
| `ai_chat_logs` | User + assistant messages (per chat session) |
| `user_reading_progress` | Quran/Hadith last position + bookmarks (JSON per profile) |
| `user_app_sync` | Full app payload (habits, prefs, stats, family…) |
| `prayer_completions` | Daily prayer check-ins |
| `tasbih_sessions` | Tasbih session history |
| `habit_completion_logs` | Habit completion by date |
| `dua_read_logs` | Dua read counts |
| `education_progress` | Education topics opened |
| `user_preferences` | Theme, launcher, notifications |
| `zakat_calculations` | Saved zakat calculations |
| `location_prefs` | Saved city/coordinates |
| `family_members` | Family mode profiles |

---

## 7. Without Supabase

If `.env` is missing, the app falls back to **local-only** auth (AsyncStorage) for development. Analytics are not sent to the cloud in that mode.

## 8. Edge Functions (YZ asistanı ve yakındaki yerler)

İkisi de isteğe bağlıdır; kapalıyken uygulama cihaz üzerindeki asistanı ve doğrudan OpenStreetMap'i kullanır.

**Gerekenler:** [Supabase CLI](https://supabase.com/docs/guides/cli), `supabase login`, `supabase link --project-ref <ref>` ve 007 migration'ının çalıştırılmış olması.

### YZ asistanı (`functions/assistant`)

Claude (`claude-opus-5-5`) ile her dilde yanıt verir; dua, Öğren konusu ve sure bulup uygulama sayfalarını açan butonlar döndürür. Yalnızca giriş yapmış kullanıcılar kullanabilir.

```bash
npm run assistant:catalog          # uygulama içeriğinden catalog.json üretir (dualar/konular değişince tekrar)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set ASSISTANT_DAILY_LIMIT=60   # isteğe bağlı, kullanıcı başına günlük istek
supabase functions deploy assistant
```

Sonra `.env` içine `EXPO_PUBLIC_ASSISTANT_REMOTE=1` ekleyip Metro'yu yeniden başlatın. Fonksiyon hata verirse veya kota dolarsa uygulama otomatik olarak cihazdaki asistana döner.

Maliyet: istek başına birkaç bin giriş token'ı (sistem metni ve araçlar önbelleğe alınır) ve kısa bir yanıt. Kullanım kayıtları Dashboard → Edge Functions → assistant → Logs altında token sayılarıyla görünür.

### Yakındaki yerler (`functions/places`)

```bash
supabase secrets set GOOGLE_PLACES_API_KEY=...   # isteğe bağlı; yoksa yalnızca OpenStreetMap
supabase functions deploy places
```

**Yalnızca Google anahtarıyla anlamlıdır.** OpenStreetMap servisleri (Overpass 406, Nominatim 403) Supabase Edge Function'larından gelen istekleri engelliyor (2026-10-26'da doğrulandı), bu yüzden ücretsiz yol uygulamanın telefondan yaptığı doğrudan istektir: önce Overpass, 12 sn içinde yanıt yoksa Nominatim. Google anahtarı eklerseniz `.env` içine `EXPO_PUBLIC_PLACES_PROXY=1` yazın; giriş yapmış kullanıcılar Google Places (New) sonuçlarını alır (Google Cloud'da "Places API (New)" açık olmalı), diğer herkes doğrudan OSM yoluna düşer. Google sonuçları kullanım şartları gereği saklanmaz.
