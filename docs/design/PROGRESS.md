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

---

## Etapa 3 · Home and Crew status — done

**Done**
- Home (`/(tabs)/home`): full station scene (window with stars + gradient Earth, land, clouds, night side, city lights; console; plant; teal floor), Orbi drone floating, Orbi speech bubble from the latest `ai_chat.alerts` entry (→ Orbi), Bolt walking left ↔ right (18 s loop, legs/arm swing, bob, flips at each end), greeting + mission day bar, "Stable 72" → Status, coins pill, calendar button.
- Log button with ring (`logsDoneCount/7`) opens/closes the LogMenu (chevron rotates; tap outside closes). 7 rows with Done / Log now from `isLoggedToday`; Relax shows a chevron. Each row opens its overview.
- Reduced motion: Bolt stands still (idle pose) and Orbi/hologram stop floating.
- Crew status (`/(tabs)/status`): header + sync time, Overall gauge (score, label, logs done), gold Daily check-in card (streak + 7 dots), 7-day DayScrubber (tap a day → gauge, counts, hologram areas and callouts change), green hologram (grid, beam, scanlines, platform, hover + flicker) colored by `daily_summaries.areas`, 8 callouts linked to body points with ok/warn/alert. Pending callouts on today show "+ Log today" and open the add form; others open the overview. Legend.
- Derived values live in `src/data/derived.ts` (`dayVitals`, `orbiNudge`, deltas, radiation total, exercise minutes).

**Decisions**
- Log menu starts closed (both states are reachable; AppHome = open, AppHomeClosed = closed).
- Home window shrinks on short screens so the floor never covers it; the bubble and drone follow the window bottom.
- Orbi bubble text is a friendly line per alert type (poor_sleep → "sleep was short last night. Wind down at 21:00?", etc.).
- Overall label: ≥70 Stable (green), 50–69 Attention (yellow), <50 Alert (pink).
- Daily check-in = today's mood log. Streak = consecutive days with a mood log. The 7 dots show progress to the next 7-day streak; completing it gives the "+50 coins" bonus (`saveDailyLog('mood')`).
- Callouts: Muscle uses `muscle_mass` deltas, falling back to `strength` (the mock has no muscle_mass logs). Levels: bone ≤−1.5% warn / ≤−3% alert; strength/aerobic ≤−5% warn / ≤−10% alert; sleep ≥7 h ok / ≥5 h warn; exercise ≥90 min ok; BP ≥130 warn / ≥140 alert; stress from mood level + tags. Radiation = cumulative personal dose (illustrative, never alert).
- Viewer's right = `armR`/`legR` on the hologram (matches AppStatus + mock).
- Known dev-only quirk: loading `http://localhost:8081/status` directly hits Metro's own `/status` endpoint. In-app navigation and exported builds are fine.

---

## Etapa 4 · Logs (overview → add) — done

