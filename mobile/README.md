# Karmo Workout — Mobile (React Native / Expo)

A native rewrite of the Karmo Workout web app, built with **Expo**. Full
feature parity with the web app — Motion Analysis (photo *and* video with
frame-picking), Body Analysis, Nutrition Tracking (with daily targets and
meal history), a Profile screen (goals, body measurements, an Activity
Calendar), custom Workout Plans, a manual Workout Log with calorie estimates
and per-exercise progress charts, light/dark theme, and English/繁體中文/简体中文
language switching — now as a real iOS/Android app instead of a website.

**Important:** this app is a *client* only. It still talks to the existing
Next.js backend (`../` — the original `karmo_workout` project) for the actual
Gemini (Vertex AI) calls, so no API credentials ever live on the phone. You
must run that backend somewhere reachable from your phone (your computer, on
the same Wi-Fi, works fine for development).

## Prerequisites

- **Node.js 18+** on the machine you develop from (see the main project's
  `README.md` for how to install it on Windows).
- **Expo Go** app on your iPhone — install it from the App Store. This lets
  you run and test the app live without needing a Mac or Xcode.
- Your phone and computer must be on the **same Wi-Fi network**.

## 1. Start the backend

From the project root (`karmo_workout/`, not `mobile/`):

```bash
npm install          # if you haven't already
npm run dev -- -H 0.0.0.0
```

`-H 0.0.0.0` makes the dev server reachable from other devices on your
network, not just `localhost`.

Find your computer's LAN IP address:

- **Windows:** `ipconfig` → look for "IPv4 Address" (something like `192.168.1.23`)
- **macOS:** `ipconfig getifaddr en0`

If Windows Firewall prompts you to allow Node.js on a private network,
click **Allow**.

## 2. Configure the mobile app

```bash
cd mobile
npm install
```

Then lock dependency versions to your installed Expo SDK (this fixes any
version drift automatically):

```bash
npx expo install expo-camera expo-image-picker expo-image react-native-gesture-handler react-native-safe-area-context react-native-screens @react-navigation/native @react-navigation/native-stack @react-native-async-storage/async-storage react-native-svg expo-localization expo-video expo-video-thumbnails @react-native-community/slider
```

Copy the env example and point it at your computer's LAN IP from step 1:

```bash
cp .env.example .env
```

Edit `.env`:
```
EXPO_PUBLIC_API_URL=http://192.168.1.23:3000
```
(use your actual IP, not this example one)

## 3. Run it

```bash
npx expo start
```

This prints a QR code in the terminal. Open the **Camera app** (iOS) or the
**Expo Go app** (Android) and scan it — the app loads on your phone in a few
seconds. Any code change you save hot-reloads instantly.

## Notes on how it works

- **Camera & photo upload** use `expo-camera` and `expo-image-picker` —
  native equivalents of the web app's `getUserMedia`/`<input type=file>`.
- **Streaming AI responses**: React Native's `fetch()` doesn't expose a
  readable stream body, so `src/lib/api.ts` uses the standard RN workaround —
  `XMLHttpRequest` with progressive `responseText` — to get the same
  token-by-token streaming feel as the web version.
- **Persistence**: everything (nutrition log + target, body profile, weight
  measurements, workout log, workout plans, theme, language) uses
  `AsyncStorage` instead of `localStorage`, mirroring the web app's
  `src/lib/*.ts` modules one-for-one but with async reads/writes.
- **Video frame-picking** (Motion → Upload tab): pick a video via
  `expo-image-picker`, preview/scrub it with `expo-video` + a
  `@react-native-community/slider`, then "Use This Frame" calls
  `expo-video-thumbnails` to extract a JPEG at the scrubbed position — this
  feeds into the same photo-analysis pipeline as a normal capture, no backend
  changes needed.
- **Charts**: the weight-trend and per-exercise progress charts use
  `react-native-svg` (`Polyline` + `LinearGradient`), a direct port of the
  web app's inline-SVG `TrendChart`.
- **Theme**: `src/lib/theme/ThemeContext.tsx` provides light/dark palettes
  from `src/theme.ts`, defaulting to the OS appearance
  (`useColorScheme()`) and persisted to `AsyncStorage`.
- **Language**: `src/lib/i18n/` is a straight copy of the web app's
  dictionary-based i18n (`translations.ts` is byte-identical), swapping
  `expo-localization` in for `navigator.language` to detect the default.
- **CORS**: not an issue — CORS is a browser mechanism only. Native
  `fetch`/`XHR` calls from the app aren't subject to it, so the backend needs
  no changes to serve the mobile client.

## Building a real installable app (no Mac required)

For a build you can install permanently (TestFlight or App Store), use
**EAS Build** — Expo's cloud build service. It builds the iOS binary in the
cloud, so you don't need a Mac or Xcode even for this step:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios
```

You'll need a free Expo account and (for App Store distribution, not for
internal testing) an Apple Developer account ($99/year). `eas build` will
walk you through Apple credentials interactively.

## Troubleshooting

- **"Network error" in the app**: usually means `EXPO_PUBLIC_API_URL` doesn't
  match your computer's current LAN IP, the backend isn't running, or a
  firewall is blocking port 3000. Try opening `http://<your-ip>:3000` in your
  phone's browser — if that doesn't load, fix connectivity first.
- **Camera permission denied**: go to iPhone Settings → Expo Go → enable
  Camera and Photos.
- Your LAN IP can change when you reconnect to Wi-Fi — update `.env` if the
  app stops connecting.
