# nasa-space-apps-2026-front-end

**CosmoMedic**: health monitoring app for astronauts (NASA Space Apps 2026 · "Create Health Monitoring Software for Astronauts on Space Missions"). React Native + Expo (SDK 58), runs on phone and web. Visual style: Nebula Glass.

## Run

```bash
npm install
npm run web          # browser (phone-width frame)
npx expo start       # Expo Go / emulator
```

- Sign in with Crew ID `ORB3-ANA` (or `ORB3-RAJ`, `ORB3-MIKA`, `ORB3-LEO`) and any 4-digit PIN.
- **Voice** (Orbi chat voice mode, Fill with Orbi, mood voice notes):
  - Orbi talks with `expo-speech` (system / browser voices).
  - Listening: phone → system recognizer (needs a development build: `npx expo run:android` / `run:ios`); Chrome / Edge / Safari → the browser's speech recognition; **Firefox** (or when the browser recognizer fails) → **on-device Whisper** (`whisper-base`, ~77 MB, downloaded once from jsDelivr + Hugging Face and cached by the browser; audio never leaves the device).
  - Mood voice notes are recorded with `expo-audio` and kept in memory with the log.
- Data is an in-memory mock (`src/mocks/mock-db.json`) and resets on reload.
- Dev catalogue of components and the Bolt animation lab: `/dev/components`. Ground team dashboard (web): `/ground`.

## Deploy (Vercel)

`vercel.json` builds the static web app (`npx expo export -p web` → `dist/`) and rewrites every route to `index.html`, so deep links like `/status` work. Import the repo in Vercel and deploy the `ui-cosmomedic` branch; no settings needed.

## Structure

| Path | What |
|---|---|
| `src/app/` | expo-router routes (login, onboarding, tabs, logs, calendar, leaderboard, ground, dev) |
| `src/components/` | Shared UI (tokens-based) |
| `src/data/` | Types, in-memory store, data API (`api.ts`), derived values, Orbi replies, Fill-with-Orbi parser |
| `src/avatar/` | Bolt's animation state machine |
| `src/theme/` | Design tokens and fonts |
| `docs/design/` | Design handoff: README, SCREENS, COMPONENTS, navigation, data model, tokens, ANIMATIONS, PROGRESS |

## Checks

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor
```
