# CosmoMedic · build progress

Living log of the app build (React Native + Expo SDK 58, expo-router). Each stage ends with: web run, typecheck, visual comparison with `screenshots/`, this file updated and a commit.

How to run: `npm run web` (or `npx expo start`). Dev catalogue of components: `/dev/components`.

---

## Etapa 1 · Base — done

**Done**
- expo-router with every route in `navigation.json` (`src/app/`): login, onboarding 1–5, tabs (home, status, orbi, messages, avatar), calendar, leaderboard, ground, logs/* (overview + add), logs/body/injury, logs/relax, dev/components.
- `src/theme/tokens.ts` copied from `tokens/tokens.ts`, plus an `ext` block with values taken from `source/*.dc.html` (scene colors, alpha variants, two font sizes). `src/theme/fonts.ts` loads Sora 600/700 and Inter 400–700.
- `src/mocks/mock-db.json` (copy of `data/mock-db.json`).
- Data layer `src/data/`: `types.ts` (from `data-model.json`), `store.ts` (in-memory db + `useData` hook), `api.ts` (getAstronaut, getLogs, getLatestLog, isLoggedToday, getDailySummary(ies), addLog, updateLog, saveDailyLog, Orbi/journal/alerts, ground messages + ETA, shop buy/equip, leaderboard, calendar), `format.ts`. Screens never import the JSON.
- Current user = `currentAstronautId` (ast-01), today = `mission.today` (12).
- Components from `COMPONENTS.md` in `src/components/`: Screen/Footer, Header, TabBar, Card (+CardTitle, StatTile, InfoNote), PrimaryButton, SecondaryButton, RewardChip, LogStateButton, Chip, Segmented, Field, Rating, Toggle, WeekBars, TrendLine, Ring, Gauge, ProgressBar, MoodFace, MoodSlider, CoinsPill, StatusDot, TodayChip, Badge, Legend, HologramBody, Callout(+lines), DayScrubber, LogMenu, Astronaut/BoltFigure, OrbiDrone, ChatBubble, Icon (45 icons).
- `/dev/components` shows all of them.

**Decisions**
- Docs moved from `docs/` to `docs/design/` (the path used by the brief and by README's suggested CLAUDE.md line).
- Icons: the 45 stroke icons were extracted from `source/*.dc.html` (exact paths) instead of `lucide-react-native`, so they match the screenshots 1:1.
- Values present in the source CSS but missing in `tokens.ts` live in `tokens.ext` (documented there). No other colors/sizes are used.
- Header title uses `font.size.screenTitle` (17) everywhere; some sources use 15, the token wins.
- `Chip` default selected tone = teal (COMPONENTS.md / style guide); mood tags use the lilac variant shown in AppMoodAdd.
- Web keeps a phone-like frame (max width 430, centered). `?frame=390` pins the design width (used for screenshots).
- Station clock = UTC (ISS uses GMT). `getNow()` = date of `mission.today` + real time of day.
- Data is in memory and resets on reload (no backend yet).
- `logsTotal` = 7 (mood, sleep, radiation, meal, exercise, measurement, meditation) as in the mock; injury is not counted. Because Relax/meditation is "coming soon", a day with 6/7 is shown as complete (green) in the day scrubber.
- Daily summary: mock file is the base (score, areas); `logsDone` is recomputed from logs; each new log adds +2 to the score (cap 100).
- `typedRoutes` and `reactCompiler` experiments turned off (hrefs are built dynamically from data; the external store doesn't need the compiler).
- Mock login: a known Crew ID + any 4-digit PIN.
- Bolt is built from layered SVG parts inside `Animated.View`s (pivot per limb) so Reanimated can animate head/arms/legs on native and web.

**Pending**: all screens (stages 2–5).

---

## Etapa 2 · Login and onboarding — done

**Done**
- `/login`: Earth background, logo, Crew ID + PIN, Sign in (validates against `astronauts[].crewId`, PIN = any 4 digits), inline error.
- `/onboarding/1–5` with shared `OnboardingShell` (back, "Step n of 5", 5-segment progress, sticky CTA).
  - 1 Welcome, 2 Body baseline, 3 Vitals & habits: every field read-only (dashed `Field readOnly`), values from `astronaut.profile/baseline` and `mission.goals`; read-only food-preference chips; "filled by medical team" note.
  - 4 Devices: wrist band / dosimeter status from `astronaut.devices`, BP cuff "Pair" (simulated), daily reminders switch, "Simulated for the hackathon" badge.
  - 5 Companion: Bolt preview on a platform, editable name (saved to `avatar.name`), Orbi Journal/Private explanation, "Start mission" → Home.
- Flow verified in the browser via CDP: `/` → `/login` → Sign in → `/onboarding/1` … `/onboarding/5` → Start mission → `/home`.

**Decisions**
- All mock astronauts already have `onboardingDone: true`. To keep Login → Onboarding reachable (navigation.json), the first sign-in of each app session shows onboarding; after "Start mission" later sign-ins go straight to Home (`src/data/session.ts`).
- Login fields are prefilled with Ana's Crew ID and a demo PIN to speed up demos.
- Onboarding values come from the mock, so a few numbers differ from the PNGs (e.g. muscle mass 27 vs 28, resting HR 66 vs 62, badge CPD-0413 vs 0412). Data wins.
- Pair / reminders are UI-only (no field for them in the data model).
