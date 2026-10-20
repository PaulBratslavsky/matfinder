> **M15** (step 2 of 3 of [plan 08](../08-nearby-and-place-search.md)) · Blocked by: {{#m14}} · Next: {{#m16}}

## Goal
`GET /api/search?q&lat&lng` turns what someone types into suggestions: **places** (MatFinder cities first, then
Mapbox) each with how many gyms are within 25 mi, and **gyms** by name from anywhere.

## Why
- The user decided (2026-10-19): searching a place where MatFinder has gyms (e.g. "West Hartford") must switch you
  there. The app needs to know which places exist and whether they have gyms before it moves the map.
- Gyms by name from anywhere (plan 08, P7) cost one extra query and let "Engle" find Engle Jiu Jitsu from any area.

## Implementation spec
- [ ] `src/lib/geocode.ts`: add `searchPlaces(q, near?)`, next to `geocodeAddress`. US only, types
      `place,locality,neighborhood,postcode`, limit 5, `proximity` when `near` is given, 5 s timeout. Same token rule
      (`MAPBOX_GEOCODING_TOKEN`, falling back to `MAPBOX_ACCESS_TOKEN`) and the same rule that the token never appears
      in errors or logs. Returns `[]` (not an error) when no token is configured.
- [ ] A `search` service (new `src/api/search/`, or a custom route on the school API: pick the smaller one and say why
      in the PR) with:
  - **City places:** published-gym cities whose `name` matches `q` (fold accents and case, as `lib/filters.ts` does in
    the app). Use each city's `center`.
  - **Mapbox places,** only when no city matched.
  - `gymCount` for each place with {{#m14}}'s radius query at 25 mi (count only, no populate).
  - **Gyms:** published schools whose name, neighborhood, postal code or affiliation name contains `q`
    (`$containsi`), at most 5, with `city { slug, name, state }`, sorted by distance from `lat` / `lng` when given.
- [ ] Controller + route `GET /api/search`; `q` shorter than 3 characters → `{ places: [], gyms: [] }` (200, not 400);
      `Cache-Control: public, max-age=300`.
- [ ] Grants: the new action in `GRANTS.public` and `GRANTS.authenticated`.
- [ ] Tests: unit for `searchPlaces` with a mocked `fetch` (URL, params, error mapping, no token in output) in
      `tests/unit`; integration for the endpoint against the seed in `tests/api.test.ts` (the test server runs with
      `MAPBOX_GEOCODING_TOKEN=` empty, so only city places and gyms come back there).

## Reference
Response shape and the place order: plan 08 → *Endpoints* → `GET /api/search`.

## Watch out for
- **Mapbox token.** Production has no `MAPBOX_GEOCODING_TOKEN` yet and the `pk.` token is about to be URL-restricted,
  which breaks server calls (no referrer). The user must create an unrestricted server token first (plan 08 → *Risks*).
- **Verify the Mapbox API:** whether v6 forward geocoding replaces v5 `mapbox.places`, and whether temporary results
  may be cached. Don't add a server cache unless the terms allow it.
- **No 500s from Mapbox.** A timeout, a 4xx or a missing token leaves `places` with only the city matches.

## Done when
- [ ] `q=las vegas` → the Las Vegas place with `gymCount: 8`, `source: "city"`, and no Mapbox request.
- [ ] `q=garage` → the sample gym "Sample Garage Grappling (Demo)" with its city.
- [ ] A place with no gyms nearby comes back with `gymCount: 0` (mocked Mapbox).
- [ ] No token configured → still 200 with city places and gyms only.
- [ ] `npm run test:unit` and `npm run test:integration:isolated` pass.

## Out of scope
Any app change ({{#m16}}); saving searches; analytics.

## For the implementing agent
- **Deviation protocol:** stop and ask before changing a decision in plan 08.
- **Workflow:** branch `m15-search-suggestions`, one PR with `Closes {{#self}}`, merged by the user once every
  Done-when box passes.
