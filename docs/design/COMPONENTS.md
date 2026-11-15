# Components (build once, reuse)

Values come from `tokens/tokens.ts` (app copy: `src/theme/tokens.ts`). Implemented in `src/components/`; live catalogue at `/dev/components`.

| Component | Props | Look |
|---|---|---|
| `Screen` | `children, footer?, tabBar?` | bg `color.bg`; content scrolls; `footer` is sticky (bg `bg`, top border, shadow) |
| `Header` | `title, onBack, right?` | 44×44 back button (glass, radius 14), centered Sora 17 title |
| `TabBar` | `active` | floating glass pill, radius 22, 5 items; active = teal icon/text + teal underline + teal 12% bg |
| `Card` | `children, padding` | `surface` glass + 1px `border`, radius 18, shadow `card` |
| `PrimaryButton` | `label, reward?, onPress, href?` | lilac bg, dark text, radius 18, min-height 54, glow `primary` |
| `SecondaryButton` | `label, icon?` | glass bg, 1px border, radius 18 |
| `RewardChip` | `amount=10` | "+10" + gold coin icon (no background) |
| `LogStateButton` | `logged, onLog, onEdit, loggedText?, editLabel?` | not logged → `PrimaryButton "Log today" + RewardChip`; logged → green outline "✓ Logged today" + `SecondaryButton Edit` |
| `Chip` | `label, selected, disabled, tone?, readOnly?` | pill 36 h; selected = teal 14% bg + teal border (`tone="primary"` = lilac, used by mood tags); disabled = dashed muted + ✓; readOnly = 60% opacity (onboarding) |
| `Segmented` | `items, selected` | glass track, selected = lilac bg |
| `Field` | `label, value, unit?, readOnly?` | 48 h, radius 14; readOnly = dashed border, muted text |
| `Rating` | `value, min/max labels` | five 46 h buttons |
| `WeekBars` | `values[7], target?, todayIndex` | bars, dashed target line, today outlined + "Today" |
| `TrendLine` | `points[], threshold` | small line chart, dashed threshold |
| `MoodFace` | `level 1..5, size` | SVG face: great/good/okay/tired/stressed with matching colors |
| `MoodSlider` | `value, onChange` | vertical track (pan gesture) with labels left, faces right |
| `CoinsPill` | `amount` | glass pill, gold coin icon |
| `TodayChip` / `StatusDot` | `state` | ok green `#39FF9F`, warn `#FFC94D`, alert `#FF6B8B` |
| `HologramBody` | `areas{head,torso,armL,armR,legL,legR}` | outline astronaut, each part stroked by level color, grid + scanline bg, platform ring |
| `Callout` | `icon, label, value, level, onPress` | 120×56 box linked by a line to a body point |
| `DayScrubber` | `days[], selected, onSelect` | 7 buttons with vertical fill bar = logs done |
| `LogMenu` | `items[], open` | dropdown under the Log button; rows with Done / Log now; first row "Fill with Orbi · N to go" (teal) |
| `Astronaut` (Bolt) | `state, equipped` | two-eyed side astronaut; walking = legs/arm swing + bob; respects reduced motion. Built as `BoltFigure` (SVG layers per body part) + `BoltActor` (state machine, see `ANIMATIONS.md`) |
| `OrbiDrone` | — | small floating drone with two eyes |
| `ChatBubble` | `author, text, meta, progress?` | me = lilac right, other = glass left; ETA bar for in-transit |

Icons: simple 24×24 stroke icons: smile, moon, sun, activity, utensils, leaf, calendar, message, send, user, bell, coins, check, clock, alert-triangle, heart, zap, bone, bandage, camera, lock, eye-off, trophy, chevron. The app uses the exact paths from `source/*.dc.html` (`src/components/Icon.tsx`, 45 icons) instead of lucide.

## Added during the build

| Component | Where | What |
|---|---|---|
| `Txt` | `Txt.tsx` | Text with Sora/Inter by weight (Android needs one family per weight) |
| `InfoNote`, `StatTile`, `CardTitle`, `SectionLabel` | `Card.tsx` | Lilac tip row, small stat tile, card title row |
| `Toggle`, `Ring`, `Gauge`, `ProgressBar`, `Badge`, `Legend` | `Inputs.tsx`, `Charts.tsx`, `Pills.tsx` | Switch, progress ring (log button, exercise), gauge (dev catalogue only), bars, small badges, ok/attention/alert legend |
| `LogScreen`, `SavedBanner`, `ListRow`, `MetricTile`, `Stars`, `Note`, `ComingSoon`, `Greyed`, `Stepper` | `LogKit.tsx` | Shared pieces of the log screens |
| `OnboardingShell` | `Onboarding.tsx` | Step header, 5-step progress, sticky CTA |
| `StationWindow`, `StationProps`, `StationWall` | `StationScene.tsx` | Home scene (window/Earth, console, plant, floor) using the equipped room items |
| `HelmetIcon`, `SuitIcon`, `PetArt`, `WindowView`, `EarthScene`, `Surface`, `RoomSwatch` | `ShopArt.tsx` | Shop items drawn in SVG (`src/data/shopArt.ts`); `EarthScene` = beach / countryside / mountains / city window views |
| `DraftCard` | `FillCards.tsx` | Editable confirmation card of Fill with Orbi |
| `PrototypeTag` | `Pills.tsx` | Gold notice "Temporary speech recognition · a better model will replace it", shown wherever the app listens (voice mode, Fill with Orbi voice, mood voice note) |
| `HealthTag` | `Pills.tsx` | Status tag (dot + "Doing well" / "Attention" / "Alert") shown instead of the overall score |
| `AudioBars` | `AudioBars.tsx` | Live audio bars driven by a 0…1 level (mic input or synthetic while Orbi speaks) |
| `VoiceMode` | `VoiceMode.tsx` | Full-screen hands-free conversation with Orbi (speak → listen → answer loop), used by Orbi chat and Fill with Orbi |
| `VoiceNoteRecorder`, `VoiceNotePlayer` | `VoiceNote.tsx` | Record / play the optional voice note of the mood check-in (expo-audio) |
| `LogoMark alive` | `Space.tsx` | Login/onboarding logo that blinks and glances around at random intervals |
| `BoltFigure`, `BoltActor` | `Astronaut.tsx`, `src/avatar/BoltActor.tsx` | Bolt rig + animation state machine (`ANIMATIONS.md`) |
