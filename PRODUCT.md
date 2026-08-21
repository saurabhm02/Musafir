# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

[Inferred: React Native app for iOS 15+ and Android 8+ (TRD-FE). One shared brand/visual language across both, with only native affordances (back gesture, safe areas, nav transitions) following OS convention — not a Material/Cupertino style-switch. Confirm if OS-adaptive styling is actually wanted instead.]

## Stack

React Native 0.74+, TypeScript, MapLibre GL/Mapbox for 3D maps, Redux Toolkit + React Query, React Navigation 6, Reanimated 3 for animation. [Decided in TRD-FE.md, not delegated to this session.]

## Users

- **Weekend Warrior** (25-35): impulsive short trips, wants quick discovery and budget options.
- **Road Trip Enthusiast**: photography-focused, wants scenic spots and sharing.
- **Memory Keeper**: family traveler, wants private memories and organization.
- **Backpacker**: budget traveler, wants local experiences and stats.

Job: "help me discover what's worth stopping for along a route I'm already taking, not just at the destination."

## Product Purpose

Musafir turns a route search (e.g. "Delhi to Triund") into a 3D map with community-sourced points of interest along the way — food stops, viewpoints, temples, treks, rest stops — so travelers stop missing what's on the road. Success = travelers actually detour to a suggested place and later contribute their own finds/photos back.

## Positioning

**Smart Route Overlap™** — when a new route search shares a road segment with a route already in the DB (e.g. Nagpur→Delhi crosses the popular Delhi→Chandigarh corridor), Musafir surfaces that corridor's already-discovered POIs automatically. Destination-only apps (Google Maps, TripAdvisor) don't do this; it's the thing a copycat would have to rebuild from scratch, not skin.

## Operating Context

- Primary usage moment: planning a road trip (pre-departure, on wifi) and mid-trip (spotty connectivity, GPS active, one-handed).
- Trip tracking runs in the background with GPS while the phone may be mounted/pocketed.
- Photo capture happens outdoors, often bright sunlight, often quickly (driver has stopped briefly).

## Capabilities and Constraints

- MVP scope (MVP.md): auth, route search + 3D map, Smart Route Overlap, POI browse/create with photos, public/private photo visibility. Trip tracking, social, AI are post-MVP.
- Portrait-only for MVP.
- Free-tier infra ceilings apply (Supabase 500MB, Cloudinary 25GB, Mapbox/MapLibre free tiles) — design should not assume unlimited image/tile budget (compress, avoid gratuitous high-res hero imagery).
- Battery budget: <10%/hour during active GPS tracking — animation/rendering choices during the Active Trip screen should stay cheap.

## Brand Commitments

- Name: **Musafir** (Hindi/Urdu for "traveler"/"wayfarer") — implies journey-over-destination, community, on-the-road warmth. No existing logo/visual assets yet.
- Tagline direction from PRD: "every journey into a story worth remembering."

## Evidence on Hand

- No real POI photos, logo, or brand assets exist yet — first screens will need placeholder/seed imagery, not fabricated "real" testimonials or photos.
- Seed route data planned: Delhi-Triund, Delhi-Jaipur, Mumbai-Goa, Bangalore-Mysore, Delhi-Manali (MVP.md appendix).

## Product Principles

1. Journey over destination — every screen should make the *route*, not just the endpoint, feel like the product.
2. Community evidence over marketing gloss — real traveler photos/tags carry more weight in the UI than editorial copy.
3. One-handed, outdoors-usable — large touch targets, high contrast, works in bright sunlight and while driving-adjacent.
4. Cheap by default — respect free-tier infra and battery ceilings; don't design interactions that assume unlimited bandwidth/GPU.

## Accessibility & Inclusion

No product-specific requirement established beyond PRD's baseline (screen reader support, adjustable font sizes, color-blind-friendly palette, minimum touch targets) — standard mobile a11y floor applies.
