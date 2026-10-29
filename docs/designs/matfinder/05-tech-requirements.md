# Technical Requirements

> As built: reconstructed from `PaulBratslavsky/matfinder` @ `4f6074c` (2026-10-28), then updated in E9 to branch
> `egm/trust-safety-ux` @ `7a4644e` (2026-10-29), after the 25 steps of `06-change-spec.md`. This describes the code,
> not intentions. `S/` = `server/`, `P/` = `server/src/plugins/matfinder/server/src/`, `A/` =
> `server/src/plugins/matfinder/admin/src/`, `M/` = `mobile/`.

## Strapi content types

**Who writes what:**

| Type | Written by |
|---|---|
| school | admins (Content Manager), the agent (MCP), the sample seed |
| city | admins and the sample seed only. No MCP tool writes cities; `list_reference_data` reads them |
| instructor, affiliation | admins, the agent (`upsert_instructor`, `upsert_affiliation`), the sample seed |
| claim | signed-in users create; admins move it on the Claims tab; account deletion scrubs it |
| knowledge | admins, the agent (`upsert_knowledge`), the sample seed |
| report | signed-in users create; admins resolve it on the Reports tab; account deletion deletes or unlinks it |
| saved-gym | signed-in users only; account deletion deletes them |
| Better Auth types | Better Auth itself; admins can edit `ba_user` in the Content Manager |

### `api::school.school`: collection type (`S/src/api/school/content-types/school/schema.json`)
| Field | Type | Notes |
|---|---|---|
| name | string | required, max 120 |
| slug | uid (target name) | required. A partial unique index on draft rows (`schools_slug_draft_uq`, `S/src/lib/indexes.ts`) |
| shortDescription | text | max 280 |
| description | blocks | |
| city | relation manyToOne → `api::city.city` | inverse `city.schools` |
| affiliation | relation manyToOne → `api::affiliation.affiliation` | inverse `affiliation.schools` |
| headInstructors | relation manyToMany → `api::instructor.instructor` | inverse `instructor.schools` |
| location | customField `global::map-box` | required |
| latitude, longitude | float | derived from `location`, hidden in the Content Manager (`config.attributes`) |
| neighborhood, postalCode | string | |
| logo | media (single) | fetched by the app, never shown (no component in `M/components/` renders it) |
| gallery | media (multiple, images) | |
| lastVerifiedAt | date | shown as "Schedule verified". Set only by a person in the admin: `upsert_school` drops it from its input (`P/mcp/tools/upsert-school.ts`) |
| notice | string | max 140. A short notice from the gym ("Closed Nov 27"). Empty or `null` removes it |
| noticeUntil | date | last day the notice shows; empty means until it's removed |
| pricing | component `school.pricing` | single |
| contact | component `school.contact` | single |
| amenities | component `school.amenities` | single |
| schedule | component `schedule.session` | repeatable, max 100 (validated) |
| origin | enum `manual` / `web-agent` | private, default `manual` |
| sourceUrls | json | private |
| discoveredAt | datetime | private |

- **Draft & publish:** yes. **Localized:** no.
- **Server-set fields:**
  - `slug`, by Document Service middleware, or by `createDraft` (see *MCP server*);
  - `latitude`/`longitude`, from `location` by middleware;
  - `origin`, `sourceUrls`, `discoveredAt`, set by the MCP tool `add_gym_from_web` in the same create
    (`P/services/discovery.ts`, `S/src/api/school/services/school.ts` › `createDraft`).
- **Derived public fields, never stored:**
  - `claimed`, from accepted claims (see *Custom routes*);
  - `addedFromWeb` = `origin === 'web-agent'`. `origin` itself stays private;
  - `notice`, only while it applies: `noticeUntil` empty or on or after the city's local date (`activeNotice`,
    `S/src/lib/directory.ts`);
  - `freeTrial`, from `pricing.freeTrial`, in the directory payload.

### `api::city.city`: collection type (`S/src/api/city/content-types/city/schema.json`)
| Field | Type | Notes |
|---|---|---|
| name | string | required, max 80. The schema says `unique: true`, but that is Strapi validation only; no database index enforces it |
| slug | uid | required. Unique index `cities_slug_uq` (`S/src/lib/indexes.ts`) |
| state | string | |
| country | string | default `US` |
| timezone | string | required, must be a valid IANA zone (middleware) |
| center | customField map-box | required |
| defaultZoom | decimal | default 10.5 |
| schools | relation oneToMany → school | inverse side, `mappedBy: city` |

- **Draft & publish:** no.

### `api::instructor.instructor`: collection type (`S/src/api/instructor/content-types/instructor/schema.json`)
| Field | Type | Notes |
|---|---|---|
| name | string | required, max 120 |
| slug | uid | required. Partial unique index on draft rows |
| beltRank | enum white, blue, purple, brown, black, red_black, red_white, red | required |
| degree | integer | 0–10 |
| photo | media | |
| bio | text | max 1000 |
| schools | relation manyToMany → school | inverse side, `mappedBy: headInstructors` |

- **Draft & publish:** yes.

### `api::affiliation.affiliation`: collection type (`S/src/api/affiliation/content-types/affiliation/schema.json`)
| Field | Type | Notes |
|---|---|---|
| name | string | required, max 80 |
| slug | uid | required. Partial unique index on draft rows |
| website | text | was `string` (255) before B-11 |
| logo | media | |
| schools | relation oneToMany → school | inverse side, `mappedBy: affiliation` |

- **Draft & publish:** yes.

### `plugin::matfinder.claim` (`P/content-types/claim/schema.json`)
- **Fields:**
  - the gym it's about: `schoolDocumentId`, `schoolSlug`, `schoolName`;
  - who's claiming: `userId` (private, the Better Auth user's documentId), `name`, `email`, `phone`, `role` (owner /
    manager / head_instructor / staff), `message`;
  - `status`: pending / contacted / accepted / rejected / withdrawn;
  - admin fields: `adminNote` (private), `handledBy`, `contactedAt`, `decidedAt`.
- The gym is stored as copied ids and names, not as a relation.
- **Draft & publish:** no. Hidden in the Content Manager.
- **Database indexes** (`S/src/lib/indexes.ts`): `matfinder_claims_accepted_uq` (one accepted claim per gym) and
  `matfinder_claims_open_uq` (one pending or contacted claim per person per gym).
