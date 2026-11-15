# nasa-space-apps-2026-front-end

**CosmoMedic**: health monitoring app for astronauts (NASA Space Apps 2026 · "Create Health Monitoring Software for Astronauts on Space Missions"). React Native + Expo (SDK 58), runs on phone and web. Visual style: Nebula Glass.

## Run

```bash
npm install
npm run web          # browser (phone-width frame)
npx expo start       # Expo Go / emulator
```

- Sign in with a valid backend **username and password** (`POST /api/v1/auth/login`). No credentials are prefilled. Astronaut accounts open the app; ground accounts open `/ground`.
- **Voice** (Orbi chat voice mode, Fill with Orbi, mood voice notes):
  - Orbi talks with `expo-speech` (system / browser voices).
  - Listening: phone → system recognizer (needs a development build: `npx expo run:android` / `run:ios`); Chrome / Edge / Safari → the browser's speech recognition; **Firefox** (or when the browser recognizer fails) → **on-device recognizer** (Moonshine base via transformers.js, ~63 MB, downloaded once from jsDelivr + Hugging Face and cached by the browser; audio never leaves the device; free and open source, no API key).
  - Mood voice notes are recorded with `expo-audio`, uploaded to `/app/me/uploads`, and linked to the saved log.
- The app loads the authenticated `/api/v1/app/snapshot` into a reactive local cache. Writes update the cache and enter the existing offline queue; the sync banner distinguishes queued changes from server synchronization. The queue, snapshot and rotated tokens persist in localStorage on web and in memory on phones.
- Dev catalogue of components and the Bolt animation lab: `/dev/components`. Ground team dashboard (web): `/ground`.

## API configuration

Copy `.env.example` to `.env.local` if you need to override the defaults:

```dotenv
EXPO_PUBLIC_API_URL=https://crew-health-api-univesp.azurewebsites.net/api/v1
EXPO_PUBLIC_USE_MOCK_DATA=false
```

Restart/reload Expo after changing the environment. These variables are public configuration; never put passwords or tokens in them. `EXPO_PUBLIC_USE_MOCK_DATA=true` explicitly restores the original demo (use `ORB3-ANA` and any four-digit PIN in the username/password fields).

- `/auth/login` accepts `{ username, password }`. The separate `/app/auth/login` endpoint accepts `{ crewId, pin }`; the app uses the first contract.
- Access tokens are sent as Bearer credentials. Backend roles `medical` and `admin` map to the ground dashboard, as defined by the server. A 401 triggers one shared `/auth/refresh` request; an invalid refresh ends the session. Sign out revokes the refresh token using `/auth/logout`.
- `src/data/api.ts` remains the screen data boundary. It handles onboarding, device pairing, log create/edit, audio uploads, Orbi chat, ground messages and avatar purchases/equipment through `/app/me/*`.
- The existing `src/data/sync.ts` queue sends logs, edits, ground messages and Journal exchanges through `/app/me/sync`. Shop, onboarding and device settings use queued REST calls. The snapshot (including crew leaderboard counts) refreshes after sync and every 60 seconds; failed sends retry after 15 seconds. The sync banner shows pending changes and errors.
- Queued operations retain their operation ID and original timestamp across connection failures, so `/sync` applies each at most once. Confirmed Fill-with-Orbi cards are removed individually so a partial failure can retry the remaining cards.
- Backend roles and permissions control the snapshot: astronaut accounts see their own health records; ground accounts see the crew dashboard. The frontend also guards navigation.
- Photos, hardware access, calendar and relaxation content retain prototype limitations. The simulated injury-photo button is disabled with a real backend; existing photo URLs are preserved. Device pairing records the backend setting, without implementing Bluetooth.
- The remote branch's offline queue and storage are preserved. No demo fallback occurs on a failed real login. Native persistence across app restarts, hardware telemetry and meal-plan screens remain future work.

Authenticated integration testing requires an actual account provisioned in the backend. The tests under `tests/` mock HTTP responses and do not write health data to the deployed API.

## Orbi today (rules) and next (LLM)

**Today Orbi is not an AI model.** Two simple pieces:

1. **Speech → text**: the phone / browser recognizer, or the on-device Moonshine model (only transcribes, understands nothing).
2. **Text → action, by rules**:
   - `src/data/orbiParser.ts` fills the *Fill with Orbi* cards from **predefined answers and numbers**: numbers in digits or words ("one hundred eighteen over seventy-six, pulse sixty-four", "six and a half hours", `src/data/spokenNumbers.ts`), clock times ("bed at eleven thirty"), and keywords (moods, tags, foods, equipment, "hard", "easy", "skip"). Anything it can't read is filled with a default and marked "Orbi guessed", and nothing is saved before the astronaut confirms.
   - `src/data/orbi.ts` answers locally, including without a connection. Journal exchanges enter the `/app/me/sync` queue; Private conversations never leave the device or enter the queue.

**Next: a real LLM behind the same two interfaces**, so the screens don't change:

- `OrbiFillParser.parse(category, text, ctx)` → an LLM with structured (JSON) output matching `DraftMap`: understands any phrasing, mixes categories in one sentence, asks a follow-up when something is missing.
- `/app/me/orbi/chat` can switch to an LLM on the backend without changing the app screens.
- Mission constraints to keep: it must run **on board** (small local model) or tolerate the Earth communication delay; "confirm before save" and the **Private mode never stores anything** guarantees stay.

## Deploy (Vercel)

`vercel.json` builds the static web app (`npx expo export -p web` → `dist/`) and rewrites every route to `index.html`, so deep links like `/status` work. Import the repo in Vercel and deploy the `ui-cosmomedic` branch; no settings needed.

## Structure

| Path | What |
|---|---|
| `src/app/` | expo-router routes (login, onboarding, tabs, logs, calendar, leaderboard, ground, dev) |
| `src/components/` | Shared UI (tokens-based) |
| `src/data/` | Types, HTTP transport, reactive server snapshot, data API (`api.ts`), derived values, Fill-with-Orbi parser |
| `src/avatar/` | Bolt's animation state machine |
| `src/theme/` | Design tokens and fonts |
| `docs/design/` | Design handoff: README, SCREENS, COMPONENTS, navigation, data model, tokens, ANIMATIONS, PROGRESS |

## Checks

```bash
npm test
npx tsc --noEmit
npx expo lint
npx expo-doctor
```
