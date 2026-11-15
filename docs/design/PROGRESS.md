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

---

## Etapa 9 · Injuries on the Crew status hologram — done

**Done**
- `getDailySummary().areas` now merges injuries: every injury logged up to that day with status `active` or `healing` sets its area to `alert` (pink `holoAlert`). Mapping in `injuryAreas()` (`src/data/api.ts`): head/neck → head, back → torso, arm/hand → armL/armR by side, leg/knee/foot → legL/legR by side ("center" → both). Documented in data-model.json.
- Crew status adds one callout per open injury ("Injury · Left hand" / "Healing" or "Active", pink) in an extra row below the body on the injury's side, linked by a dashed line to the hurt area; tapping opens `/logs/body/injury?id=…` (status Active/Healing/Resolved can be updated there).
- Verified: Ana's left-hand bruise (healing, day 9) turns the left arm pink with the callout; marking it Resolved returns the arm to green and removes the callout. The day scrubber shows it from day 9 on.
- The Bolt state machine already reads the same injuries (arm injury → guards the arm).
- SCREENS.md updated.

**Decisions**
- Injury status is not versioned in the mock, so past days use the current status (an injury resolved today disappears from past days too).
- Up to 4 injury callouts (2 per side); the stage grows by 92 px per extra row.

---

## Etapa 10 · Final review — done

**Docs ↔ app consistency (fixed)**
- README: lists `ANIMATIONS.md` and `PROGRESS.md`; Coming-soon note clarifies that voice is live only in Fill with Orbi (normal Orbi chat mic stays greyed); Orbi rule mentions Fill with Orbi.
- SCREENS: routes are the real expo-router routes; Home log menu has the Fill with Orbi row + summary card; Orbi quick replies; Crew status injury callouts; Fill with Orbi row in section 4; Avatar points to ANIMATIONS.md.
- COMPONENTS: real icon source (design paths, not lucide), Chip tones/readOnly, LogMenu special row, and a table of components added during the build.
- navigation.json: `OrbiFill`, `DevComponents`, and the new links (Home/Orbi → orbi-fill, Status → add forms and injury). Script check: all 33 routes/links map to a file in `src/app/`; all referenced screenshots exist.
- data-model.json: added `currentAstronautId`, `mission.today`, `daily_summaries.logsTotal`, coin/streak/clock conventions, injury-aware `areas`, derived message status, shop asset note, `fillWithOrbi`, Bolt statuses.
- tokens/tokens.ts + tokens.json now mirror `src/theme/tokens.ts`, including the `ext` block (values taken from the design sources). Base tokens were already identical.
- Root README rewritten for the project; AGENTS.md has the "UI work" line.