- **Rules** (`P/domain/claims.ts`, `P/services/claims.ts`, `P/controllers/claim.ts`):
  - States: `pending → contacted → accepted | rejected`, `pending → accepted | rejected`, `accepted → withdrawn`
    (remove-owner), and `pending | contacted → withdrawn` when the claimant deletes their account. Any other move is
    409 `INVALID_STATE`.
  - Create: 404 when the gym isn't published; 409 `ALREADY_CLAIMED` when it has an accepted claim; 409 `CLAIM_OPEN`
    when this user already has an open claim on it, also when two creates race (the index); 429 `TOO_MANY_CLAIMS`
    at 5 open claims per user (`MAX_OPEN_PER_USER`); 422 when the account has no email. Success is 201.
  - Input (zod): `role` one of the four roles, `phone` 7–40 characters matching a pattern, `message` max 1000,
    `name` max 120.
  - `mine` looks the gym up by slug, then the claim by the gym's documentId, so a claim still shows after the slug
    changes. An unknown or unpublished gym gives `{ status: null, createdAt: null }`.
  - Reject and remove-owner need a note, which is appended to `adminNote`. `handledBy` is the admin's name or email.
  - Every admin action (`act`) runs in one `strapi.db.transaction`. It reads the claim inside the transaction and
    writes only if the status is still the one it read; otherwise everything rolls back with 409 `INVALID_STATE`.
    An unknown claim is 404 `NOT_FOUND`; a missing note is 422 `VALIDATION_ERROR`. Accept fails if the gym already
    has an accepted claim, and otherwise rejects its other open claims, setting their `adminNote` to "Another claim
    was accepted." (replacing any earlier note). A second
    accept that slips past the check hits the index and returns 409 `ALREADY_CLAIMED`; a Postgres deadlock (`40P01`)
    returns 409 `INVALID_STATE`.
  - Before the indexes are created, `closeDuplicateOpenClaims` keeps the newest of one person's open claims on a gym
    and rejects the rest with a note. Two accepted claims on one gym are left for a person: the index fails instead.
  - The admin list returns at most 500 rows.
  - **Account deletion** (`forgetUser`): open claims become `withdrawn`. Every claim of the user keeps its gym and
    decision, but its name, email, phone and message are replaced ("Deleted account", `deleted@matfinder.invalid`,
    "—", none) and a line is added to `adminNote`. Accepted claims stay accepted, so the gym stays "claimed"
    (06 › Open questions 5).

### `plugin::matfinder.knowledge` (`P/content-types/knowledge/schema.json`)
| Field | Type | Notes |
|---|---|---|
| question | string | required, max 200 |
| answer | text | required, max 2000 |
| category | enum visiting, schedule, pricing, kids, gear, facilities, policies, competition, other | required, default `other` |
| school | relation manyToOne → school | optional; empty means it applies to every gym. No inverse side |
| source | enum admin / owner / agent / question | required, default `admin` |
| sourceUrls | json | private |
| dedupeKey | text | private, hidden in the Content Manager (`config.attributes`). `<gym documentId or *>\|<question, trimmed, NFKC, lowercased>` (`P/domain/knowledge.ts`) |

- **Draft & publish:** yes.
- **Database index:** `matfinder_knowledge_dedupe_draft_uq` on `dedupe_key` for draft rows. `NULL` keys (admin-made and
  older entries) never collide.
- **`upsert_knowledge`** (`P/services/knowledge.ts`): finds the entry by `id`, else by key, else by the same gym and
  question (case-insensitive) whatever its key, and writes the key on save. A unique violation means a parallel create
  won (it updates that entry) or an admin renamed the entry holding the key (it clears that key and saves again).

### `plugin::matfinder.report` (`P/content-types/report/schema.json`)
| Field | Type | Notes |
|---|---|---|
| schoolDocumentId, schoolSlug, schoolName | string | required, copied from the published gym |
| userId | string | required, private. The reporter's documentId, or `deleted-account` |
| kind | enum schedule, price, closed, contact, other | required |
| message | text | max 1000. Required by the app for `other` only (`M/lib/reports.ts`) |
| status | enum open / resolved | required, default `open` |
| adminNote | text | private |
| resolvedBy | string | the admin's name or email |
| resolvedAt | datetime | |

- **Draft & publish:** no. Hidden in the Content Manager and the Content-Type Builder.
- **Database index:** `matfinder_reports_open_uq`, one open report per user per gym.
- **Rules** (`P/services/reports.ts`, `P/domain/reports.ts`):
  - create: 201 `{ status: 'open' }`; 404 when the gym isn't published; 409 `REPORT_OPEN` when this user already has
    an open report on it (also on a race, through the index); 429 `TOO_MANY_REPORTS` at 10 open reports per user; 422
    for bad input (zod, `P/controllers/report.ts`);
  - the admin list: newest first, at most 500, every status when `?status` is absent;
  - resolve: `open → resolved` once, by a conditional update; a second resolve is 409 `INVALID_STATE`, an unknown id
    404. An optional note, sent only through the API (the admin UI sends none), **replaces** `adminNote`;
  - account deletion: the user's open reports are deleted; resolved ones stay, with `userId` set to `deleted-account`.

### `plugin::matfinder.saved-gym` (`P/content-types/saved-gym/schema.json`)
- **Fields:** `schoolDocumentId` (string, required) and `userId` (string, required, private).
- **Draft & publish:** no. Hidden in the Content Manager and the Content-Type Builder.
- **Database index:** `matfinder_saved_gyms_uq` on (`user_id`, `school_document_id`).
- **Rules** (`P/services/saved.ts`): save only a published gym (404 otherwise); saving twice is a no-op, also on a
  race; 429 `TOO_MANY_SAVED` at 200 per user. Remove looks the gym up by its draft slug, so it also works for an
  unpublished gym, and an unknown slug still returns 200 `{ saved: false }`. The list reads at most 200 rows, newest
  first, and silently leaves out gyms that are no longer published. Account deletion deletes them all.

### Better Auth types (`S/src/extensions/better-auth/content-types/*`)
- **The user is `plugin::better-auth.user`** (table `ba_user`): `name` (required), `email` (unique), `emailVerified`,
  `image`, and `roles`, a manyToMany relation to `plugin::api-permissions.role`. **Visible in the Content Manager and
  the Content-Type Builder**, so admins can edit users and their roles there.
- `ba_session` and `ba_account`: `userId` is an integer (it follows `generateId: 'serial'`). `ba_account` holds the
  password hash. Hidden in the admin.
