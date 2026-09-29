> **Part of {{#epic}}** · **M9** (step 10 of 10) · Blocked by: {{#m7}}, {{#m8}} · Spec: [06-build-spec.md @ 0a488c1](https://github.com/PaulBratslavsky/matfinder/blob/0a488c125ef61fa485f1c71c2d75565debe19de3/docs/plan/06-build-spec.md#m9-tests-deploy-and-real-listings)

## Goal
Unit, server integration, and Playwright suites are green. The backend runs on Strapi Cloud and the web app on Vercel with **same-origin** auth. 3–5 real Las Vegas schools are published, and every proof-of-concept acceptance criterion passes on the deployed URLs.

## Why
- The acceptance criteria are run against **Vercel + Strapi Cloud** (and dev builds for native); this step is where they all pass.
- The **Vercel same-origin rewrite** is a user decision named in the deviation protocol. Better Auth's session cookie must be **first-party**. Cross-site cookies between `*.vercel.app` and `*.strapiapp.com` are blocked by Safari and by third-party-cookie restrictions elsewhere, which makes this the #1 "works locally, breaks in production" auth failure.

## Implementation spec
- [ ] **Unit (Vitest):**
  - `mobile/lib/time.test.ts`: training today, next session, On now, day rollover, a device TZ ≠ city TZ (mock `Date`).
  - `mobile/lib/filters.test.ts`: text search (accent- and case-insensitive), each filter, AND combination.
  - `server/tests/unit/*.test.ts`: `slugify` fallback, schedule validation, directory trimming.
- [ ] **Server integration** (`server/tests/api.test.ts`, run against a dev server with the sample seed from {{#m8}}):
  - directory field set is exactly the public set;
  - bySlug is 401/403 → sign up via `/api/auth/sign-up/email` → 200;
  - `GET /api/schools` → 403;
  - `POST /mcp` `tools/list` with the admin token → exactly 8 tools;
  - `upsert_school` creates a draft absent from the directory;
  - `set_school_schedule` rejects `end <= start`.
- [ ] **End-to-end (Playwright, `mobile/e2e/`)** against `npx expo start --web` (or the exported build served locally), `trace: 'retain-on-failure'`: map loads → "Training today" + "Visitors welcome" → pin/list item → preview card → "View school" → sign up (unique email) → school page shows the full schedule with today highlighted → sign out → redirected to sign-in.
- [ ] **Deploy backend:** push → Strapi Cloud. Set production env vars; `SEED_SAMPLE_DATA` **unset**. Create the production admin user and the production `matfinder-curator` admin token.
- [ ] **Deploy web:** Vercel project, root directory `mobile`, env vars per *Environment variables* below. `mobile/vercel.ts` (install `@vercel/config`):
  ```ts
  import { routes, type VercelConfig } from '@vercel/config/v1'
  const STRAPI = process.env.STRAPI_ORIGIN! // e.g. https://<project>.strapiapp.com
  export const config: VercelConfig = {
    framework: null,
    buildCommand: 'npx expo export -p web',
    outputDirectory: 'dist',
    rewrites: [
      routes.rewrite('/api/(.*)', `${STRAPI}/api/$1`), // same-origin API → first-party auth cookies
      routes.rewrite('/(.*)', '/index.html'),           // SPA fallback (static files are served first)
    ],
  }
  ```
  Then add the Vercel production URL to Strapi's `WEB_ORIGINS` and redeploy Strapi. Restrict the Mapbox public token to the Vercel domains.
- [ ] **Smoke test** the acceptance criteria below on the deployed URLs.
- [ ] **Real listings:** the curator adds 3–5 real Las Vegas schools via Claude + MCP against **production**, reviews, uploads logos, and publishes.

## Reference (copied from the spec)

### Deployment
- **Backend → Strapi Cloud:** https://cloud.strapi.io → import the GitHub repo → **root directory `server`** → US region → Node 24 (or newest offered) → set the env vars → deploy on push to `main`. Docs: https://docs.strapi.io/cloud/getting-started/intro. After the first deploy: create the admin user, the `matfinder-curator` admin token, and confirm the API Permissions grants were seeded.
- **Web → Vercel:** import the repo → **root directory `mobile`** → `vercel.ts` above (build `npx expo export -p web`, output `dist`, `/api/*` rewrite to Strapi Cloud, SPA fallback) → env vars → deploy. Add the production and preview domains to Strapi `WEB_ORIGINS`.
- **Why the rewrite matters:** Better Auth's session cookie must be **first-party**. Cross-site cookies between `*.vercel.app` and `*.strapiapp.com` are blocked by Safari and by third-party-cookie restrictions elsewhere. This is the #1 "works locally, breaks in production" auth failure.
- **Native:** dev builds (`npx expo run:ios|android`); optional EAS Build internal distribution for testers. **No App Store / Play Store submission** in the proof of concept (physical iPhones need an Apple Developer account for TestFlight or ad-hoc builds).

**Forward reference from {{#m1}}:** the Strapi Cloud project was first linked and deployed in {{#m1}}, but the "after the first deploy" items above couldn't all be done then. The `matfinder-curator` token needs the MCP actions from {{#m5}}, and the grants are seeded by {{#m3}}. They're done here, where the spec's M9 lists them as tasks, along with checking that the production grants were seeded. *(added: not in spec)*

**Production admin token** (the same steps as {{#m5}}, on production): Strapi admin → **Settings → Admin Tokens** (not API Tokens; `/mcp` rejects API tokens) → name `matfinder-curator`, unlimited duration → tick **only** the *MatFinder MCP tools* actions. Save it in a password manager; **never commit it**. Connect Claude to `https://<project>.strapiapp.com/mcp` with `-H "Authorization: Bearer <token>"`, the same form as the local `claude mcp add` in {{#m5}}. *(added: not in spec: the production connect command)*

### Environment variables (production)
This is the spec's two env tables with the example column cut to production values. *(added: not in spec: the reshaped tables)*

**Strapi (Strapi Cloud)**

| Variable | Example | Notes |
|---|---|---|
| `HOST`, `PORT` | `0.0.0.0`, `1337` | |
| `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY` | random | Strapi Cloud injects |
| `DATABASE_CLIENT` | `postgres` | |
| `DATABASE_URL` | (managed) | Strapi Cloud injects |
| `BETTER_AUTH_SECRET` | `openssl rand -hex 32` | |
| `BETTER_AUTH_URL` | `https://<project>.strapiapp.com` | bare origin |
| `WEB_ORIGINS` | `http://localhost:8081,https://matfinder.vercel.app` | CORS + `trustedOrigins`; add the Vercel production and preview domains |
| `MAPBOX_ACCESS_TOKEN` | `pk.…` | admin map field |
| `MAPBOX_GEOCODING_TOKEN` | `pk.…`/`sk.…` | server-only geocoding (no URL restriction); falls back to the above |
| `MCP_ENABLED` | `true` | |
| `SEED_SAMPLE_DATA` | **unset** | development only |

**Expo (Vercel, EAS)**

| Variable | Example | Notes |
|---|---|---|
| `EXPO_PUBLIC_STRAPI_URL` | `https://<project>.strapiapp.com` | native API + auth |
| `EXPO_PUBLIC_WEB_API_BASE` | *(empty)* (prod, relative via rewrite) | web API + auth |
| `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` | `pk.…` | URL-restricted to the Vercel domains |
| `EXPO_PUBLIC_DEFAULT_CITY` | `las-vegas` | |
| `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` | `sk.…` (`DOWNLOADS:READ`) | **build-time secret**, never `EXPO_PUBLIC_` |
| `STRAPI_ORIGIN` (Vercel only) | `https://<project>.strapiapp.com` | used by `vercel.ts` |

> `EXPO_PUBLIC_*` values are compiled into the bundle. **No secrets** (admin token, `sk.` tokens, `BETTER_AUTH_SECRET`) may use that prefix.

### API surface (what the integration tests assert)
| Method & path | Role | Returns |
|---|---|---|
| `GET /api/schools/directory?city=<slug>` | Public, Authenticated | `{ data: { city: { slug, name, timezone, center: { latitude, longitude }, defaultZoom }, localDate, weekday, generatedAt, schools: [{ documentId, slug, name, logo: { url } \| null, latitude, longitude, neighborhood, postalCode, affiliation: string \| null, styles, programs, visitorsWelcome, dropInFee, currency, todaySessions: [{ start, end, classType, style }] }] } }`, `Cache-Control: public, max-age=60` |
| `GET /api/schools/slug/:slug` | **Authenticated only** | `{ data: { documentId, slug, name, shortDescription, description (blocks), city: { slug, name, timezone }, location, neighborhood, postalCode, logo, gallery, affiliation: { name, slug, website, logo } \| null, headInstructors: [{ name, slug, beltRank, degree, photo, bio }], pricing, contact, amenities, schedule: [{ day, start, end, classType, style, notes }], styles, programs, todaySessions, nextSessionToday, lastVerifiedAt } }`, or 404 |
| `GET /api/cities` | Public | core `find` |
| `/api/auth/*` | Public | Better Auth (sign-up/email, sign-in/email, sign-out, get-session) |
| `POST /mcp` | Admin token | Strapi MCP (8 custom tools only) |
| core `/api/schools`, `/api/instructors`, `/api/affiliations` | **nobody** | 403 |

The 8 MCP tools are `list_reference_data`, `find_schools`, `get_school`, `upsert_school`, `set_school_schedule`, `upsert_instructor`, `upsert_affiliation`, and `list_pending_drafts` (full contracts in {{#m5}}).

### Time rules (what `time.test.ts` asserts)
- **City-local now** = `Intl.DateTimeFormat('en-US', { timeZone: city.timezone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now)` → `{ localDate: 'YYYY-MM-DD', weekday: 'mon'…'sun', minutes }`. **Never** use the device time zone.
- Session times: Strapi stores `HH:mm:ss.SSS`; APIs emit `HH:mm`; compare as minutes since midnight.
- **`todaySessions`** = sessions with `day === weekday`, sorted by start.
- **Training today (R6)** = any today session with `end > nowMinutes`.
- **`nextSessionToday`** = the first today session with `end > nowMinutes`; label **"On now"** if `start ≤ now < end`; otherwise "<Class type> · <h:mm am/pm>".
- **Styles** = distinct from the schedule (`both` → gi + nogi). **Programs** = distinct `classType`.

## Watch out for
- **`SEED_SAMPLE_DATA` stays unset in production.**
- **The `/api/(.*)` rewrite is a user decision.** Without it, auth cookies are cross-site and get blocked. If production auth fails, **don't** switch to the `bearer()` fallback on your own; ask the user first.
- **Keep the rewrite order as written:** `/api/(.*)` first, then the SPA fallback `/(.*)` → `/index.html`. Static files are served first. *(added: not in spec: that the order matters)*
- **Add the Vercel production (and preview) domains to Strapi's `WEB_ORIGINS` and redeploy Strapi.** `WEB_ORIGINS` drives CORS and `trustedOrigins`.
- **Restrict the Mapbox public token** (`EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`) to the Vercel domains.
- **Never commit the production `matfinder-curator` token**, and never put it in an `EXPO_PUBLIC_*` variable. Don't paste it into issues or PRs either. *(added: not in spec: issues and PRs)*
- **Tests sign up real users** through `/api/auth/sign-up/email` with a unique email; the seed doesn't create accounts.
- **Real listings go through MCP as drafts.** A human reviews, uploads logos, and publishes in the admin.
- **No App Store / Play Store submission** in the proof of concept.
- `STRAPI_ORIGIN` is a Vercel-only variable used by `vercel.ts`; install `@vercel/config`.

## Verify during this step
Nothing new is tagged to M9. If production auth doesn't persist even with the rewrite, stop and ask before changing the auth transport; the `bearer()` fallback needs the user's approval.

If a check fails, the deviation protocol applies: stop and ask.

## Done when
- [ ] All suites are green locally: unit (Vitest), server integration, and Playwright
- [ ] Every acceptance criterion below passes on Vercel + Strapi Cloud

The deploy and real-listings tasks feed the second box. To track them separately: *(added: not in spec)*
- [ ] Backend deployed to Strapi Cloud with production env vars (`SEED_SAMPLE_DATA` unset); production admin user and `matfinder-curator` token created; grants confirmed
- [ ] Web deployed to Vercel with the `vercel.ts` rewrite; Vercel URL added to `WEB_ORIGINS` and Strapi redeployed; Mapbox public token restricted
- [ ] 3–5 real Las Vegas schools added via MCP on production, reviewed, logos uploaded, and published

## Acceptance criteria this step unlocks
All of them, run against **Vercel + Strapi Cloud** (and dev builds for native):
- [ ] **AC1:** Signed out, the web app opens on a map centered on the device location (or the Las Vegas center if denied), with pins for every published school.
- [ ] **AC2:** Search "Henderson" narrows pins and list; *Training today*, *Visitors welcome*, and *Gi / No-Gi* each filter correctly and combine with AND; empty results show a helpful empty state.
- [ ] **AC3:** "Training today" and the card's next session are correct in **Las Vegas time** even with the device set to another time zone.
- [ ] **AC4:** Tapping a pin shows the preview card with next session today (or "On now"), visitors badge, drop-in fee, styles, and distance.
- [ ] **AC5:** "View school" while signed out → sign up → returns to **that** school's page with the full schedule (today highlighted), pricing, instructors with belts, affiliation, amenities, contact, and a working **Directions** hand-off.
- [ ] **AC6:** Without a session, `GET /api/schools/slug/<slug>` returns 401/403 and `GET /api/schools` returns 403; the directory payload contains **no** gated fields.
- [ ] **AC7:** The session survives web reloads and native app restarts; sign out re-gates school pages.
- [ ] **AC8:** In Claude (Code or Desktop) connected to production MCP with the curator token, `tools/list` shows **only** the 8 MatFinder tools; "add <real Vegas school>…" creates a **draft** with a geocoded pin and a structured schedule; it is **not** visible in the app; `list_pending_drafts` lists it with its changed fields.
- [ ] **AC9:** After the curator uploads a logo and **publishes** in the Strapi admin, the school appears in the app within ~60 s.
- [ ] **AC10:** The same core flows work in iOS Simulator and Android Emulator dev builds (native Mapbox map).
- [ ] **AC11:** Unit, server integration, and Playwright suites are green.

## Out of scope
- App Store / Play Store submission and its prerequisites: in-app account deletion (Apple guideline 5.1.1(v)), privacy policy, Sign in with Apple if any social login is added
- v2 candidates (owners claiming listings, program-type filter, favorites, password reset / email verification, social sign-in, schedule exceptions, more cities, Sentry, per-session "visitors welcome" overrides)
- Re-evaluating Better Auth (beta) before any public launch (parked)

## For the implementing agent
- **Deviation protocol:** commands, structures, versions, and conventions in this spec are **user decisions**. If you (the build agent) want to substitute any of them (build friction, a newer API, a "simpler" alternative), **STOP and ask the user.** Do not silently trade off. This applies especially to: the auth stack, the two-endpoint gate, draft-only MCP tools, and the Vercel same-origin rewrite.
- **Docs:** Vercel `vercel.ts` https://vercel.com/docs/project-configuration/vercel-ts · rewrites https://vercel.com/docs/rewrites · Strapi Cloud https://docs.strapi.io/cloud/getting-started/intro · Strapi MCP server https://docs.strapi.io/cms/features/strapi-mcp-server · Expo https://docs.expo.dev (web export)
- **Workflow (the spec's rule):** one branch and one pull request per milestone issue, merged into `main` once the milestone's **Done when** check passes; the PR body says `Closes #<issue>`. Merging to `main` deploys Strapi Cloud (and Vercel, once connected). Branch: `m9-tests-deploy`; PR body: `Closes {{#self}}`.
