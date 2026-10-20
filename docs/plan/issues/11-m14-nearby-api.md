> **M14** (step 1 of 3 of [plan 08](../08-nearby-and-place-search.md)) · Blocked by: none · Next: {{#m15}}, {{#m16}}

## Goal
Gyms can be found by distance: every school carries indexed `latitude` / `longitude` columns, and
`GET /api/schools/nearby?lat&lng&radius` returns the published gyms within a radius (default 25 mi) from any city,
each with "today" computed in its own city's time.

## Why
- The user decided (2026-10-19) that Explore works from your location plus a radius, with no city picker. That needs a
  query by distance, and today coordinates exist only inside the `location` JSON field, which SQL can't filter.
- {{#m15}} (search suggestions) and {{#m16}} (the app) both build on this query.

## Implementation spec
- [ ] `api::school.school` gains `latitude` and `longitude` (`decimal`). Hide them from the Content Manager edit view
      (`config.editable: false` in the CM layout, or the equivalent for 5.58: verify).
- [ ] A Document Service middleware, next to the existing ones in `src/document-middlewares/index.ts`
      (`registerDocumentMiddlewares`), copies `location.latitude` / `location.longitude` into the columns on `create`, `update` and
      `publish` for `api::school.school`. It must also run for the MCP tools' draft writes (they go through the
      Document Service, so it should; prove it in a test).
- [ ] Bootstrap backfill: for schools (draft and published) where `latitude` is null and `location` has coordinates,
      write the columns. Idempotent; logs how many it fixed.
- [ ] Index: add `CREATE INDEX IF NOT EXISTS schools_lat_lng ON schools (latitude, longitude)` next to
      `UNIQUE_INDEXES` (check the real table and column names Strapi creates on SQLite and Postgres).
- [ ] `src/lib/radius.ts` (pure, unit-tested): `boundingBox(center, miles)`, `haversineMiles(a, b)`,
      `clampRadius(r)` (1–100, default 25), `parseCoords(lat, lng)` (range-checked).
- [ ] School service `getNearby({ latitude, longitude, radius })`: bounding box with `$between` on the columns, the
      published status, the directory fields (same populate as `getDirectory`) plus `city { slug, name, state, timezone }`;
      exact haversine filter; sort by distance; cap 300 (`truncated`). `cities` map with each city's `cityNow`.
      `nearest` when empty: the closest city that has at least one published gym (by its `center`).
- [ ] Controller `nearby` + route `GET /schools/nearby` in `routes/01-custom-school.ts` (before the core router, like
      `/schools/directory`); `Cache-Control: public, max-age=60`; `400` for bad input.
- [ ] Grants: `api::school.school.nearby` in `GRANTS.public` and `GRANTS.authenticated` (`src/lib/permissions.ts`).
- [ ] Tests: unit for `lib/radius.ts` (`tests/unit`); integration for the endpoint against the seed
      (`tests/api.test.ts`).

## Reference
Response shape, limits and caching: plan 08 → *Endpoints* → `GET /api/schools/nearby`. Directory item: unchanged
`toDirectoryItem` (`src/lib/directory.ts`) plus `citySlug` and `distanceMiles` (one decimal).

## Watch out for
- **Don't change `GET /api/schools/directory?city=`.** The e2e suite and older links use it.
- **Decimal columns** may come back as strings on Postgres. Convert in one place (`num()` in `lib/directory.ts`).
- **Draft vs published:** the columns must be right on both, because publishing copies the draft.
- **Never start Strapi without the plugin build** (CLAUDE.md). Run the suites with `npm run test:integration:isolated`.

## Done when
- [ ] Around the Las Vegas center at 25 mi: the 8 sample gyms, sorted by distance, each with `citySlug: las-vegas` and
      the city's `localDate` / `weekday` in `cities`.
- [ ] From a point 40 mi outside Las Vegas at 10 mi: no gyms, and `nearest` names Las Vegas with its distance.
- [ ] Bad `lat`, missing `lng`, `radius=0` → 400; `radius=500` → clamped to 100.
- [ ] Moving a gym's pin in the admin, and an `upsert_school` address change through MCP, both update the columns.
- [ ] `npm run test:unit` and `npm run test:integration:isolated` pass; `/directory?city=las-vegas` is unchanged.

## Out of scope
Search suggestions ({{#m15}}); any app change ({{#m16}}); PostGIS.

## For the implementing agent
- **Deviation protocol:** the plan's names, limits and shapes are the user's decisions. If you want to change one,
  stop and ask.
- **Verify, don't recall:** check Strapi 5.58's Document Service middleware and `decimal` behavior in the docs
  (`strapi-docs` MCP first, then https://docs.strapi.io) before relying on them.
- **Workflow:** branch `m14-nearby-api`, one PR into `main` with `Closes {{#self}}`, merged by the user once every
  Done-when box passes.
