# Assets

Brand: white line-art mosque (rounded strokes) on green (#14725A → #0D3B2E). Adaptive icon and splash background: #0F5C4A.

| File | Size | Notes |
|---|---|---|
| `icon.png` | 1024×1024 | iOS and default icon, full bleed (iOS adds the rounded mask) |
| `adaptive-icon.png` | 1024×1024 | Android foreground, transparent, mark inside the 66% safe circle; background colour in `app.json` |
| `splash.png` | 1024×1024 | Splash logo, transparent; background colours in the `expo-splash-screen` plugin |
| `notification-icon.png` | 96×96 | White silhouette on transparent (Android tints it) |
| `sounds/` | — | `adhan_short.wav` for notifications, `adhan_full.m4a` for "Listen to the adhan" |

Store graphics live in `docs/store/` (`play-icon-512.png`, `feature-graphic.png` 1024×500).
Changing any of these is a native change: raise `version` in `app.json` and build a new APK (an over-the-air update will not change them).
