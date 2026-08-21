# Design

<!-- impeccable:design-schema 1 -->

## World

**Chosen direction: v3 — minimal, photo-led, flat map.** This supersedes v2's dark-editorial/tilted-3D-terrain system entirely, on explicit direction from a user-supplied reference image (source of truth for this pass). Musafir is now a warm off-white, near-black-type, single-accent app in the vein of clean modern travel/map apps — real travel photography as the primary visual interest (heroes, cards, galleries), a flat top-down map (no CSS/MapLibre tilt), soft rounded cards with subtle 1px borders, and generous whitespace. No gradients, no glassmorphism, no dark mode, no illustrated mascot, no heavy shadows.

v1 (Live 3D Map), v2 (dark-editorial refresh), and the earlier Atlas/Passport/Trail-Journal/Musa-mascot explorations are all superseded. Files remain in `design/` for history but are not the system. **The 3D tilted terrain map — v1 and v2's core mechanism — is dropped in v3** per explicit instruction; route/POI display now uses a flat map treatment throughout.

## Color

Single accent + neutral system, no supporting dark-green "trail" role, no dark mode:

- `--bg` `#FAF8F5` — app background, warm off-white
- `--card` `#FFFFFF` — elevated surfaces (cards, sheets, inputs)
- `--ink` `#111111` — near-black text, primary buttons, default pin fill
- `--ink-soft` `#6B6660` — secondary text
- `--ink-faint` `#9C9690` — placeholder/tertiary text
- `--border` `#EFEAE2` / `--border-strong` `#E3DDD2` — subtle 1px card/input borders, no heavy shadows
- `--accent` `#FF6800` — restrained orange, used sparingly: primary CTA on key screens, route line, active states, one badge/pill role
- `--accent-tint` `#FFEDE0` — accent-tinted backgrounds (badges, "why this place" callouts)
- Semantic: `--success #1AAE64`, `--warn #F5A623`, `--error #E44444`, `--info #3B82F6` (each with a matching `-tint`)
- Map (flat, ground-plane only): `--map-land #EFEAE0`, `--map-water #CFE0DE`, `--map-road #FFFFFF`, `--map-park #DCE7D6`

## Type

Single family, no mono pairing — a deliberate change from v1/v2:

- **Inter** — all UI text, weights 400–800. Headings at 700–800, body at 400–500, labels/captions at 600.

## Photography

The reference image is photo-led throughout — hero cards, place thumbnails, trip story strips, feed posts. **This sandbox's network allowlist blocks external image CDNs** (Unsplash and equivalents both time out / 403), so `design/mockup-v3.html` uses toned CSS-gradient `.photo` blocks (`.p-mtn`, `.p-road`, `.p-sunset`, `.p-lake`, `.p-food`, `.p-forest`, `.p-snow`) as visual stand-ins — they read as photography at thumbnail/hero size but are not real files. **Before shipping, every `.photo` div needs to become a real `<img>`** sourced from licensed travel photography (community-contributed per PRODUCT.md once available, or a licensed stock set for pre-launch marketing screens).

## The map (flat, not tilted)

- Flat 2D plane: pale land fill, soft water/park shapes, white road strokes with a hairline outline — closer to a minimal Mapbox Light/CARTO Positron style than to OSM default
- Route line: white halo stroke underneath an orange core stroke, rounded caps/joins, so it reads clearly over roads/land without a glow effect
- Pins: teardrop shape (rounded square rotated 45°), ink-fill by default, accent-fill for the destination/active pin, white ring border; origin point is a plain white-fill ring instead of a marker
- Route summary card floats top of map (stops + stat row), category filter chips below it, a places bottom sheet with category counts anchors the bottom — same layered-overlay pattern as before, just restyled flat/light
- This is a build-time note for whoever wires up MapLibre/Mapbox: turn off pitch/bearing tilt, use a light preset style, keep marker layering logic (pins render above route line, above land)

## Components (v3)

- **Buttons**: solid ink primary, solid accent for one primary action per screen (e.g. "Save place", "Let's get started"), outlined ghost secondary — 12px radius, no shadow
- **Cards**: white fill, 1px `--border`, 12–20px radius depending on size, `--shadow` is a very soft 2-layer shadow used sparingly (floating map cards, sheets) not on every card
- **Bottom nav**: 4 tab items + center raised FAB (ink circle, "+") for Add Place — matches the reference's icon-with-label tab bar
- **Category picker / filter chips**: pill-shaped, outline default, solid-ink active state — same interaction pattern as v2, restyled light/flat
- **Mascot**: dropped entirely in v3. A single-line compass glyph remains only as the app's logomark (auth screens, nowhere else) — no separate "Musa" character treatment
- **Loading**: shimmer skeleton blocks matching the real layout's shapes, plus a small spinner for full-screen loads
- **Empty / error states**: centered icon-in-circle (outline icon, tinted circle for error/red, neutral circle for empty), heading, one line of support copy, one primary action — no illustration work

## Motion

Not specced in detail for v3 (this pass is static reference only) — carry over v2's principles where they still apply: route line draws in, pins drop in staggered, sheets spring up, filter chips are instant no-easing toggles.

## Reference build

`design/mockup-v3.html` — the current design reference, 23 screens: 4 onboarding slides, Welcome/Login/Signup/Verify Email, Dashboard, Search, Route & Places (flat map), Place Details, Add Place, Trip Tracking, Trip Story, Memories, Profile, Social Feed, Achievements, Settings, and Loading/Empty/Error states. Includes a design-system reference panel (colors, type scale, spacing, radius, buttons, input) at the bottom of the file, matching the layout of the user-supplied reference image. This supersedes `mockup-v2.html` and everything before it as the design system of record.

## Screen scope note

Trip Tracking, Trip Story, Social, and Achievements are designed here even though MVP.md/PRD.md mark them post-MVP (Phase 2/3) — this was an explicit ask to design the full app end-to-end. Designing these screens does not change MVP build scope or commit to building them now; `MVP-PHASES.md` still governs build order.

## Open / not decided here

- Whether Add Place becomes a multi-step wizard vs. the single scrollable form shown here — a build-time call, not a visual one.
- Real photography sourcing/licensing for the `.photo` placeholder blocks — flagged above, needs a decision before this ships past prototype stage.
