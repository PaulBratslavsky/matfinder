# Technical Requirements

> Verified on **2026-09-27** against the Strapi docs (via the `strapi-docs` MCP and https://docs.strapi.io), the source of `@strapi-community/plugin-better-auth` (`1.0.0-beta.7`) and `strapi-plugin-map-box` (`0.0.4`), Better Auth's Expo guide, and the Strapi blog posts on MCP custom tools and on Strapi MCP with TanStack AI (Strapi 5.55.1).
> When in doubt during the build, query the `strapi-docs` MCP first.

Requirement IDs (R1–R14) refer to `03-requirements.md`.

---

## Strapi content types

All content types live in `server/src/api/<name>/` (Strapi's native folder structure). The existing demo types `api::location.location` and `api::category.category` are **deleted**.

### `api::city.city`: collection type
| Field | Type | Notes |
|---|---|---|
| name | string | required, unique, max 80 (e.g., "Las Vegas") |
| slug | uid (target: `name`) | required. Set by middleware if missing (see *Document Service middleware*) |
| state | string | e.g., "NV" |
| country | string | default "US" |
| timezone | string | **required**, IANA name (e.g., `America/Los_Angeles`). Validated by middleware |
| center | customField `global::map-box` | required. Map center `{ longitude, latitude, address, zoom, pitch, bearing }` |
| defaultZoom | decimal | default 10.5 |
| schools | relation oneToMany → `api::school.school` (mappedBy `city`) | |

- Draft & publish: **no** (config-like; changes go live immediately)
- Localized: no

### `api::affiliation.affiliation`: collection type
| Field | Type | Notes |
|---|---|---|
| name | string | required, max 80 (e.g., "10th Planet Jiu Jitsu", "Gracie Barra", "Independent") |
| slug | uid (target: `name`) | required. Set by middleware |
| website | string | normalized to `https://…` |
| logo | media (single, images) | optional |
| schools | relation oneToMany → `api::school.school` (mappedBy `affiliation`) | |

- Draft & publish: **yes** (R13–R14) · Localized: no

### `api::instructor.instructor`: collection type
| Field | Type | Notes |
|---|---|---|
| name | string | required, max 120 |
| slug | uid (target: `name`) | required. Set by middleware |
| beltRank | enumeration | required: `white`, `blue`, `purple`, `brown`, `black`, `red_black`, `red_white`, `red` |
| degree | integer | min 0, max 10 (stripes/degrees) |
| photo | media (single, images) | optional |
| bio | text | max 1000 |
| schools | relation manyToMany → `api::school.school` (mappedBy `headInstructors`) | |

- Draft & publish: **yes** · Localized: no

### `api::school.school`: collection type
| Field | Type | Notes |
|---|---|---|
| name | string | required, max 120 |
| slug | uid (target: `name`) | required. **The stable public key**: app URL `/schools/<slug>` and the MCP upsert key. Set by middleware; real DB unique index (see *Uniqueness*) |
| shortDescription | text | max 280. Used in lists and search results |
| description | blocks | rich text for the school page |
| city | relation manyToOne → `api::city.city` (inversedBy `schools`) | required |
| location | customField `global::map-box` | required. `{ longitude, latitude, address, zoom, pitch, bearing }` (the plugin's JSON shape) |
| neighborhood | string | e.g., "Summerlin", "Henderson". Searchable (R5) |
| postalCode | string | Searchable (R5) |
| logo | media (single, images) | |
| gallery | media (multiple, images) | up to 12 (soft limit, enforced in the admin workflow) |
| affiliation | relation manyToOne → `api::affiliation.affiliation` (inversedBy `schools`) | optional ("Independent" is its own affiliation) |
| headInstructors | relation manyToMany → `api::instructor.instructor` (inversedBy `schools`) | ordered list |
| pricing | component `school.pricing` (single) | |
| contact | component `school.contact` (single) | |
| amenities | component `school.amenities` (single) | |
| schedule | component `schedule.session` (**repeatable**) | weekly recurring sessions (R6, R11) |
| lastVerifiedAt | date | when a human last confirmed the schedule and prices. Shown as "Schedule verified <date>"; drives the staleness queue |

- Draft & publish: **yes** · Localized: no
- **Derived at response time (never stored):**
  - `styles`: distinct `gi` / `nogi` from `schedule` (a `both` session counts as both)
  - `programs`: distinct `classType`s from `schedule`
  - `todaySessions`, `nextSessionToday`: see *Time rules*

---

## Components

### `school.pricing`
| Field | Type | Notes |
|---|---|---|
| visitorsWelcome | boolean | default `false`. Drives the R7 filter and the card badge |
| dropInFee | decimal | min 0; `null` = unknown, `0` = free |
| dropInNotes | string | e.g., "Free for visiting black belts", "Must sign waiver online" |
| freeTrial | boolean | default `false` |
| freeTrialNotes | string | e.g., "First week free" |
| monthlyMin | decimal | min 0 |
| monthlyMax | decimal | min 0, ≥ `monthlyMin` (validated) |
| currency | enumeration | `USD` (default). Kept for future cities |

### `school.contact`
| Field | Type | Notes |
|---|---|---|
| phone | string | E.164 preferred (`+17025551234`) |
| email | email | |
| website | string | normalized to `https://…` |
| instagram | string | stored as a **handle without `@`**. Middleware strips `@` and full URLs |

### `school.amenities`
| Field | Type | Notes |
|---|---|---|
| showers | boolean | default false |
| changingRooms | boolean | default false |
| parking | boolean | default false |
| giRental | boolean | default false |
| proShop | boolean | default false |
| kidsArea | boolean | default false |
| airConditioning | boolean | default false |

> "Women's-only classes" is **not** an amenity flag. It is derived from `schedule` (`classType = womens`) so it can't contradict the timetable.

### `schedule.session`
| Field | Type | Notes |
|---|---|---|
| day | enumeration | required: `mon`, `tue`, `wed`, `thu`, `fri`, `sat`, `sun` |
| startTime | time | required. City-local wall-clock time (Strapi stores `HH:mm:ss.SSS`; APIs emit `HH:mm`) |
| endTime | time | required. Must be after `startTime` on the same day (no sessions across midnight) |
| classType | enumeration | required: `fundamentals`, `all_levels`, `advanced`, `open_mat`, `competition`, `kids`, `womens` |
| style | enumeration | required: `gi`, `nogi`, `both` |
| notes | string | optional, e.g., "Ages 6–12", "Bring both gi and rash guard" |

## Dynamic zones
**None.** School pages have a fixed layout (confirmed in stage 3).

---

## Time rules (single definitions, used by server, app, and tests)
- **City-local now:** `Intl.DateTimeFormat('en-US', { timeZone: city.timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())` → `{ localDate, weekday, minutes }`. **Never** use the device's time zone. (Verify during build that Hermes on iOS/Android returns correct `timeZone` results; fallback: have the server return `now` fields and compute an offset.)
- **`todaySessions`:** sessions where `day === weekday(localNow)`, sorted by `startTime`.
- **"Training today" (R6):** the school has ≥ 1 session today with `endTime > localNow.minutes`.
- **`nextSessionToday` (R3 card):** the first today session with `endTime > localNow.minutes`. If `startTime ≤ now < endTime`, it's labeled **"On now"**.
- **Day rollover:** the directory response carries `localDate`. The app refetches when the city-local date changes or the app returns to the foreground (TanStack Query `refetchOnWindowFocus` / AppState).
- **Distance:** straight-line (haversine) from device location, in miles. Hidden without location permission.

---

## API surface

### Principles
- **The sign-in gate is enforced by the server (R10, NFR Security).** Core `find` / `findOne` routes for School, Instructor, and Affiliation are **not granted to any role**. The app uses exactly two school endpoints: a **public, trimmed directory** and an **authenticated full detail**.
- Controllers are thin ctx adapters. **All logic lives in services** (`api::school.school` service), shared by REST controllers **and** MCP tools.
- REST responses only ever read **published** documents (`status: 'published'`).

### Custom routes, `server/src/api/school/routes/01-custom-school.ts`
> The file is prefixed `01-` so it loads **before** the core router. Otherwise `GET /api/schools/directory` is swallowed by the core `GET /api/schools/:id`.

| Method & path | Handler | Role | Description |
|---|---|---|---|
| `GET /api/schools/directory?city=<citySlug>` | `api::school.school.directory` | **Public** (+ Authenticated) | All published schools in the city, trimmed to preview fields. Powers the map, list, search, and filters (R2–R9) |
| `GET /api/schools/slug/:slug` | `api::school.school.bySlug` | **Authenticated only** | Full school page payload (R11). Unauthenticated → 401/403 → the app shows the sign-in prompt |

**`GET /api/schools/directory` response** (`Cache-Control: public, max-age=60`):
```json
{
  "data": {
    "city": { "slug": "las-vegas", "name": "Las Vegas", "timezone": "America/Los_Angeles",
              "center": { "latitude": 36.1699, "longitude": -115.1398 }, "defaultZoom": 10.5 },
    "localDate": "2026-09-27", "weekday": "sun", "generatedAt": "2026-09-27T19:05:00.000Z",
    "schools": [{
      "documentId": "…", "slug": "example-bjj-summerlin", "name": "Example BJJ Summerlin",
      "logo": { "url": "…/thumbnail_logo.png" },
      "latitude": 36.18, "longitude": -115.30,
      "neighborhood": "Summerlin", "postalCode": "89135",
      "affiliation": "Example Team",
      "styles": ["gi", "nogi"], "programs": ["fundamentals", "open_mat", "kids"],
      "visitorsWelcome": true, "dropInFee": 20, "currency": "USD",
      "todaySessions": [{ "start": "19:00", "end": "20:30", "classType": "open_mat", "style": "nogi" }]
    }]
  }
}
```
> Deliberately **excluded** from the public payload: the weekly schedule beyond today, instructors, contact, amenities, gallery, description, and pricing beyond the drop-in fee.

**`GET /api/schools/slug/:slug` response:** the full published school, with `city`, `affiliation` (name, slug, website, logo), `headInstructors` (name, slug, beltRank, degree, photo, bio), `pricing`, `contact`, `amenities`, the full `schedule` (times as `HH:mm`), `logo`, `gallery` (with formats), `description` (blocks), `lastVerifiedAt`, plus the derived `styles`, `programs`, `todaySessions`, `nextSessionToday`, and `city.timezone`. `404` if there is no published school with that slug.

### Other REST
| Method & path | Role | Notes |
|---|---|---|
| `GET /api/cities` (core `find`) | Public | Used to resolve the default city and map center. Filter `?filters[slug][$eq]=las-vegas` |
| `/api/auth/*` | Public | Better Auth routes mounted by the plugin (sign-up, sign-in, sign-out, get-session) |

### Default population strategy
No population middleware is needed. Both school endpoints build their own Document Service queries with explicit `populate` and `fields`: a **list profile** (directory) and a **detail profile** (bySlug). This is the documented list-vs-detail split, and it means the public route cannot accidentally over-fetch.

### GraphQL
Not used.

---

## Uniqueness (identity keys)
`slug` is the identity key for School, Instructor, Affiliation, and City. Schema `unique: true` is **validation-layer only**. Document Service writes (seed, MCP tools) bypass it, so:

1. **Real DB indexes, created in `bootstrap()`** (works on both SQLite locally and Postgres in production; both support partial unique indexes). Each DDL statement runs in its own try/catch and logs `error` on failure:
   ```sql
   -- draft-and-publish types: exactly one draft row per document, so index the draft rows
   CREATE UNIQUE INDEX IF NOT EXISTS schools_slug_draft_uq      ON schools (slug)      WHERE published_at IS NULL;
   CREATE UNIQUE INDEX IF NOT EXISTS instructors_slug_draft_uq  ON instructors (slug)  WHERE published_at IS NULL;
   CREATE UNIQUE INDEX IF NOT EXISTS affiliations_slug_draft_uq ON affiliations (slug) WHERE published_at IS NULL;
   CREATE UNIQUE INDEX IF NOT EXISTS cities_slug_uq             ON cities (slug);
   ```
   (Verify the table and column names against the generated schema. Strapi uses `collectionName` and snake_case columns.)
2. **Create, catch, refetch** in every service upsert. On a unique violation, re-query **by slug** and update that document instead of throwing.
3. **`slugify` with a fallback.** An empty result (non-Latin names) becomes `school-<6-char id>` so slugs never collide on `''`.

---

## MCP server (enabled)
- **Config:** `server/config/server.ts` → `mcp: { enabled: env.bool('MCP_ENABLED', true) }`. Endpoint `POST /mcp` (stateless).
- **Auth:** an **Admin token** (Settings → **Admin Tokens**, not API Tokens) named `matfinder-curator`, holding **only** the *MatFinder MCP tools* actions below. **No Content Manager permissions**, so Strapi's generic CRUD tools never appear in `tools/list`.
- **Registration (all in `server/src/index.ts` → `register()`; not `bootstrap()`, which runs after the MCP server starts and would also wipe token grants):**
  1. `strapi.service('admin::permission').actionProvider.registerMany([...])`, one action per tool: `{ section: 'settings', category: 'MatFinder MCP tools', uid: 'matfinder-mcp.<tool-name>', displayName: '<Title>' }`. Mutating tools get a ` (write)` suffix. Action id = `api::matfinder-mcp.<tool-name>`.
  2. `strapi.ai.mcp.registerTool({ name, title, description, auth: { policies: [{ action: 'api::matfinder-mcp.<tool-name>' }] }, resolveInputSchema, resolveOutputSchema, createHandler })`: **one object argument**; `resolveOutputSchema` is **mandatory**; `z` comes from **`@strapi/utils`** (never import `zod` directly; Strapi bundles zod 3).
  3. Handlers return `{ content: [{ type: 'text', text }], structuredContent }`, where `structuredContent` matches the output schema. They call the **school/instructor/affiliation services**, the same code the REST controllers use.
- **Code layout:** `server/src/mcp/index.ts` (the tool list plus `registerMcp(strapi)`), `server/src/mcp/tools/<tool>.ts`, and `server/src/mcp/guard.ts` (result-size guard).
- **Result-size guard:** serialized size × 2 + 2 KB; above 950 KB, return `{ error: 'RESULT_TOO_LARGE', message: '<tool-specific shrink hint>' }` instead.
- **All writes target the draft.** No tool publishes, unpublishes, deletes, or uploads media. Photos and logos are uploaded by the curator in the admin (a known MCP limitation).

### Tools
| Tool | Kind | Input (all zod-validated) | Output / behavior |
|---|---|---|---|
| `list_reference_data` | read | `{}` | Cities, affiliations, and instructors as `{ slug, name }` (instructors also `beltRank`). **Call first** to reuse existing records and avoid duplicates |
| `find_schools` | read | `{ search?, city?, status?: 'any'\|'published'\|'unpublished-changes'\|'never-published', staleDays?: number, page?: 1, limit?: 20 (max 50) }` | `{ items: [{ documentId, slug, name, neighborhood, city, affiliation, status, updatedAt, lastVerifiedAt }], page, limit, total, hasMore }`. `staleDays` returns schools whose `lastVerifiedAt` is older than N days (or empty) |
| `get_school` | read | `{ slug, excerptChars?: 600 }` | The **draft** version with relations as **names and slugs** (not bare ids), schedule as `HH:mm`, description as plain text truncated to `excerptChars`, and `status` (`published` / `unpublished-changes` / `never-published`) |
| `upsert_school` | write | `{ slug?, name?, citySlug?, shortDescription?, descriptionText?, address?, latitude?, longitude?, neighborhood?, postalCode?, affiliationSlug?, headInstructorSlugs?, pricing?: Partial<Pricing>, contact?: Partial<Contact>, amenities?: Partial<Amenities>, lastVerifiedAt? }` | **Partial by construction.** It only writes fields that are provided; components are **merged** field by field. No `slug` or unknown slug → **create** (requires `name`, `citySlug`, `address`). **Location:** if only `address` is given, the server **geocodes it with Mapbox** (biased to the city center) and stores the `map-box` JSON. The agent is never trusted to invent coordinates. `descriptionText` (paragraphs separated by blank lines) is converted to blocks. `headInstructorSlugs` **replaces** the ordered list. Returns `{ documentId, slug, created, changedFields, status }` |
| `set_school_schedule` | write | `{ slug, sessions: [{ day, start: 'HH:mm', end: 'HH:mm', classType, style, notes? }] }` (max 100) | **Replaces the whole weekly schedule** on the draft (the tool description says to send the complete week). Validates each row (enums, `end > start`). Returns `{ slug, sessionCount, byDay: { mon: 3, … } }` |
| `upsert_instructor` | write | `{ slug?, name?, beltRank?, degree?, bio? }` | Partial create/update (draft). Link instructors to schools via `upsert_school.headInstructorSlugs` |
| `upsert_affiliation` | write | `{ slug?, name?, website? }` | Partial create/update (draft) |
| `list_pending_drafts` | read | `{ type?: 'school'\|'instructor'\|'affiliation', limit?: 25 }` | Documents that are **never published** or have **unpublished changes**, each with `changedFields` (draft vs. published comparison of top-level fields, components, and schedule count) and `updatedAt`. Lets the curator ask "what's waiting for review?" |

- Every tool gets a **hand-written description** stating what it is for and when to use it (e.g., `upsert_school`: "Create or partially update a BJJ school listing as a DRAFT. Only send fields you want to change. Call `find_schools` first to check whether the school already exists.").
- Multi-write operations (create a school and connect relations; replace a schedule) run inside **`strapi.db.transaction()`** in the service.

### Connecting clients
- **Claude Code:** `claude mcp add matfinder --transport http https://<strapi-host>/mcp -H "Authorization: Bearer <admin token>"`
- **Claude Desktop:** `claude_desktop_config.json` → `npx -y mcp-remote https://<strapi-host>/mcp --header "Authorization: Bearer <admin token>"`
- Local: `http://localhost:1339/mcp`. The token is never committed and never shipped in the app.

### Known limitations (accepted)
No media upload; stateless requests; tool results are size-guarded.

---

## Auth (Better Auth, `@strapi-community/plugin-better-auth`) ⚠️ beta
- **Packages (server):** `better-auth@^1.7`, `@better-auth/expo@^1.7`, `@strapi-community/plugin-better-auth`, `@strapi-community/plugin-api-permissions`, `@strapi-community/plugin-better-auth-dashboard`, `@better-auth/infra`, **`zod@^4.1.12`** (pinned for the dashboard; Strapi's internals keep their own zod 3). **Uninstall** `@strapi/plugin-users-permissions` (the plugin refuses to boot while it's installed).
- **`server/config/plugins.ts`:** enable `better-auth`, `api-permissions`, `better-auth-dashboard`, plus `'map-box'` (see stage 6, M0, for the key check).
- **`server/src/lib/auth.ts`** (the runtime auto-discovers this path; **export the instance**, not a factory):
  ```ts
  import { betterAuth } from 'better-auth'
  import { expo } from '@better-auth/expo'
  import { strapiAdapter } from '@strapi-community/plugin-better-auth'

  const webOrigins = (process.env.WEB_ORIGINS ?? 'http://localhost:8083').split(',')

  export const auth = betterAuth({
    database: strapiAdapter(),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:1339',
    trustedOrigins: [...webOrigins, 'matfinder://', ...(process.env.NODE_ENV === 'production' ? [] : ['exp://'])],
    emailAndPassword: { enabled: true, requireEmailVerification: false, minPasswordLength: 8 },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 }, // 30-day sliding session
    plugins: [expo()],
    advanced: { database: { generateId: 'serial' } }, // REQUIRED, or foreign keys break on first sign-up
  })
  export default auth
  ```
- **Generate Better Auth content types** (`user`, `session`, `account`, `verification`): `npx @better-auth/cli generate --config src/lib/auth.ts --yes`.
- **Session lifetime:** 30 days, sliding (refreshed daily on use). Marco signs in once per trip, not per day.
- **Rate limiting:** Better Auth's built-in limiter (on by default in production) protects the sign-in and sign-up endpoints.
- **Flows:**
  - **Sign up:** name, email, password → session created → return to `redirect`.
  - **Sign in:** email, password → session → return to `redirect`.
  - **Sign out:** `authClient.signOut()` → clear the query cache for detail data.
  - **Password reset / email verification:** out of scope for the proof of concept.
- **How the app sends the session:**
  - **Native** (`lib/auth-client.native.ts`): `createAuthClient({ baseURL: EXPO_PUBLIC_STRAPI_URL + '/api/auth', plugins: [expoClient({ scheme: 'matfinder', storagePrefix: 'matfinder', storage: SecureStore })] })`. API requests add `Cookie: await authClient.getCookie()` with `credentials: 'omit'`.
  - **Web** (`lib/auth-client.web.ts`): `createAuthClient({ baseURL: <web API base> + '/api/auth' })`. Browser cookies; in production the requests are **same-origin** through the Vercel rewrite. In local development they go cross-origin to `localhost:1339` (same site, so cookies still work) with `credentials: 'include'`.
- **CORS (`server/config/middlewares.ts`):** `strapi::cors` with `origin: WEB_ORIGINS`, `credentials: true`. Keep the map-box CSP directives from the plugin README.

## Permissions & roles
Content-API permissions are managed by **`plugin-api-permissions`** (Settings → API Permissions). Users & Permissions is gone. Rows are `plugin::api-permissions.permission { action, role }`; roles are `plugin::api-permissions.role`. Seed both roles in `bootstrap()`, idempotently (skip rows that already exist):

| Role | Granted actions |
|---|---|
| **Public** | `api::school.school.directory`, `api::city.city.find` |
| **Authenticated** | everything Public has, plus `api::school.school.bySlug` |

- **Never granted to any role:** core `find` / `findOne` / `create` / `update` / `delete` on school, instructor, affiliation, and **any access to the Better Auth `user` content type**. The current user comes only from `/api/auth/get-session` (prevents listing accounts).
- **Admin roles:** Super Admin (the curator) manages everything in the admin and publishes. The **MCP admin token** holds only the `api::matfinder-mcp.*` actions.

## Lifecycles / policies / middlewares
- **Document Service middleware** (`strapi.documents.use()` in `register()`, always `return next()`; reject with `errors.ValidationError` from `@strapi/utils`), in `server/src/document-middlewares/`:
  1. **`slug`:** on `create` for school, instructor, affiliation, and city, set `slug = slugify(name)` with the fallback if it's missing. Slugs are **not** regenerated on rename (stable URLs).
  2. **`schedule-validate`:** on school `create`/`update` when `schedule` is present: every row has `endTime > startTime`, enums are valid, and there are at most 100 rows.
  3. **`normalize-contact`:** strip `@` and URLs from `instagram`; prefix `https://` on `website` fields (school contact and affiliation).
  4. **`pricing-validate`:** `monthlyMax ≥ monthlyMin`; fees ≥ 0.
  5. **`city-validate`:** `timezone` must be a valid IANA zone (`new Intl.DateTimeFormat('en-US', { timeZone })` doesn't throw).
- **No lifecycle hooks** for business logic.
- **No custom policies.** Access is route permissions (api-permissions) plus admin-token scoping.
- **`bootstrap()`:** create the unique indexes, seed role permissions, and (development only, behind `SEED_SAMPLE_DATA=true`) seed sample data.

---

## Pages & components (Expo Router, `mobile/app/`)
The Expo app is upgraded to **SDK 57**. Template leftovers (`app/modal.tsx`, `app/(tabs)/explore.tsx`, `app/(tabs)/map.tsx`, `scripts/reset-project.js`) are removed. `app.json` sets `"scheme": "matfinder"`, `"name": "MatFinder"`, a real `ios.bundleIdentifier` / `android.package` (`com.matfinder.app`), and `web.output: "single"` (a single-page app: school pages are behind auth and need no static pre-rendering).

### Route tree
| Route file | URL | Access | Data | Components |
|---|---|---|---|---|
| `app/_layout.tsx` | n/a | n/a | n/a | `QueryClientProvider`, `AuthProvider` (wraps `authClient.useSession()`), NativeWind theme, React Native Reusables `PortalHost`, root `Stack` |
| `app/(tabs)/_layout.tsx` | n/a | n/a | n/a | Tabs: **Explore**, **Account** |
| `app/(tabs)/index.tsx` | `/` (`?q=&today=1&visitors=1&style=gi\|nogi&school=<slug>`) | public | `useDirectory(citySlug)` → `GET /api/schools/directory` | `SchoolMap`, `SearchBar`, `FilterChips`, `PreviewCard`, `SchoolList` (map/list toggle), `EmptyState`, `RecenterButton` |
| `app/(tabs)/account.tsx` | `/account` | public | session | Signed in: name, email, **Sign out**. Signed out: **Sign in** / **Create account** |
| `app/schools/[slug].tsx` | `/schools/<slug>` | **signed in** | `useSchool(slug)` → `GET /api/schools/slug/:slug` | No session → `<Redirect href={{ pathname: '/sign-in', params: { redirect: '/schools/<slug>' } }} />`. Otherwise: `SchoolHeader` (logo, name, affiliation, "Schedule verified <date>"), `Gallery`, `ProgramChips`, `ScheduleTable` (today highlighted, "On now" badge), `PricingCard`, `InstructorList`, `AmenityList`, `LocationMap` (static mini map), `DirectionsButton`, `ContactLinks`, description |
| `app/sign-in.tsx` | `/sign-in?redirect=` | public | Better Auth | React Native Reusables sign-in block (email, password). On success `router.replace(redirect ?? '/')` |
| `app/sign-up.tsx` | `/sign-up?redirect=` | public | Better Auth | React Native Reusables sign-up block (name, email, password) |
| `app/+not-found.tsx` | n/a | public | n/a | Link back to Explore |

### Key components and modules
- **`components/map/SchoolMap.tsx`** (native: `@rnmapbox/maps` `MapView` + `Camera` + `ShapeSource` / `CircleLayer` / `SymbolLayer` with clustering) and **`SchoolMap.web.tsx`** (`react-map-gl/mapbox` `Map` + GeoJSON `Source` / `Layer`), sharing **`SchoolMap.types.ts`**: `{ center, zoom, schools: MapSchool[], selectedSlug?, onSelect(slug), userLocation? }`. If there's no Mapbox token, render `MapUnavailable` and default to the list view.
- **`PreviewCard`:** bottom sheet on native, floating card on web. Shows name, logo, distance, `nextSessionToday` ("Open mat · 7:00 pm" / "On now" / "No more sessions today"), visitors-welcome badge, drop-in fee, style chips, and a **View school** button.
- **`lib/api/client.ts`:** fetch wrapper (keeps the existing `qs` pattern). Base URL: native `EXPO_PUBLIC_STRAPI_URL`; web `EXPO_PUBLIC_WEB_API_BASE` (empty in production → relative `/api`). Adds auth per platform (see *Auth*). Maps 401/403 to `AuthRequiredError`.
- **`lib/api/schools.ts`:** `getDirectory(citySlug)`, `getSchoolBySlug(slug)`, plus types.
- **`lib/time.ts`:** implements the *Time rules* (pure functions, unit-tested).
- **`lib/filters.ts`:** `applyFilters(schools, { q, today, visitors, style }, now)`. Text match (case-insensitive, accent-insensitive) on name, neighborhood, postalCode, and affiliation. All filters AND together (R9). Pure and unit-tested.
- **`lib/geo.ts`:** haversine distance (extends the existing file) and `directionsUrl(lat, lng, name)`: Apple Maps on iOS (`https://maps.apple.com/?daddr=`), Google Maps elsewhere (`https://www.google.com/maps/dir/?api=1&destination=`).
- **Hooks:**
  - `useDirectory`: TanStack Query, `staleTime` 60 s, refetch on focus and on city-local date change.
  - `useSchool`: enabled only with a session.
  - `useSession`.
  - `useUserLocation`: `expo-location` with a permission prompt; falls back to the city center (R1).
- **UI kit:** React Native Reusables components in `components/ui/` (button, card, input, label, text, badge, toggle-group, separator, skeleton, alert, avatar) on NativeWind v4.

## State management
- **Server state:** TanStack Query (`['directory', citySlug]`, `['school', slug]`). Sign-out clears the `school` queries.
- **URL state:** search text, filters, and the selected school are in the Explore route's search params, so web links are shareable (`/?today=1&visitors=1`).
- **Client state:** map camera position and the open sheet only (component state).

## Background jobs
**None.** Staleness is surfaced on demand (`find_schools` with `staleDays`, and "Schedule verified" on the page) rather than by a cron job.

## Media & uploads
- **Provider:** Strapi Cloud media in production; the local upload provider in development.
- **Formats:** Strapi's default responsive formats (`thumbnail`, `small`, `medium`, `large`). The directory returns the logo's `thumbnail` only; the detail returns gallery `small` and `large`.
- **Allowed types:** images only (logo, gallery, instructor photo, affiliation logo).
- **Uploads:** the curator only, in the admin (MCP cannot upload).

## Environment variables

### Strapi backend (`server/.env`, Strapi Cloud project settings)
| Variable | Example | Notes |
|---|---|---|
| `HOST` / `PORT` | `0.0.0.0` / `1339` | |
| `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY` | random | Strapi Cloud injects these in production |
| `DATABASE_CLIENT` | `sqlite` (local) · `postgres` (Strapi Cloud) | |
| `DATABASE_FILENAME` | `.tmp/data.db` | local SQLite only; must not be empty |
| `DATABASE_URL` | (production only) | Strapi Cloud injects |
| `BETTER_AUTH_SECRET` | `openssl rand -hex 32` | |
| `BETTER_AUTH_URL` | `http://localhost:1339` / `https://<project>.strapiapp.com` | bare origin, no path |
| `WEB_ORIGINS` | `http://localhost:8083,https://matfinder.vercel.app` | CORS + Better Auth `trustedOrigins` |
| `MAPBOX_ACCESS_TOKEN` | `pk.…` | admin map field (browser-visible in the admin) |
| `MAPBOX_GEOCODING_TOKEN` | `pk.…` or `sk.…` | **server-only** geocoding for `upsert_school`; falls back to `MAPBOX_ACCESS_TOKEN`. Must not be URL-restricted |
| `MCP_ENABLED` | `true` | |
| `SEED_SAMPLE_DATA` | `true` (dev only) | never set in production |

### Expo app (`mobile/.env`, EAS/Vercel env)
| Variable | Example | Notes |
|---|---|---|
| `EXPO_PUBLIC_STRAPI_URL` | `http://localhost:1339` (iOS sim) · `http://10.0.2.2:1339` (Android emu) · `http://<LAN-IP>:1339` (device) · `https://<project>.strapiapp.com` (prod) | native API + auth base |
| `EXPO_PUBLIC_WEB_API_BASE` | `http://localhost:1339` (dev) · *(empty)* (prod → relative `/api` via Vercel rewrite) | web API + auth base |
| `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` | `pk.…` | public, **URL-restricted** to the Vercel domains for web |
| `EXPO_PUBLIC_DEFAULT_CITY` | `las-vegas` | |
| `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` | `sk.…` (`DOWNLOADS:READ` scope) | **build-time secret** for native builds (EAS secret). Never prefixed `EXPO_PUBLIC_` |

### Vercel (web hosting)
| Variable | Example | Notes |
|---|---|---|
| `STRAPI_ORIGIN` | `https://<project>.strapiapp.com` | read by `vercel.ts` for the `/api/:path*` rewrite |

> Everything prefixed `EXPO_PUBLIC_` is compiled into the app bundle. **No secrets there**: no admin token, no `sk.` Mapbox tokens, no Better Auth secret.

---

## Seed data (decided)
- **Development and tests:** `server/src/seed/sample.ts`, run from `bootstrap()` only when `SEED_SAMPLE_DATA=true`, and idempotent (upsert by slug). Contents: city **Las Vegas** (`America/Los_Angeles`, center 36.1699, -115.1398), 3 affiliations, 6 instructors, and **8 clearly fictional schools** (names like "Sample Summerlin Jiu-Jitsu (Demo)") spread across Summerlin, Henderson, the Strip, and North Las Vegas. Together they cover every filter combination: at least one open mat every evening, visitors welcome yes/no, Gi-only, No-Gi-only, and both. All published.
- **Real listings:** added by the curator **through Claude + MCP** and reviewed and published in the admin. This is also the acceptance test for R13–R14. Sample data is never seeded in production.

## Testing (decided)
- **Unit (Vitest):**
  - `mobile/lib/time.ts`: "training today", next session, "On now", day rollover, a device time zone different from the city's.
  - `mobile/lib/filters.ts`: text search, each filter, and the AND combination.
  - Server helpers: `slugify` fallback, schedule validation, directory payload trimming.
- **Server integration (Vitest + Strapi test instance, or supertest against a running dev server):**
  - `GET /api/schools/directory` returns only the public field set.
  - `GET /api/schools/slug/:slug` returns 401/403 without a session and 200 with one.
  - Core `GET /api/schools` returns 403 for everyone.
  - Each MCP tool through a JSON-RPC `POST /mcp` with a scoped admin token; no publish/delete tools appear in `tools/list`.
- **End-to-end (Playwright, against the Expo web build):** open map → filter "Training today" + "Visitors welcome" → open preview card → "View school" → sign up → land on the school page with the full schedule. Tests create their own users (unique emails) and rely only on the sample seed.
- **Monitoring:** none in the proof of concept; **Sentry later** (before real users).

## Robustness notes (built in)
- **No silent failures:** MCP tools return structured errors (`VALIDATION_ERROR` with field paths, `NOT_FOUND`, `GEOCODE_FAILED` with the address tried, `RESULT_TOO_LARGE`) that the agent can act on.
- **Uniqueness:** DB indexes plus create-catch-refetch (above).
- **Session lifetime:** 30-day sliding, explicit.
- **User-data exposure:** no role can read the Better Auth `user` type; the current user comes only from `get-session`.
- **Metric definitions:** "Training today", "next session", and "distance" each have one definition (*Time rules*).
- **Human correction loop:** AI writes drafts only; `list_pending_drafts` shows what changed; a human publishes.
- **Freshness:** `lastVerifiedAt`, "Schedule verified <date>" on the page, and `find_schools({ staleDays: 90 })` as the review queue.
- **Empty states:** no schools in view, no sessions left today ("try tomorrow"), no location permission, no Mapbox token, and an empty city (seeded dev data versus an empty production database on day one).
- **Cost:** Mapbox free tiers (web map loads, mobile monthly active users, geocoding) comfortably cover the proof of concept. The web token is URL-restricted to prevent quota theft.
