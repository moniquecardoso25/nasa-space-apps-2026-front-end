# Screens

Base size 390×844. Route names are the expo-router routes used by the app (`src/app/`). Dev-only: `/dev/components` (component catalogue + Bolt animation lab). `PNG` = file in `screenshots/`. Current user in mocks: `ast-01` (Ana), today = mission day 12.

## 1 · Sign in and onboarding

| Screen | Route | PNG | Content | Data | Goes to |
|---|---|---|---|---|---|
| Login | `/login` | AppLogin | Earth background, CosmoMedic logo, Crew ID + PIN, Sign in | `astronauts[].crewId` | Onboarding 1 (first time) or Home |
| Onboarding 1 · Welcome | `/onboarding/1` | AppOnb1 | Name, crew ID, mission, start, length, language. **Read-only** fields + note "filled by medical team" | `astronaut`, `mission` | Confirm → 2 |
| Onboarding 2 · Body | `/onboarding/2` | AppOnb2 | Height, weight, age, bone density, muscle mass, strength, aerobic, body fat (read-only) | `astronaut.profile`, `.baseline` | Confirm → 3 |
| Onboarding 3 · Vitals & habits | `/onboarding/3` | AppOnb3 | Resting HR, resting BP, usual sleep, bedtime, kcal goal, exercise goal, food prefs (read-only) | `baseline`, `mission.goals` | Confirm → 4 |
| Onboarding 4 · Devices | `/onboarding/4` | AppOnb4 | ARCHeR wrist band (connected), dosimeter badge, BP cuff (Pair), daily reminders switch | `astronaut.devices` | Continue → 5 |
| Onboarding 5 · Companion | `/onboarding/5` | AppOnb5 | Astronaut preview, name field ("Bolt"), Orbi + Journal/Private explanation. No color picker | `avatar.name` | Start mission → Home |

All onboarding screens: progress bar (5 steps), back button, sticky bottom button.

## 2 · Main tabs (tab bar: Home · Status · Orbi AI · Messages · Avatar)

| Screen | Route | PNG | Content | Data | Notes |
|---|---|---|---|---|---|
| Home | `/(tabs)/home` | AppHome (menu open), AppHomeClosed | Full-screen station scene (window with Earth, console, plant, floor). **Bolt walks** left↔right. Orbi drone + speech bubble (latest alert). Top-left: **Log button** (ring 3/7) that drops a vertical list: **Fill with Orbi** (N to go) + the 7 logs with Done / Log now; calendar button next to it. After Fill with Orbi, a card "Orbi saved N logs +N". Bolt is driven by the animation state machine (`ANIMATIONS.md`), equipped room/pet/helmet/suit are shown. Top-right: coins. Bottom-left: greeting + mission day bar; bottom-right: **status tag** ("Doing well" / "Attention" / "Alert", no number) → Status | `daily_summaries[today]`, `ai_chat.alerts`, `avatar` | Log menu items open each overview. Relax opens greyed screen |
| Crew status | `/(tabs)/status` | AppStatus | Header + coins · **status tag** card ("Doing well" / "Attention" / "Alert" + "3 of 7 logs done"; the numeric overall score and gauge were removed on request) · gold **Daily check-in +50** card with streak dots · **7-day scrubber** (tap a day: tag and counts change) · **green hologram body** with 8 callouts linked to body parts (mood/stress → head, BP/radiation → chest, muscle → arm, sleep → wrist band, exercise/bone → legs). Each area colored by level ok/warn/alert. **Open injuries** (active/healing) paint their area pink (holoAlert) and add a callout "Injury · Left hand · Healing" in an extra row below the body, linked by a dashed line to the area, opening the injury in Body. Legend below | `daily_summaries` (areas include injuries), latest logs per type, `baseline`, injury logs | Callouts open the matching overview. Pending ones show "+ Log today" |
| Orbi AI | `/(tabs)/orbi` | AppOrbi | Orbi header (on-board, no delay) · **Journal / Private** toggle + disclaimer · chat · "Saved to your journal" chip · quick replies (incl. "Fill today's logs") · input, **voice mode** button (teal wave), send. **Voice mode** (full screen, `VoiceMode`): Orbi speaks (TTS), listens, answers out loud, listens again; live **audio bar** (teal = your mic level, violet = Orbi speaking); EN/PT recognition chips; typing still possible; mic button = "done talking" / interrupt Orbi | `ai_chat.messages`, `.journal` | Private mode: never persist (also in voice mode) |
| Messages | `/(tabs)/messages` | AppMessages | Ground team header · delay banner "Earth is 20 min away" · thread with status (delivered / in transit + ETA bar) · composer: textarea, attach log, Mark urgent, Send | `ground_messages`, `mission.commDelaySec` | ETA = sentAt + delay |
| Calendar | `/calendar` | AppCalendar | Coming soon banner, month grid with check-in days + events, today/upcoming (all greyed) | `calendar` | Greyed but reachable |

## 3 · Avatar, shop and leaderboard

