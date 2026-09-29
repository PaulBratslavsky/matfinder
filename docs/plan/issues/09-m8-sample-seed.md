> **Part of {{#epic}}** · **M8** (step 9 of 10) · Blocked by: {{#m5}} · Spec: [06-build-spec.md @ 0a488c1](https://github.com/PaulBratslavsky/matfinder/blob/0a488c125ef61fa485f1c71c2d75565debe19de3/docs/plan/06-build-spec.md#m8-sample-seed--media)

## Goal
A fresh development database boots with a clearly fictional Las Vegas dataset (1 city, 3 affiliations, 6 instructors, 8 published schools) that covers every filter and edge case in the app, and a second boot doesn't duplicate it.

## Why
- The server integration tests in {{#m9}} run "against a dev server with the sample seed". The coverage list is built to exercise the app's states (e.g. one school with no instructors or amenities "tests empty sections").
- The seed is **development only** (`SEED_SAMPLE_DATA` is unset in production) and uses clearly fictional "Sample … (Demo)" names.
- This step is blocked by {{#m5}} rather than {{#m7}}: it reuses the draft-upsert services from {{#m4}} and {{#m5}} and doesn't touch the app, so it can run in parallel with {{#m6}} / {{#m7}}. *(added: not in spec: the spec runs M8 after M7)*

**Forward reference to earlier steps:** {{#m4}} and {{#m6}} needed published Las Vegas schools before this seed existed, so they used hand-made records in the admin as a stopgap. This step replaces that. The Done-when uses a fresh database, so those hand-made records don't affect it. *(added: not in spec)*

## Implementation spec
- [ ] `src/seed/sample.ts`, called from `bootstrap()` **only if** `SEED_SAMPLE_DATA === 'true'` and idempotent (upsert by slug through the services). Seed:
  - **City** Las Vegas (`las-vegas`, NV, US, `America/Los_Angeles`, center lng -115.1398 / lat 36.1699, zoom 10.5).
  - **3 affiliations:** "Sample Team Alpha (Demo)", "Sample Team Beta (Demo)", "Independent".
  - **6 instructors** (mixed belts).
  - **8 clearly fictional schools** named "Sample … (Demo)", in Summerlin, Henderson, near the Strip, North Las Vegas, Spring Valley, and Centennial Hills, with real-looking Vegas-area coordinates. **Coverage:** at least one open mat every evening of the week; visitors welcome yes/no; Gi-only, No-Gi-only, and both; kids and womens sessions; varied prices; one school with no instructors or amenities (tests empty sections); one with `lastVerifiedAt` over 90 days ago. **Publish all** (`strapi.documents(uid).publish({ documentId })`).
- [ ] Logos: skip, or use one placeholder image uploaded via the upload service. The UI falls back to initials.
- [ ] End-user accounts are **not** seeded. Tests sign up through the real `/api/auth/sign-up/email` endpoint.

## Reference (copied from the spec)
**Env var this step introduces:**

| Variable | Example | Notes |
|---|---|---|
| `SEED_SAMPLE_DATA` | `true` | **development only** |

**Coverage checklist.** This is the spec's *Coverage* sentence turned into checkboxes, with field names from the {{#m2}} schemas. *(added: not in spec: the checklist form)*
- [ ] At least one `open_mat` session every evening, `mon`–`sun`
- [ ] Visitors welcome yes / no (`pricing.visitorsWelcome`)
- [ ] Gi-only, No-Gi-only, and both (`style`: `gi` / `nogi` / `both`)
- [ ] `kids` and `womens` sessions
- [ ] Varied prices
- [ ] One school with no instructors or amenities
- [ ] One school with `lastVerifiedAt` over 90 days ago
- [ ] Locations across Summerlin, Henderson, near the Strip, North Las Vegas, Spring Valley, and Centennial Hills

**Shapes to seed**, summarized from the {{#m2}} schemas in the repo *(added: not in spec: the summary)*:
- `map-box` fields (`city.center`, `school.location`) are JSON: `{ longitude, latitude, address, zoom, pitch, bearing }` (spec).
- Session rows: `day` (`mon`…`sun`), `startTime` / `endTime` (`time`), `classType` (`fundamentals`, `all_levels`, `advanced`, `open_mat`, `competition`, `kids`, `womens`), `style` (`gi`, `nogi`, `both`), `notes?`. The {{#m2}} schedule-validate middleware rejects `endTime <= startTime`.
- `beltRank` (`white`, `blue`, `purple`, `brown`, `black`, `red_black`, `red_white`, `red`), `degree` 0–10.
- City has `draftAndPublish: false`; affiliation, instructor, and school are draft-and-publish.

## Watch out for
- **Seed only if `SEED_SAMPLE_DATA === 'true'`.** It's **development only**, and {{#m9}} leaves it unset on Strapi Cloud.
- **Idempotent:** upsert by slug through the services, so a second boot creates no duplicates. A plain insert would also collide with the slug unique indexes from {{#m2}}. *(added: not in spec: the index collision)*
- **Publish all** with `strapi.documents(uid).publish({ documentId })`. City has no draft/publish (`draftAndPublish: false`), so there's nothing to publish for it. *(added: not in spec: the city note)*
- **Clearly fictional names only:** "Sample … (Demo)".
- **No end-user accounts.** Tests sign up through the real `/api/auth/sign-up/email`.
- **Write through the services** (per the spec), so the {{#m2}} Document Service middlewares (slug, validation, contact normalization) also run on seed data. *(added: not in spec: the reason)*
- Logos are optional; the UI falls back to initials.

## Verify during this step
Nothing in the spec is tagged to M8. If anything here doesn't work as written, the deviation protocol applies: stop and ask.

## Done when
- [ ] A fresh database with `SEED_SAMPLE_DATA=true` boots with 8 published sample schools
- [ ] A second boot creates no duplicates

One way to get a fresh local database: `dropdb matfinder && createdb -O strapi matfinder` (**this wipes local data**), then `npm run develop` in `server/` and check that `/api/schools/directory?city=las-vegas` lists 8 schools. *(added: not in spec)*

## Acceptance criteria this step unlocks
None directly. It supplies the data the {{#m9}} integration and Playwright suites run against (AC11).

## Out of scope
- Real Las Vegas listings, added by the curator via MCP against production → {{#m9}}
- Tests → {{#m9}}

## For the implementing agent
- **Deviation protocol:** commands, structures, versions, and conventions in this spec are **user decisions**. If you (the build agent) want to substitute any of them (build friction, a newer API, a "simpler" alternative), **STOP and ask the user.** Do not silently trade off. This applies especially to: the auth stack, the two-endpoint gate, draft-only MCP tools, and the Vercel same-origin rewrite.
- **Docs:** Strapi: query the `strapi-docs` MCP first; otherwise https://docs.strapi.io (v5). Document Service https://docs.strapi.io/cms/api/document-service
- **Workflow (the spec's rule):** one branch and one pull request per milestone issue, merged into `main` once the milestone's **Done when** check passes; the PR body says `Closes #<issue>`. Merging to `main` deploys Strapi Cloud (and Vercel, once connected). Branch: `m8-sample-seed`; PR body: `Closes {{#self}}`.