**Done**
- Shared kit `src/components/LogKit.tsx`: LogScreen (header + sticky footer), SavedBanner ("Saved · logged today +10" / "Changes saved", 5 s), ListRow, MetricTile, Stars (display + input), Note (info/warning/danger), ComingSoon, Greyed, Stepper, Group, ChipRow.
- Every overview uses `LogStateButton`: not logged → `Log today +10`; logged → green `✓ Logged today` + `Edit` (meals/exercise/body: `Add`). Matches the `*Todo` / `*Done` PNGs.
- Mood: Week/Month/Mission tabs, mood line chart with faces, trend, average · best day · check-ins, Orbi insight, "Shared with Orbi" journal entries. Add: draggable vertical slider (responder system, mouse/touch/pen, a11y increment/decrement) + tags; edits today's check-in when it exists.
- Sleep: last night (duration vs 7 h target, bed/quality/woke, illustrative stage bar), week bars vs target, ARCHeR band tiles, 16-sunrises tip. Add: bed/wake prefilled from the band, total, rested 1–5, wake-ups, note.
- Radiation: mission total (illustrative badge), daily dose bars, area monitor from `environment_readings` with neutron mix, recent readings. Add: personal/area, value, read at, µSv/mSv, simulated "Scan badge".
- Body: 5 measurements with cadence + status (Not logged today / Logged Fri / Due today), trend vs baseline (dashed = −10%), injuries (Healing/Resolved/Active) + Report button. Add: Measurement tab (metric chips, already-logged greyed with ✓, BP systolic/diastolic/pulse or value + unit, % vs baseline computed); Injury tab (where + side, what, severity, pain 1–5, description, simulated photo, severe → `flaggedToGround`). `?id=` opens an existing injury to update its status (no coins).
- Meals: kcal vs goal + macros, meals today with stars, week kcal bars, menu-fatigue warning. Add: what you ate + quick picks (fill name and kcal), kcal, time, 1–5 stars.
- Exercise: ring today (min vs 90), week strip (done / missed / today / future), sessions today, week minutes vs 90. Add: type, equipment, duration stepper, effort 1–5.
- Relax: "Coming soon" banner, content greyed (opacity 0.4 + grayscale) and not interactive, but reachable.
- Every save = +10 coins (`addLog`), "Logged today" updates everywhere (Home menu ring, Status, overviews). Verified via CDP: drag slider → Save "Great"; meal save → +10 banner → Home coins 1,250 → 1,260, ring 3/7 → 4/7, Meals "Done".

**Decisions**
- Once-a-day logs (mood, sleep, radiation) are edited in place when they already exist today (no extra coins); meals, exercise, measurements and injuries add a new log each time (+10).
- Saving returns to the screen that opened the form (overview, Home or Status).
- Meal macros are estimated from kcal (15/55/30 %) because the form has no macro inputs; macro goals 90/300/80 g come from AppMeals (constant `MACRO_GOALS`).
- Menu fatigue = same meal 3+ days in a row with average taste ≤ 3, or an Orbi `menu_fatigue` alert.
- Weekly measurement is "up to date" when logged in the last 7 days; BP (daily) when logged today. Value color follows the status (green logged / gold due), as in AppBody.
- Exercise week strip uses the calendar week (Mon–Sun); other week charts use the last 7 mission days.
- Sleep stage bar is illustrative (built from duration + wake-ups); the data model has no sleep stages.
- Time inputs are plain `HH:MM` text fields with a mask (no native time picker yet).

---

## Etapa 5 · Orbi, Messages, Avatar & shop, Leaderboard, Calendar — done

