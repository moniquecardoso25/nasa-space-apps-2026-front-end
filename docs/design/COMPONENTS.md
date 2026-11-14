# Components (build once, reuse)

Values come from `tokens/tokens.ts`.

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
| `Chip` | `label, selected, disabled` | pill 36 h; selected = teal 14% bg + teal border; disabled = dashed muted + ✓ |
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
| `LogMenu` | `items[], open` | dropdown under the Log button; rows with Done / Log now |
| `Astronaut` (Bolt) | `state, equipped` | two-eyed side astronaut; walking = legs/arm swing + bob; respects reduced motion |
| `OrbiDrone` | — | small floating drone with two eyes |
| `ChatBubble` | `author, text, meta, progress?` | me = lilac right, other = glass left; ETA bar for in-transit |

Icons: simple 24×24 stroke icons (e.g. `lucide-react-native`): smile, moon, sun, activity, utensils, leaf, calendar, message, send, user, bell, coins, check, clock, alert-triangle, heart, zap, bone, bandage, camera, lock, eye-off, trophy, chevron.
