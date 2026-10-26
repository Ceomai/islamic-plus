# Islamic+

A comprehensive mobile companion app: prayer times, Quran & Hadith, Qibla, nearby mosques, halal dining, spiritual habits, Islamic calendar, education, and Zakat/Sadaqa tools.

Built with **React Native** and **Expo SDK 54** (iOS & Android).

## Features

| Module | Description |
|--------|-------------|
| **Prayer Times** | Location-based times via `adhan`; 12 calculation methods; Hanafi/Shafi Asr |
| **Notifications** | Per-prayer enable/disable, custom sounds, weekday rules |
| **Quran** | Surah list via [Al Quran Cloud API](https://alquran.cloud) |
| **Hadith** | Collections by sect preference |
| **Qibla** | Compass using device magnetometer |
| **Nearby Places** | Mosques and halal restaurants (OpenStreetMap) |
| **Tasbih** | Dhikr counter with haptics |
| **Home launcher** | iPhone-style customizable home screen |
| **Auth** | Sign up / sign in or guest mode |

## Quick start (developers)

```bash
cd Islamic
npm install
npx expo start
```

Scan the QR code with Expo Go. For local Wi‑Fi issues see [KURULUM.md](KURULUM.md).

## Beta testing (friends, before App Store)

**Do not share Expo Go QR codes with testers.** Use EAS builds instead:

| Platform | Method | Guide |
|----------|--------|--------|
| Android | APK install link | [BETA-TEST.md](BETA-TEST.md) |
| iPhone | TestFlight | [BETA-TEST.md](BETA-TEST.md) |

```bash
npm run build:preview:android   # APK for friends
npm run build:preview:ios       # TestFlight build
npm run submit:ios              # Upload latest iOS build
```

Privacy policy (TestFlight / store): [docs/PRIVACY.md](docs/PRIVACY.md)

## Project structure

```
Islamic/
├── App.tsx
├── eas.json              # EAS Build profiles
├── src/
│   ├── components/
│   ├── config/           # e.g. guest feature access
│   ├── constants/
│   ├── context/
│   ├── navigation/
│   ├── screens/
│   ├── services/
│   └── types/
├── assets/
└── docs/PRIVACY.md
```

## Tech stack

- React Native 0.81 + Expo 54
- TypeScript, React Navigation
- `adhan`, `hijri-converter`
- `expo-location`, `expo-notifications`, `expo-audio`, `expo-sensors`
- **Supabase** (optional): auth, anonymized `profiles`, `auth_logs` — see [supabase/README.md](supabase/README.md)

## Dua audio

Each dua has a dedicated MP3 (Hisnul Muslim via [Alsarmad/Adhkar-json](https://github.com/Alsarmad/Adhkar-json)). Regenerate mapping:

```bash
npm run dua-audio:sync
```

## Production checklist

- [x] EAS Build configured (`eas.json`)
- [x] Placeholder app icons under `assets/`
- [x] Privacy policy ([docs/PRIVACY.md](docs/PRIVACY.md))
- [ ] Replace placeholder icons with final branding
- [ ] Add adhan sound files under `assets/sounds/`
- [ ] Full Hadith API integration
- [ ] App Store / Play Store listing (after beta)

## License

Private project — all rights reserved unless otherwise specified.
