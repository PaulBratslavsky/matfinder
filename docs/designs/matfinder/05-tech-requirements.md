# Technical Requirements

> As built: reconstructed from `PaulBratslavsky/matfinder` @ `4f6074c`, 2026-10-28. This describes the code, not
> intentions. `S/` = `server/`, `P/` = `server/src/plugins/matfinder/server/src/`, `A/` =
> `server/src/plugins/matfinder/admin/src/`, `M/` = `mobile/`.

## Strapi content types

### `api::school.school`: collection type (`S/src/api/school/content-types/school/schema.json`)
| Field | Type | Notes |
|---|---|---|
| name | string | required, max 120 |
| slug | uid (target name) | required. A partial unique index on draft rows is created in `bootstrap()` (`S/src/index.ts`) |
| shortDescription | text | max 280 |
| description | blocks | |
| city | relation manyToOne → `api::city.city` | |
| affiliation | relation manyToOne → `api::affiliation.affiliation` | |
| headInstructors | relation manyToMany → `api::instructor.instructor` | |
| location | customField `global::map-box` | required |
| latitude, longitude | float | derived from `location`, hidden in the Content Manager (`config.attributes`) |
| neighborhood, postalCode | string | |
| logo | media (single) | fetched by the app, never shown (no component in `M/components/` renders it) |
| gallery | media (multiple, images) | |
| lastVerifiedAt | date | shown as "Schedule verified" |
| pricing | component `school.pricing` | single |
| contact | component `school.contact` | single |
| amenities | component `school.amenities` | single |
| schedule | component `schedule.session` | repeatable, max 100 (validated) |
| origin | enum `manual` / `web-agent` | private, default `manual` |
| sourceUrls | json | private |
| discoveredAt | datetime | private |

- **Draft & publish:** yes. **Localized:** no.
- **Server-set fields:**
  - `slug`, by Document Service middleware;
  - `latitude`/`longitude`, from `location` by middleware;
  - `origin`, `sourceUrls`, `discoveredAt`, set by the MCP tool `add_gym_from_web` (`P/services/discovery.ts`).
- **No stored `claimed` field.** The public `claimed` boolean is derived at read time from accepted claims (see
  *Custom routes*).

### `api::city.city`: collection type (`S/src/api/city/content-types/city/schema.json`)
- **Fields:**
  - `name`: required, max 80. The schema says `unique: true`, but that is Strapi validation only; no database index
    enforces it (`S/src/index.ts`, comment at the top);
  - `slug`: unique index added in `bootstrap()`;
  - `state`;
  - `country`: default US;
  - `timezone`: required, must be a valid IANA zone (middleware);
  - `center`: map-box, required;
  - `defaultZoom`: default 10.5;
  - `schools`: oneToMany.
- **Draft & publish:** no.

### `api::instructor.instructor`: collection type (`S/src/api/instructor/content-types/instructor/schema.json`)
- **Fields:**
  - `name`: required, max 120;
  - `slug`;
  - `beltRank`: enum white…red, required;
  - `degree`: 0–10;
  - `photo`;
  - `bio`: max 1000;
  - `schools`: manyToMany, mappedBy.
- **Draft & publish:** yes.

### `api::affiliation.affiliation`: collection type (`S/src/api/affiliation/content-types/affiliation/schema.json`)
- **Fields:** `name` (max 80), `slug`, `website`, `logo`, `schools` (oneToMany).
- **Draft & publish:** yes.

### `plugin::matfinder.claim` (`P/content-types/claim/schema.json`)
- **Fields:**
  - the gym it's about: `schoolDocumentId`, `schoolSlug`, `schoolName`;
  - who's claiming: `userId` (private), `name`, `email`, `phone`, `role` (owner / manager / head_instructor / staff),
    `message`;
  - `status`: pending / contacted / accepted / rejected / withdrawn;
  - admin fields: `adminNote` (private), `handledBy`, `contactedAt`, `decidedAt`.