- `ba_verification` and `ba_jwks` (holds `privateKey`): hidden in the admin.
- A unique index on `ba_user.email` (`ba_user_email_uq`, `S/src/lib/indexes.ts`).
- **How controllers read the user:** `ctx.state.user ?? ctx.state.auth?.credentials?.user` (`P/controllers/claim.ts`,
  `report.ts`, `saved.ts`, `gym-chat.ts`). Plugin rows store the user's `documentId` as `userId`.
- **No-role fallback:** ⚠️ framework behavior: api-permissions treats a signed-in user with no role as Public (code
  comment in `S/src/document-middlewares/user-role.ts`). The `userRole` middleware and `backfillUserRoles` give every
  user the Authenticated role.
- **Deletion:** Better Auth deletes the user, its sessions and accounts; `beforeDelete` first runs the claims, reports
  and saved-gym `forgetUser` (`S/src/lib/auth.ts:20–29`). It finds the Strapi row by `id: Number(user.id)`; if none is
  found, the cleanup is skipped silently and the user is still deleted. The log line counts claims only.

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
- `school.contact`: `phone` (string), `email` (string), `website` and `instagram` (`text`, were `string` before B-11).
- `school.amenities`: 7 booleans.

## Dynamic zones
None.

## API surface

### REST (core routers)
- The core routers for school, city, instructor and affiliation are registered (`S/src/api/*/routes`).
- **None of their actions is granted.** `api::city.city.find` was granted to Public before B-2. It's now revoked on
  every boot, from Public and Authenticated, even when granted by hand (`REVOKED`, `S/src/lib/permissions.ts`). The app
  reads cities through the directory payload. `S/tests/api.test.ts` checks `GET /api/cities` and
  `GET /api/cities?populate=schools` return 403.
- `config/api.ts`: `defaultLimit` 25, `maxLimit` 100, `withCount: true`.

### Custom routes (`S/src/api/school/routes/01-custom-school.ts`, `controllers/school.ts`, `services/school.ts`)
| Method / path | Who | Returns |
|---|---|---|
| `GET /api/schools/directory?city=` | Public | the trimmed directory for one city (`toDirectoryItem`, `S/src/lib/directory.ts`): today's sessions, preview fields, `claimed`, `lastVerifiedAt`, `addedFromWeb`, `freeTrial` and the active `notice`. Gyms without coordinates are left out. 400 without `city`, 404 for an unknown city. `Cache-Control: public, max-age=60` |
| `GET /api/schools/nearby?lat&lng&radius` | Public | gyms within `radius` mi (default 25, clamped to 1–100; `S/src/lib/radius.ts`), bounding box then haversine, max 300 with a `truncated` flag, and a `nearest` city when empty. Each item has the directory fields. Gyms without coordinates or without a city time zone are left out. Same cache header. **Not called by the app** |
| `GET /api/schools/slug/:slug` | Authenticated | the full gym page: contact, pricing, instructors, full schedule, gallery, description, `claimed`, `addedFromWeb` and the active `notice` (`S/src/api/school/services/school.ts`). 404 if not published. No cache header |

- **`claimed`** is a public boolean with no owner identity. Each read computes it with `claimedAmong(ids)`
  (`P/services/claims.ts`), only for the gyms it returns, in chunks of 500 (B-12).

### Plugin content-API routes (`P/routes/index.ts`)
| Method / path | Who | Handler |
|---|---|---|
| `POST /api/matfinder/claims` | Authenticated | `claim.create` (zod-validated, `P/controllers/claim.ts`) |
| `GET /api/matfinder/claims/mine?school=` | Authenticated | `claim.mine` |
| `POST /api/matfinder/reports` | Authenticated | `report.create` → `{ status: 'open' }` (body `{ schoolSlug, kind, message? }`) |
| `GET /api/matfinder/saved` | Authenticated | `saved.find` → `{ items: [{ slug, name, neighborhood, city }] }` |
| `PUT /api/matfinder/saved/:slug` | Authenticated | `saved.save` → `{ saved: true }` |
| `DELETE /api/matfinder/saved/:slug` | Authenticated | `saved.remove` → `{ saved: false }` |
| `GET /api/matfinder/chat/status` | Authenticated | `gym-chat.status` → `{ ready }` |
| `POST /api/matfinder/schools/:slug/chat` | Authenticated | `gym-chat.ask`: a server-sent-events (SSE) stream, `Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no` |

- CORS: `PUT` and `DELETE` work cross-origin with Strapi's default `methods` (`S/config/middlewares.ts` doesn't set
  them).

### Better Auth routes used by the app
- `/api/auth/sign-up/email`, `/sign-in/email`, `/sign-out`, `/get-session` (`M/lib/auth-client.*.ts`).
- `POST /api/auth/delete-user` with `{ password }` (`authClient.deleteUser`, `M/app/account.tsx`). Without a password
  the `before` hook returns 400 "Enter your password to delete your account." A wrong password is Better Auth's
  `INVALID_PASSWORD`.

### Plugin admin routes (`P/routes/index.ts`, `P/permissions.ts`)
- **Policies:** `admin::isAuthenticatedAdmin` and `admin::hasPermissions`.
- `plugin::matfinder.read`: `GET /matfinder/summary` (now with `reports.open`), `/gyms`, `/from-web`, `/claims`,
  `/reports?status=open|resolved` (400 for any other status).
- `plugin::matfinder.claims.review`: `POST /matfinder/claims/:documentId/{contacted,accept,reject,remove-owner}`.
- `plugin::matfinder.reports.review` ("Resolve problem reports"): `POST /matfinder/reports/:documentId/resolve`, body
  `{ note? }`.
- The rules are under the content types above.

### Plugin admin UI (`A/index.ts`, `A/pages/MatFinderPage.tsx`, `A/components/*`, `A/tabs.ts`)
- A MatFinder menu link and page with four tabs, in this order: **Gyms** (`GymsTab`), **Claims** (`ClaimsTab`,
  `ClaimDialog`), **Reports** (`ReportsTab`) and **From the web** (`FromWebTab`). The tab badges show claims waiting,
  open reports, and web gyms that aren't live.
- **Claims** shows each email as "(unverified)", with a tooltip to confirm who they are by phone (B-10).
- **Reports** lists reports newest first, filtered by `?status=` (default open; open, resolved or all), each with the
  gym (linking to it in the Content Manager), kind, message, date, and for resolved ones `resolvedAt`, `resolvedBy` and
  `adminNote`. The "Mark resolved" icon button needs `reports.review` and sends no note. The reporter isn't shown. not verified: this tab in a browser (it's covered by the admin API tests only).
