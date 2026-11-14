# CosmoMedic

CosmoMedic is a cross-platform crew health prototype for the **NASA Space Apps Challenge 2026**. It brings an astronaut’s mission health readings, daily wellbeing check-in, support requests, and NASA research data into a single interface.

The app uses the existing Nebula Glass visual system and adapts it for mobile and desktop browsers. The original section 6 ground dashboard is not part of this prototype.

> **Prototype notice:** CosmoMedic is a hackathon project and is not an official NASA product or a medical device. Synthetic mission readings are illustrative. OSDR and AGBRESA records are research data and must not be treated as a personal diagnosis or care recommendation.

## Features

- **Crew sign-in:** JWT authentication against the Crew Health API, with a demo sign-in button.
- **Mission home and status:** astronaut profile, mission day, daily readings, pre-mission baseline, check-in history, detected patterns, and a body hologram.
- **Daily wellbeing check-in:** API-provided stress and fatigue scales, symptom options, notes, and urgent symptom routing to the medical team.
- **Messages and support:** proactive health messages, read/dismiss actions, preference controls, and support requests with status and care-team responses.
- **Orbi:** searches the authenticated crew-health knowledge base in Journal mode. Private mode makes no API requests.
- **Research data:** public Inspiration4/OSDR crew summaries, timelines, measurements, alerts, studies, timepoints, analytes, categories, and CSV exports; plus AGBRESA participants, observations, group comparisons, quality flags, and exports.
- **Medical care:** role-gated support queue, check-ins, patterns, care responses, document uploads, and mission records.
- **Admin operations:** role-gated dataset import, synthetic mission regeneration, import history, and CSV export.
- **Voice navigation:** use the microphone to move through screens one option at a time, or say “next option”, “previous”, “open”, or a screen name in English.
- **Responsive navigation:** desktop side menu and mobile navigation bar with a full-screen menu.

## Requirements

- Node.js **22.13 or newer**.
- npm. This repository includes `package-lock.json`.
- A browser for the quickest demo. Android and iOS development require the corresponding Expo development environment.
- The separate Crew Health API backend for live data. The frontend can also run in local sample mode without it.

## Install and run the frontend

```bash
npm ci
```

Start the web app:

```bash
npm run web
```

Or start the Expo development server and press **W** to open the browser:

```bash
npx expo start
```

## Deploy to Vercel

The repository includes a Vercel configuration for Expo's static web export. Import the repository using its root directory and let `vercel.json` set the install command (`npm ci`), build command (`npm run build:web`), and output directory (`dist`). The build exports the app's routes as static files, including the supported mission-log routes. No SPA rewrite is required.

Add `EXPO_PUBLIC_API_URL` in the Vercel project's Environment Variables for Preview and Production, pointing to the publicly reachable Crew Health API. Do not use `127.0.0.1` or `localhost` for a deployed site: those addresses refer to each visitor's device. The API server must allow requests from the deployed site's origin, and it must be available over HTTPS for the browser to connect from an HTTPS deployment. Redeploy after changing environment variables.

To produce the same static files locally, run:

```bash
npm run build:web
```

To use an Android emulator, press **A** in the Expo terminal. iOS simulator development requires macOS and Xcode. Voice recognition on native devices requires a development build because its native module is not bundled in Expo Go.

## Connect the Crew Health API

The backend is a separate project and is not included in this repository. Start it using that project’s instructions. The API examples in `Crew_Health_API_JSONs.docx.pdf` use port `8000`; its interactive API documentation is served at `/docs`.

Copy `.env.example` to `.env.local` and set the API host before starting Expo:

```dotenv
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
```

For a phone on the same Wi-Fi network, replace `127.0.0.1` with the development computer’s LAN IP address and allow the backend port through the computer firewall. Restart Expo after changing the environment file.

The API uses `POST /api/v1/auth/login` and bearer tokens for protected endpoints. The sign-in form expects the API `username` and password. The demo button tries `astronaut4` with password `spaceapps2026`; if the API cannot be reached, it opens the local sample experience. The API document also demonstrates the `surgeon` account with the same demo password. Use credentials supplied by the backend team for other roles.

The frontend reads `EXPO_PUBLIC_API_URL` as a public build-time setting. **Do not put API keys, admin secrets, or private credentials in any `EXPO_PUBLIC_*` variable.** The API access token stays in application memory for the current session and is cleared when the app reloads or the user signs out.

## Backend coverage and data behavior

The API client in `src/services/crew-health-api.ts` follows the endpoint groups in the supplied API JSON document:

| API group | Frontend surface |
| --- | --- |
| Authentication and `/me` | Sign-in, onboarding review, home, and status |
| Check-in options, check-ins, patterns | Mood check-in, status, and care operations |
| Proactive messages, preferences, support | Messages & support |
| Medical-care and synthetic-mission endpoints | Role-gated Care operations |
| Inspiration4 OSDR and CSV export | Research data · Inspiration4 |
| AGBRESA and CSV export | Research data · AGBRESA |
| NASA knowledge documents and search | Orbi reference search and Care document tools |
| Data ingest and mission regeneration | Admin tools in Care operations |

When connected, the API’s profile and health data replace sample values on the corresponding screens. The supplied contract supports writing daily check-ins, support requests, message status, and message preferences. Other mission logs are shown as API-backed read-only data because the document does not define write endpoints for sleep, radiation, meals, exercise, measurements, or meditation. Those forms remain available only in local sample mode and are not sent to the API.

Inspiration4 OSDR records are real research measurements. AGBRESA records are from healthy volunteers in an Earth-based bed-rest study. Synthetic long-duration mission records are generated sample data. The app keeps these sources labelled separately.

## Main screens

| Screen | Route |
| --- | --- |
| Sign in | `/login` |
| Crew account and mission review | `/onboarding` |
| Home | `/home` |
| Crew status | `/status` |
| Orbi knowledge search | `/orbi` |
| Messages and support | `/messages` |
| Mission log screens | `/log/mood`, `/log/sleep`, `/log/radiation`, `/log/body`, `/log/meals`, `/log/exercise`, `/log/relax` |
| Research data | `/research` |
| Medical care and admin operations | `/care` |
| Avatar, calendar, leaderboard | `/avatar`, `/calendar`, `/leaderboard` |

## Quality checks

```bash
npm run lint
npm run typecheck
```

## Project structure

```text
src/
  app/                  Expo Router screens
  components/           Shared UI, auth state, navigation, and astronaut visuals
  constants/            Theme, demo values, and navigation options
  services/             Crew Health API client and endpoint types
docs/
  screenshots/          CosmoMedic visual references
  data/                 Prototype data-model references
  CosmoMedic-screens.pdf
```

## References

- [CosmoMedic screen references](docs/CosmoMedic-screens.pdf)
- Crew Health API JSON examples (`Crew_Health_API_JSONs.docx.pdf`, provided separately and not included in this repository)
- [Expo SDK 58 documentation](https://docs.expo.dev/versions/v58.0.0/)
- [Expo Router documentation](https://docs.expo.dev/router/introduction/)