- The gym is stored as copied ids and names, not as a relation.
- **Draft & publish:** no. Hidden in the Content Manager.
- **Rules** (`P/domain/claims.ts`, `P/services/claims.ts`, `P/controllers/claim.ts`):
  - States: `pending → contacted → accepted | rejected`, `pending → accepted | rejected`, and
    `accepted → withdrawn` (remove-owner). Any other move is 409 `INVALID_STATE`.
  - Create: 404 when the gym isn't published; 409 `ALREADY_CLAIMED` when it has an accepted claim; 409 `CLAIM_OPEN`
    when this user already has an open claim on it; 429 `TOO_MANY_CLAIMS` past 5 open claims per user
    (`MAX_OPEN_PER_USER`); 422 when the account has no email.
  - Input (zod): `role` one of the four roles, `phone` 7–40 characters matching a pattern, `message` max 1000,
    `name` max 120.
  - Reject and remove-owner need a note, which is appended to `adminNote`. `handledBy` is the admin's name or email.
  - Accept fails if the gym already has an accepted claim, and otherwise rejects its other open claims. The accept
    path runs in `strapi.db.transaction(...)` (`P/services/claims.ts:115`).
  - The admin list returns at most 500 rows.

### `plugin::matfinder.knowledge` (`P/content-types/knowledge/schema.json`)
- **Fields:**
  - `question`: max 200;
  - `answer`: max 2000;
  - `category`: 9 values;
  - `school`: manyToOne, optional (empty means it applies to every gym);
  - `source`: admin / owner / agent / question;
  - `sourceUrls`: private.
- **Draft & publish:** yes.

### Better Auth types (`S/src/extensions/better-auth/content-types/*`)
- `ba_user`: `name` (required), `email` (unique), `emailVerified`, `image`, and `roles`, a manyToMany relation to
  `plugin::api-permissions.role`. **Visible in the Content Manager and the Content-Type Builder**, so admins can edit
  users and their roles there.
- `ba_session` and `ba_account`: `userId` is an integer (it follows `generateId: 'serial'`). `ba_account` holds the
  password hash. Hidden in the admin.
- `ba_verification` and `ba_jwks` (holds `privateKey`): hidden in the admin.
- A unique index on `ba_user.email` is added in `bootstrap()`.

## Components (`S/src/components/*`)
- `schedule.session`:
  - `day` (enum);
  - `startTime` and `endTime` (time, required);
  - `classType` (enum, 7 values);
  - `style` (`gi` / `nogi` / `both`);
  - `notes`.
- `school.pricing`:
  - `visitorsWelcome`;
  - `dropInFee` and `dropInNotes`;
  - `freeTrial` and `freeTrialNotes`;
  - `monthlyMin` and `monthlyMax`;
  - `currency` (USD).
- `school.contact`: `phone`, `email`, `website`, `instagram`.
- `school.amenities`: 7 booleans.

## Dynamic zones
None.

## API surface

### REST (core routers)
- The core routers for school, city, instructor and affiliation are registered (`S/src/api/*/routes`).
- Only `city.find` is granted (Public). The core `/api/schools`, `/api/instructors` and `/api/affiliations` return 403
  to everyone (`S/tests/api.test.ts`).
  - ⚠️ not verified: whether `GET /api/cities?populate=schools` is blocked. School `find` isn't granted, and the
    api-permissions plugin's sanitizing of relations wasn't checked. No test covers it.
- `config/api.ts`: `defaultLimit` 25, `maxLimit` 100, `withCount: true`.

