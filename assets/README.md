# Assets

Add the following image files before building for production:

- `icon.png` — 1024×1024 app icon
- `splash.png` — 1284×2778 splash screen
- `adaptive-icon.png` — 1024×1024 Android adaptive icon foreground
- `notification-icon.png` — 96×96 white silhouette for Android notifications
- `sounds/adhan_short.wav` — short adhan clip for notifications
- `sounds/adhan_full.wav` — full adhan clip (optional)

Generate green placeholder PNGs (beta builds):

```bash
node scripts/generate-assets.js
```

Replace with final branding before App Store release.
