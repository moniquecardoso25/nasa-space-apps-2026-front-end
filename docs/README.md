# CosmoMedic design references

CosmoMedic is a health-monitoring interface for astronauts on space missions, prepared for the NASA Space Apps Challenge 2026. The app is built with Expo, React Native, and Expo Router for mobile and web.

## Reference files

| File | Purpose |
| --- | --- |
| `SCREENS.md` | Screen goals, contents, states, and navigation |
| `COMPONENTS.md` | Shared component guidance |
| `tokens/tokens.json`, `tokens/tokens.ts` | Color, typography, spacing, radius, and shadow tokens |
| `navigation.json` | Route map and screen relationships |
| `screenshots/*.png` | Supplied visual references |
| `source/*.dc.html` | Original design sources; reference only |
| `data/data-model.json` | Prototype data model and field descriptions |
| `data/mock/*.json` | Example records for the local prototype |
| `CosmoMedic-screens.pdf` | Screen specification for this hackathon prototype |

## Product rules

- Use mission days. Use “Sol” only for a Mars mission.
- The astronaut app is centered on the crew member’s own health and mission data. Medical and admin API tools are role-gated.
- Pre-mission baselines are read-only in the astronaut app.
- Mark illustrative radiation values clearly; they are not NASA limits.
- Journal and Private modes have different data behavior. Private mode must not send requests to the Crew Health API.
- Research data from Inspiration4 and AGBRESA must remain distinct from synthetic mission data and the signed-in astronaut’s personal record.
- Relaxation, calendar, avatar, and leaderboard elements in the visual reference may be local prototype experiences where the API does not define corresponding endpoints.
- Follow the supplied screenshots and existing Nebula Glass colors when changing the interface.

## Quick links

- [Main project README](../README.md)
- [Screen inventory](SCREENS.md)
- [Components](COMPONENTS.md)
- [Design tokens](tokens/tokens.json)