| Screen | Route | PNG | Content |
|---|---|---|---|
| Avatar · Helmet | `/(tabs)/avatar?tab=helmet` | AppAvatar | Header "Avatar & shop" + coins · stage with Bolt in a mini room · tabs Helmet/Suit/Room/Pets · item grid (Equipped / Owned / price) · Leaderboard link |
| Avatar · Suit | `?tab=suit` | AppAvatarSuit | Same layout, suit items |
| Avatar · Room | `?tab=room` | AppAvatarRoom | 3 horizontal scroll rows: **Window view** (9), **Wall** (7), **Floor** (6) |
| Avatar · Pets | `?tab=pets` | AppAvatarPets | 2-column pet grid; equipped pet shows in the stage |
| Leaderboard | `/leaderboard` | AppLeaderboard | Tabs **Daily logs / Coins**, podium top 3, list, note on how it counts |

Data: `astronauts[].avatar`, `shop`, `logs` (counts). Avatar animation state machine driven by `avatar.state` (idle, walking, happy, tired, sleepy, sad) **plus the astronaut's logs/summaries** — see `ANIMATIONS.md` (14 idle animations, status animations with priority, celebrate after saving, reduced-motion static pose).

## 4 · Logs (overview → add)

Pattern for every log: **Overview** = header with back → today summary → week chart/history → extra info → **sticky footer button**. **Add** = form → **sticky Save +10**. Each overview exists in two states (see `*Todo` / `*Done` PNGs).

| Log | Overview (route · PNG) | Add (route · PNG) | Overview shows | Add form |
|---|---|---|---|---|
| Mood | `/logs/mood` · AppMood (logged), AppMoodTodo | `/logs/mood/add` · AppMoodAdd | Week/Month/Mission tabs, mood line chart with face icons, average · best day · check-ins, Orbi insight, **"Shared with Orbi"** entries | **Vertical drag slider** (Great→Stressed, faces), tags, **"Anything else? Say it": optional voice note** (record ≤ 1 min with live bars, play back, re-record, delete; transcript when possible), Save "Okay" +10. Overview shows **"Your voice notes"** (player + transcript) |
| Sleep | `/logs/sleep` · AppSleep, AppSleepTodo | `/logs/sleep/add` · AppSleepAdd | Last night (duration, stages bar), week bars vs 7h target, **ARCHeR wrist band** data (light, movement, HR, noise), 16-sunrises tip | Bed/wake time (prefilled by band), rested 1–5, wake-ups, note |
| Radiation | `/logs/radiation` · AppRadiation, AppRadiationTodo | `/logs/radiation/add` · AppRadiationAdd | Mission total (illustrative), daily dose bars, area monitor + particle mix, recent readings | Personal/Area, value, read at, µSv/mSv, "Scan badge" |
| Body | `/logs/body` · AppBody, AppBodyDone | `/logs/body/add` · AppBodyAdd · `/logs/body/injury` · AppBodyInjury | Measurements list with cadence + status (Not logged / Logged Mon / Due today), trend vs baseline (dashed = 10% loss), **Injuries** list (Healing/Resolved) + Report button | Tabs Measurement/Injury. Measurement: metric chips (already-logged ones greyed), systolic/diastolic/pulse. Injury: where + side, what happened, severity, pain 1–5, description, photo, severe → flagged to ground |
| Meals | `/logs/meals` · AppMeals, AppMealsDone | `/logs/meals/add` · AppMealsAdd | kcal vs goal + macros, meals today with taste stars, week kcal bars, menu-fatigue warning | What you ate + quick picks, kcal, time, **taste 1–5 stars** |
| Exercise | `/logs/exercise` · AppExercise, AppExerciseDone | `/logs/exercise/add` · AppExerciseAdd | Ring today (60/90), week strip (done/missed/today), sessions today, week minutes vs 90 | Type, equipment, duration stepper, effort 1–5 |
| Relax | `/logs/relax` · AppRelax | — | Coming soon banner, content greyed (featured session, list) | — |
| Fill with Orbi (new, no PNG) | — | `/logs/orbi-fill` | Opened from the top row of the Home log menu ("Fill with Orbi · N to go") and from Orbi's quick replies. Orbi-chat style: Orbi asks only the categories not logged today (mood, sleep, radiation, blood pressure, meal, exercise); answer by voice (teal mic, dictation), text, or "skip". **Voice mode · answer hands-free** button opens the same `VoiceMode` conversation: Orbi reads each question aloud, listens, fills the card, says "Got it" and asks the next one; at the end it closes and the cards wait for confirmation. Each answer becomes an **editable confirmation card** (dashed teal, "Orbi guessed: …" for defaults); mood keeps the vertical slider as manual option. Sticky **Confirm & save N logs +N×10** → addLog per category → Home shows "Orbi saved N logs +N". Nothing is saved before confirming | Parser: `src/data/orbiParser.ts` (rule-based, EN + PT keywords, swappable for AI) |

## 5 · Ground dashboard (web)

`/ground` · AppDashboard (fluid page, 1440 wide). Sidebar · crew table (status tag, mood, sleep, radiation*, Orbi alert) · Orbi alerts with evidence + "Schedule check-up" · sleep 7-day average per crew · environment readings per module (temp, pressure, light, noise, radiation*, crew present) with module filter. Data: everything in `data/mock/`.

## Style guide

AppStyle.png — palette, type, components, rules.