- Two homepage widgets: **Gym directory** (`DirectoryWidget`) and **Claims to review** (`ClaimsWidget`).
- All of it needs `plugin::matfinder.read`. Claim actions also need `claims.review`, and Resolve needs
  `reports.review`.
- **Data:** `gyms.summary` (`P/services/gyms.ts`, with claim and report counts) and `discovery.listFromWeb`
  (`P/services/discovery.ts`: gyms with origin `web-agent`, their sources, possible duplicates, `notLive` and
  `thisWeek` counts, at most 500 rows).
- **Boot guard:** `assertMatFinderBuilt()` (`S/config/plugins.ts:11–16`) refuses to start Strapi when
  `dist/server/index.js` is missing. ⚠️ framework behavior: Strapi skips a plugin without a server build, and its
  schema sync then drops the plugin's tables. The code comment names the claims table and the MCP token grants; by the
  same sync rule, knowledge, reports and saved gyms would go too.

### Default population
- The custom services populate what they need themselves (`DIRECTORY_FIELDS_QUERY` / `DIRECTORY_POPULATE` in
  `S/src/api/school/services/school.ts`).
- There's no route-level populate middleware.

## MCP server
- `mcp.enabled` comes from `MCP_ENABLED`, default true (`S/config/server.ts`). The endpoint is `/mcp`.
- **Auth:** an admin API token. Each MatFinder tool checks the action `plugin::matfinder.mcp.<tool-with-hyphens>`,
  with underscores turned into hyphens: `upsert_school` → `plugin::matfinder.mcp.upsert-school` (`actionId`,
  `P/mcp/index.ts`). The `find_new_gyms` prompt needs the `add_gym_from_web` action.
- **If Strapi's MCP server is missing** (`strapi.ai.mcp` undefined), the plugin logs a warning and registers no tools
  (`P/mcp/index.ts`). ⚠️ framework behavior: on 5.58 that branch looks unreachable: `strapi.ai.mcp` always exists, and with
  `MCP_ENABLED=false` the tools are registered but never exposed.
- **Custom tools:**
  - `list_reference_data`, `find_schools` (with `staleDays`), `get_school_draft` (now with `notice` and `noticeUntil`);
  - `upsert_school` (geocodes the address), `set_school_schedule` (replaces the whole week);
  - `upsert_instructor`, `upsert_affiliation`;
  - `list_pending_drafts`, `find_possible_duplicates` (`P/domain/duplicates.ts`);
  - `add_gym_from_web` (`DUPLICATE_SUSPECTED` unless `confirmNotDuplicate`);
  - `upsert_knowledge`.
- **Creating vs updating a school** (B-1):
  - `add_gym_from_web` and `upsert_school` **without a slug** call `createDraft`: always a new school, never an
    update. The slug is the name's, or the first free one of `<name>-<city>`, `<name>-<city>-2`… checked across every
    city (`pickFreeSlug`, `S/src/lib/slugify.ts`). Each try is its own transaction; a unique violation retries with a
    new slug, at most three attempts in all.
  - `upsert_school` **with a slug** updates that school, or creates one with that slug if none has it
    (`upsertDraft`).
  - `upsert_school` never writes `lastVerifiedAt` (UX-1). It accepts `notice` (max 140) and `noticeUntil`.
- **Duplicate checks** (`P/services/discovery.ts`): in the same city, a similar name, the same phone, website or
  Instagram, or within 150 m; in other cities, the same phone, website, Instagram or distance, not the name (chains
  share names).
- **Input caps:** website and Instagram take up to 500 characters (`urlText`, `P/mcp/schemas.ts`), matching the `text`
  columns.
