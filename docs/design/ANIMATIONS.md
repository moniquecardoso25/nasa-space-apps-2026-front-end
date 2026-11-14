# Bolt · animation state machine

Bolt (the astronaut companion) is animated by a small state machine. Code lives in `src/avatar/`:

| File | What it does |
|---|---|
| `types.ts` | Rig channels, `AnimationDef`, `StatusKey` |
| `animations.ts` | Catalogue (14 idle + 11 status + 1 event), gaits, status priority |
| `machine.ts` | Pure reducer `boltReducer` + weighted `pick` + `staticAnimFor` (reduced motion) |
| `status.ts` | `deriveStatuses()` — the astronaut's data → Bolt statuses |
| `BoltActor.tsx` | Runs the machine with Reanimated: walk to a spot, play the pose loop, `NEXT` |

No XState: a reducer is enough and keeps the logic testable.

## Art and rig

`BoltFigure` (`src/components/Astronaut.tsx`) draws the same side-view Bolt as the design (two eyes in a visor, backpack, chest panel, arm band) in **react-native-svg**, split into layers inside `Animated.View`s, each with its own pivot (`transformOrigin`). Reanimated drives these channels:

| Channel | Part | Unit |
|---|---|---|
| `head`, `headY` | head rotation / lift | deg / px |
| `armF`, `armB` | front arm / back arm rotation (pivot at the shoulder) | deg |
| `legL`, `legR` | legs (pivot at the hip; negative = forward) | deg |
| `body`, `lean`, `squash` | whole-body bob, tilt, vertical scale | px / deg / × |
| `eyes` | eye scaleY (1 open … 0.1 closed, blinks by default) | × |

Props held in the front hand: `cup`, `tablet`, `can` (watering can), `tray` (food). Overlays above the head: `zzz`, `sparkles`, `note`, `sweat`. Helmet and suit colors come from the equipped shop items.

## States and transitions

```
           NEXT (no status)                   NEXT (status active)
  ┌──────┐ ───────────────▶ ┌──────┐  ┌────────┐ ──────────────▶ ┌────────┐
  │ idle │                  │ idle │  │ status │                 │ status │
  └──────┘ ◀─────────────── └──────┘  └────────┘                 └────────┘
     │   NEXT (status cleared)    ▲        ▲  new top status interrupts an idle anim
     └────────────────────────────┼────────┘
                                  │ NEXT
                         ┌────────────┐
   SAVED (Home focused   │ celebrate  │   short event, interrupts anything but forced
   after a new log) ───▶ └────────────┘

   FORCE(id) → forced (dev selector, replays)   RELEASE → automatic again
```

Each state runs in two phases: **move** (walk to its spot — window, console, plant, pet, a random point, or stay — using a gait) then **act** (loop the pose program for a random duration in its range) → `NEXT`.

**Choosing the next animation** (`candidates` + `pick`):
- No status: idle animations by weight; an idle never repeats back to back.
- Statuses active: animations of the **top-priority status ×1**, other active statuses ×0.5, idle ×0.05 (just enough life). Status animations may repeat.
- Pet animations only when a pet is equipped.

**Transitions are smooth**: every channel blends to the new pose in 280 ms (`withTiming`) before the loop starts; locomotion is a linear `translateX` at the gait speed; facing flips with `scaleX`.

**Reduced motion**: no walking, no loops. Bolt holds the static pose (explicit `pose` or the first keyframe) of the animation of the current top status, or a neutral stand when there is no status. Orbi and the hologram also stop floating.

## Idle animations (14)

| id | Label | Spot | Weight | Duration |
|---|---|---|---|---|
| walk | Walk | random point | 5 | 0.6–1.2 s after arriving |
| wave | Wave | stay | 2 | 2.2–3 s |
| stretch | Stretch | stay | 2 | 2.6–3.4 s |
| float | Float (zero-g) | stay | 2 | 3.2–4.2 s |
| lookWindow | Look out the window | window | 3 | 3–4.5 s |
| coffee | Drink coffee (cup) | stay | 2 | 3–4 s |
| console | Use the console | console (faces left) | 3 | 3–4.2 s |
| waterPlant | Water the plant (can) | plant | 2 | 2.6–3.4 s |
| playPet | Play with the pet (needs pet) | pet | 2 | 2.6–3.4 s |
| tablet | Read the tablet | stay | 2 | 3–4.2 s |
| jump | Jump | stay | 1 | 1.6–2 s |
| spin | Spin | stay | 1 | 1.2 s |
| sit | Sit down | stay | 1 | 3–4 s |
| yawnLight | Small yawn | stay | 1 | 1.8–2.2 s |

## Status animations (priority over idle)

Priority (strongest first): `saved` › `injuryLeg` › `injuryArm` › `injuryBack` › `tired` › `stress` › `lowMood` › `menuFatigue` › `lowExercise` › `happy`.

| Status | Derived from (`status.ts`) | Animations |
|---|---|---|
| tired | last sleep < 6 h (today/yesterday) or `avatar.state` tired/sleepy | yawn, slowWalk (slow gait, head down), nap (sits, eyes closed, zzz) |
| lowMood | latest mood level 2, or `avatar.state` sad | sitEarth (walks to the window, sits, looks at Earth) |
| happy | latest mood ≥ 4, or `avatar.state` happy | dance (♪), cheer (sparkles) |
| stress | mood level 1 or tags anxious/overloaded | pace (fast back and forth, sweat) |
| injuryLeg | injury active/healing on leg/knee/foot | limp (limp gait, uneven bob) |
| injuryArm | injury active/healing on arm/hand | holdArm (guards the arm while walking) |
| injuryBack | injury active/healing on head/neck/back | holdBack (leans, hand on the back) |
| lowExercise | no exercise today and < 45 min yesterday | stretchHard |
| menuFatigue | same meal 3+ days with low taste, or Orbi menu_fatigue alert | pokeFood (tray, pokes the food) |
| saved | a log was just saved (Home regains focus with a newer `lastSaved`) | celebrate (event, 1.8 s, sparkles) |

## Where it runs

- **Home**: `BoltActor` with spots taken from the scene (window center, console, plant, pet), statuses from `deriveStatuses()` and `celebrateKey = lastSaved.at` while Home is focused.
- **`/dev/components` › Bolt animations**: force any animation (chips), "Auto (state machine)", and simulate statuses to watch the machine choose. Shows the current animation and reason.
- Previews (onboarding, avatar stage) use the light `Astronaut` (idle bob / walk) for performance.
