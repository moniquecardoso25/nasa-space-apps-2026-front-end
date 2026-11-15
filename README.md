# nasa-space-apps-2026-front-end

**CosmoMedic**: health monitoring app for astronauts (NASA Space Apps 2026 · "Create Health Monitoring Software for Astronauts on Space Missions"). React Native + Expo (SDK 58), runs on phone and web. Visual style: Nebula Glass.

## Run

```bash
npm install
npm run web          # browser (phone-width frame)
npx expo start       # Expo Go / emulator
```

- Sign in with Crew ID `ORB3-ANA` (or `ORB3-RAJ`, `ORB3-MIKA`, `ORB3-LEO`) and PIN `2026`. `GROUND` / `2026` opens the ground dashboard. With no server, any 4-digit PIN opens the demo data.
- **Voice** (Orbi chat voice mode, Fill with Orbi, mood voice notes):
  - Orbi talks with `expo-speech` (system / browser voices).
  - Listening: phone → system recognizer (needs a development build: `npx expo run:android` / `run:ios`); Chrome / Edge / Safari → the browser's speech recognition; **Firefox** (or when the browser recognizer fails) → **on-device recognizer** (Moonshine base via transformers.js, ~63 MB, downloaded once from jsDelivr + Hugging Face and cached by the browser; audio never leaves the device; free and open source, no API key).
  - Mood voice notes are recorded with `expo-audio` and kept in memory with the log.
- Data comes from the backend (see below). With `EXPO_PUBLIC_API_URL=mock`, or when the server can't be reached at sign-in, the app runs on the in-memory mock (`src/mocks/mock-db.json`), which resets on reload.
- Dev catalogue of components and the Bolt animation lab: `/dev/components`. Ground team dashboard (web): `/ground`.

## Backend and offline use

The app talks to the [Crew Health API](https://github.com/lzphellipe/nasa-space-software-health-crew) (live: https://crew-health-api-univesp.azurewebsites.net, `/docs` for the routes).

- **Server:** `EXPO_PUBLIC_API_URL` (default: the Azure URL above). Example: `EXPO_PUBLIC_API_URL=http://localhost:8000 npm run web`. Set it to `mock` to use only the bundled demo data.
- **Sign-in** (`src/data/sync.ts`): `POST /api/v1/app/auth/login` with Crew ID and PIN, then `GET /api/v1/app/snapshot`, which returns the whole database in the same shape as `mock-db.json`. The screens keep reading it synchronously through `api.ts`; nothing in them changed. Tokens: 30-minute access token, renewed with the refresh token (`src/data/backend.ts`).
- **Writes are local first.** `api.ts` updates the screen at once and puts the change in a queue: logs, edits, messages to the ground, Orbi chats in Journal mode (`POST /api/v1/app/me/sync`), shop and onboarding. Each queued change has its own id, so the server applies it at most once, even when a batch is sent again after the link drops. After each send the app fetches the snapshot again (also every minute, for new ground messages and alerts).
- **No link** (the Earth delay, or no signal): the app keeps working on the last data received and the queue waits on the device. A line above the tab bar says how many changes are waiting; they are sent when the link is back. On the web the queue and the last data are kept in `localStorage`, so they survive a reload; on the phone they are kept in memory for now (add AsyncStorage in `backend.ts` to keep them across app restarts).
- **Orbi chat** keeps answering on the device with no link (rules in `src/data/orbi.ts`). Private mode never leaves the device; Journal mode is sent to the server.
- **Dates:** the station clock keeps the date on the mission's "today" (`getNow` in `api.ts`); server timestamps from later real days are moved to that day when the snapshot is loaded.

## Orbi today (rules) and next (LLM)

**Today Orbi is not an AI model.** Two simple pieces:

1. **Speech → text**: the phone / browser recognizer, or the on-device Moonshine model (only transcribes, understands nothing).
2. **Text → action, by rules**:
   - `src/data/orbiParser.ts` fills the *Fill with Orbi* cards from **predefined answers and numbers**: numbers in digits or words ("one hundred eighteen over seventy-six, pulse sixty-four", "six and a half hours", `src/data/spokenNumbers.ts`), clock times ("bed at eleven thirty"), and keywords (moods, tags, foods, equipment, "hard", "easy", "skip"). Anything it can't read is filled with a default and marked "Orbi guessed", and nothing is saved before the astronaut confirms.
   - `src/data/orbi.ts` picks a **canned reply** by keyword (sleep, tired, stress, lonely…). It does not understand free conversation.

**Next: a real LLM behind the same two interfaces**, so the screens don't change:

- `OrbiFillParser.parse(category, text, ctx)` → an LLM with structured (JSON) output matching `DraftMap`: understands any phrasing, mixes categories in one sentence, asks a follow-up when something is missing.
- `orbiReply(text)` → an LLM chat with the astronaut's context (recent logs, Orbi alerts, baseline) and journal summaries for the medical team.
- Mission constraints to keep: it must run **on board** (small local model) or tolerate the Earth communication delay; "confirm before save" and the **Private mode never stores anything** guarantees stay.

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