**Checks**: `tsc` clean · `expo lint` clean · `expo-doctor` 20/20 · Android bundle and web production export build · every route opened in a headless browser with no console errors (the only console output is Reanimated's dev-only notice when reduced motion is emulated).

## Final summary

**Ready**
- Every screen in SCREENS.md, built from the tokens and checked against the PNGs: login, onboarding 1–5 (read-only), Home station scene (log menu, coins, Orbi nudge, equipped room/pet, Bolt state machine), Crew status (gauge, check-in streak, 7-day scrubber, hologram with callouts and injuries), Orbi (Journal/Private), Messages (comm delay, ETA, delivered/in transit), Avatar & shop (4 tabs, buy/equip), Leaderboard, Calendar and Relax (greyed, reachable), all log overviews (Todo/Done states) and add forms, injury reports, ground dashboard.
- Coins: +10 per log, +50 for a 7-day check-in streak, spent in the shop; "Logged today" consistent across Home, Status and overviews.
- Fill with Orbi: voice/text guided logging with an isolated, replaceable parser and editable confirmation.
- Bolt animation state machine (14 idle + status + celebrate), reduced-motion aware, with a dev selector.

**Simplified**
- In-memory data (no backend, no persistence, resets on reload); mock login (any 4-digit PIN).
- Orbi replies and the Fill-with-Orbi parser are rule-based (EN/PT keywords), not an AI model.
- Device pairing, badge scan and injury photo are simulated; shop items are SVG drawings; sleep stage bar is illustrative; meal macros are estimated from kcal; injury status has no history (past days use the current status).
- Time inputs are masked text fields, not native pickers. Speech recognition language fixed to en-US.

**Missing / next**
- Real backend + auth, sync of logs and messages with the ground team, real Orbi AI (LLM behind `OrbiFillParser` and `orbiReply`), ground replies.
- Native testing on devices (only bundles were built here); voice needs a development build.
- Ground dashboard: only "Crew overview" is implemented; Environments/Alerts/Schedule/Messages sidebar items are static.
- Calendar and Relax content (coming soon by design); notifications/reminders.

## Follow-up · animated backgrounds, no Bolt shadow

- Stars twinkle and move in two parallax layers (sway on login, wrapping drift in the Home window).
- Home window Earth turns: land and clouds (wind, faster) scroll inside the round clip; the planet floats. Login/Relax Earth floats.
- Bolt's floor shadow removed (`BoltShadow` deleted).
- Decision: speeds and amplitudes are motion values, not colors/sizes, so they live next to the components (documented in ANIMATIONS.md). Reduced motion keeps every background static (verified: identical frames).

## Follow-up · status tag, voice mode, mood voice notes, alive logo

- **Overall score removed from the UI.** Home pill, Status card and the ground table show a status tag only (`healthTag()`: ≥70 "Doing well", ≥50 "Attention", else "Alert"). `overallScore` stays in the data as the internal source of the tag. The `Gauge` remains in the dev catalogue only.
- **Voice mode** (`VoiceMode`): hands-free loop speak → listen → answer, with a live audio bar (teal = mic level, violet = Orbi speaking, muted = thinking). In Orbi chat (Journal/Private respected) and Fill with Orbi (reads each question, fills the card, moves on; cards still need "Confirm & save"). Orbi always answers in English (rule-based replies are English).
- **Speech engines** (`src/voice/speech.ts`): native recognizer on phones, Web Speech on Chrome/Edge/Safari, **on-device recognizer** (first Whisper, now Moonshine — see below) on Firefox and as automatic fallback when the browser recognizer fails (network/service errors). Whisper = transformers.js 3.7.6 from jsDelivr + `Xenova/whisper-base` q8 (~77 MB, cached). Decision: whisper-tiny (~41 MB) misheard "118 over 76, pulse 64" as "187/76" in tests; base got it right. Voice-activity detection ends a turn after ~1.3 s of silence.
- **TTS** (`src/voice/tts.ts`, expo-speech): picks the most natural voice for the language; safety timer so a browser that never fires `onend` can't freeze the loop.
- **Mood voice note**: "Anything else? Say it" on the check-in (expo-audio, ≤ 60 s, live bars, play back / re-record / delete). Transcript: live via Web Speech, or Whisper after recording (Firefox / fallback). Phone: audio only. Saved as `mood.data.voiceNote`; the Mood overview lists "Your voice notes".
- **Login robot** blinks, glances and tilts at random natural intervals (also onboarding 1). Reduced motion → static.
- New icons (pause, stop, close, trash, wave) drawn in the same 24 px stroke style. New control sizes (voice mode mic 76, end 56) are not in the design; touch targets use `size.touch` (44) elsewhere.
- Tested in headless Chrome with a fake microphone (Windows TTS WAVs): Web Speech removed (Firefox simulation) → Whisper transcribed EN and PT phrases exactly; browser recognizer forced to fail → automatic Whisper fallback; Fill voice mode created the BP card 118/76/64; voice note recorded, transcribed, saved and played back on the overview; TTS calls use "Google US English"; Private voice chat not saved to Journal.
- Not verified here: real Firefox and real phones (no device); first Whisper download time depends on the connection.
- Follow-up: the EN/PT recognition chips were removed on request (user reported it not understanding speech). Voice input is English only (`VOICE_LANG` in `src/voice/speech.ts`); the voice-mode header now names the active recognizer (browser / on-device Whisper / phone) to help diagnose.

## Follow-up · Earth window views

- 4 new window views in the shop (Room › Window view): **Beach** 400, **Countryside** 350, **Mountains** 450, **City lights** 500 (`window-beach`, `window-field`, `window-mountains`, `window-city`) in `src/mocks/mock-db.json`, `docs/design/data/mock-db.json` and `docs/design/data/mock/shop.json`.
- Drawn by `EarthScene` (`ShopArt.tsx`) on a 100×100 canvas that fills any size; **only existing palette tokens** (sky = loginEarth/earthLight, sea = earthMid, sand, land/landLight/plantMid, gold sun, consoleBar/console/track for mountains and buildings, gold lit windows). Decision: the design has no art for these, so they are a "window screen" showing places on Earth, in the same flat style.
- Home window: beach/countryside clouds drift (70 s loop, wraps); mountains (dusk) and city (night) get the twinkling, drifting stars only in the top 30 % of the sky. Reduced motion → static.

## Follow-up · voice latency and noisy rooms

User report (Firefox): answer took ~16 s, stayed "Listening…" and heard "sixty" for "sixty-four".
- **Cause 1 — voice detection**: the noise floor was measured only in the first 0.3 s; steady room noise (fan, PC) above it kept the turn open until the 15 s limit. Now the floor adapts all the time (starts at the room level, creeps up over ~6 s, drops fast), speech must be ~7 dB above it (hysteresis), the turn ends after 1 s of quiet (max 12 s), and only the spoken part (+ margins) is transcribed. Reproduced with a −35 dBFS fan-noise WAV: end of speech detected 1.2 s after the last word (was ~10 s).
- **Cause 2 — transcription speed**: Whisper always encodes a fixed 30 s window: 8.6 s for a 5 s answer (single-thread WebAssembly). Switched the on-device engine to **Moonshine base** (`onnx-community/moonshine-base-ONNX`, q8, ~63 MB, English): **~1.5 s** for the same clip, same phrase accuracy. Possible because voice input is English-only now.
- The model is downloaded **and warmed up** (one silent inference) when a voice screen opens; voice mode waits for it ("Getting voice ready… N %") before opening the mic, so the first-use download/compile can't stall the voice detection.
- Audio is trimmed and peak-normalized before transcription (Moonshine occasionally returned nothing for clips with a long silent start / clipped peaks: 1 of 4 runs → 5 of 5 after the fix), with one retry if the result is empty.
- Listening label says "tap ■ when you finish" (manual stop always transcribes).
- Result in tests (headless Chrome, model cached): Fill voice answer ~1–2 s after the last word, with background noise; voice-note transcript ~1 s after Stop.
- Next idea if it is still slow on weak machines: run the model in a Web Worker and enable multithreaded WASM (needs COOP/COEP headers on Vercel).

## Follow-up · numbers in words, "writing down…" loader, LLM note

- Speech recognizers often write numbers in words ("sixty four") and the rule parser only read digits (plus one…twelve). New `src/data/spokenNumbers.ts` converts them before parsing: compounds, hundreds ("one hundred eighteen", "one eighteen"), thousands, decimals ("forty point five"), "and a half", "half an hour", "an hour and a half", spoken clock times ("at eleven thirty" → 11:30, "ten o'clock"), and the "sixty for" homophone. Tested: 18/18 converter cases; parser 11/11 spoken answers across mood, sleep, radiation, BP, meal, exercise (compiled with the project's tsc, run in Node).
- Parser fixes found on the way: bedtime 7–11 without am/pm = evening; "calories" no longer cut to "ories" in meal names; no trailing comma in names.
- Voice mode shows a loader as soon as the sentence ends: "Got it! Writing down what you said…" (spinner) → "Orbi is thinking…"; the Fill dictation mic shows the same.
- Decision (user): **no LLM in this prototype** — fill predefined answers and numbers only. README now explains "Orbi today (rules) and next (LLM)": the LLM goes behind `OrbiFillParser` and `orbiReply`, on board or delay-tolerant, keeping confirm-before-save and Private mode.

## Follow-up · examples everywhere, temporary-model tag, same listening behaviour everywhere

- Example phrases are visible from the start in everything spoken: voice mode "Try saying" box (Fill: the current question's example, updated each question; chat: phrases the rule-based Orbi understands), Fill dictation (existing hint line, now English spoken-style examples), mood voice note ("e.g. Long lab shift today…").
- `PrototypeTag` (gold): "Temporary speech recognition · a better model will replace it" — about the **listening model**, not Orbi — on voice mode, next to Fill's voice controls, and on the mood voice note.
- Listening audit (3 places: voice mode for chat + Fill, Fill dictation mic, mood voice note): all use `startListening` / the same on-device model, adaptive voice detection, English, model download + warm-up before the mic opens (now inside `listenWhisper`, so every place gets it, with "Getting voice ready… N %"), and the same "Got it! Writing down what you said…" loader with spinner. The model now yields one frame before running so the loader is painted first.
- While the voice is busy (getting the model ready / writing down), the mic is already closed (tracks stopped before transcribing; never open while Orbi speaks) and the controls now show it: voice-mode mic and Fill mic are dimmed and disabled, the Fill input placeholder says "Writing down what you said…", and the voice note hides Re-record / Delete until the transcript is done.
- Fill shows answers with digits: the transcript is passed through `spokenToDigits` (now case-insensitive, keeps the rest of the text) before the chat bubble, the voice-mode "heard" line and the parser — "A hundred and eighteen over seventy-six, pulse sixty-four" → "118 over 76, pulse 64". Orbi chat and voice notes keep the natural words.

## Follow-up · voice prepared up front, in a Web Worker

User report: the page was very laggy while voice got ready; asked to download first and only allow voice after.
- The on-device model now runs in a **module Web Worker** (`whisper.web.ts`, blob-URL worker importing transformers.js from jsDelivr); main-thread fallback only if module workers are unavailable. Loading + warm-up + transcription no longer block the UI: during the first-use download and setup the longest main-thread task was 225 ms / largest frame gap 334 ms (was several seconds of freeze).
- **Gate** (`useVoiceGate` + `VoicePrep`): Orbi chat, Fill with Orbi and the mood check-in start the download **as soon as they open**; voice mode, mic and "Record a voice note" stay dimmed/disabled with "Preparing voice (one time only)… N % · you can type meanwhile" → "Voice almost ready…" → unlocked. Error → "Voice couldn't load · Retry". Typing always works. Browser / phone recognizers need no download, so nothing is gated there.
- Timings (headless Chrome): first use ~22 s to unlock (one run took 150 s — download hiccup; raw model download is ~4 s at 10 MB/s), cached ~5 s.

## Follow-up · "I finished talking but it keeps listening"

- Likely cause: browsers (Firefox) deliver all-zero mic frames for a moment after the mic opens; the detector took that zero as the room level, so normal room noise counted as speech and the turn only ended at the 12 s limit.
- Voice detection v3 (`listenWhisper` in `speech.ts`): ~300 ms room calibration that ignores zero frames (min of real frames); floor follows the room; to *keep* speaking the level must stay within ~14 dB of the voice's own peak (steady noise or gain pumping after you stop = silence); turn ends after 1 s of quiet; max 10 s per answer (was 12 s); browser auto-gain disabled on our mic stream (it raised the noise when you stopped).
- Live feedback: "Listening… hearing you" while voice is detected, "Listening… finishing (or tap ■)" after 350 ms of quiet — in voice mode and in the Fill mic — so it is visible what the detector thinks.
- Tested with the mic forced to start with 500 ms of zeros, on 4 recordings (steady fan noise, silent start + room noise, gain pumping to −30 dBFS after speech, clean speech): every turn ended ~1 s after the last word and the BP card was filled.

## Follow-up · 6 counted logs, "All caught up" screen

- Meditation (Relax is "coming soon") no longer counts: `COUNTED_TYPES` = mood, sleep, radiation, measurement, meal, exercise → Log ring "N/6", Status "N of 6 logs done", day scrubber, ground. Score bonus compares with the stored snapshot using the same 6 types.
- Fill with Orbi with nothing left shows **"All caught up!"**: big check, the 6 categories "✓ Logged", "Come back tomorrow…", Back to Home / Talk to Orbi (was a single chat bubble). It doesn't start the voice download (nothing to say).
- Tested: Ana 3/6 → filled BP, meal, exercise → confirm → ring 6/6, menu all Done, Fill shows All caught up, Status "6 of 6 logs done".


## Backend integration - username/password authentication

- Default data source: Crew Health API at `https://crew-health-api-univesp.azurewebsites.net/api/v1`; opt-in mock mode remains available through `.env.local`.
- Login uses `/auth/login` with username/password, following the standard backend contract; `/app/auth/login` with Crew ID/PIN is a separate supported backend route, not used by this UI.
- Authenticated snapshot supplies the existing UI model, including mission, profile, baseline, logs, summaries, alerts, messages, shop, calendar and environment readings. Ground access is restricted by role.
- Remote mutations: logs, edits, onboarding, device settings, purchases/equipment, messages, Orbi Journal/Private chat and audio uploads. API-confirmed IDs, balances and streak bonuses replace local reward calculation.
- Async save actions show pending/error states and preserve forms on failure. Reads refresh after writes and every minute. Refresh-token rotation, logout and expired-session routing are connected.
- Uploaded mood audio maps the backend `url` field to the player's `uri`. Simulated injury photos are disabled in real API mode.
- Fill with Orbi saves sequentially and removes each confirmed card, allowing remaining cards to be retried after a partial failure.
- Tests cover HTTP authentication, refresh concurrency, server log responses, failed writes, uncertain retry idempotency, audio URL mapping and Private mode. See README for configuration and limitations.
- Live authenticated end-to-end validation remains pending a valid backend test account. No credentials are committed.

- Validation: 11 HTTP tests passed, TypeScript and Expo lint passed, web production export completed. Public health/mission endpoints and CORS preflight accepted Authorization, Content-Type and Idempotency-Key. Authenticated server tests and real device testing require a valid account/device.
