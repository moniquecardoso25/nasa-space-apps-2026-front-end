# Orbi — design handoff

Health monitoring app for astronauts (NASA Space Apps 2026 · "Create Health Monitoring Software for Astronauts on Space Missions").
Stack: **React Native + Expo** (runs on phone and web). Visual style: **Nebula Glass** (dark space, glass cards, lilac/teal/gold).

> For AI coding agents (Claude Code, etc.): read this file first, then `SCREENS.md` for what to build, `COMPONENTS.md` + `tokens/` for how it looks, and `data/` for the data shape. Screenshots are the visual source of truth; `source/*.dc.html` hold the exact styles (inline CSS) if you need a precise value.

## Folder

| Path | What it is |
|---|---|
| `SCREENS.md` | Every screen: route, purpose, sections, data it reads/writes, navigation, states |
| `COMPONENTS.md` | Shared components to build once and reuse |
| `tokens/tokens.json`, `tokens/tokens.ts` | Colors, type, radius, spacing, shadows (import `tokens.ts` in RN) |
| `navigation.json` | Route map (expo-router style) and links between screens |
| `screenshots/*.png` | One PNG per screen at 2× (390×844 base) |
| `source/*.dc.html` | Design source of each screen (HTML + inline CSS). Reference only, not app code |
| `data/data-model.json` | All data the app uses: files, fields, types, enums, derived values |
| `data/mock/*.json` | Mock database (4 astronauts × 12 mission days) split per file |
| `data/mock-db.json` | Same mock in one object, easy to import while the backend is not ready |
| `ANIMATIONS.md` | Bolt's animation state machine (idle/status animations, priorities, reduced motion) |
| `PROGRESS.md` | Build log of the app: what is done, decisions, what is simplified or missing |

## Product rules (short)

- **Mission days, not Sols.** "Day 12 of 30". Sol is a Mars day; switch only if the mission is on Mars.
- **One role in the app: astronaut.** Login = Crew ID + PIN. Ground team uses the web dashboard.
- **Onboarding data is read-only.** Pre-flight values come from the medical team; the astronaut only confirms.
- **Every log type has two screens:** an *overview* (today + week history + sticky button) and an *add* form (sticky Save).
  Overview button: `Log today +10 🪙` when not logged, `✓ Logged today · Edit` when logged (meals/exercise/body: `Add` instead of Edit).
- **Coins:** every saved log = +10. Coins buy avatar items. Leaderboard ranks by number of logs (tab 1) or coins (tab 2).
- **Everyone starts with the same astronaut** ("Bolt"). Customization only through the shop (helmet, suit, pets, room window/wall/floor).
- **Orbi (AI)** is also the journal. *Journal* mode saves and sends summaries to the medical team; *Private* mode stores nothing. **Fill with Orbi** asks for every log still open today (voice or text) and saves them after an editable confirmation.
- **Messages** = text with the ground team, always showing the communication delay and estimated arrival.
- **Coming soon (show greyed, but navigable):** Relax/meditation, Calendar screen content, Orbi voice input in the normal chat. Voice is live only in **Fill with Orbi** (`/logs/orbi-fill`), the guided logging flow.
- **Radiation values are illustrative** (NASA gives no fixed limit for long missions). Mark them with `*`.
- Screens are 390×844. Only the essentials need to be visible without scrolling; long content scrolls and the main action stays fixed at the bottom. Avatar/shop lists may be taller.

## NASA/CSA references used in the UI

Bone density −1–1.5%/month · strength & aerobic −10–12% vs pre-mission (avg) · ISS exercise ≈1.5 h/day, 6–7 days/week · ARCHeR wrist actigraphy (motion, sleep, light) · 16 sunrises/day on ISS · personal dosimeters + area monitors, neutrons ≈30% of ISS radiation (CSA) · habitability: temperature, pressure, light, noise, space · comm delay up to 20 min one-way to Mars · journaling for behavioral health · "menu fatigue".

## Suggested line for the repo's CLAUDE.md

```
UI work: follow docs/design/README.md, SCREENS.md and tokens/tokens.ts. Use data/mock-db.json until the backend exists.
(Already added to the repo's AGENTS.md; the app copy of the tokens is src/theme/tokens.ts.)
```