### Custom routes (`S/src/api/school/routes/01-custom-school.ts`, `controllers/school.ts`, `services/school.ts`)
| Method / path | Who | Returns |
|---|---|---|
| `GET /api/schools/directory?city=` | Public | the trimmed directory for one city (`toDirectoryItem`: today's sessions, preview fields and `claimed`; `S/src/lib/directory.ts`). Gyms without coordinates are left out. 400 without `city`, 404 for an unknown city. `Cache-Control: public, max-age=60` |
| `GET /api/schools/nearby?lat&lng&radius` | Public | gyms within `radius` mi (default 25, clamped to 1–100; `S/src/lib/radius.ts`), bounding box then haversine, max 300 with a `truncated` flag, and a `nearest` city when empty. Each item has `claimed`. Gyms without coordinates or without a city time zone are left out. Same cache header. **Not called by the app** |
| `GET /api/schools/slug/:slug` | Authenticated | the full gym page: contact, pricing, instructors, full schedule, gallery, description and `claimed` (`S/src/api/school/services/school.ts`). 404 if not published. No cache header |

- **`claimed`** is a public boolean with no owner identity. Each of the three reads computes it from
  `claimedSchoolIds()` (`P/services/claims.ts:141`), which loads accepted claims with `limit: 10000`.

### Plugin content-API routes (`P/routes/index.ts`)
| Method / path | Who | Handler |
|---|---|---|
| `POST /api/matfinder/claims` | Authenticated | `claim.create` (zod-validated, `P/controllers/claim.ts`) |
| `GET /api/matfinder/claims/mine?school=` | Authenticated | `claim.mine` |
| `GET /api/matfinder/chat/status` | Authenticated | `gym-chat.status` → `{ ready }` |
| `POST /api/matfinder/schools/:slug/chat` | Authenticated | `gym-chat.ask`: a server-sent-events (SSE) stream, `Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no` |

### Plugin admin routes (`P/routes/index.ts`, `P/permissions.ts`)
- **Policies:** `admin::isAuthenticatedAdmin` and `admin::hasPermissions`.
- `plugin::matfinder.read`: `GET /matfinder/summary`, `/gyms`, `/from-web`, `/claims`.
- `plugin::matfinder.claims.review`: `POST /matfinder/claims/:documentId/{contacted,accept,reject,remove-owner}`.
  The rules are under `plugin::matfinder.claim` above.

### Plugin admin UI (`A/index.ts`, `A/pages/MatFinderPage.tsx`, `A/components/*`)
- A MatFinder menu link and page with three tabs: **Gyms** (`GymsTab`), **From the web** (`FromWebTab`) and
  **Claims** (`ClaimsTab`, `ClaimDialog`). The tab badges show claims waiting and web gyms that aren't live.
- Two homepage widgets: **Gym directory** (`DirectoryWidget`) and **Claims to review** (`ClaimsWidget`).
- All of it needs `plugin::matfinder.read`. Claim actions also need `claims.review`.
- **Data:** `gyms.summary` (`P/services/gyms.ts`) and `discovery.listFromWeb` (`P/services/discovery.ts`: gyms with
  origin `web-agent`, their sources, possible duplicates, `notLive` and `thisWeek` counts, at most 500 rows).
- **Boot guard:** `assertMatFinderBuilt()` (`S/config/plugins.ts:11–16`) refuses to start Strapi when
  `dist/server/index.js` is missing, because booting without the plugin would delete the claims table and the MCP
  token grants.

### Default population
- The custom services populate what they need themselves (`DIRECTORY_FIELDS_QUERY` / `DIRECTORY_POPULATE` in
  `S/src/api/school/services/school.ts`).
- There's no route-level populate middleware.

## MCP server
- `mcp.enabled` comes from `MCP_ENABLED`, default true (`S/config/server.ts`). The endpoint is `/mcp`.
- **Auth:** an admin API token. Each MatFinder tool checks the action `plugin::matfinder.mcp.<tool-with-hyphens>`,
  with underscores turned into hyphens: `upsert_school` → `plugin::matfinder.mcp.upsert-school` (`actionId`,
  `P/mcp/index.ts:34–38`). The `find_new_gyms` prompt needs the `add_gym_from_web` action (`P/mcp/index.ts:87`).
- **If Strapi's MCP server is missing** (`strapi.ai.mcp` undefined), the plugin logs a warning and registers no tools
  (`P/mcp/index.ts:55–58`). On 5.58 that branch looks unreachable: `strapi.ai.mcp` always exists, and with
  `MCP_ENABLED=false` the tools are registered but never exposed.
- **Custom tools:**
  - `list_reference_data`, `find_schools` (with `staleDays`), `get_school_draft`;
  - `upsert_school` (geocodes the address), `set_school_schedule` (replaces the whole week);
  - `upsert_instructor`, `upsert_affiliation`;
  - `list_pending_drafts`, `find_possible_duplicates` (`P/domain/duplicates.ts`);
  - `add_gym_from_web` (`DUPLICATE_SUSPECTED` unless `confirmNotDuplicate`);
  - `upsert_knowledge`.
- **Prompt:** `find_new_gyms` (`P/mcp/prompts/find-new-gyms.ts`).
- **Publishing:** after each write, `publishing.afterWriteDocument` publishes unless `autoPublish` is false
  (`P/services/publishing.ts:23–33`).
  - It publishes the **whole current draft**, so an agent write also publishes any draft edits a person saved but
    didn't publish.
  - A `ValidationError` comes back as `notPublishedBecause`. Any other publish error is rethrown after the draft write
    has already been saved.
  - `upsert_knowledge` publishes through the knowledge service's own `afterWriteDocument` call
    (`P/services/knowledge.ts:58`), not through the tool's publish hook.
- **Limits:**
  - tool results are capped at 950 KB (`P/mcp/guard.ts`);
  - none of the 11 MatFinder tools deletes, unpublishes or uploads media (`P/mcp/index.ts`);
  - Strapi 5.58's built-in tools are listed to any token that holds the matching content permissions. They include
    `delete_<type>`, `unpublish_<type>` and `discard_<type>_draft`, and 10 Media Library tools with
    `media_delete_assets` and `media_delete_folder` (docs.strapi.io › Strapi MCP server). What the agent can delete
    therefore depends on the curator token's permissions. ⚠️ not in code: which permissions the production token holds.

## Auth (Better Auth, `S/src/lib/auth.ts`)
- **Sign-up and sign-in:** email and password. No verification, reset or deletion.
- **Session:** 30 days, refreshed once a day.
- **Mount:** `/api/auth/*`, as the tests use it (`S/tests/api.test.ts`).
  The mount path is the Strapi plugin's default (`basePath`, `/api/auth`). Cookie attributes are Better Auth's own
  defaults (`httpOnly`, and `Secure` in production); none are set in code (better-auth.com › Cookies).
- **Web:** cookies go to the app's own origin through Vercel's `/api` rewrite (`M/vercel.ts`), with
  `credentials: 'include'` (`M/lib/auth-client.web.ts`).
- **Native:** `@better-auth/expo` with SecureStore (prefix `matfinder`). The session goes as a `Cookie` header
  (`M/lib/auth-client.native.ts`, `M/lib/api/client.ts`).
- **New users:** they get the Authenticated role from the `userRole` Document Service middleware
  (`S/src/document-middlewares/user-role.ts`). `backfillUserRoles` fixes any left without one
  (`S/src/lib/permissions.ts`).
- ⚠️ framework behavior: Better Auth's own rate limiting isn't configured in `auth.ts`. Its defaults apply.

## Permissions & roles (`S/src/lib/permissions.ts` › `GRANTS`)
- **Public:** `api::school.school.directory`, `.nearby`, `api::city.city.find`.
- **Authenticated:** the Public grants, plus:
  - `api::school.school.bySlug`;
  - `plugin::matfinder.claim.create` and `.mine`;
  - `plugin::matfinder.gym-chat.status` and `.ask`.
- **Seeding:** `seedPermissions` adds missing grants on every boot and leaves grants made in the admin alone.
  ⚠️ not in code: any extra grants clicked in the production admin.
- **Admin:**
  - RBAC actions `plugin::matfinder.read` and `plugin::matfinder.claims.review` (`P/permissions.ts`);
  - plus one `plugin::matfinder.mcp.<tool-with-hyphens>` action per tool (see *MCP server*).

## Lifecycles / policies / middlewares
- **Document Service middlewares**, registered in `register()` (`S/src/index.ts`, `S/src/document-middlewares/`):
  - `slug`: **on create only.** Fills the slug from the name for school, instructor, affiliation and city, with a
    fallback prefix when the name slugifies to nothing (`slug.ts`).
  - `normalizeContact`: turns an Instagram link into a handle and adds `https://` to school websites and to the
    affiliation `website`.
  - `scheduleValidate`: checks enums, end after start, at most 100 sessions.
  - `pricingValidate`: fees ≥ 0, max ≥ min.
  - `cityValidate`: the time zone must be an IANA name.
  - `schoolCoordinates`: copies `location` to `latitude`/`longitude`, and drops client-sent `latitude`/`longitude`
    when `location` isn't in the write.
  - `userRole`: **on create only.** Gives new users the Authenticated role (`user-role.ts:12`).
  - The others run on create, update and clone (`utils.ts`).
- **`bootstrap()`** (`S/src/index.ts`):
  - creates the raw SQL indexes (`S/src/index.ts:15–23`): partial unique indexes on school, instructor and
    affiliation draft slugs, unique `cities_slug_uq` and `ba_user_email_uq`, and the non-unique
    `schools_lat_lng_idx` for the nearby query. **A failed index is logged and boot carries on**, so with duplicate
    rows already present, uniqueness isn't enforced;
  - runs `seedPermissions` (logs and skips a missing role), `backfillUserRoles` (at most 1000 users; the Authenticated
    role id is cached per process) and `backfillSchoolCoordinates` (`S/src/lib/coordinates.ts`; it writes through the
    query engine, so the middlewares don't run);
  - runs the sample seed when `SEED_SAMPLE_DATA=true`. It's idempotent and upserts by slug (`S/src/seed/sample.ts`).
- **Plugin:** registers its RBAC actions and MCP tools in `register()`. Its `bootstrap()` is empty, and it has no
  policies or lifecycles (`P/index.ts`, `P/register.ts`).
- **Global middlewares** (`S/config/middlewares.ts`):
  - the standard Strapi stack;
  - a content security policy (`S/config/middlewares.ts:8–14`): `script-src 'self' 'unsafe-inline' blob:`,
    `connect-src 'self' https: blob:` (so any HTTPS origin) plus the Mapbox hosts, and `img-src` for `data:`, `blob:`
    and Mapbox;
  - CORS: origins from `WEB_ORIGINS`, `credentials: true`, plus the `X-Run-Id` header.

## Pages & components (frontend, `M/app/`)
| Route | File | Calls | Sign-in |
|---|---|---|---|
| `/` Explore | `app/index.tsx` | `GET /api/schools/directory?city=` (query key `['directory', city]`, staleTime 60 s, refetches each minute while the city's date ≠ the server's `localDate`, `hooks/useDirectory.ts`) | no |
| `/schools/[slug]` | `app/schools/[slug]/index.tsx` | `GET /api/schools/slug/:slug` (`['school', slug]`); `GET /api/matfinder/claims/mine`; `GET /api/matfinder/chat/status` (staleTime 5 min) | yes (redirects to `/sign-in?redirect=`) |
| `/schools/[slug]/claim` | `claim.tsx` | `POST /api/matfinder/claims` | yes |
| `/schools/[slug]/ask` | `ask.tsx` | `POST /api/matfinder/schools/:slug/chat` (SSE, `hooks/useGymChat.ts`) | yes |
| `/account` | `account.tsx` | Better Auth session, sign-out | no |
| `/sign-in`, `/sign-up` | `sign-in.tsx`, `sign-up.tsx` | Better Auth `/api/auth/*` | no |
| `+not-found` | `+not-found.tsx` | none | no |

- **Explore** is made of these components:
  - the map: `components/LocationMap.tsx` on native, `.web.tsx` on web;
  - `components/explore/` `SheetSearch`, `FilterBar`, `SortToggle`, `SchoolCard`, `SchoolPreview`;
  - `components/map/MapPin.tsx`.
  - Pins aren't clustered.
- **Gym page:** `components/school/*` (`SchoolTopBar`, `SchoolHeader`, `ClaimLine`, `NextClassCard` and the
  sections).
- **Shared components:** `components/kit/` holds `RankBar` (`kit/index.tsx`, `kit/RankBar.tsx`). `components/ui/*` is
  used only by the sign-in and sign-up forms and `+not-found`.
- **Unused code:**
  - `LocationMap`'s `searchable`, `radiusMiles`, `onLocationChange`, `onRefresh` and `flyTo`;
  - in `lib/geo.ts`, `getBoundingBox` and `formatMiles`;
  - most of `components/ui/*`.
- **Device location:** Explore and the gym page call `useUserLocation` (`M/hooks/useUserLocation.ts`,
  `M/app/index.tsx:49`, `M/app/schools/[slug]/index.tsx:49`). It asks for foreground permission through
  expo-location. The location drives distances and `sort=distance` and isn't sent to the server. The iOS permission
  text is in `M/app.json` (`NSLocationWhenInUseUsageDescription`).
- **Errors:** `M/lib/api/client.ts` throws `AuthRequiredError` on 401/403 and `ApiError` otherwise.
- **Redirects:** after sign-in, `safeRedirect` (`M/hooks/useSession.tsx:22`) follows `redirect` only when it starts
  with `/`, not `//` and not `/sign-`. Anything else goes to Explore.

## State management
- **Server state:** TanStack Query. Retry 2 and refetch on reconnect and focus (`M/app/_layout.tsx`). No persisted
  cache.
- **URL state:** `?q&today&visitors&style&sort&school` (`M/lib/filters.ts`).
- **Client state:** the theme preference, stored in SecureStore or localStorage (`M/theme/preference*.ts`). "Now"
  ticks every 30 s in the city's time zone (`M/hooks/useCityNow.ts`, `M/lib/time.ts`). The device location lives in
  `useUserLocation` and is never stored.
- **Sign-out** removes only the `['school']` queries (`M/app/account.tsx:51`). `['my-claim', slug]` and
  `['gym-chat-status']` stay cached, so on a shared device the previous user's claim status can show until it
  refetches.

## Background jobs
None. There are no cron tasks (`S/config/`), and the admin widgets poll from the browser every 30 s and 15 s
(`A/components/DirectoryWidget.tsx`, `ClaimsWidget.tsx`).

## Media & uploads
- Strapi's upload plugin with the default provider. ⚠️ not in code: the Strapi Cloud storage provider.
- The MCP tools can't upload media. The curator uploads in the admin.

## Environment variables (names only)

### Strapi backend (`S/.env.example` and code)
- **Strapi:** `HOST`, `PORT`, `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`,
  `ENCRYPTION_KEY`, and `JWT_SECRET` (listed, but read by no file).
- **Database:** `DATABASE_CLIENT`, `DATABASE_FILENAME`. `DATABASE_*` connection, SSL and pool vars are read in
  `config/database.ts` but aren't in `.env.example`.
- **Database extras:** `DATABASE_URL`, `DATABASE_SCHEMA`, `DATABASE_CONNECTION_TIMEOUT`; `config/database.ts` also
  has a `mysql` branch.
- **Mapbox:** `MAPBOX_ACCESS_TOKEN`, `MAPBOX_DEBUG_MODE`, `MAPBOX_GEOCODING_TOKEN`, `MAP_BOX_PLUGIN_PATH`. Geocoding
  falls back to `MAPBOX_ACCESS_TOKEN` and is limited to `country=us`, `types=address,poi` (`S/src/lib/geocode.ts`).
- **Auth:** `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (default `http://localhost:1339`), `WEB_ORIGINS` (default
  `http://localhost:8083`, in `auth.ts` and `middlewares.ts`), `BETTER_AUTH_DASHBOARD_SECRET` (`dash()` refuses
  requests without it). `PORT` defaults to 1339.
- **MatFinder:** `MCP_ENABLED`, `MATFINDER_AUTO_PUBLISH`, `MATFINDER_AI_SCRIPTED` (not in `.env.example`),
  `AI_API_KEY`, `AI_GYM_CHAT_MODEL`, `AI_ADMIN_CHAT_MODEL` (read, but no route uses it yet), `SEED_SAMPLE_DATA`.
- **Not in `.env.example`:** `FLAG_NPS`, `FLAG_PROMOTE_EE`, `NODE_ENV`.

### Frontend (`M/.env.example`)
- `EXPO_PUBLIC_STRAPI_URL`, `EXPO_PUBLIC_WEB_API_BASE`, `EXPO_PUBLIC_DEFAULT_CITY` (default `las-vegas`),
  `EXPO_PUBLIC_WEB_URL`, `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`, `RNMAPBOX_MAPS_DOWNLOAD_TOKEN`.
- Vercel only: `STRAPI_ORIGIN`.

### Tests only
- Server: `TEST_PORT` (default 1342, `S/scripts/test-server.sh`), `ALLOW_ADMIN_BOOTSTRAP`, `API_URL`
  (`S/tests/global-setup.ts`).
- App e2e: `PLAYWRIGHT_CHROMIUM_PATH`, `CI` (`M/playwright.config.ts`).

## Tests
- **Server unit** (`S/tests/unit/*.test.ts`):
  - claims state machine, directory trimming and time rules;
  - duplicates, `sameJson`, gym chat, publishing;
  - radius, schedule validation, slugify.
- **Server integration** (`S/tests/api.test.ts`, test server on 1342 with the seed and a scripted model):
  - directory and cache header, the account gate;
  - MCP (11 tools, auth, publishing), the web-gym tools and prompt;
  - the admin API, claims end to end;
  - gym chat, nearby, lat/lng hidden in the Content Manager.
- **App unit** (`M/lib/*.test.ts`, `M/theme/tokens.test.ts`): explore, filters, time, week, claims, gym chat, theme
  contrast.
- **App e2e** (Playwright, `M/e2e/`):
  - `explore-to-school`: explore → filters → preview → sign-in gate → sign up → gym page → claim → accepted → sign out;
  - `ask-about-gym`.
- **Test infrastructure:**
  - `S/scripts/test-server.sh` starts `strapi start` on a fresh `.tmp/test.db` with throwaway secrets, the sample seed
    and the scripted AI, refuses a port that already serves another Strapi, and kills its process group on exit.
  - `S/tests/global-setup.ts` registers the first admin and the MCP token only when `ALLOW_ADMIN_BOOTSTRAP=1`.
  - `M/playwright.config.ts` exports the web build with an empty API base and serves it with `M/e2e/serve.mjs` on
    :8084, which proxies `/api` the way Vercel does. The export writes `dist/`, which a running `expo start` also
    uses.

## Operations (robustness sweep)
- **Silent failure modes:**
  - Geocoding failures become a `GEOCODE_FAILED` tool error (5 s timeout, `S/src/lib/geocode.ts`).
  - Chat errors are `RUN_ERROR` events inside a 200 stream (`P/gym-chat/errors.ts`). A bad slug or body is an HTTP 400
    before the stream starts.
  - A failed bootstrap index is only logged (see `bootstrap()`).
  - No alerting, no error tracking.
- **Uniqueness under concurrency:**
  - Real unique indexes on school, instructor and affiliation draft slugs, city slug and user email (`S/src/index.ts`),
    unless their creation failed at boot. `city.name` has no database index.
  - `upsertDraft` catches a duplicate on create and refetches (`S/src/api/school/services/school.ts`).
- **Recurring-job reentrancy:** N/A, no cron.
- **Transactional workflow steps:**
  - Accepting a claim also rejects the gym's other open claims, in one `strapi.db.transaction` (`P/services/claims.ts:115`).
    No gym row is written: `claimed` is derived when read.
  - An agent write saves the draft, then publishes it in a separate step. A publish error other than validation leaves
    the draft saved and unpublished (`P/services/publishing.ts`).
- **Session lifetime:** 30 days, sliding (`S/src/lib/auth.ts`). A 401 or 403 on the gym page (`AuthRequiredError`)
  shows "Your session has ended" (`M/app/schools/[slug]/index.tsx`).
- **User-data exposure:**
  - No user `find` route is granted (`S/src/lib/permissions.ts`).
  - A claim stores `userId` as private.
  - The gym chat log line includes the user's documentId (`P/services/gym-chat.ts:120–124`).
  - `ba_user` is editable in the admin's Content Manager.
  - ⚠️ framework behavior: what Better Auth's own `/api/auth/*` routes expose (for example its `dash()` plugin) is
    the plugin's.
- **Metric definitions:**
  - "Training today" = at least one session today that hasn't ended, in the city's time zone (`S/src/lib/directory.ts`,
    `M/lib/time.ts`).
  - "Starting soon" = within 90 min (`M/lib/explore.ts`).
  - "Stale" = `lastVerifiedAt` older than 90 days (`M/components/school/SchoolHeader.tsx`).
- **Human correction loops:**
  - Admins edit any agent-written gym in the Content Manager.
  - No field is marked as set by a person. A later `upsert_school` writes over the same fields.
  - With `autoPublish` on, an agent write publishes the whole draft, including a person's unpublished edits.
- **Reproducibility / versioning:**
  - Gyms keep `origin`, `sourceUrls` and `discoveredAt`.
  - The chat logs, per question: the user's documentId, the gym slug, the number of knowledge entries (and how many
    were cut), the finish reason or "failed", the time in ms and the token usage. It doesn't log the model
    (`P/services/gym-chat.ts:120–124`).