- **Prompt:** `find_new_gyms` (`P/mcp/prompts/find-new-gyms.ts`).
- **Publishing** (`P/services/publishing.ts`): after each write, `afterWriteDocument` publishes the draft unless
  `autoPublish` is false. The decision uses where the document stood **before** the write (`previousStatus`, which
  each write tool returns and `P/mcp/index.ts` strips from the tool's output):

  | Before the write | Published? |
  |---|---|
  | new (this write created it) | yes |
  | `published` | yes |
  | `unpublished-changes` (someone's unpublished edits) | no: `notPublishedBecause` = `EARLIER_CHANGES` |
  | `never-published` | only a school with `origin: 'web-agent'`; otherwise no: `NEVER_PUBLISHED` |

  - A draft identical to the live version isn't published again. With `autoPublish` off, the result has no
    `notPublishedBecause`.
  - A `ValidationError` comes back as `notPublishedBecause`. Any other publish error is rethrown after the draft write
    has already been saved.
  - `upsert_knowledge` uses the same rule through the knowledge service's own `afterWriteDocument` call.
- **Limits:**
  - tool results are capped at 950 KB (`P/mcp/guard.ts`);
  - none of the 11 MatFinder tools deletes, unpublishes or uploads media (`P/mcp/index.ts`);
  - Strapi 5.58's built-in tools are listed to any token that holds the matching content permissions. They include
    `delete_<type>`, `unpublish_<type>` and `discard_<type>_draft`, and 10 Media Library tools with
    `media_delete_assets` and `media_delete_folder` (docs.strapi.io › Strapi MCP server). The plugin README says the
    curator token holds MatFinder actions only, and `S/tests/api.test.ts` proves such a token lists exactly the 11
    tools. ⚠️ not in code: which permissions the production token holds.

## Auth (Better Auth, `S/src/lib/auth.ts`)
- **Sign-up and sign-in:** email and password. No verification and no reset.
- **Account deletion:** `user.deleteUser.enabled`. The app always sends the password; a `before` hook refuses
  `/delete-user` without one. `beforeDelete` clears the user's claims, reports and saved gyms first (see each type).
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
- **Rate limiting:** Better Auth's defaults; not configured in `auth.ts`. The client IP it keys on comes from
  `advanced.ipAddress` (`ipAddressOptions`, `S/src/lib/auth-ip.ts`): `AUTH_IP_HEADERS` (headers tried in order) and
  `AUTH_TRUSTED_PROXIES`, both empty by default.
  - ⚠️ framework behavior: with the default, Better Auth trusts `x-forwarded-for` only when it holds one address.
    Behind a proxy chain no IP resolves, and every request shares one bucket (B-9). It then logs
    "single shared per-path bucket".
  - not verified: which headers production receives. Finding out is the owner's probe (06 › Deployment 6), with
    `AUTH_IP_PROBE=true` and `global::auth-ip-probe` (`S/src/middlewares/auth-ip-probe.ts`): the first 20
    `/api/auth/*` requests per process log header names and counts, never values.

## Permissions & roles (`S/src/lib/permissions.ts` › `GRANTS`, `REVOKED`)

| Action | Public | Authenticated | Admin |
|---|---|---|---|
| `api::school.school.directory`, `.nearby` | ✓ | ✓ | |
| `api::school.school.bySlug` | | ✓ | |
| `api::city.city.find` | revoked on boot | revoked on boot | |
| `plugin::matfinder.claim.create`, `.mine` | | ✓ | |
| `plugin::matfinder.report.create` | | ✓ | |
| `plugin::matfinder.saved.find`, `.save`, `.remove` | | ✓ | |
| `plugin::matfinder.gym-chat.status`, `.ask` | | ✓ | |
| `plugin::matfinder.read` (admin page, widgets, admin GET routes) | | | RBAC |
| `plugin::matfinder.claims.review` | | | RBAC |
| `plugin::matfinder.reports.review` | | | RBAC. ⚠️ not in code: whether production's Super Admin has it after deploy (06 › Deployment 7) |
| `plugin::matfinder.mcp.<tool>` (11) | | | admin API tokens |

- **Seeding:** `seedPermissions` adds missing grants on every boot, then `revokePermissions` removes the `REVOKED`
  ones, even when they were granted by hand. Other grants made in the admin are left alone. ⚠️ not in code: any extra
  grants clicked in the production admin.
- Better Auth's own `/api/auth/*` routes are outside this table: the Better Auth plugin serves them.

## Lifecycles / policies / middlewares
- **Document Service middlewares**, registered in `register()` (`S/src/index.ts`, `S/src/document-middlewares/`):
  - `slug`: **on create only.** Fills the slug from the name for school, instructor, affiliation and city, with a
    fallback prefix when the name slugifies to nothing (`slug.ts`). `createDraft` sets the slug itself.
  - `normalizeContact`: turns an Instagram link into a handle and adds `https://` to school websites and to the
    affiliation `website`.
  - `scheduleValidate`: checks enums, end after start, at most 100 sessions.
  - `pricingValidate`: fees ≥ 0, max ≥ min.
  - `cityValidate`: the time zone must be an IANA name.
  - `schoolCoordinates`: copies `location` to `latitude`/`longitude`, and drops client-sent `latitude`/`longitude`
    when `location` isn't in the write.
  - `userRole`: **on create only.** Gives new users the Authenticated role (`user-role.ts`).
  - The others run on create, update and clone (`utils.ts`).
- **`bootstrap()`** (`S/src/index.ts`), in this order:
  1. `claims.closeDuplicateOpenClaims()` (see *claim*);
  2. `createIndexes()` (`S/src/lib/indexes.ts`): the partial unique indexes on school, instructor and affiliation
     draft slugs; unique `cities_slug_uq` and `ba_user_email_uq`; the claim, knowledge, report and saved-gym indexes
     above; and the non-unique `schools_lat_lng_idx` for the nearby query. Every failure is logged
     (`[matfinder] index failed`). **A failed unique index stops the boot when `NODE_ENV=production`** (B-7);
     elsewhere it's only logged. ⚠️ framework behavior: `strapi start` doesn't set `NODE_ENV`, and Strapi defaults it
     to `development` (`@strapi/core/dist/configuration/index.js`, checked at C). `S/scripts/test-server.sh` calls
     `strapi start` "production mode" in a comment, but it doesn't set `NODE_ENV` either;
  3. `seedPermissions`, then `revokePermissions`;
  4. `backfillUserRoles` (at most 1000 users; the Authenticated role id is cached per process) and
     `backfillSchoolCoordinates` (`S/src/lib/coordinates.ts`; it writes through the query engine, so the middlewares
     don't run);
  5. the sample seed when `SEED_SAMPLE_DATA=true`. It's idempotent and upserts by slug (`S/src/seed/sample.ts`). A
     failed seed is logged and the boot carries on.
- **Plugin:** registers its RBAC actions and MCP tools in `register()`. Its `bootstrap()` is empty, and it has no
  policies or lifecycles (`P/index.ts`, `P/register.ts`).
- **Global middlewares** (`S/config/middlewares.ts`):
  - `global::auth-ip-probe` first (does nothing unless `AUTH_IP_PROBE=true`);
  - the standard Strapi stack;
  - a content security policy: `script-src 'self' 'unsafe-inline' blob:`, `connect-src 'self' https: blob:` (so any
    HTTPS origin) plus the Mapbox hosts, and `img-src` for `data:`, `blob:` and Mapbox;
  - CORS: origins from `WEB_ORIGINS`, `credentials: true`, plus the `X-Run-Id` header; default methods.

## Pages & components (frontend, `M/app/`)
| Route | File | Calls | Sign-in |
|---|---|---|---|
| `/` Explore | `app/index.tsx` | `GET /api/schools/directory?city=` (query key `['directory', city]`, staleTime 60 s, refetches each minute while the city's date ≠ the server's `localDate`, `hooks/useDirectory.ts`) | no |
| `/schools/[slug]` | `app/schools/[slug]/index.tsx` | `GET /api/schools/slug/:slug` (`['school', slug]`); `GET /api/matfinder/claims/mine`; `GET /api/matfinder/chat/status` (staleTime 5 min); `GET /api/matfinder/saved`, `PUT`/`DELETE /api/matfinder/saved/:slug` (`['saved']`, `hooks/useSaved.ts`) | yes (redirects to `/sign-in?redirect=`) |
| `/schools/[slug]/claim` | `claim.tsx` | `POST /api/matfinder/claims` | yes |
| `/schools/[slug]/ask` | `ask.tsx` | `POST /api/matfinder/schools/:slug/chat` (SSE, `hooks/useGymChat.ts`) | yes |
| `/schools/[slug]/report` | `report.tsx` | `POST /api/matfinder/reports` | yes (redirects to sign-in) |
| `/account` | `account.tsx` | Better Auth session, sign-out, `deleteUser`; `GET /api/matfinder/saved` | no |
| `/privacy` | `privacy.tsx` | none | no |
| `/sign-in`, `/sign-up` | `sign-in.tsx`, `sign-up.tsx` | Better Auth `/api/auth/*` | no |
| `+not-found` | `+not-found.tsx` | none | no |

- `_layout.tsx` registers titles for `schools/[slug]/report` ("Report a problem") and `privacy` ("Privacy").
- **Explore** is made of these components:
  - the map: `components/LocationMap.tsx` on native, `.web.tsx` on web. Without a Mapbox token it's list-only;
  - `components/explore/` `SheetSearch`, `FilterBar` (Training today, Visitors welcome, **Open mat**, Gi / No-Gi),
    `SortToggle`, `SchoolCard`, `SchoolPreview`;
  - `components/map/MapPin.tsx`. Pins aren't clustered.
  - The map re-fits when any filter changes, `openMat` included (`filtersKey`, `app/index.tsx`). not verified in e2e
    (no Mapbox token there).
- **Preview card** (`SchoolPreview.tsx`): the active notice (`NoticeBanner`), chips ("No drop-ins" when
  `visitorsWelcome` is false, the drop-in price, "Free first class"), "Schedule verified <date>" or "Schedule not
  verified yet" (stale after 90 days), the source line ("Added by MatFinder's AI agent from the gym's web pages" or
  "Added by the MatFinder team", `M/lib/verified.ts`) and "Something wrong? Report a problem" (`ReportLink`).
- **Gym page:** `components/school/*`:
  - `SchoolTopBar`, with a bookmark button (Save gym / Saved. Tap to remove). It shows no error, so a 429
    `TOO_MANY_SAVED` never reaches the user;
  - `SchoolHeader`, with the verified line and the source line;
  - `NoticeBanner` (on the gym page the notice shows whatever `noticeUntil` says when the city has no time zone,
    `S/src/api/school/services/school.ts:413`), `ClaimLine`, `NextClassCard` and the sections, then `ReportLink`;
  - `NextClassCard` has "Add to calendar" (a Google Calendar link) and, on the web only, "Download .ics"
    (`calendarIcs`, `M/lib/week.ts`: times converted from the city's zone to UTC, lines folded at 75 UTF-8 bytes). It
    follows RFC 5545 except one thing: `;` in text isn't escaped (`'\;'` at `M/lib/week.ts:143` is a plain `;` in
    JavaScript), and the test checks commas only (`M/lib/week.test.ts`).
- **Report a problem** (`report.tsx`): five kinds (`M/lib/reports.ts`, default "Schedule is wrong"), a message
  ("What's wrong?", at most 1000 characters, required only for "Something else"), "Only the MatFinder team sees your
  report.", then a "Report sent" screen with "Thanks, we'll check it". `REPORT_OPEN` and `TOO_MANY_REPORTS` get their
  own messages.
- **Account** (`account.tsx`): when signed in, the account card with Sign out, **Saved gyms** (each opens the gym), and
  **Delete account** (an inline confirm with the password; errors in a `role="alert"` line). The confirm text names
  saved gyms and claims but not reports; the privacy page names reports. After deletion: "Your
  account was deleted." and the guest card. A Privacy link at the bottom. The sign-up form links to the privacy page.
- **Privacy** (`privacy.tsx`): what the app stores without an account, with location, with an account, for claims,
  for saved gyms and reports, for "Ask about this gym", what MatFinder doesn't have, and what deletion does, dated `UPDATED = '2026-10-29'`. The code comment says the owner
  reviews it before deploy. No contact address yet (06 › Open questions 5).
- **Shared components:** `components/kit/` holds `RankBar` and the small kit (`ActionButton`, `Card`, `Label`).
  `components/ui/*` is used only by the sign-in and sign-up forms and `+not-found`.
- **Unused code:**
  - `LocationMap`'s `searchable`, `radiusMiles`, `onLocationChange`, `onRefresh` and `flyTo`;
  - in `lib/geo.ts`, `getBoundingBox` and `formatMiles`;
  - most of `components/ui/*`.
- **Device location** (`M/hooks/useUserLocation.ts`): opening a screen never shows the system prompt. The hook reads
  the permission: `checking`, then `granted`, `denied` or `ask`. Explore shows "Allow your location to center the map
  and see how far each gym is." with **Use my location** (which prompts) while it's `ask`, and "Showing <city>. Allow
  location to see distances." when `denied`. `refresh()` (pull-to-refresh) gets a new position only when already
  granted. If reading the position fails after permission was granted, the status becomes `denied`; if the permissions
  API throws (some browsers), it becomes `ask`. The location drives distances and `sort=distance` and isn't sent to the server. The iOS permission text is
  in `M/app.json` (`NSLocationWhenInUseUsageDescription`).
- **Errors:** `M/lib/api/client.ts` throws `AuthRequiredError` on 401/403 and `ApiError` (with the server's `code`)
  otherwise. It has `apiGet`, `apiPost`, `apiPut` and `apiDelete`.
- **Redirects:** after sign-in, `safeRedirect` (`M/hooks/useSession.tsx:22`) follows `redirect` only when it starts
  with `/`, not `//` and not `/sign-`. Anything else goes to Explore.

## State management
- **Server state:** TanStack Query. Retry 2 and refetch on reconnect and focus (`M/app/_layout.tsx`). No persisted
  cache.
- **URL state:** `?q&today&visitors&openmat&style&sort&school` (`M/lib/filters.ts` for the filters; `sort` and
  `school` in `M/app/index.tsx`).
- **Client state:** the theme preference, stored in SecureStore or localStorage (`M/theme/preference*.ts`). "Now"
  ticks every 30 s in the city's time zone (`M/hooks/useCityNow.ts`, `M/lib/time.ts`). The device location lives in
  `useUserLocation` and is never stored.
- **Sign-out** removes the `['school']` and `['saved']` queries (`M/app/account.tsx`, and the gym page's "session
  ended" path). `['my-claim', slug]` and `['gym-chat-status']` stay cached, so on a shared device the previous user's
  claim status can show until it refetches (B nit N1, not in scope).
- **Account deletion** clears the whole query cache (`queryClient.clear()`, `M/app/account.tsx`).

## Background jobs
None. There are no cron tasks (`S/config/`), and the admin widgets poll from the browser every 30 s and 15 s
(`A/components/DirectoryWidget.tsx`, `ClaimsWidget.tsx`).

## Media & uploads
- Strapi's upload plugin with the default provider. ⚠️ not in code: the Strapi Cloud storage provider.
- The MCP tools can't upload media. The curator uploads in the admin.
- **Web app files** (`M/public/`): `index.html`, `manifest.webmanifest` and the icons `icon-192.png`, `icon-512.png`
  and `apple-touch-icon.png`.

## Environment variables (names only)

### Strapi backend (`S/.env.example` and code)
- **Strapi:** `HOST`, `PORT`, `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`,
  `ENCRYPTION_KEY`, and `JWT_SECRET` (listed, but read by no file).
- **Database:** `DATABASE_CLIENT`, `DATABASE_FILENAME`. `DATABASE_*` connection, SSL and pool vars are read in
  `config/database.ts` but aren't in `.env.example`.
- **Database extras:** `DATABASE_URL`, `DATABASE_SCHEMA` (also used to qualify the raw index SQL),
  `DATABASE_CONNECTION_TIMEOUT`; `config/database.ts` also has a `mysql` branch, which `createIndexes` refuses.
- **Mapbox:** `MAPBOX_ACCESS_TOKEN`, `MAPBOX_DEBUG_MODE`, `MAPBOX_GEOCODING_TOKEN`, `MAP_BOX_PLUGIN_PATH`. Geocoding
  falls back to `MAPBOX_ACCESS_TOKEN` and is limited to `country=us`, `types=address,poi` (`S/src/lib/geocode.ts`).
- **Auth:** `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (default `http://localhost:1339`), `WEB_ORIGINS` (default
  `http://localhost:8083`, in `auth.ts` and `middlewares.ts`), `BETTER_AUTH_DASHBOARD_SECRET` (`dash()` refuses
  requests without it). `PORT` defaults to 1339.
- **Auth IP (B-9):** `AUTH_IP_HEADERS`, `AUTH_TRUSTED_PROXIES` (both empty by default, `S/src/lib/auth-ip.ts`) and
  `AUTH_IP_PROBE` (`false`; `true` only for the owner's one-off check).
- **MatFinder:** `MCP_ENABLED`, `MATFINDER_AUTO_PUBLISH`, `MATFINDER_AI_SCRIPTED` (not in `.env.example`),
  `AI_API_KEY`, `AI_GYM_CHAT_MODEL`, `AI_ADMIN_CHAT_MODEL` (read, but no route uses it yet), `AI_GYM_CHAT_DAILY_TOTAL`
  (empty = 200; not a whole number ≥ 1 fails the boot, `P/config.ts`), `SEED_SAMPLE_DATA`.
- **Not in `.env.example`:** `FLAG_NPS`, `FLAG_PROMOTE_EE`, `NODE_ENV` (a failed unique index stops the boot only when
  it's `production`).

### Frontend (`M/.env.example`)
- `EXPO_PUBLIC_STRAPI_URL`, `EXPO_PUBLIC_WEB_API_BASE`, `EXPO_PUBLIC_DEFAULT_CITY` (default `las-vegas`),
  `EXPO_PUBLIC_WEB_URL`, `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`, `RNMAPBOX_MAPS_DOWNLOAD_TOKEN`.
- Vercel only: `STRAPI_ORIGIN`.

### Tests only
- Server: `TEST_PORT` (default 1342, `S/scripts/test-server.sh`), `ALLOW_ADMIN_BOOTSTRAP`, `API_URL`
  (`S/tests/global-setup.ts`).
- App e2e: `PLAYWRIGHT_CHROMIUM_PATH`, `CI` (`M/playwright.config.ts`). The e2e `API_URL` is fixed at port 1342, so a
  different `TEST_PORT` breaks the e2e run.

## Tests
Counts at `7a4644e`, from `reviews/E8-implementation-log.md` › *Final run*: server unit 94, server integration 47, app
unit 84, app e2e 9. All pass; lint has one older warning.

- **Server unit** (`S/tests/unit/*.test.ts`):
  - claims state machine and duplicate open claims (`claims-dedupe`), directory trimming and time rules;
  - duplicates, `sameJson`, gym chat (with the daily total and conversation size), publishing (every
    `previousStatus`);
  - indexes (schema qualifying, the production stop, log-only elsewhere, a plain index never stops the boot, MySQL and
    bad schema names refused), knowledge keys, permissions (`GRANTS`, `REVOKED`), auth
    IP options;
  - radius, schedule validation, slugify (with `pickFreeSlug`).
- **Server integration** (`S/tests/api.test.ts`, test server on 1342 with the seed and a scripted model):
  - public directory and cache header (with the trust fields and notices), the account gate, the closed cities
    endpoint;
  - MCP: 11 tools, the MatFinder-only token, auth, publishing over unpublished edits, `lastVerifiedAt` ignored,
    create-only adds, notices; the web-gym tools and prompt;
  - the admin API (a read-only admin gets 403 on actions), gym claims end to end (create and refuse, contact → accept →
    remove-owner, double taps and rival accepts);
  - gym chat, nearby, lat/lng hidden in the Content Manager;
  - account deletion (the test named for unlinking resolved reports asserts only the deletion of open ones), problem
    reports, saved gyms. The saved-gym deletion test reads `.tmp/test.db` with better-sqlite3 and skips unless
    `API_URL` is :1342. Helpers: `readOnlyAdmin` makes an admin with only `plugin::matfinder.read`.
- **App unit** (`M/lib/*.test.ts`, `M/theme/tokens.test.ts`): explore, filters (with Open mat), time, week (with
  `.ics`), claims, gym chat, reports, verified, theme contrast.
- **App e2e** (Playwright, `M/e2e/`):
  - `explore-to-school` (2 tests): explore → filters → preview (trust lines) → sign-in gate → sign up → gym page (week
    grid, Download .ics, reload keeps the session) → report a problem → save (checked on /account) → claim → accepted
    (the test registers the first admin itself through `/admin/register-admin`) → sign out re-gates; and "the web app
    is installable" (manifest linked and served);
  - `ask-about-gym` (3 tests);
  - `account` (2 tests): the privacy page, and delete account (password required);
  - `location` (2 tests): not decided (the "Use my location" prompt, then the denied message), and allowed (no notice,
    distances shown).
- **Test infrastructure:**
  - `S/scripts/test-server.sh` runs `npm run build`, then `strapi start` on a fresh `.tmp/test.db` with throwaway
    secrets, the sample seed and the scripted AI. It refuses a port that already serves another Strapi, and kills its
    process group on `stop` (run before each start and by the e2e teardown); it has no exit trap.
  - `S/tests/global-setup.ts` registers the first admin and the MCP token only when `ALLOW_ADMIN_BOOTSTRAP=1`.
  - `M/playwright.config.ts` exports the web build with an empty API base and serves it with `M/e2e/serve.mjs` on
    :8084, which proxies `/api` the way Vercel does and serves `.webmanifest` as `application/manifest+json`. Its globalSetup and
    globalTeardown start and stop the test server; one worker, and one retry on CI. The
    export writes `dist/`, which a running `expo start` also uses.
- **Not covered by any test** (SQLite and a browser only): the Postgres paths (the `varchar` → `text` change, the
  races in claims, `createDraft` and knowledge), the headers production receives, the Reports tab in a browser,
  native flows and install prompts; the 429 limits on reports and saved gyms; `saved.remove` on an unpublished gym;
  semicolons in `.ics` text.

## Operations (robustness sweep)
- **Silent failure modes:**
  - Geocoding failures become a `GEOCODE_FAILED` tool error (5 s timeout, `S/src/lib/geocode.ts`).
  - Chat errors are `RUN_ERROR` events inside a 200 stream (`P/gym-chat/errors.ts`). A bad slug or body is an HTTP 400
    before the stream starts.
  - A failed unique index stops a production boot; in development it's only logged (`S/src/lib/indexes.ts`).
  - No alerting, no error tracking.
- **Uniqueness under concurrency:**
  - Real unique indexes on school, instructor and affiliation draft slugs, city slug, user email, one accepted claim
    per gym, one open claim per person per gym, one knowledge entry per key, one open report per user per gym, and one
    saved row per user per gym (`S/src/lib/indexes.ts`). `city.name` has no database index (B nit N5).
  - Each write catches its index's violation: `upsertDraft` refetches, `createDraft` retries with a new slug, claims
    return `CLAIM_OPEN` or `ALREADY_CLAIMED`, knowledge updates the winner, reports return `REPORT_OPEN`, saves are
    no-ops. not verified on Postgres (no local Postgres).
- **Recurring-job reentrancy:** N/A, no cron.
- **Transactional workflow steps:**
  - Every claim action, including accept and its rejection of rivals, is one `strapi.db.transaction` that re-reads the
    claim and writes only if it's unchanged (`P/services/claims.ts`). No gym row is written: `claimed` is derived when
    read.
  - Account deletion's claim cleanup is one transaction; reports and saved gyms follow, then Better Auth deletes the
    user (`S/src/lib/auth.ts`).
  - An agent write saves the draft, then publishes it in a separate step. A publish error other than validation leaves
    the draft saved and unpublished (`P/services/publishing.ts`).
- **Session lifetime:** 30 days, sliding (`S/src/lib/auth.ts`). A 401 or 403 on the gym page (`AuthRequiredError`)
  shows "Your session has ended" (`M/app/schools/[slug]/index.tsx`).
- **User-data exposure:**
  - No user `find` route is granted (`S/src/lib/permissions.ts`).
  - Claims, reports and saved gyms store `userId` as private. The Reports tab doesn't show the reporter.
  - The gym chat log line includes the user's documentId (`P/services/gym-chat.ts`).
  - `ba_user` is editable in the admin's Content Manager (B nit N2, not in scope).
  - Users can delete their account and the data linked to it (see each type); the privacy page says what's kept.
  - ⚠️ framework behavior: what Better Auth's own `/api/auth/*` routes expose (for example its `dash()` plugin) is
    the plugin's.
- **Metric definitions:**
  - "Training today" = at least one session today that hasn't ended, in the city's time zone (`S/src/lib/directory.ts`,
    `M/lib/time.ts`).
  - "Starting soon" = within 90 min (`M/lib/explore.ts`).
  - "Stale" = `lastVerifiedAt` older than 90 days (`M/lib/verified.ts`).
- **Human correction loops:**
  - Admins edit any agent-written gym in the Content Manager.
  - An agent write over a person's unpublished edits, or over a never-published draft the agent didn't add, isn't
    published; `notPublishedBecause` says so (`P/services/publishing.ts`).
  - Only a person sets "Schedule verified" (`lastVerifiedAt`).
  - Users report wrong listings; admins resolve them on the Reports tab. Resolving changes nothing in the listing by
    itself.
  - No field is marked as set by a person. A later `upsert_school` still writes over the same fields once they're
    published.
- **Reproducibility / versioning:**
  - Gyms keep `origin`, `sourceUrls` and `discoveredAt`; the app shows whether the agent added a gym.
  - The chat logs, per question: the user's documentId, the gym slug, the number of knowledge entries (and how many
    were cut), the finish reason or "failed", the time in ms and the token usage. It doesn't log the model
    (`P/services/gym-chat.ts`).
- **Cost guards:**
  - Gym chat (`P/gym-chat/limits.ts`, `P/services/gym-chat.ts`), all counted in memory, so a restart starts over:
    - a daily total for everyone, `AI_GYM_CHAT_DAILY_TOTAL` (default 200), checked first; when it's spent, the answer
      is `service_limit` ("Ask about this gym has reached today's limit. Try again tomorrow.") and no user is charged;
    - 40 questions per user per UTC day, spent before the model call;
    - per chat: 12 questions, at most two replies per question, 500 characters per question, 20k per earlier answer,
      and 60k for the whole conversation as sent;
    - 30k of gym context, at most 500 knowledge entries; 4000 output tokens; `effort: 'low'`; prompt caching; 30 s
      deadline.
  - ⚠️ not in code: a spending limit on the Anthropic account (06 › Deployment 5).
- **Aging / SLA visibility:**
  - "Schedule verified" is shown on the preview and the gym page, and flagged after 90 days.
  - `find_schools` has `staleDays`.
  - The admin widgets count claims to review; the tab badges count open reports too.
  - No digest or reminder.
- **Audit trail:** claims keep `handledBy`, `contactedAt` and `decidedAt`; reports keep `resolvedBy` and
  `resolvedAt`. Gyms have Strapi's own `updatedBy` and `updatedAt`. No per-field history: Content History comes with
  Strapi's Growth and Enterprise plans and records only Content Manager edits, never API or MCP writes. Audit logs of
  MCP actions are Enterprise-only (docs.strapi.io › Content History, MCP server). ⚠️ not in code: which Strapi Cloud
  plan production is on.
- **Search:** client-side text match over the one loaded city (`M/lib/filters.ts`). There's no place search or
  server-side search.
- **Empty states:** Explore ("No gyms match", list-only without a map token), each gym page section ("No classes
  listed yet" and so on) and Saved gyms ("Tap the bookmark on a gym's page to save it here.") (`M/app/index.tsx`,
  `M/components/school/*`, `M/app/account.tsx`).
