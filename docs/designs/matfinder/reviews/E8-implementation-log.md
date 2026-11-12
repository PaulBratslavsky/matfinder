# E8 implementation log

- **Spec:** `06-change-spec.md` (25 steps, after checkpoint C fixes)
- **Branch:** `egm/trust-safety-ux`, cut from `egm/app-review` @ `bfed216` (the review docs commit on top of `main` @
  `4f6074c`). The spec said "cut from `main` @ `4f6074c`"; the app code is identical, and the branch also carries the
  review docs.
- **Started:** 2026-10-29
- **Implemented by:** the Elephant (main agent), with one fresh implementing agent per batch of steps, run one at a
  time. Each agent got only the spec, the codebase and a short brief (rules: follow the spec exactly, stop on a
  deviation, one commit per step, no push, no production values). The Elephant reviewed each batch's diff before the
  next.

## Environment
- macOS (Darwin 25.4.0), Node v24.20.0, npm 11.19.0.
- `npm ci` in `server/` and `mobile/`: exit 0. npm 11 skips dependency install scripts by default (esbuild, @swc/core,
  better-sqlite3, fsevents, core-js-pure). Nothing broke: better-sqlite3's native module and the plugin's `dist/`
  were present, and every suite below ran.
- No `.env` in the worktree. Every boot used `server/scripts/test-server.sh`'s throwaway values (SQLite
  `.tmp/test.db`, `AI_API_KEY` empty, `MATFINDER_AI_SCRIPTED=true`, no Mapbox token).

## Baseline (before any change, @ `bfed216`)
| Check | Result |
|---|---|
| `server`: `npm run typecheck` | pass |
| plugin: `npx tsc -p src/plugins/matfinder/server/tsconfig.json --noEmit` | pass |
| `server`: `npm run test:unit` | 9 files, 69 tests, pass |
| `server`: `npm run test:integration:isolated` | 27 tests, pass |
| `mobile`: `npm run typecheck` | pass |
| `mobile`: `npm run test:unit` | 7 files, 73 tests, pass |
| `mobile`: `npm run lint` | 0 errors, 1 warning (pre-existing: `LocationMap.web.tsx:11` import/no-named-as-default) |
| `mobile`: `npm run test:e2e` (Playwright, Chromium 1243) | 4 tests, pass |

## Pre-existing problems
- The lint warning above.

## Summary (2026-10-29)
- **Result:** all 25 steps implemented, one commit each (`21937fd` S1 … `7a4644e` S25), on `egm/trust-safety-ux`. Not
  pushed. No `.env` was created; a scan of the full diff found no keys or tokens.
- **Final run @ `7a4644e`:**

  | Suite | Baseline | Final |
  |---|---|---|
  | server `npm run typecheck` | pass | pass |
  | plugin tsc | pass | pass |
  | server `npm run test:unit` | 69 | 94 |
  | server `npm run test:integration:isolated` | 27 | 47 |
  | mobile `npm run typecheck` (app + e2e) | pass | pass |
  | mobile `npm run test:unit` | 73 | 84 |
  | mobile `npm run lint` | 1 warning (pre-existing) | same 1 warning |
  | mobile `npm run test:e2e` | 4 | 9 |

- **Stops (deviation protocol):** four steps stopped for a decision. The Elephant accepted all four fixes as spec
  corrections, not design changes:
  - S13: a type cast on `ctx.body`, and asserting the empty 204 Koa sends for a `null` session;
  - S21: `.filter({ visible: true })`, because pushed screens leave hidden copies of the same link;
  - S24: `.last()` on the Privacy heading (the stack header is also an `h1`), and the sign-in button is "Continue".
- **Other spec corrections, made by the implementing agents and logged per step:**
  - S3: indentation, and a `strapi start` scratch boot instead of `npm run develop`;
  - S5: the cross-city test city moved to Honolulu, so it doesn't become the nearest city in an existing test;
  - S10: the lockfile was edited by hand (npm 11 added unrelated entries), then checked with `npm ls --package-lock-only`;
  - S10: the bundle grep path is `dist/_chunks`;
  - S22: a return-type annotation;
  - README wording.
  - *Shared edits* named a few files that steps only read; they were left unchanged.
- **⚠️ items settled in E8:**
  - a throw in `bootstrap()` stops `strapi start` (exit 1);
  - Content Manager update is `PUT …/:id` with the documentId;
  - column names `dedupe_key`, `school_document_id`, `user_id`;
  - the built-in MCP tool names;
  - the admin-token `{ action, subject }` shape;
  - S8's revoke on an existing database;
  - Expo SDK 57 `output: single` uses `public/index.html`;
  - `authClient.deleteUser` exists;
  - headless Chromium fails an ungranted location request at once (code 1).
- **Tested only with mocks or fakes:** the chat's daily total (fake config, scripted model); S6's `NEVER_PUBLISHED`
  branch (fake Document Service). No real model, Mapbox or production service was called.