**Done**
- Orbi AI (`/(tabs)/orbi`): header (on board, no delay), Journal/Private toggle + disclaimer, chat with day/time separators, "Saved to your journal (Shared with Orbi) · View" chip, quick replies, input, greyed mic, send.
  - Journal: messages go to `ai_chat.messages` and each astronaut message creates a `journal` entry (shows in Mood › Shared with Orbi).
  - Private: messages live only in component state; nothing touches the db (verified: private text never appears in Journal).
  - Replies come from `src/data/orbi.ts` (rule-based, reads the astronaut's logs). Quick replies send text or open screens.
- Messages (`/(tabs)/messages`): delay banner from `mission.commDelaySec`, thread grouped by day, ground messages "arrived HH:MM", own messages "In transit · arrives on Earth ~HH:MM" + ETA bar or "Delivered HH:MM". ETA = `sentAt + commDelaySec`, recomputed every 15 s. Composer: textarea, attach today's logs (paperclip), Mark urgent, Send.
- Avatar & shop (`/(tabs)/avatar?tab=helmet|suit|room|pets`): stage with Bolt in a mini room (equipped wall, floor, window view, pet), name + level + logs, 4 tabs synced to `?tab`, grids (helmet/suit 3 cols, pets 2 cols), Room = 3 horizontal rows (Window 9, Wall 7, Floor 6). States Equipped / Owned / price. Owned → equip; price → confirm sheet → buy & equip (coins spent) or "need N more coins". Leaderboard link with ranks.
- Equipped items show everywhere Bolt appears: helmet/suit colors on Bolt, pet on the Home floor, window view / wall / floor in the Home scene.
- Leaderboard: Daily logs / Coins tabs, podium top 3 (1st gold), list, explanation.
- Calendar (`/calendar`): Coming soon banner; month grid with check-in ticks, event dots and today; Today + Coming up events from `calendar.json` — all greyed and not interactive but reachable.

**Decisions**
- Shop sprites in `shop.json` (`assets/shop/*.png`) don't exist; items are drawn in SVG from `src/data/shopArt.ts` (colors/patterns copied from the AppAvatar* sources).
- Suit shading/boots are derived from the suit color (mixed with `color.bg`), helmet color only tints the head.
- Buying an item equips it right away. Tapping the equipped pet unequips it (pet can be null).
- Orbi quick replies change with the last answer; the default set is the one in AppOrbi.
- Leaderboard uses the 4 mock astronauts (the PNG shows a 5th, "Sam", that is not in the mock).
- Message status is derived from the clock (`now ≥ ETA` → Delivered), not from the stored `status` field.

---

## Etapa 6 · Review — done

**Done**
- Swept every route in a headless browser (CDP, 390×844): `/`, `/login`, `/onboarding/1–5`, `/home`, `/status` (via tab), `/orbi`, `/messages`, `/avatar?tab=helmet|suit|room|pets`, `/calendar`, `/leaderboard`, `/ground`, all `/logs/*` overviews and forms, `/logs/body/injury?id=…`, `/logs/relax`, `/dev/components`. No console errors or warnings.
- Ground dashboard `/ground` built (it is in navigation.json): sidebar, crew table (overall, mood, sleep, radiation*, Orbi alert), Orbi alerts with evidence + "Schedule check-up" toggle, sleep 7-day averages, environment readings per module with filter. Fluid width (the phone frame is skipped for this route).
- `npx tsc --noEmit` clean, `npx expo lint` clean (fixed React Compiler lint rules: no render-time mutation, Reanimated `.set()`, no setState in effect bodies), `npx expo-doctor` 20/20, Android bundle exports (`expo export -p android`).
- AGENTS.md got the "UI work" line suggested by README.

### Summary after stage 6

**Ready**
- All screens of SCREENS.md sections 1–5 with live mock data, the overview → add pattern with +10 coins, Home scene with log menu and walking Bolt, Crew status hologram with 7-day scrubber, Orbi journal/private chat, messages with comm delay/ETA, avatar shop (buy/equip, items reflected on Bolt and in the Home room), leaderboard, greyed Calendar/Relax, ground dashboard.

**Simplified**
- Data is in memory (resets on reload). Orbi replies are rule-based. Device pairing, badge scan and photo are simulated. Shop items are SVG drawings (no sprites). Sleep stages bar is illustrative. Time inputs are masked text fields.

**Missing (at this point)**
- Real backend/persistence and auth; native run on a device was not tested here (only the Android bundle build); voice input; ground dashboard navigation items other than "Crew overview" are static.

---

## Etapa 7 · "Fill with Orbi" (voice-guided logging) — done

**Done**
- New route `/logs/orbi-fill` in the Orbi chat style: header with Orbi, step chips (one per open category), chat bubbles, editable draft cards, composer with **active teal mic** + text + send, "Skip" and (for mood) "Use the slider".
- Entry points: top row of the Home log menu ("Fill with Orbi · N to go", teal mic icon) and Orbi's quick replies ("Fill today's logs"). The normal Orbi chat mic stays greyed.
- Orbi asks only the categories not logged today, in order mood → sleep → radiation → blood pressure → meal → exercise. If an answer is not understood it asks once more with an example, then uses defaults and flags them.
- Every answer becomes an editable confirmation card (dashed teal border, "Orbi guessed: … Please check." for defaulted fields, Remove). Mood card: 5 faces + tags + "Use the slider instead" (vertical MoodSlider inline).
- Nothing is saved until **Confirm & save N logs +N×10**: `saveDrafts` calls `addLog` / `saveDailyLog` per category (+10 each), so "Logged today" updates everywhere; then Home shows "Orbi saved N logs · … +N" (dismissable).
- Voice: `expo-speech-recognition` via `src/voice/speech.ts` (native module in dev builds, Web Speech API on web). When it is unavailable (Expo Go, unsupported browser) the mic is hidden and only text is used. Permissions configured in `app.json`.
- Parser isolated in `src/data/orbiParser.ts` behind `OrbiFillParser` (`parse(category, text, ctx) → { draft, understood, assumed, skipped }`); rule-based numbers, clock times, durations and EN/PT keywords ("bem", "cansado", "dormi 6 horas e meia", "125 por 82, pulso 70", "45 min on the treadmill, hard"). Swap `orbiParser` for an LLM later.
- Verified in the browser: Ana (3 open categories, one unclear answer → retry) → Confirm → Home 3/7 → 6/7, coins +30, summary card; Leo (all 6 open, one skipped) → 5 logs saved. Sleep parsing checked with 4 phrasings (6h30, 6h45, 7h, 8h).
- Docs updated: SCREENS.md (new row), navigation.json (`OrbiFill` + links from Home/Orbi), data-model.json (`fillWithOrbi`).

**Decisions**
- "Body" in the interview = blood pressure (the daily measurement); weekly metrics stay in the Body form.
- A category that already has a log today is never asked; mood answered here when it doesn't exist yet counts as the daily check-in (streak/+50 bonus rules apply).
- Speech language is `en-US`; the parser also understands Portuguese keywords.
- Voice needs a development build on phones (`npx expo run:android|ios`); Expo Go falls back to text.

---

## Etapa 8 · Bolt animation state machine — done

**Done**
- `src/avatar/` with a reducer state machine (`machine.ts`), catalogue (`animations.ts`: 14 idle, 11 status, 1 event), status derivation from data (`status.ts`) and the Reanimated runner `BoltActor.tsx`. Documented in `docs/design/ANIMATIONS.md`.
- Idle: walk, wave, stretch, float, look out the window, drink coffee, use the console, water the plant, play with the pet, read the tablet, jump, spin, sit, small yawn — weighted random with duration ranges, walking to the right spot first.
- Status (priority over idle): tired → yawn / slow walk / nap; low mood → sit and look at Earth; happy → dance / cheer; stress → pacing; leg injury → limp; arm injury → hold the arm; back/neck → hold the back; low exercise → stretch; menu fatigue → poke the food; just saved → short celebration (when Home regains focus).
- A new top status interrupts an idle animation; transitions blend every channel in 280 ms; reduced motion = static pose of the current status (verified: two frames 2.5 s apart are identical).
- Art stays the design's Bolt in react-native-svg (two eyes, visor, backpack) with animatable head, arms, legs, body; new hand props (cup, tablet, watering can, food tray) and overlays (zzz, sparkles, notes, sweat).
- `/dev/components` › "Bolt animations": force any animation, Auto mode, simulate statuses, current animation + reason.
- Home uses `BoltActor` (Ana today: arm-injury + tired statuses → holds her arm, yawns, naps, mixed with a little idle life).
- Docs: SCREENS.md, COMPONENTS.md and data-model.json point to ANIMATIONS.md.

**Decisions**
- Reducer instead of XState (no new dependency, pure and easy to test).
- Status animations may repeat; idle ones never repeat back to back. Idle weight ×0.05 while a status is active.
- "Celebrate" is triggered by Home focus after a new save (not while the form is open), once per save.
- Shared values are written with `.set()` (React Compiler friendly).