- **Cost guards:**
  - Gym chat (`P/gym-chat/limits.ts`, `P/services/gym-chat.ts`): 40 questions per user per UTC day, counted in memory
    and spent before the model call; 12 per chat; 500 characters per question, 20k per earlier answer, 30k of gym
    context, at most 500 knowledge entries; 4000 output tokens; `effort: 'low'`; prompt caching; 30 s deadline.
  - There's no cap across all users.
- **Aging / SLA visibility:**
  - "Schedule verified" is shown and flagged after 90 days.
  - `find_schools` has `staleDays`.
  - The admin widgets count claims to review.
  - No digest or reminder.
- **Audit trail:** claims keep `handledBy`, `contactedAt` and `decidedAt`. Gyms have Strapi's own `updatedBy` and
  `updatedAt`. No per-field history: Content History comes with Strapi's Growth and Enterprise plans and records only
  Content Manager edits, never API or MCP writes. Audit logs of MCP actions are Enterprise-only
  (docs.strapi.io › Content History, MCP server). ⚠️ not in code: which Strapi Cloud plan production is on.
- **Search:** client-side text match over the one loaded city (`M/lib/filters.ts`). There's no place search or
  server-side search.
- **Empty states:** Explore ("No gyms match", list-only without a map token) and each gym page section ("No classes
  listed yet" and so on) (`M/app/index.tsx`, `M/components/school/*`).
