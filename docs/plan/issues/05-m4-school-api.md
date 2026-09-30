> **Part of {{#epic}}** · **M4** (step 5 of 10) · Blocked by: {{#m3}} · Spec: [06-build-spec.md @ 68803f6](https://github.com/PaulBratslavsky/matfinder/blob/68803f6bf44a5d0415cdefc498706b9e2ade58b9/docs/plan/06-build-spec.md#m4-school-api-the-server-enforced-gate)

## Goal
Two custom endpoints serve school data with the access gate **enforced on the server**: a public, trimmed directory for the map (`/api/schools/directory`) and an account-only full school page (`/api/schools/slug/:slug`). Core CRUD routes stay closed.

## Why
- The **two-endpoint gate** is a user decision, named in the deviation protocol. A preview answers "can I train here tonight, and what does it cost?" for anyone, while the full school page (schedule, pricing, instructors, amenities, contact) requires a free account. Gated fields must never appear in the directory, and core `find` stays ungranted (403).
- The school service also hosts the draft-write methods that the MCP tools call ({{#m5}}). The spec's M5 says "All writes go through the school / instructor / affiliation **services**", and M8's seed upserts "through the services".

## Implementation spec
- [ ] `src/api/school/services/school.ts`: extend the core service with:
  - `getDirectory(citySlug)`
  - `getBySlug(slug)`
  - `upsertDraft(input)`, `setScheduleDraft(slug, sessions)`, `listPendingDrafts(opts)`: the MCP tools call these; see {{#m5}}. Their contracts are copied under *Reference → Draft-write contracts*.
  - Helpers `toTodaySessions`, `deriveStyles`, `derivePrograms` using `src/lib/time.ts` (*Time rules* below).
  - Queries use `strapi.documents('api::school.school').findMany({ filters, fields, populate, status: 'published', limit, start })`. **Pagination is top-level `limit`/`start`** (not `pagination: {}`).

  **Forward reference:** only {{#m5}}'s MCP tools call `upsertDraft`, `setScheduleDraft` and `listPendingDrafts`, so **their check is in {{#m5}}'s Done-when**. Here they just need to exist and build. When `upsertDraft` gets an address without coordinates, it must geocode, but `src/lib/geocode.ts` is built in {{#m5}}; wire that call in there. *(added: not in spec)*
- [ ] `src/api/school/controllers/school.ts`: `factories.createCoreController('api::school.school', ({ strapi }) => ({ async directory(ctx) {...}, async bySlug(ctx) {...} }))`. Thin: read params, call the service, set `Cache-Control: public, max-age=60` on the directory, and return `ctx.notFound()` for an unknown slug.
- [ ] **`src/api/school/routes/01-custom-school.ts`.** The `01-` prefix makes it load before the core router; otherwise `/schools/directory` matches core `GET /schools/:id`:
  ```ts
  export default { routes: [
    { method: 'GET', path: '/schools/directory', handler: 'api::school.school.directory' },
    { method: 'GET', path: '/schools/slug/:slug', handler: 'api::school.school.bySlug' },
  ] }
  ```
  Leave the core router file in place (its actions stay ungranted).
- [ ] Payloads exactly as in *API surface*. The directory **must not** include the weekly schedule beyond today, instructors, contact, amenities, gallery, description, or pricing beyond `visitorsWelcome` / `dropInFee` / `currency`.

## Reference (copied from the spec)

### API surface
| Method & path | Role | Returns |
|---|---|---|
| `GET /api/schools/directory?city=<slug>` | Public, Authenticated | `{ data: { city: { slug, name, timezone, center: { latitude, longitude }, defaultZoom }, localDate, weekday, generatedAt, schools: [{ documentId, slug, name, logo: { url } \| null, latitude, longitude, neighborhood, postalCode, affiliation: string \| null, styles, programs, visitorsWelcome, dropInFee, currency, todaySessions: [{ start, end, classType, style }] }] } }`, `Cache-Control: public, max-age=60` |
| `GET /api/schools/slug/:slug` | **Authenticated only** | `{ data: { documentId, slug, name, shortDescription, description (blocks), city: { slug, name, timezone }, location, neighborhood, postalCode, logo, gallery, affiliation: { name, slug, website, logo } \| null, headInstructors: [{ name, slug, beltRank, degree, photo, bio }], pricing, contact, amenities, schedule: [{ day, start, end, classType, style, notes }], styles, programs, todaySessions, nextSessionToday, lastVerifiedAt } }`, or 404 |
| `GET /api/cities` | Public | core `find` |
| `/api/auth/*` | Public | Better Auth (sign-up/email, sign-in/email, sign-out, get-session) |
| `POST /mcp` | Admin token | Strapi MCP (8 custom tools only) |
| core `/api/schools`, `/api/instructors`, `/api/affiliations` | **nobody** | 403 |

Role grants seeded in {{#m3}}: Public → `api::school.school.directory`, `api::city.city.find`; Authenticated → those plus `api::school.school.bySlug`.

### Time rules (one definition, used everywhere)
- **City-local now** = `Intl.DateTimeFormat('en-US', { timeZone: city.timezone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now)` → `{ localDate: 'YYYY-MM-DD', weekday: 'mon'…'sun', minutes }`. **Never** use the device time zone. Verify Hermes (iOS and Android) returns correct `timeZone` results.
- Session times: Strapi stores `HH:mm:ss.SSS`; APIs emit `HH:mm`; compare as minutes since midnight.
- **`todaySessions`** = sessions with `day === weekday`, sorted by start.
- **Training today (R6)** = any today session with `end > nowMinutes`.
- **`nextSessionToday`** = the first today session with `end > nowMinutes`; label **"On now"** if `start ≤ now < end`; otherwise "<Class type> · <h:mm am/pm>".
- **Styles** = distinct from the schedule (`both` → gi + nogi). **Programs** = distinct `classType`.
- **Distance** = haversine miles from the device (hidden without permission).
- The app refetches the directory when the city-local date changes or the app regains focus.

On the server, "now" is the server clock converted with the **city's** `timezone`, never the server's local zone. The Hermes check applies to the app's copy in {{#m6}}. *(added: not in spec)*

### Data model notes
- The schemas are in the repo from {{#m2}}: `server/src/api/{city,affiliation,instructor,school}/content-types/*/schema.json` and `server/src/components/{school,schedule}/*.json`.
- `city` is required at the service and tool level (relations can't be marked `required` reliably in the schema). **The directory only returns schools whose city matches.**
- The `map-box` value is JSON: `{ longitude, latitude, address, zoom, pitch, bearing }`. The directory exposes `latitude` / `longitude` from `location`. *(added: not in spec: the last sentence, read from the payload shape)*

### Draft-write contracts
These are the spec's *MCP tools* rows for the three methods above. The "Tool → service method" pairing is *(added: not in spec)*, inferred from the names and "the MCP tools call these".

All tools are **draft-only**, return **names and slugs** for relations, and return structured errors (`VALIDATION_ERROR` with field paths, `NOT_FOUND`, `GEOCODE_FAILED`, `RESULT_TOO_LARGE`).

| Tool → service method | Input | Behavior / output |
|---|---|---|
| `upsert_school` → `upsertDraft(input)` | `{ slug?, name?, citySlug?, shortDescription?, descriptionText?, address?, latitude?, longitude?, neighborhood?, postalCode?, affiliationSlug?, headInstructorSlugs?, pricing?, contact?, amenities?, lastVerifiedAt? }` (component inputs are **partial**) | **Only provided fields are written; components are merged per field.** Unknown or missing slug → create (requires `name`, `citySlug`, `address`). `address` without coordinates → **server geocodes**. `descriptionText` → blocks. `headInstructorSlugs` replaces the ordered list. → `{ documentId, slug, created, changedFields, status }` |
| `set_school_schedule` → `setScheduleDraft(slug, sessions)` | `{ slug, sessions: [{ day, start: 'HH:mm', end: 'HH:mm', classType, style, notes? }] }` (≤ 100) | **Replaces the entire weekly schedule** on the draft (description: "send the complete week"). → `{ slug, sessionCount, byDay }` |
| `list_pending_drafts` → `listPendingDrafts(opts)` | `{ type?: 'school'\|'instructor'\|'affiliation', limit = 25 }` | Never-published docs and docs with unpublished changes: `{ type, slug, name, status, updatedAt, changedFields }` |

Write rules from the spec's M5 that apply to these methods: writes target the **draft**; multi-write operations run inside `strapi.db.transaction(async () => {...})` (Document Service calls join the ambient transaction); **no publish, unpublish, delete, or media upload**; **create, catch, refetch**: on a unique-index violation during create, re-query by slug and apply the update instead.

## Watch out for
- **Name the route file `01-custom-school.ts`.** Without the prefix, `/schools/directory` matches core `GET /schools/:id`.
- **Leave the core router file in place** with its actions ungranted; the API surface requires core `/api/schools` → 403.
- **Pagination is top-level `limit` / `start`** in `strapi.documents(...).findMany`, not `pagination: {}`.
- **Read with `status: 'published'`**: drafts never reach the directory or the school page.
- **The directory must not include** the weekly schedule beyond today, instructors, contact, amenities, gallery, description, or pricing beyond `visitorsWelcome` / `dropInFee` / `currency`. Build each item from an explicit list of allowed fields: the schedule has to be loaded to compute `todaySessions`, but only today's rows go out. *(added: not in spec: the explicit-list approach)*
- **Never use the device time zone**; always use the city's `timezone`.
- **Controllers stay thin:** read params, call the service, respond. `Cache-Control: public, max-age=60` on the directory; `ctx.notFound()` for an unknown slug.
- **`city` is required at the service level** (not in the schema), so `upsertDraft` must reject a create without `citySlug`.

## Verify during this step
- **Forward reference from {{#m3}}:** if {{#m3}} couldn't show the `school.directory` / `school.bySlug` grants in Settings → API Permissions because these actions didn't exist yet, check them now (the box is in *Done when*). *(added: not in spec)*

If a check fails, the deviation protocol applies: stop and ask.

## Done when
**Forward reference, interim data:** the trimming checks need at least one published school in `las-vegas`, but the sample seed only arrives in {{#m8}}. Until then, create a City (`las-vegas`, `America/Los_Angeles`) and a School by hand in the admin and publish it. *(added: not in spec)*
- [ ] `curl /api/schools/directory?city=las-vegas` → 200 with trimmed fields, e.g. `curl -i 'http://localhost:1339/api/schools/directory?city=las-vegas'`
- [ ] `curl /api/schools/slug/<slug>` → 401/403 without a cookie
- [ ] `curl /api/schools/slug/<slug>` → 200 with a cookie (e.g. `-b /tmp/mf-cookies.txt` from the {{#m3}} sign-up example) *(added: not in spec: the cookie-jar path)*
- [ ] `curl /api/schools` → 403
- [ ] An unknown slug (with a cookie) → 404 *(added: not in spec: the spec's task requires `ctx.notFound()` but its Done-when doesn't test it)*
- [ ] Settings → API Permissions shows Public: `school.directory`; Authenticated: `school.directory` + `school.bySlug`. This check was moved here from {{#m3}}, where it may not have been visible yet. *(added: not in spec)*

## Acceptance criteria this step unlocks
- **AC6:** Without a session, `GET /api/schools/slug/<slug>` returns 401/403 and `GET /api/schools` returns 403; the directory payload contains **no** gated fields.
- **AC3 (server half):** "Training today" and the next session are computed in **Las Vegas time**, whatever the caller's time zone.

## Out of scope
- MCP registration, the 8 tools, geocoding, the admin token, and exercising the draft-write methods → {{#m5}}
- The app consuming these endpoints → {{#m6}}, {{#m7}}
- Sample data → {{#m8}}
- Automated tests for trimming and the gate → {{#m9}}

## For the implementing agent
- **Deviation protocol:** commands, structures, versions, and conventions in this spec are **user decisions**. If you (the build agent) want to substitute any of them (build friction, a newer API, a "simpler" alternative), **STOP and ask the user.** Do not silently trade off. This applies especially to: the auth stack, the two-endpoint gate, draft-only MCP tools, and the Vercel same-origin rewrite.
- **Docs:** Strapi: query the `strapi-docs` MCP first; otherwise https://docs.strapi.io (v5). Document Service https://docs.strapi.io/cms/api/document-service · routes https://docs.strapi.io/cms/backend-customization/routes · controllers https://docs.strapi.io/cms/backend-customization/controllers
- **Workflow (the spec's rule):** one branch and one pull request per milestone issue, merged into `main` once the milestone's **Done when** check passes; the PR body says `Closes #<issue>`. Merging to `main` deploys Strapi Cloud (and Vercel, once connected). Branch: `m4-school-api`; PR body: `Closes {{#self}}`.