- **Not verified (needs Postgres, production or a device):**
  - the `varchar` → `text` change (S2);
  - every Postgres race path (S3, S5, S7);
  - the headers production receives (S12; owner's probe);
  - the Reports tab in a browser;
  - native app flows;
  - install prompts;
  - Vercel's `.webmanifest` content type;
  - the map re-fit (no Mapbox token in e2e).
- **Still for the owner:** everything in 06 › *Deployment* and *Open questions* (token scope, chat model and total,
  beta auth risk, privacy text and contact, the B-3 and deletion defaults).


## Steps

## S1 — Unique indexes stop failing silently
- **Commit:** `21937fd`
- **Checks:**
  - `server`: `npm run typecheck` → pass.
  - `npx vitest run tests/unit/indexes.test.ts` → 5 passed. (Full `npm run test:unit`: 10 files, 74 tests, pass.)
  - `npm run test:integration:isolated` → 27 passed.
  - sqlite index query → `6 affiliations_slug_draft_uq,ba_user_email_uq,cities_slug_uq,instructors_slug_draft_uq,schools_lat_lng_idx,schools_slug_draft_uq` (exact match).
  - Negative scratch boot (duplicate city slug, `NODE_ENV=production`, port 1343) → `exit 1` within seconds (not the
    120 s alarm), "Refusing to start" count 2. Nothing left listening on 1343; scratch files removed.
- **Spec corrections:** none.
- **Mock/stub only:** the Postgres branch of `tableRef` (`"public"."schools"`) and the MySQL rejection are tested only
  against the fake strapi in the unit file; no Postgres locally.
- **⚠️ confirmed:** a throw in `bootstrap()` makes `strapi start` exit (exit 1, "Shutting down Strapi") rather than
  keep serving.

## S2 — Widen web-sourced URL columns to `text` and raise the tool caps to 500
- **Commit:** `b412495`
- **Checks:**
  - `server`: `npm run typecheck` → pass; plugin `tsc --noEmit` → pass.
  - `npm run test:unit` → 74 passed.
  - `npm run test:integration:isolated` → 28 passed (27 + the new long-website test, not skipped), including the
    negative half (512-character website refused, stored value unchanged).
  - Scratch SQLite upgrade (port 1343, `.tmp/scratch.db`): booted the S1 build with the sample seed (columns were
    `varchar(255)`), saved `components_school_contacts` (16 rows) and `affiliations.website`; rebuilt at this step and
    booted on the same file → `PRAGMA table_info` check printed `ok` for contacts (`website`, `instagram`) and `ok` for
    `affiliations.website`; values `deepStrictEqual` before/after. No errors in the boot log. Scratch files deleted.
- **Spec corrections:** none.
- **Unverified:** the Postgres `varchar(255)` → `text` change (⚠️ in the spec) can't run locally (no Postgres). Only
  the SQLite table rebuild was observed. Owner backup before deploy stands.

## S3 — Claims: no double claims, no rival accepts
- **Commit:** `8577382`
- **Checks:**
  - `server`: `npm run typecheck` → pass; `npm run build:plugin` → pass (ESM check ok); plugin `tsc --noEmit` → pass.
  - `npx vitest run tests/unit/claims-dedupe.test.ts tests/unit/claims.test.ts tests/unit/indexes.test.ts` → 3 files,
    9 tests, pass. Full `npm run test:unit` → 75 passed.
  - `npm run test:integration:isolated` → 29 passed, including the new race test (not skipped: admin JWT present).
  - sqlite index query on `.tmp/test.db` → `matfinder_claims_accepted_uq,matfinder_claims_open_uq`.
  - Negative test: the double-tap half of the race test (one 201, one 409 `CLAIM_OPEN`) passed.
  - Data check on a copy: copied `.tmp/test.db` to `.tmp/scratch.db`, dropped `matfinder_claims_open_uq`, inserted two
    open claims (pending older with a note, contacted newer) for one gym/person, booted with `strapi start` on 1343 →
    the older one is `rejected`, `handledBy` `MatFinder (automatic)`, note `called once\nClosed automatically: …`; the
    newer stays `contacted`; the index was then created; log says "closed 1 duplicate open claim(s)". Scratch deleted.
  - `mobile`: `npm run typecheck` → pass; `npm run test:unit` → 73 passed (no mobile file changed in S3).
- **Spec corrections:**
  - The `try { … }` block in `create` is quoted at 4-space indent; placed at the method body's 6-space indent.
  - The data check says to boot the copy with `npm run develop`; the brief forbids `develop`, so it was booted with
    `strapi start` (same env as `scripts/test-server.sh`, port 1343) on a copy of the test database instead of a
    development database. Same code path (`bootstrap()`).
  - *Shared edits* lists `mobile/lib/api/claims.ts`, `mobile/lib/claims.ts` and `server/src/seed/sample.ts` under S3,
    but S3's Files section edits none of them (it says the app already handles 409 `CLAIM_OPEN`). Left unchanged.
- **Unverified (SQLite only):** the real Postgres race. On SQLite, writes serialize, so the two concurrent accepts
  resolve as one 200 and one 409 without exercising row locks, the conditional `updateMany` miss (`ClaimChanged`) or
  the Postgres deadlock branch (`40P01`). The unique-violation codes for Postgres (`23505`) are only matched by
  pattern, not observed.

## S4 — Claim lookups by gym id, and only for the gyms shown
- **Commit:** `b5f89c3`
- **Checks:**
  - `server`: `npm run typecheck` → pass; `npm run build:plugin` → pass; plugin `tsc --noEmit` → pass.
  - `npm run test:unit` → 75 passed.
  - `npm run test:integration:isolated` → 29 passed (the new `mine?school=no-such-gym` assertion is inside the first
    claim test; the existing tests cover `claimed` on the directory and gym page after accept and remove-owner).
  - Test server up separately: `GET /api/schools/nearby?lat=36.17&lng=-115.14&radius=60` → 8 schools, every
    `claimed` boolean → `true`; the same check on the Las Vegas directory → `true`. Server stopped.
  - `grep -rn claimedSchoolIds server/src` → no output.
  - `mobile`: `npm run typecheck` → pass; `npm run test:unit` → 73 passed (no mobile file changed).
- **Spec corrections:** *Shared edits* lists `mobile/lib/api/claims.ts` under S4, but S4 says "no change" there (the
  endpoint and response shape are unchanged). Left unchanged.
- **Not covered by a test:** `claimed: true` on the nearby payload (only the boolean type was checked), and the
  500-id chunking (the sample data has 8–9 gyms, so only one chunk ever runs).
- **Note:** `mobile/.tmp/` (the brief's log folder) shows as untracked in `git status`; it isn't in `.gitignore`.

## S5 — `add_gym_from_web` and slug-less `upsert_school` only create, never update an existing gym
- **Commit:** `92a2dec`
- **Checks:**
  - `server`: `npm run typecheck` → pass; plugin `tsc --noEmit` → pass; `npm run build:plugin` (via `prebuild` in the
    test server) → pass.
  - `npm run test:unit` → 11 files, 80 passed (new: 4 `pickFreeSlug` cases, 1 `findDuplicates … { names: false }` test
    with both spec cases).
  - `npm run test:integration:isolated` → 32 passed, including the three new tests in `gyms from the web (MCP)` and the
    unchanged `flags a gym that is already listed` and `adds a new gym …` tests.
  - Negative test: `never overwrites …` (with `confirmNotDuplicate: true`, the listed gym's `documentId`, city, location
    and `updatedAt` are unchanged; the new gym gets `sample-summerlin-bjj-demo-las-vegas`).
- **Spec corrections:**
  - The cross-city test's city was at Boulder, CO (`40.01, -105.27`, `America/Denver`). Its gym is auto-published, so
    the existing nearby test `finds nothing far from every gym, and names the nearest city that has gyms` (from West
    Hartford, CT, expects `las-vegas`) then got the integration city as nearest and failed (31/32). Moved the test city
    and its two gyms to Honolulu (`21.31, -157.86`, `Pacific/Honolulu`; gyms at `21.32, -157.87` and `21.33, -157.88`,
    the same offsets as the spec's), which is farther from CT than Las Vegas. Nothing the test asserts changed.
  - *Shared edits* lists `server/src/seed/sample.ts` under S5, but S5's Files section doesn't edit it (the seed always
    sends a `slug`). Left unchanged.
- **⚠️ confirmed:** `POST /content-manager/collection-types/api::city.city` with the fields as the body works for a
  non-draft type (City, `draftAndPublish: false`); the status is in `[200, 201]`.
- **Unverified (SQLite only):** the concurrent-create retry (`SlugTaken` / unique violation → a fresh slug in a new
  transaction) isn't exercised by a test; on Postgres the point is that each attempt is its own transaction, which
  can't run locally.

## S6 — Don't auto-publish over a person's unpublished edits
- **Commit:** `5d615e8`
- **Checks:**
  - `server`: `npm run typecheck` → pass; plugin `tsc --noEmit` → pass.
  - `npm run test:unit` → 82 passed (new: the `unpublished-changes` test and the `never-published` test in
    `tests/unit/publishing.test.ts`, against the file's fake Document Service).
  - `npm run test:integration:isolated` → 33 passed, including the new `doesn't publish over a person's unpublished
    edits` (negative: the directory still shows `visitorsWelcome: null`) and the unchanged `upsert_school publishes the
    gym straight to the directory, and its updates too` (positive).
- **Spec corrections:**
  - README: the added clause reads oddly after the `MATFINDER_AUTO_PUBLISH` sentence, so it went after "when
    validation stops it" in the first sentence, and the `MATFINDER_AUTO_PUBLISH` sentence follows it. Same words.
  - *Shared edits* lists `server/src/seed/sample.ts` under S6, but S6 doesn't edit it (`publishIfNeeded` ignores the
    extra field). Left unchanged.
- **⚠️ confirmed:** the 5.58 Content Manager draft-save route is `PUT /content-manager/collection-types/:model/:id`
  (`@strapi/content-manager/dist/server/routes/admin.js`, handler `collection-types.update`); `:id` is the documentId
  (`updateDocument` calls `documentManager.findOne(id, model, { status: 'draft' })`) and the body is the fields. It
  saves the draft only and returns 200. The test uses it as the spec wrote it.
- **Not covered by an integration test:** the `NEVER_PUBLISHED` branch (only the unit test with a fake), and the
  instructor/affiliation/schedule/knowledge paths' `previousStatus` (wired the same way, exercised only on the
  `published`/created path by the existing tests).

## S7 — One knowledge entry per gym and question, enforced by the database
- **Commit:** `132f09e`
- **Checks:**
  - `server`: `npm run typecheck` → pass; plugin `tsc --noEmit` → pass.
  - `npm run test:unit` → 84 passed (new file `tests/unit/knowledge-key.test.ts`, the two spec cases).
  - `scripts/test-server.sh start`, then on `.tmp/test.db`:
    - `PRAGMA table_info(matfinder_knowledge)` → `dedupe_key|TEXT` (⚠️ column name `dedupe_key` confirmed);
    - `SELECT name FROM sqlite_master WHERE … name='matfinder_knowledge_dedupe_draft_uq'` → 1 row (checked with
      `node -e`, `length === 1` → true).
  - Integration suite against that server (same command as `test:integration:isolated`, server started separately so
    the index check could run on the same database) → 36 passed, including `parallel upserts of the same question make
    one entry`, `hides dedupeKey from the Content Manager` and `re-keys an entry an admin renamed instead of
    duplicating it`. Server stopped.
- **Spec corrections:** none. (*Shared edits* lists S7 under `school/schema.json`, `gym-chat.ts` and `seed/sample.ts`;
  S7 only cites or reads them, "no change". Left unchanged.)
- **Unverified:**
  - SQLite serialises writes, so the parallel test proves no regression, not the Postgres race; the catch-and-refetch
    branch probably never ran.
  - The stale-key release (`strapi.db.query(...).updateMany` setting `dedupeKey: null`) isn't reached by the rename
    test: the renamed entry is found by the question-and-gym fallback and re-keyed in the same row. ⚠️ whether
    `updateMany` changes `updated_at` stays unverified.

## S8 — Close the unused public cities endpoint
- **Commit:** `88f5f1b`
- **Checks:**
  - `npx vitest run tests/unit/permissions.test.ts` → 2 passed (fake Document Service). Full `npm run test:unit` → 86
    passed. `npm run typecheck` → pass.
  - Test server up (`scripts/test-server.sh start`):
    - `curl … '/api/cities?populate=*'` → `403`;
    - directory regression → `las-vegas true`;
    - integration suite (same command as `test:integration:isolated`) → 36 passed, including `serves cities to no
      one, with or without populate (B-2)` (five paths × signed out and signed in, all 403).
  - Revoke on an existing database (beyond the spec's checks): copied `.tmp/test.db` to `.tmp/scratch.db`, inserted
    `api::city.city.find` for the public and authenticated roles (permission rows + role links), booted with
    `strapi start` on 1343 (scratchboot.sh, test-server values) → log `revoked api::city.city.find from the public
    role` and `… authenticated role`; `GET /api/cities` → 403; afterwards 0 city permission rows. Scratch stopped and
    deleted.
- **Spec corrections:** none.
- **⚠️ / notes:** signed-out `/api/cities` is 403 (not 401) as the spec predicted. Whether the old grant actually
  leaked gated fields through `populate` was not tested (the endpoint is closed instead, as decided).

## S9 — Prove the curator token sees only MatFinder tools, and document the token scope
- **Commit:** `7702709`
- **Checks:**
  - `server`: `npm run typecheck` → pass; plugin `tsc --noEmit` → pass.
  - `npm run test:integration:isolated` → 38 passed: the exact-list test, plus `the curator token lists no built-in
    content tools …` (negative: no create/update/delete/publish/unpublish/discard/media/upload names) and `a token that
    also holds a Content Manager permission sees extra built-in tools …` (extra > 0).
- **⚠️ confirmed from the installed source:**
  - Built-in tool names in 5.58: `@strapi/content-manager/dist/server/mcp/derive-content-type-mcp-tools.js` derives
    `list_<slug>`, `get_<slug>`, `create_<slug>`, `update_<slug>`, `delete_<slug>`, `publish_<slug>`,
    `unpublish_<slug>`, `discard_<slug>_draft` (single types: `get_`, `write_`, `delete_`, `publish_`, `unpublish_`,
    `discard_…_draft`), each guarded by the Content Manager action with `subject: uid`;
    `@strapi/upload/dist/server/mcp/register-upload-mcp-tools.js` registers `media_list_assets`, `media_get_asset`,
    `media_update_asset`, `media_move_assets`, `media_delete_assets`, `media_*_folder`. The test's regex covers them;
    no MatFinder tool name matches it.
  - `adminPermissions` accepts `{ action, subject }`: `@strapi/admin/.../validation/admin-tokens.js` validates each
    entry with `common-validators.js` `permission` (`subject` must be one of the action's subjects). The token was
    created (201).
- **Spec corrections:** the "Agent writes go live" sentence says "(… see below)", but the new curator-token bullet is
  placed above it (right after the "MCP tools." bullet, as the spec says). Changed to "see above".
- **Not checked:** which extra tools the wide token listed (the test only asserts the count is above 0, as written).

## S10 — Pin the prerelease auth packages, and mark claim emails unverified
- **Commit:** `bb6160d`
- **Checks:**
  - Pin check (`node -e …` from the spec) → three lines ending in `true`.
  - `git diff --stat package-lock.json` → 3 insertions, 3 deletions; `git diff package-lock.json | grep '"version"'` →
    no output. `npm ls --package-lock-only` → no invalid/missing entries.
  - `npm run build:plugin` → exit 0; `grep -rl "(unverified)" src/plugins/matfinder/dist` →
    `dist/_chunks/MatFinderPage-*.js` and `.mjs`.
  - plugin `tsc --noEmit` → pass; `npm run test:unit` → 86 passed.
- **Spec corrections:**
  - `npm install --package-lock-only --ignore-scripts` (npm 11.19.0) changed the three root specifiers **and** added
    six `inBundle: true, optional: true` entries under `node_modules/@tailwindcss/oxide-wasm32-wasi/node_modules/`
    (`@emnapi/core`, `@emnapi/runtime`, `@emnapi/wasi-threads`, `@napi-rs/wasm-runtime`, `@tybys/wasm-util`,
    `tslib`): npm re-recording a wasm package's bundled deps, not a resolved-version change. That fails the spec's
    "`grep '"version"'` prints nothing" check. Reverted the regenerated file and changed only the three root
    specifiers in `package-lock.json` by hand, which is the diff the spec says to expect ("Only the root entry's three
    specifiers change"). The caller can rerun the npm command if they prefer npm's output.
  - The bundle check greps `src/plugins/matfinder/dist/admin`, but the admin page is code-split into
    `dist/_chunks/` (`dist/admin/index.*` only loads it), so that path has no match. Grepped `dist` instead.
- **Not done:** the optional visual check in the admin (owner step, not part of "Done when"). `npm ci` against the
  edited lockfile wasn't run (it would reinstall `node_modules`).

## S11 — Gym chat: a daily total for everyone, and a cap on conversation size
- **Commit:** `37b6b21`
- **Checks:**
  - `npm run build:plugin` → exit 0.
  - `npm run test:unit` (server) → 89 passed (86 + the three new cases: 60,000-character cap, `has` doesn't count,
    daily total stops the third question with `service_limit`).
  - `npm run typecheck` (server) and plugin `tsc --noEmit` → pass.
  - `mobile`: `npm run typecheck` → pass; `npm run test:unit` → 73 passed (includes the new `service_limit` case).
  - `npm run test:integration:isolated` → 38 passed (the "gym chat (scripted model)" tests unchanged and green).
- **Spec corrections:** none. All quoted lines were present (`services/gym-chat.ts` `daily.take` line had moved, found by code).
- **Mock/stub only:** the daily-total case runs the real `chat()` with `fakeText()` and a fake Strapi (`plugin.config`
  returns `gymChatDailyTotal: 2`). The env path `AI_GYM_CHAT_DAILY_TOTAL` → `config/plugins.ts` wasn't booted with a
  non-default value. In-memory count per process: concurrency proven only by the code having no `await` between the
  check and the increments, not by a load test.

## S12 — Better Auth: read the client IP that reaches Strapi, and a probe to find it
- **Commit:** `161c0a8`
- **Checks:**
  - `npm run typecheck` → pass; `npm run test:unit -- tests/unit/auth-ip.test.ts` → 4 passed (the real `getIP` from
    `better-auth/api`). Full `npm run test:unit` → 93 passed; plugin `tsc --noEmit` → pass.
  - Production-mode rate limit on `:1343` (`NODE_ENV=production TEST_PORT=1343 scripts/test-server.sh start`, localhost
    only, throwaway SQLite and secrets):
    - default settings, four clients as `X-Forwarded-For: <ip>, 76.76.21.21` → `401 401 401 429` (B-9 reproduced);
      `grep -c 'single shared per-path bucket' .tmp/test-server.log` → `1`.
    - `AUTH_IP_HEADERS=x-vercel-forwarded-for,x-forwarded-for`, same loop plus `X-Vercel-Forwarded-For: <ip>` →
      `401 401 401 401`; then `198.51.100.50` four times as both headers → `401 401 401 429`. Shared-bucket warning
      count in that run → `0`.
  - Probe (`AUTH_IP_PROBE=true`, production mode): one `get-session` request → one line
    `… /api/auth/get-session x-forwarded-for=2 x-real-ip=absent x-vercel-forwarded-for=absent forwarded=absent cf-connecting-ip=absent true-client-ip=absent`;
    `grep -c '203.0.113.7' .tmp/test-server.log` → `0`. Without `AUTH_IP_PROBE`: `grep -c 'auth ip probe'` → `0`.
  - `npm run test:integration:isolated` → 38 passed (the new global middleware is in the stack).
- **Spec corrections:** none ("line 25" was the `advanced:` line, found by code). Created `server/src/middlewares/`
  (didn't exist).
- **⚠️ still unverified (as the spec says):** which headers production Strapi receives on the web (Vercel rewrite) and
  native paths. That's the owner's probe run in *Deployment*; not done here.

## S13 — Account deletion, server side — STOPPED (not committed)
- **Commit:** none. The S13 edits are uncommitted in the working tree (`server/src/lib/auth.ts`,
  `services/claims.ts`, `domain/claims.ts`, `tests/api.test.ts`), including the two proposed fixes below. They wait
  for the caller's decision.
- **Why stopped (two places where the spec can't work as written):**
  1. **A type doesn't fit.** `npm run typecheck` → `src/lib/auth.ts: error TS2339: Property 'password' does not exist
     on type 'unknown'`. `createAuthMiddleware(handler)` with no options types `ctx.body` as `unknown`
     (`@better-auth/core/dist/api/index.d.mts:31`). Proposed:
     `!(ctx.body as { password?: unknown } | undefined)?.password`.
  2. **The test can't pass as written.** `expect(await (await get('/api/auth/get-session', cookie)).json()).toBeNull()`
     → `SyntaxError: Unexpected end of JSON input`. Better Auth answers JSON `null`, the plugin sets `ctx.body = null`
     (`plugin-better-auth/dist/server/index.js:94–95`), and Koa 2.16.4 turns a null body into an empty **204**
     (`koa/lib/response.js:140–146`). Proposed:
     `const after = await get('/api/auth/get-session', cookie); expect([after.status, await after.text()]).toEqual([204, '']);`
- **With both proposed fixes (working tree, uncommitted):** `npm run typecheck` → pass; `npm run build:plugin` → 0;
  plugin `tsc --noEmit` → pass; `npm run test:unit` → 93 passed; `npm run test:integration:isolated` → 39 passed
  (the new test included: no password → 400, wrong password → 400 `INVALID_PASSWORD`, correct → 200
  `{ success: true, message: 'User deleted' }`, old cookie → no session, old credentials → 401, claim
  `withdrawn` with placeholders, email absent from the board). Server log: `account deleted: 1 claim(s) cleared`.
- **⚠️ confirmed:** Henderson is published in the sample seed (the claim POST returned 201); `?status=pending` and
  `?status=withdrawn` are both accepted by the board.
- **Not tested:** an accepted claim staying `accepted` through deletion (the test only covers a pending claim);
  `beforeDelete` failing (the "account isn't deleted" path); SQLite only.

- **Elephant decision (2026-10-29):** both proposed fixes accepted as spec corrections, not design changes (a type cast for `ctx.body`, and the test asserting the empty 204 Koa sends for a `null` body). Committed as `fd6bc13` after the type check passed again.

## S14 — The agent can't set "Schedule verified"
- **Commit:** `477a0ab`
- **Checks:**
  - `npm run typecheck` (server) and plugin `tsc --noEmit` → pass.
  - `npm run test:integration:isolated` → 40 passed (39 + the new `upsert_school never changes lastVerifiedAt` test;
    not skipped, the curator token was present).
- **Spec corrections:** none. S5's `args.slug ? upsertDraft : createDraft` line was present and replaced with the
  spec's block, which keeps the create-only branch. `date` stays in the import for S15's `noticeUntil`.
- **Not checked:** whether Strapi's MCP layer strips or rejects the unknown `lastVerifiedAt` key (the test
  deliberately doesn't assert it; the stored date didn't change either way).

## S15 — Gym notice and the public trust fields (backend)
- **Commit:** `21219e1`
- **Checks:**
  - `npm run typecheck` (server) and plugin `tsc --noEmit` → pass.
  - `npm run test:unit` (server) → 94 passed (93 + the new `activeNotice` case; the `toDirectoryItem` and gym-chat
    cases carry the new assertions).
  - `npm run test:integration:isolated` → 41 passed (the new notice test: set → shown, `noticeUntil: 2000-01-01` →
    `null`, empty notice → `null`; `addedFromWeb: true` on the web-added gym; `origin`/`sourceUrls`/`discoveredAt`
    still absent). Schema sync created the `notice`/`notice_until` columns on the throwaway SQLite.
  - `mobile`: `npm run typecheck` → pass; `npm run test:unit` → 73 passed. The new fields are additive; mobile types
    get them in S18.
- **Spec corrections:** none. The spec doesn't say where the new `activeNotice` unit test goes; it is in the
  `toDirectoryItem` describe, after `defaults missing pieces`. The notice integration test sits after S14's test.
- **Not checked:** the Content Manager edit view showing the two fields (person path); the rollback column drop.
  SQLite only.

## S16 — "Report a problem" (backend and admin tab)
- **Commit:** `4c49d45`
- **Checks:**
  - Verify 1 (`scripts/test-server.sh start`, throwaway `.tmp/test.db`): `.schema matfinder_reports` has
    `school_document_id` and `user_id`; `.indexes` lists `matfinder_reports_open_uq`. Server stopped after.
    ⚠️ column names **confirmed** (SQLite; Postgres uses the same snake_case naming, not booted here).
  - `npm run typecheck` (server), plugin server `tsc --noEmit`, and also the admin `tsc -p admin/tsconfig.json
    --noEmit` → pass. `npm run build:plugin` → exit 0.
  - `npm run test:unit` (server) → 94 passed (unchanged).
  - `npm run test:integration:isolated` → 45 passed (41 + the four new: report/repeat/bad input/signed-out; admin
    board without `userId`, summary `reports.open`, read-only admin 403, resolve 200 then 409; the double-tap race
    `[201, 409]`; account deletion removes the open report's marker from the board). None skipped.
- **Spec corrections:** none. Placement choices the spec left open: `readOnlyAdmin` moved to file scope just above
  `describe('public directory')` (its comment now says "no claims.review or reports.review"); the reports
  `forgetUser` line sits right after the claims `forgetUser` line, before the log line; the new `json` helper is copied
  into `describe('problem reports')`, which is at the end of the file.
- **Not checked:** the Reports tab and its badge in a browser (spec: build only; owner's optional manual check).
  The race test passes on SQLite but doesn't show whether the pre-check or the unique index produced the 409.
  `TOO_MANY_REPORTS` (10 open) isn't tested (the spec has no test for it). The "resolved reports are unlinked" half of
  `forgetUser` isn't tested (the test covers an open report).

## S17 — Saved gyms (backend)
- **Commit:** `3d0dbca`
- **Checks:**
  - Scratch-database check (`scripts/test-server.sh start`, throwaway `.tmp/test.db`): `.schema matfinder_saved_gyms`
    has `user_id` and `school_document_id`; `.indexes` lists `matfinder_saved_gyms_uq`. Server stopped after.
    ⚠️ column names **confirmed** (SQLite).
  - `npm run typecheck` (server) and plugin `tsc --noEmit` → pass; `npm run build:plugin` → exit 0.
  - `npm run test:unit` (server) → 94 passed (unchanged).
  - `npm run test:integration:isolated` → 47 passed (45 + `saved gyms`: signed-out 401s, 404 for an unknown gym,
    idempotent PUT, list with city, user B sees `[]`, DELETE then empty; and the deletion test: the
    `matfinder_saved_gyms` row count drops by one, read through `better-sqlite3` read-only). None skipped.
- **Spec corrections:** none. `beforeDelete` order is claims, reports, saved, then the log line. The routes comment
  now lists the three saved grants.
- **Not checked:** `TOO_MANY_SAVED` (200) and the double-tap path through the unique index aren't tested (the
  spec has none); a saved gym that was unpublished dropping out of the list; `remove` of an unpublished gym. No mobile
  change in S16–S17, so the mobile suites weren't rerun after S15. SQLite only.

## S18 — Notice, "verified" and source on the preview; drop-in and trial chips (mobile)
- **Commit:** `8c6b87d`
- **Checks:**
  - `npm run typecheck` (mobile, app + e2e) → pass. `gym-chat.test.ts` needed no fixture change (tsc flagged nothing).
  - `npm run test:unit` (mobile) → 78 passed (73 + 4 in the new `verified.test.ts` + 1 new week case: no drop-ins with
    a free first class says the free class once, as "First class free").
  - `npm run lint` → 0 errors, the pre-existing `LocationMap.web.tsx` warning only.
  - `npm run test:e2e` → 4 passed (the preview now shows "Schedule …" and "Added by …").
  - `grep -rn "Members only" mobile/app mobile/components mobile/lib` → no output.
- **Spec corrections:** none. `formatDate` had no importer outside `SchoolHeader.tsx` (grep), so nothing repointed.
  S15 had not touched `mobile/lib/api/schools.ts` or the e2e spec, so S18 is the first mobile edit there.
- **Not checked:** the `NoticeBanner` rendering with a real notice (the sample seed has none; server side covered by
  S15's test); the stale colour on the preview; "Free first class" chip in a browser (no sample gym asserted).

## S19 — "Open mat" filter (mobile)
- **Commit:** `f441f5b`
- **Checks:**
  - `npm run typecheck` (app + e2e) → pass; `npm run test:unit` → 79 passed (78 + the URL round-trip case; the
    `applyFilters` open-mat case → `['jj', 'hg']` sits in "each filter on its own"); `npm run lint` → pre-existing
    warning only.
  - `npm run test:e2e` → 4 passed: the Open mat chip sets `openmat=1`, the list equals the API's gyms whose `programs`
    include `open_mat`, and turning it off drops the param.
- **Spec corrections:** none. `Filters` gets `openMat` after `visitors`. In the e2e filter I kept `s.programs?.includes`
  (optional chaining, no `as any`). The `filtersToParams` round-trip expectation needed no `openmat: undefined` key
  (`toEqual` ignores undefined properties), so only the `f` literal and the invalid-values expectation got `openMat: false`.
- **Not checked:** the map re-fit when Open mat toggles (no Mapbox token in e2e: sheet only).

## S20 — "Add to calendar" as an .ics download (mobile web)
- **Commit:** `9f5173e`
- **Checks:**
  - `npm run typecheck` (app + e2e) → pass (DOM `document`/`URL`/`Blob` types resolve); `npm run test:unit` → 82
    passed (79 + the three new calendar cases: DST in Los Angeles in October and December, UTC + escaped `SUMMARY`,
    folding at ≤ 75 UTF-8 bytes with the accented text intact after unfolding); `npm run lint` → pre-existing warning only.
  - `npm run test:e2e` → 4 passed: on the gym page "Download .ics" triggers a download named `*.ics` whose file has
    `BEGIN:VEVENT` and a UTC `DTSTART`.
- **Spec corrections:** none.
- **Not checked:** importing the file into Apple Calendar or Outlook (Chromium download only); native keeps the
  Google link (the .ics link is web-only and wasn't run on a device). The DST tests use the Node ICU time-zone data.

## S21 — "Report a problem" in the app (mobile) — STOPPED before commit
- **Commit:** none. All S21 edits are in the working tree, uncommitted, waiting for a decision on the e2e line below.
- **Checks:**
  - `npm run typecheck` (app + e2e) → pass. Typed routes didn't flag `/schools/[slug]/report` (no generated route
    types in `.expo/types`), so `npx expo customize tsconfig.json` wasn't run; `tsconfig.json` unchanged.
  - `npm run test:unit` → 84 passed (82 + 2 in `reports.test.ts`); `npm run lint` → pre-existing warning only.
  - `npm run test:e2e` with the spec's lines as written → **1 failed** (3 passed):
    `await expect(page.getByText('Report a problem').first()).toBeVisible()` resolves to a hidden
    "Report a problem" span. The Explore screen and the gym page stay mounted (hidden) under the report screen, and
    both now have a `ReportLink`, so `.first()` is a hidden one. The error context shows the report screen did render
    (header heading "Report a problem" and the label). The `getByRole('link', …)` click itself worked (role queries
    skip hidden elements).
  - With the proposed one-line fix `page.getByText('Report a problem').filter({ visible: true }).first()` (the same
    pattern the spec file already uses at the gym-name check) → 4 passed: the report is sent, "Thanks, we'll check it"
    shows, and "Back to the gym" returns to the page so the claim step continues.
- **Choices the spec left open:** the "Tell us what's wrong." error replaces the field's hint under the input (as
  claim.tsx does for the phone error); the radio group is labelled "What's the problem?"; the form branch sets
  `Stack.Screen` title "Report a problem".
- **Not checked:** the signed-out redirect to sign-in for `/report` (not in the e2e); the server error copy in a browser.

- **S21, Elephant decision (2026-10-29):** the e2e fix (`.filter({ visible: true })` on the "Report a problem" heading check) is accepted as a test-only spec correction. The pattern is already used in that file for the gym-name check. Committed as `42acf8e` after the mobile type check passed again; e2e had passed 4/4 with it.

## S22 — Saved gyms in the app (mobile)
- **Commit:** `8691a48`
- **Checks:**
  - `npm run typecheck` (app + e2e) → pass after the correction below; `npm run test:unit` → 84 passed (no new unit
    tests in this step); `npm run lint` → pre-existing `LocationMap.web.tsx` warning only.
  - `npm run test:e2e` → 4 passed: on the signed-in gym page "Save gym" turns into "Saved. Tap to remove", and
    `/account` lists the gym as a link; `goBack()` returns to the gym page and the claim step continues.
- **Spec corrections:**
  - `useToggleSaved`'s `mutationFn` didn't type-check as written: TanStack infers the mutation's data type from the
    first branch (`{ saved: true }`), so the `{ saved: false }` branch failed (TS2322). Annotated the return as
    `(): Promise<{ saved: boolean }> =>`. No behaviour change.
  - e2e placement: S22's block goes after S21's report block (both name the signed-in gym page, before the claim step).
- **Not checked:** removing a gym from the list in a browser (the e2e only saves; the server DELETE is covered by S17's
  integration test); the bookmark icon's look; the sign-out cache removal (not asserted; code only).

## S23 — Installable web app (manifest)
- **Commit:** `046816d`
- **Checks:**
  - `npx expo customize public/index.html` generated the default template (non-interactive with the path given).
  - Verify 1: `EXPO_PUBLIC_WEB_API_BASE= npx expo export -p web --clear` → exit 0.
  - Verify 2: the `rel="manifest"` check on `mobile/dist/index.html` → exit 0; the manifest check (3 icons,
    `standalone`) → exit 0; `ls mobile/dist/icons` → `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`.
    `sips` confirmed 180/192/512 px from the 1024 px source.
  - `npm run typecheck` (app + e2e) and `npm run lint` → pass (pre-existing warning only).
  - Verify 3–4: `npm run test:e2e` → 5 passed, including the new "the web app is installable" test (manifest linked,
    served 200 with `name` "MatFinder", `/icons/icon-512.png` 200).
- **⚠️ confirmed:** Expo SDK 57 with `"web": { "output": "single" }` uses `public/index.html` as the template; the
  exported `dist/index.html` has the manifest, apple-touch-icon and theme-color tags. STOP rule not triggered.
- **Spec corrections:** none. The test went into `explore-to-school.spec.ts` (the Shared edits table lists S23 for that
  file). *Shared edits* lists `mobile/app.json` for S23, but the step body edits nothing there; left unchanged.
- **Not checked:** the `Content-Type` Vercel sends for `.webmanifest` (local `serve.mjs` only); Chrome's install
  prompt and iOS "Add to Home Screen" on a device; the maskable icon's safe zone (the 512 icon is reused as written).

## S24 — The app: a privacy page and "Delete account" — STOPPED before commit
- **Commit:** none. All S24 edits are in the working tree, uncommitted, waiting for a decision on two e2e lines.
  `privacy.tsx` text is verbatim from the spec, `UPDATED = '2026-10-29'`.
- **Checks:**
  - `npm run typecheck` (app + e2e) → pass, so `authClient.deleteUser({ password })` exists and `err.code` types
    (⚠️ confirmed). `npm run lint` → pre-existing warning only. `npm run test:unit` → 84 passed.
  - `npm run test:e2e` with the spec's `account.spec.ts` as written → **2 failed** (5 passed):
    1. `getByRole('heading', { name: 'Privacy' })`: strict-mode violation, **2 visible** `h1`s, the stack header's
       title (`options={{ title: 'Privacy' }}`) and the page's own `role="heading"`. This is not the hidden-copy case.
    2. The sign-in step: `getByRole('button', { name: 'Sign in' })` waits forever. The sign-in form's button is
       labelled **"Continue"** (snapshot: `button "Continue"`). Everything before it passed: wrong password → the
       alert "That password isn't right."; right password → "Your account was deleted." + the guest card.
  - Tried in the working tree (not committed): `.last()` on the heading check, and `{ name: 'Continue' }` on the
    sign-in click → **7 passed**, including the deleted account's sign-in showing an alert.
- **⚠️ confirmed:** `router.dismissTo('/account')` lands on Account after sign-up from a direct visit (the email check
  passed), so no extra `page.goto('/account')` is needed.
- **Not checked:** native (Simulator) delete flow; the owner hasn't reviewed the privacy text.

- **S24, Elephant decision (2026-10-29):** committed as `15769a2` with both test-only fixes. **Spec corrections
  (approved by the Elephant):**
  1. `account.spec.ts`: `getByRole('heading', { name: 'Privacy' }).last()`. The stack header title is also an `h1`,
     so the unqualified locator matched two visible headings.
  2. `account.spec.ts`: the deleted-account sign-in clicks `getByRole('button', { name: 'Continue' })`, the sign-in
     form's real label (`sign-in-form.tsx:75`), not "Sign in".
  E2E with both: 7 passed. The saved copy of the spec's version (`server/.tmp/account.spec.asspec.ts`) was deleted.

## S25 — Location: say why before asking, and what happens when it's denied
- **Commit:** `7a4644e`
- **Checks:**
  - `npm run typecheck` (app + e2e) → pass (`locate` is gone; its only other user, `app/index.tsx`, now calls
    `refresh`); `npm run test:unit` → 84 passed; `npm run lint` → pre-existing warning only.
  - `npm run test:e2e` → 9 passed. Both `location.spec.ts` tests pass: not decided → the "Allow your location…" line,
    then after "Use my location", "Showing Las Vegas. Allow location to see distances."; allowed (Playwright
    `permissions` + `geolocation`) → no "Use my location" and `\d+\.\d mi` distances.
- **⚠️ confirmed (headless Chromium, ungranted location):** a temporary probe spec on the app origin (deleted after
  the run) showed `isSecureContext: true`, `navigator.permissions` state `prompt`, and `getCurrentPosition` failing
  at once (2 ms) with error code 1 (`PERMISSION_DENIED`, "User denied Geolocation"). It does not stay pending. So on
  open the hook reads `prompt` → `ask`, and the tap's request ends in `denied`. (On `about:blank` Chromium also
  answers code 1, but because the page isn't a secure context, so that probe didn't count.)
- **Spec corrections:** none. The notice blocks are indented to fit the surrounding JSX.
- **Not checked:** native (Simulator) "no prompt on open"; Refresh with location granted (code only); the gym page's
  distance under the new hook (not asserted).

## Final run after S25 (2026-10-29, HEAD `7a4644e`)
- server: `npm run typecheck` → pass; plugin `tsc --noEmit` → pass; `npm run test:unit` → 94 passed;
  `npm run test:integration:isolated` → 47 passed (SQLite throwaway on 1342; stopped after).
- mobile: `npm run typecheck` (app + e2e) → pass; `npm run test:unit` → 84 passed; `npm run lint` → 0 errors, 1
  pre-existing warning (`LocationMap.web.tsx`); `npm run test:e2e` → 9 passed.
