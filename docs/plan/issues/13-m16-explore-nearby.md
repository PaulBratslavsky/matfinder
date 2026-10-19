> **M16** (step 3 of 3 of [plan 08](../08-nearby-and-place-search.md)) · Blocked by: {{#m14}}, {{#m15}}

## Goal
Explore opens on the gyms within 25 mi of you, with no city picker. Searching a place where MatFinder has gyms
switches you there, the radius is adjustable, and the view lives in the URL.

## Why
The user's decisions (2026-10-19): no city picker; location plus radius (default 25 mi); searching a place with gyms
switches you there. This replaces M6's confirmed rule "center on the device only within 60 miles of the city".

## Implementation spec
- [ ] `lib/api/schools.ts`: `getNearby({ latitude, longitude, radius })` and `search(q, near?)`, with the types from
      plan 08 → *Endpoints*. Round coordinates to 2 decimals before every request.
- [ ] `hooks/useNearby.ts` (replaces `useDirectory` in Explore): TanStack Query keyed by rounded center and radius,
      `staleTime` 60 s, refetch on focus and when any listed city's local date rolls over (as `useDirectory` does).
- [ ] `lib/explore-url.ts` (pure, unit-tested): parse and write `at=lat,lng` and `r=` (omitted at 25), next to the
      existing filter params in `lib/filters.ts`.
- [ ] `app/index.tsx`:
  - The center: `at`, else the device location, else the default area's center. P1 notice when location is off.
  - The header: "Near you", the switched-to place, or the default area.
  - Per-city time: `useCityNow` for each city in the response; each gym uses its own city's now for "Training today",
    "On now" and its next session.
  - Camera: fit the loaded gyms; with none, center on the area at the radius's zoom. Remove `NEAR_CITY_MILES` and the
    city-centered rules.
  - P2 empty state: "No gyms within 25 mi of you yet. Nearest: …" with a button that sets `at` to `nearest.center`.
- [ ] `components/explore/SheetSearch.tsx`: keep the instant local filter. From 3 characters, show suggestions
      (debounced 300 ms) under the input: **Places** ("West Hartford, CT · 6 gyms"; a 0-gym place shows "No gyms near
      … yet" and is disabled) and **Gyms** from elsewhere ("Engle Jiu Jitsu · Henderson, NV"). Tap a place → set `at`,
      clear `q`. Tap a gym → set `at` and `school`. Enter → P4.
- [ ] `components/explore/FilterBar.tsx`: a radius chip (10 · 25 · 50 mi).
- [ ] "Search this area" pill over the map after the map's center moves more than a third of the radius from `at`;
      tapping it sets `at` to the map center. The recenter button drops `at`.
- [ ] Mat room look, from `theme/tokens.ts` only (no hard-coded colors, no `dark:` classes), light and dark.
- [ ] Tests:
  - Unit: URL params, rounding, which suggestion Enter picks.
  - Playwright (`e2e/`), with the browser's geolocation set: see *Done when*. The test Strapi needs a second,
    far-away test city with one gym, in the **test** seed only (`scripts/test-server.sh` runs with
    `SEED_SAMPLE_DATA=true`).

## Watch out for
- **Typing never moves the map.** Only a tap, Enter or the pill does.
- **Distances stay from the device** (P8), hidden without permission, even after switching to another place.
- **iOS / Android:** `expo-location` permission is asked once. Test with the Simulator's Features → Location.
- **Update the e2e test** that reads `/api/schools/directory?city=las-vegas`. The endpoint stays, but Explore no longer
  uses it.
- **AC1** in `06-build-spec.md` changes. Note it in the PR and update the spec's AC1 line.

## Done when
- [ ] Playwright, geolocation in Las Vegas: the 8 sample gyms show and "Training today" matches Las Vegas time.
- [ ] Playwright: searching the second test city shows "<City> · 1 gym"; Enter switches there; the URL has `at=`; a
      reload stays there.
- [ ] Playwright, geolocation far from any gym: the empty state names the nearest area, and its button goes there.
- [ ] Playwright, location denied: the default area opens with the P1 notice.
- [ ] The radius chip changes the list (10 mi shows fewer gyms than 50 mi around the same point).
- [ ] The same flows work in the iOS Simulator.
- [ ] `npm run typecheck`, `npm run lint`, `npm run test:unit` and `npm run test:e2e` pass.

## Out of scope
A city picker (decided against); saved places; showing gyms outside the radius on the map.

## For the implementing agent
- **Deviation protocol:** stop and ask before changing a decision in plan 08, or before replacing a screen or
  component with a new design (CLAUDE.md).
- **Workflow:** branch `m16-explore-nearby`, one PR with `Closes {{#self}}`, merged by the user once every Done-when
  box passes.
