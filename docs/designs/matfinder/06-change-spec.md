# MatFinder — Change spec: trust, safety and UX fixes

> **For the implementing agent.** You have the repo checked out. This spec plus the code and the official docs is
> everything you need.
> **Deviation protocol:** the files, commands, and structures in this spec are the owner's decisions. If the code makes
> a step wrong or impossible, STOP and ask — don't improvise a substitute. The repo's own `CLAUDE.md` rules also apply:
> npm only, no Docker, no local Postgres, never commit to `main`.
> **Safety:** work on branch `egm/trust-safety-ux`, cut from `main` @ `4f6074c`. Commit once per step. Don't push.
> Never use production data or credentials, and never print secrets. Steps that touch production (backups, token
> checks, env vars) are **owner steps** in *Deployment*; the implementing agent doesn't do them.
> **Docs lookup:** the `strapi-docs` MCP, or https://docs.strapi.io (Strapi 5.58.0); Better Auth: https://www.better-auth.com/docs
> (better-auth 1.7.7); frontend: https://docs.expo.dev (Expo SDK 57) and https://tanstack.com/query/v5. Check
> version-sensitive APIs against the installed versions.
> **Based on:** `04`/`05` as built @ `4f6074c`; findings from `reviews/B-design-review.md` and change candidates from
> `reviews/A-concept-review.md`.
> **Environment:** runtime versions are to be confirmed in the E8 baseline and recorded in
> `reviews/E8-implementation-log.md`. `server/node_modules` and `mobile/node_modules` aren't installed in the review
> worktree, so no code in this spec has been compiled or run yet.

## How to read this spec

- **Steps are `S1`–`S25`.** They are this change's units of work. `M10`–`M20` elsewhere in the repo are the project's
  own milestones (03 › Milestones); don't confuse them.
- **Each step title ends with its tag**: a finding ID (`B-7`), a checkpoint A candidate (`C15`) or a UX tag
  (`UX-1`…`UX-10`, mapped to candidates below). Cross-references inside steps use the tag, for example "the B-7 step"
  or "UX-2". The table below maps tags to step numbers.
- **Line numbers are at the base commit `4f6074c`.** Earlier steps shift them. Find each edit by the code it quotes;
  if the quoted code isn't there, apply the deviation protocol.
- **Paths** are relative to the repo root. Plugin code lives in `server/src/plugins/matfinder/server/src` (server side)
  and `server/src/plugins/matfinder/admin/src` (admin UI).

| Step | Tag | Title |
|---|---|---|
| S1 | B-7 | Unique indexes stop failing silently |
| S2 | B-11 | Widen web-sourced URL columns to `text` and raise the tool caps to 500 |
| S3 | B-5 | Claims: no double claims, no rival accepts |
| S4 | B-12 | Claim lookups by gym id, and only for the gyms shown |
| S5 | B-1 | `add_gym_from_web` and slug-less `upsert_school` only create, never update an existing gym |
| S6 | B-3 | Don't auto-publish over a person's unpublished edits |
| S7 | B-6 | One knowledge entry per gym and question, enforced by the database |
| S8 | B-2 | Close the unused public cities endpoint |
| S9 | B-4 | Prove the curator token sees only MatFinder tools, and document the token scope |
| S10 | B-10 | Pin the prerelease auth packages, and mark claim emails unverified |
| S11 | B-8 | Gym chat: a daily total for everyone, and a cap on conversation size |
| S12 | B-9 | Better Auth: read the client IP that reaches Strapi, and a probe to find it |
| S13 | C15 server | Account deletion, server side |
| S14 | UX-1 | The agent can't set "Schedule verified" |
| S15 | UX-2 | Gym notice and the public trust fields (backend) |
| S16 | UX-3 | "Report a problem" (backend and admin tab) |
| S17 | UX-4 | Saved gyms (backend) |
| S18 | UX-5 | Notice, "verified" and source on the preview; drop-in and trial chips (mobile) |
| S19 | UX-6 | "Open mat" filter (mobile) |
| S20 | UX-7 | "Add to calendar" as an .ics download (mobile web) |
| S21 | UX-8 | "Report a problem" in the app (mobile) |
| S22 | UX-9 | Saved gyms in the app (mobile) |
| S23 | UX-10 | Installable web app (manifest) |
| S24 | C15 app | The app: a privacy page and "Delete account" |
| S25 | C17 | Location: say why before asking, and what happens when it's denied |

## Goals

- **G1** (owner): "review current features and recommend updates or refactor that improve ux and make the app better".
  The owner chose "all Blockers and Majors, plus your change goals" (E5, 2026-10-29). G1 is served by these checkpoint A
  change candidates, each from an A Blocker or Major:
  - **C2** (A-1): only a person sets "Schedule verified" → UX-1.
  - **C3** (A-1): show the verified date and the source on the map preview → UX-2, UX-5.
  - **C5** (A-2): "Report a problem" on the preview and the gym page, feeding an admin list → UX-3, UX-8.
  - **C6** (A-2, A-19): a per-gym notice ("Closed Nov 27") → UX-2, UX-5.
  - **C12** (A-7): saved gyms → UX-4, UX-9.
  - **C13** (A-7): the web app installable to the home screen → UX-10.
  - **C15** (A-10): a privacy page and account deletion → two C15 steps.
  - **C16** (A-19): an Open mat filter → UX-6.
  - **C17** (A-21): say why location is wanted, and what happens when it's denied → the C17 step.
  - **C18** (A nit N12): Add to calendar as an .ics download → UX-7.
  - **C19** (A nit N13): separate drop-in and free-trial chips → UX-5.
- **B-1** (Blocker): `add_gym_from_web` can overwrite and move an existing live gym. Adding only ever creates. The same
  fix covers slug-less `upsert_school`, which had the same bug.
- **B-2**: public `GET /api/cities` may leak gated gym data through `populate`. The grant is removed and revoked.
- **B-3**: auto-publish publishes a person's unpublished edits. An agent write over unpublished human edits isn't
  published. This applies to every agent write tool, not only `upsert_school`.
- **B-4**: the curator token's scope isn't stated, and Strapi's built-in tools can delete. A test proves a
  MatFinder-only token sees only MatFinder tools, and the README states the token rule and rotation.
- **B-5**: claims can be doubled and rival claims both accepted. Database indexes and a re-read inside the transaction.
- **B-6**: knowledge entries can be duplicated. A unique key and catch-and-refetch.
- **B-7**: a failed bootstrap index silently drops uniqueness. Production refuses to boot.
- **B-8**: the gym chat's cost guard can be bypassed. A daily total for everyone, and a cap on conversation size.
- **B-9**: Better Auth's rate limit may become one shared bucket behind Vercel. Configurable IP headers, plus a probe.
- **B-10**: the beta auth stack runs on caret ranges, and claim emails look verified. Exact pins and an "unverified"
  label.
- **B-11**: web-sourced URLs overflow 255-character columns. The columns become `text`, and the tool caps rise to 500.
- **B-12**: claim lookups use slugs and load every accepted claim. Lookups by gym id, only for the gyms shown.

## Non-goals

- **Deferred findings:**
  - **B-13, B-14, B-15:** doc-only; they're done in E9 (updating 04–05), not in code.
  - **B-16:** already fixed in 05.
  - **Nits N1–N18** (B): not chosen (the scope is Blockers and Majors). N1 (clear the whole query cache on sign-out) is
    the most useful; this spec only clears the cache after account deletion and for saved gyms.
  - **The relation migration in B-12** (a real `school` relation on claims) and **the plugin move in B-13**: large
    refactors with data migrations.
- **Candidates that wait for an owner decision** (checkpoint A escalations, still open):
  - **C1** (new gyms publish as drafts): config only (`MATFINDER_AUTO_PUBLISH=false`), A's open question 6. No code
    change; B-3 matters either way.
  - **C4** (analytics): needs a vendor choice (Vercel Web Analytics or PostHog).
  - **C7** (owner corrections): waits on A-3, whether gym owners are a goal this round.
  - **C8** (public, indexable gym pages): waits on A-4/A-5, whether the sign-in gate moves.
  - **C9–C11** (beginner filters and copy): wait on A-6, whether Jess is a primary persona.
  - **C14** (password reset): needs an email provider; the app has none (04 › Email).
- **Not changing:** the gym chat's model (`AI_GYM_CHAT_MODEL`, B-8's escalation); the frozen MCP tool names
  (03 › Constraints); M15–M20 scope; PR #47's files beyond the merge note in *Deployment*.
- **Noticed, not fixed:** when geocoding fails, `add_gym_from_web` throws `GEOCODE_FAILED` or `VALIDATION_ERROR`
  instead of creating an unlocated draft as its description promises (`server/src/api/school/services/school.ts:144–157`).
  Recorded for a later change.

## Current state

- **Backend:** Strapi 5.58.0 (`server/package.json`), Node `engines` `>=22.12.0 <=24.x.x` (declared, not verified).
  SQLite locally and in tests, Postgres in production on Strapi Cloud (`server/config/database.ts`). No migrations;
  schema extras are raw SQL in `bootstrap()` (`server/src/index.ts`).
- **Plugin:** the local `matfinder` plugin (`server/src/plugins/matfinder`) holds claims, knowledge, the MCP tools,
  publishing, discovery, the gym chat and the admin UI. It's built to `dist/` before `develop`/`build`
  (`npm run build:plugin`, also run by `postinstall`). It can't import the app's `src/lib/*` TypeScript, so it keeps
  its own copies of small helpers (`.../server/src/domain/`).
- **Auth:** Better Auth 1.7.7 through `@strapi-community/plugin-better-auth` 1.0.0-beta.7, configured in
  `server/src/lib/auth.ts`. Content-API grants are seeded in `server/src/lib/permissions.ts` through
  `@strapi-community/plugin-api-permissions` 1.0.0-alpha.5.
- **Frontend:** Expo SDK 57 with expo-router, TanStack Query and Mapbox (`mobile/package.json`); the web build is on
  Vercel, which rewrites `/api/*` to Strapi (`mobile/vercel.ts`).
- **Type checks:**
  - app: `npm run typecheck` in `server/` (`server/tsconfig.json` has `"strict": false` and excludes `src/plugins/**`);
  - plugin: `npx tsc -p src/plugins/matfinder/server/tsconfig.json --noEmit` from `server/`. It isn't strict
    (`server/src/plugins/matfinder/server/src/domain/result.ts:10` says so), so results don't narrow by `ok`; new plugin
    code is still written to compile under `strict: true`;
  - mobile: `npm run typecheck` in `mobile/` (`"strict": true`).
- **Tests:**
  - server unit: `npm run test:unit` in `server/` (vitest, `tests/unit/**`);
  - server integration: `npm run test:integration:isolated` in `server/`. It runs `scripts/test-server.sh`, which
    deletes and reseeds the throwaway `.tmp/test.db` and serves it with `strapi start` on port 1342, with the gym chat
    scripted (`MATFINDER_AI_SCRIPTED=true`, no key). Stop any `npm run develop` first; both use `dist/`;
  - mobile: `npm run test:unit` and `npm run test:e2e` (Playwright, `mobile/e2e/`) in `mobile/`;
  - `strapi start` doesn't set `NODE_ENV` itself: Strapi defaults it to `development` when unset
    (`@strapi/core/dist/configuration/index.js:23`), and `test-server.sh` doesn't set it. So a check that needs
    production behaviour sets `NODE_ENV=production` explicitly, as the B-7 step does.
- **CORS:** `server/config/middlewares.ts` sets `origin`, `credentials` and `headers` but not `methods`, so Strapi's
  defaults apply, which include `PUT` and `DELETE` (`@strapi/core/dist/middlewares/cors.js:13–21`).

## Shared edits

Every file below is named by more than one step. Some steps only read or check a file (their *Callers updated* says
"no change"); the rest edit it. Apply the steps in order, each on top of the earlier ones, and find each edit by the
code it quotes, not by line number.

| File | Steps, in order |
|---|---|
| `mobile/app.json` | S21, S23 |
| `mobile/app/_layout.tsx` | S21, S24 |
| `mobile/app/account.tsx` | S22, S24 |
| `mobile/app/index.tsx` | S18, S19, S25 |
| `mobile/app/schools/[slug]/index.tsx` | S18, S21, S22, S25 |
| `mobile/components/explore/SchoolPreview.tsx` | S18, S21 |
| `mobile/e2e/explore-to-school.spec.ts` | S15, S18, S19, S20, S21, S22, S23 |
| `mobile/lib/api/claims.ts` | S3, S4 |
| `mobile/lib/api/schools.ts` | S15, S18 |
| `mobile/lib/claims.ts` | S3, S21 |
| `mobile/lib/filters.ts`, `mobile/lib/filters.test.ts` | S18, S19 |
| `mobile/lib/gym-chat.test.ts` | S11, S18 |
| `mobile/lib/week.ts`, `mobile/lib/week.test.ts` | S18, S20 |
| `server/.env.example` | S11, S12 |
| `server/config/middlewares.ts` | S12, S17 |
| `server/config/plugins.ts` | S3, S11 |
| `server/package.json` | S10, S17 |
| `server/src/api/school/content-types/school/schema.json` | S7, S15 |
| `server/src/api/school/services/school.ts` | S4, S5, S6, S14, S15 |
| `server/src/index.ts` | S1, S3, S8 |
| `server/src/lib/auth.ts` | S12, S13, S16, S17 |
| `server/src/lib/directory.ts` | S4, S15 |
| `server/src/lib/indexes.ts` | S1 (creates it), S3, S7, S16, S17 |
| `server/src/lib/permissions.ts` | S8, S16, S17 |
| `server/src/plugins/matfinder/README.md` | S5, S6, S9 |
| `server/src/plugins/matfinder/server/src/content-types/index.ts` | S16, S17 |
| `server/src/plugins/matfinder/server/src/controllers/index.ts` | S16, S17 |
| `server/src/plugins/matfinder/server/src/domain/duplicates.ts` | S2, S5 |
| `server/src/plugins/matfinder/server/src/domain/errors.ts` | S3 (adds `isUniqueViolation`), S7, S16 |
| `server/src/plugins/matfinder/server/src/gym-chat/context.ts` | S2, S15 |
| `server/src/plugins/matfinder/server/src/mcp/index.ts` | S6, S9 |
| `server/src/plugins/matfinder/server/src/mcp/tools/add-gym-from-web.ts` | S5, S14 |
| `server/src/plugins/matfinder/server/src/mcp/tools/find-possible-duplicates.ts` | S2, S5 |
| `server/src/plugins/matfinder/server/src/mcp/tools/upsert-school.ts` | S2, S5, S14, S15 |
| `server/src/plugins/matfinder/server/src/routes/index.ts` | S16, S17 |
| `server/src/plugins/matfinder/server/src/services/claims.ts` | S3, S4, S13 |
| `server/src/plugins/matfinder/server/src/services/gym-chat.ts` | S7, S11, S15 |
| `server/src/plugins/matfinder/server/src/services/index.ts` | S16, S17 |
| `server/src/plugins/matfinder/server/src/services/knowledge.ts` | S6, S7 (S7 gives the final `upsert`, including S6's change) |
| `server/src/seed/sample.ts` | S2, S3, S5, S6, S7, S14 |
| `server/tests/api.test.ts` | S2, S3, S4, S5, S6, S7, S8, S9, S13, S14, S15, S16, S17 |
| `server/tests/unit/gym-chat.test.ts` | S11, S15 |

Rules where the order inside a file matters:
- **`upsert-school.ts` line 57:** S5 makes slug-less calls create; S14 keeps that and strips `lastVerifiedAt` on both
  branches. Never end with a plain `upsertDraft` call.
- **`server/src/lib/indexes.ts`:** entries go in step order after the existing ones: S3's two claim indexes, then
  S7's knowledge index, S16's reports index, S17's saved-gyms index.
- **`server/src/lib/auth.ts` `beforeDelete`:** S13 adds it with the claims line; S16 adds the reports line after it;
  S17 adds the saved-gyms line after that.
- **`mobile/app/account.tsx`:** the signed-in branch ends with S22's `<SavedGyms />`, then S24's `<DeleteAccount />`
  last, so the destructive action is at the bottom.
- **`mobile/e2e/explore-to-school.spec.ts`:** each step inserts its block at the point it names. Where two steps
  name the same point, the later step's block goes after the earlier one's.
- **`server/tests/api.test.ts`:** each step names the `describe` block it adds to; new `describe` blocks go at the end
  of the file in step order. S16 moves `readOnlyAdmin` to file scope; S17 adds the `better-sqlite3` import.

## Steps

### S1 — Unique indexes stop failing silently (B-7)

- **Why:** B-7. Every uniqueness guarantee (slugs, `ba_user.email`, and the claim indexes in S3, B-5)
  depends on raw SQL in `bootstrap()`. Today a failed index is only logged (`server/src/index.ts:29–35`), the SQL
  ignores `DATABASE_SCHEMA` (`server/config/database.ts:41`), and a MySQL database would fail every partial index.
- **Files:**
  - `server/src/lib/indexes.ts` — new file: the index list and the runner, moved out of `server/src/index.ts` so they
    can be unit-tested.

    ```ts
    import type { Core } from '@strapi/strapi';

    type IndexSpec = { sql: string; unique: boolean };

    /**
     * `"schema"."table"` on Postgres (DATABASE_SCHEMA, default `public`); the bare name on SQLite, which has no
     * schemas. Raw SQL doesn't get Strapi's schema handling, so the name is qualified here.
     */
    export function tableRef(strapi: Core.Strapi): (table: string) => string {
      const schema = strapi.db.getSchemaName();
      if (!schema) return (table) => table;
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) {
        throw new Error(`[matfinder] DATABASE_SCHEMA "${schema}" must be a plain identifier (letters, digits, _).`);
      }
      return (table) => `"${schema}"."${table}"`;
    }

    /**
     * `unique: true` in a schema is validation-layer only, and Document Service writes bypass it, so slugs get real
     * indexes. Draft-and-publish keeps a draft and a published row per document with the same slug, so only draft rows
     * are indexed (exactly one per document). City has no draft-and-publish, so it gets a plain index.
     */
    export const indexes = (t: (table: string) => string): IndexSpec[] => [
      { unique: true, sql: `CREATE UNIQUE INDEX IF NOT EXISTS schools_slug_draft_uq ON ${t('schools')} (slug) WHERE published_at IS NULL` },
      { unique: true, sql: `CREATE UNIQUE INDEX IF NOT EXISTS instructors_slug_draft_uq ON ${t('instructors')} (slug) WHERE published_at IS NULL` },
      { unique: true, sql: `CREATE UNIQUE INDEX IF NOT EXISTS affiliations_slug_draft_uq ON ${t('affiliations')} (slug) WHERE published_at IS NULL` },
      { unique: true, sql: `CREATE UNIQUE INDEX IF NOT EXISTS cities_slug_uq ON ${t('cities')} (slug)` },
      // Better Auth checks for an existing email and then inserts; the index closes the race between two sign-ups.
      { unique: true, sql: `CREATE UNIQUE INDEX IF NOT EXISTS ba_user_email_uq ON ${t('ba_user')} (email)` },
      // Not unique: the nearby query's bounding box (plan 08, M14) on the columns mirrored from `location`.
      { unique: false, sql: `CREATE INDEX IF NOT EXISTS schools_lat_lng_idx ON ${t('schools')} (latitude, longitude)` },
    ];

    /**
     * Creates the indexes. A failed UNIQUE index means uniqueness isn't enforced, so in production Strapi refuses to
     * start (the same idea as assertMatFinderBuilt in config/plugins.ts); elsewhere it's logged. A failed plain index
     * is only logged. Only Postgres and SQLite are supported: the indexes are partial (`WHERE …`).
     */
    export async function createIndexes(strapi: Core.Strapi): Promise<void> {
      const client = strapi.db.getInfo().client;
      if (client !== 'postgres' && client !== 'sqlite') {
        throw new Error(`[matfinder] DATABASE_CLIENT "${client}" isn't supported: MatFinder's unique indexes need partial indexes (Postgres or SQLite).`);
      }
      const failed: string[] = [];
      for (const { sql, unique } of indexes(tableRef(strapi))) {
        try {
          await strapi.db.connection.raw(sql);
        } catch (e) {
          strapi.log.error(`[matfinder] index failed: ${sql}`, e);
          if (unique) failed.push(sql);
        }
      }
      if (failed.length && process.env.NODE_ENV === 'production') {
        throw new Error(
          `[matfinder] ${failed.length} unique index(es) failed, so uniqueness isn't enforced. Refusing to start. ` +
            `Remove the duplicate rows named in the errors above, then deploy again.`,
        );
      }
    }
    ```

  - `server/src/index.ts` — delete the `UNIQUE_INDEXES` constant and its comment (lines 7–21). Replace the loop in
    `bootstrap()` (lines 29–35) with one call, and add the import. The whole file becomes:

    ```ts
    import type { Core } from '@strapi/strapi';
    import { registerDocumentMiddlewares } from './document-middlewares';
    import { backfillSchoolCoordinates } from './lib/coordinates';
    import { createIndexes } from './lib/indexes';
    import { backfillUserRoles, seedPermissions } from './lib/permissions';
    import { seedSampleData } from './seed/sample';

    export default {
      async register({ strapi }: { strapi: Core.Strapi }) {
        registerDocumentMiddlewares(strapi);
      },

      async bootstrap({ strapi }: { strapi: Core.Strapi }) {
        // Unique indexes (lib/indexes.ts). In production a failed one stops the boot.
        await createIndexes(strapi);
        await seedPermissions(strapi);
        await backfillUserRoles(strapi);
        await backfillSchoolCoordinates(strapi);
        // Development only: never set SEED_SAMPLE_DATA on Strapi Cloud.
        if (process.env.SEED_SAMPLE_DATA === 'true') {
          try {
            await seedSampleData(strapi);
          } catch (e) {
            strapi.log.error('[matfinder] sample data seed failed', e);
          }
        }
      },
    };
    ```

    (S3, B-5, and S8, B-2, each add one line to this `bootstrap()`.)

  - `server/tests/unit/indexes.test.ts` — new file:

    ```ts
    import { afterEach, describe, expect, it, vi } from 'vitest';
    import { createIndexes } from '../../src/lib/indexes';

    const env = process.env.NODE_ENV;
    afterEach(() => {
      process.env.NODE_ENV = env;
    });

    /** A strapi with just what createIndexes touches. `failOn` makes raw() throw for SQL containing that text. */
    function fakeStrapi(opts: { client?: string; schema?: string; failOn?: string } = {}) {
      const sql: string[] = [];
      const strapi: any = {
        db: {
          getInfo: () => ({ client: opts.client ?? 'postgres' }),
          getSchemaName: () => opts.schema,
          connection: {
            raw: vi.fn(async (q: string) => {
              sql.push(q);
              if (opts.failOn && q.includes(opts.failOn)) throw new Error('duplicate key');
            }),
          },
        },
        log: { error: vi.fn() },
      };
      return { strapi, sql };
    }

    describe('createIndexes (B-7)', () => {
      it('qualifies tables with the Postgres schema, and leaves SQLite names bare', async () => {
        const pg = fakeStrapi({ schema: 'public' });
        await createIndexes(pg.strapi);
        expect(pg.sql[0]).toContain('ON "public"."schools" (slug)');
        const lite = fakeStrapi({ client: 'sqlite' });
        await createIndexes(lite.strapi);
        expect(lite.sql[0]).toContain('ON schools (slug)');
      });

      it('refuses to start in production when a unique index fails', async () => {
        process.env.NODE_ENV = 'production';
        const { strapi } = fakeStrapi({ schema: 'public', failOn: 'schools_slug_draft_uq' });
        await expect(createIndexes(strapi)).rejects.toThrow(/Refusing to start/);
      });

      it('only logs a failed unique index outside production', async () => {
        process.env.NODE_ENV = 'development';
        const { strapi } = fakeStrapi({ client: 'sqlite', failOn: 'schools_slug_draft_uq' });
        await expect(createIndexes(strapi)).resolves.toBeUndefined();
        expect(strapi.log.error).toHaveBeenCalled();
      });

      it('never stops the boot for a plain index', async () => {
        process.env.NODE_ENV = 'production';
        const { strapi } = fakeStrapi({ schema: 'public', failOn: 'schools_lat_lng_idx' });
        await expect(createIndexes(strapi)).resolves.toBeUndefined();
      });

      it('rejects MySQL and odd schema names', async () => {
        await expect(createIndexes(fakeStrapi({ client: 'mysql' }).strapi)).rejects.toThrow(/isn't supported/);
        await expect(createIndexes(fakeStrapi({ schema: 'a"; drop' }).strapi)).rejects.toThrow(/plain identifier/);
      });
    });
    ```

- **Data:** none. Every statement is `IF NOT EXISTS`, so existing indexes are kept. What changes is the outcome of a
  failure: on a production database where an index failed before (silently), the next boot stops instead. See
  *Deployment* for the pre-deploy log check.
- **Callers updated:** `server/src/index.ts` is the only user of `UNIQUE_INDEXES`. The `mysql` branch of
  `server/config/database.ts` stays (removing it is N7, out of scope); booting with it now fails with the message
  above instead of silently missing every index.
- **Verify:**
  - `cd server && npm run typecheck` → exit 0.
  - `cd server && npx vitest run tests/unit/indexes.test.ts` → 5 passed.
  - `cd server && npm run test:integration:isolated` → all pass (the test server boots, so every index was created).
  - `cd server && sqlite3 -readonly -json .tmp/test.db "select name from sqlite_master where type='index' and name in ('affiliations_slug_draft_uq','ba_user_email_uq','cities_slug_uq','instructors_slug_draft_uq','schools_slug_draft_uq','schools_lat_lng_idx')" | node -e 'const n=JSON.parse(require("fs").readFileSync(0,"utf8")).map(r=>r.name).sort();console.log(n.length, n.join(","))'`
    → `6 affiliations_slug_draft_uq,ba_user_email_uq,cities_slug_uq,instructors_slug_draft_uq,schools_lat_lng_idx,schools_slug_draft_uq`.
    The names are listed exactly: Strapi also names every link-table index `<table>_uq` (for example
    `schools_city_lnk_uq`, `@strapi/database/dist/utils/identifiers/index.js:61`), and `_` is a `LIKE` wildcard, so a
    pattern match returns far more rows. Later steps check their own indexes by exact name. Run it while the test server is
    stopped or after the run; `.tmp/test.db` is the throwaway test database.
  - Negative test (real boot refuses): with the test server stopped,

    ```bash
    cd server
    cp .tmp/test.db .tmp/scratch-b7.db
    sqlite3 .tmp/scratch-b7.db "DROP INDEX cities_slug_uq; INSERT INTO cities (document_id, slug, name, timezone) SELECT 'b7dup', slug, name, timezone FROM cities LIMIT 1;"
    NODE_ENV=production PORT=1343 DATABASE_CLIENT=sqlite DATABASE_FILENAME=.tmp/scratch-b7.db \
      APP_KEYS=test-key-1,test-key-2 API_TOKEN_SALT=test-salt ADMIN_JWT_SECRET=test-admin-secret \
      TRANSFER_TOKEN_SALT=test-transfer-salt JWT_SECRET=test-jwt-secret ENCRYPTION_KEY=test-encryption-key \
      BETTER_AUTH_SECRET=test-better-auth-secret-0123456789 BETTER_AUTH_DASHBOARD_SECRET=test-dashboard-secret \
      BETTER_AUTH_URL=http://localhost:1343 WEB_ORIGINS=http://localhost:8083 MCP_ENABLED=true \
      perl -e 'alarm 120; exec @ARGV' npx strapi start > .tmp/scratch-b7.log 2>&1; echo "exit $?"
    grep -c "Refusing to start" .tmp/scratch-b7.log
    rm -f .tmp/scratch-b7.db .tmp/scratch-b7.log
    ```

    → `exit` is non-zero and the count is ≥ 1. (The throwaway values are the ones `scripts/test-server.sh` uses. If
    the `INSERT` fails because `cities` has more required columns than these, add them from
    `PRAGMA table_info(cities)`; that's set-up, not a deviation.) ⚠️ not verified until E8: that a throw in
    `bootstrap()` makes `strapi start` exit rather than log and keep serving.
- **Done when:** the unit file passes, the isolated integration suite passes, and the scratch boot with a duplicate
  city slug exits with "Refusing to start".
- **Rollback:** revert the commit. No data step to undo.

### S2 — Widen web-sourced URL columns to `text` and raise the tool caps to 500 (B-11)

- **Why:** B-11.
  - `contact.website`, `contact.instagram` and `affiliation.website` are Strapi `string` attributes, so the column is
    `varchar(255)`.
  - The tools cap these at 255 (`str`, `server/src/plugins/matfinder/server/src/mcp/schemas.ts:17`).
  - `normalizeWebsite` then adds `https://` (`server/src/document-middlewares/normalize-contact.ts:12–16`). A
    249–255-character input therefore overflows the column and comes back as a raw database error.
- **Files:**
  - `server/src/components/school/contact.json`: change two attributes; leave the other two as they are.

    ```json
    "website": { "type": "text" },
    "instagram": { "type": "text" }
    ```

  - `server/src/api/affiliation/content-types/affiliation/schema.json`: `"website": { "type": "string" }` becomes
    `"website": { "type": "text" }`.
  - `server/src/plugins/matfinder/server/src/mcp/schemas.ts`: add, after `str` (line 17):

    ```ts
    /** A web address or handle from a source page. Stored in `text` columns, so longer than `str`; matches sourceUrls. */
    export const urlText = z.string().max(500);
    ```

  - `server/src/plugins/matfinder/server/src/mcp/tools/find-possible-duplicates.ts:11–12`. `add_gym_from_web` reuses `lookupInput`, so this covers it too.

    ```ts
    website: urlText.optional(),
    instagram: urlText.optional().describe('@handle or instagram.com URL'),
    ```

    Also change the import on line 1 to `import { slug, str, urlText, z } from '../schemas';`.
  - `server/src/plugins/matfinder/server/src/mcp/tools/upsert-school.ts:38`: in the `contact` object, `website: str.nullable()` becomes
    `website: urlText.nullable()`, and `instagram: str.nullable()` becomes `instagram: urlText.nullable()`. Add
    `urlText` to the import on line 1.
  - `server/src/plugins/matfinder/server/src/mcp/tools/upsert-affiliation.ts:11`: `website: str.nullable().optional()` becomes
    `website: urlText.nullable().optional()`. The import on line 1 becomes
    `import { slug, upsertOutput, urlText, z } from '../schemas';`, because `str` has no other use in that file.
- **Data:**
  - Strapi's schema sync changes the column type when it boots. This only widens the columns, so existing values are
    kept.
  - ⚠️ not verified how Strapi 5.58 runs the type change:
    - On Postgres it should be `ALTER COLUMN … TYPE text`.
    - SQLite has no column-type change, so knex rebuilds the table.
  - Test the upgrade on a scratch SQLite copy that holds data written by the old schema:
    1. On this step's parent commit, in `server/`, run `npm run build`.
    2. Start Strapi with the env block from `scripts/test-server.sh` (the `PORT=… AI_API_KEY= MATFINDER_AI_SCRIPTED=true`
       lines), but with `PORT=1343 DATABASE_FILENAME=.tmp/scratch.db` and `SEED_SAMPLE_DATA=true`, as
       `… npm run start`.
    3. Wait until `curl -s -o /dev/null -w '%{http_code}' http://localhost:1343/_health` prints `204`.
    4. Save the old values:

       ```bash
       sqlite3 -json .tmp/scratch.db "SELECT id, website, instagram FROM components_school_contacts ORDER BY id" > .tmp/contacts-before.json
       ```

       Then stop Strapi.
    5. Switch to this step's commit, run `npm run build`, and start again with the same env and the same
       `.tmp/scratch.db`.
    6. Check the column types and the values:

       ```bash
       sqlite3 -json .tmp/scratch.db "PRAGMA table_info(components_school_contacts)" | node -e 'const c=JSON.parse(require("fs").readFileSync(0));for(const n of ["website","instagram"]){const t=c.find(x=>x.name===n).type;if(!/text/i.test(t))throw new Error(n+" is "+t)}console.log("ok")'
       ```

       It should print `ok`. The same check on `affiliations` › `website` should print `ok` too.
    7. `sqlite3 -json .tmp/scratch.db "SELECT id, website, instagram FROM components_school_contacts ORDER BY id"`
       should be equal to `.tmp/contacts-before.json`. Compare them with
       `node -e` + `assert.deepStrictEqual`.
    8. Delete `.tmp/scratch.db` afterwards.
  - Postgres can't be tested locally (CLAUDE.md: no local Postgres). The owner takes a Strapi Cloud backup before
    deploying this step (see Deployment).
- **Callers updated:**
  - The tools above.
  - None in `mobile/`: the app reads `contact.website` and `contact.instagram` as strings, and the type doesn't change.
  - `server/src/plugins/matfinder/server/src/domain/duplicates.ts` (`siteParts`, `instagramKey`) and `server/src/plugins/matfinder/server/src/gym-chat/context.ts:83, 91` take any string, so no
    change is needed.
  - `server/src/seed/sample.ts:22–23, 70–197` writes short values, so no change is needed.
  - The admin's Content Manager shows these fields as a textarea instead of a one-line input. This is expected.
- **Verify:**
  - Add a test to `server/tests/api.test.ts`, inside `describe('MCP (curator tools)')`, after the `set_school_schedule`
    test:

    ```ts
    it('stores a website longer than 255 characters, and refuses one over 500', async (ctx) => {
      if (!token) return ctx.skip();
      const long = `example.com/${'a'.repeat(380)}`; // 392 characters; 400 once https:// is added
      const r = await callTool(token, 'upsert_school', {
        name: `Integration Long URL ${randomBytes(3).toString('hex')} (Demo)`,
        citySlug: 'las-vegas',
        address: '2 Test Way, Las Vegas, NV',
        latitude: 36.18,
        longitude: -115.15,
        contact: { website: long },
      });
      expect(r.isError).toBe(false);
      const draft = await callTool(token, 'get_school_draft', { slug: r.data.slug });
      expect(draft.data.contact.website).toBe(`https://${long}`);

      const tooLong = await mcp(token, 'tools/call', { name: 'upsert_school', arguments: { slug: r.data.slug, contact: { website: `example.com/${'a'.repeat(500)}` } } });
      expect(!!tooLong.body.error || !!tooLong.body.result?.isError).toBe(true);
    });
    ```

  - `npm run test:integration:isolated` → all tests pass, including the new one.
  - Negative test: the 512-character website above is refused by the tool's input schema, and the stored value
    doesn't change. Add `expect((await callTool(token, 'get_school_draft', { slug: r.data.slug })).data.contact.website).toBe(\`https://${long}\`)`
    after the refusal.
- **Done when:** the new integration test passes, and the scratch-database upgrade check prints `ok` with the values
  unchanged.
- **Rollback:**
  - Revert the commit.
  - Going back to `string` narrows the columns to `varchar(255)`. If a value over 255 characters was saved in the
    meantime, Postgres refuses the narrowing (`value too long`) and Strapi fails to boot.
  - Before reverting, shorten or clear those values in the Content Manager. To find them, run a query on a database
    copy: `length(website) > 255`.
  - This step isn't cleanly reversible once long values exist.

### S3 — Claims: no double claims, no rival accepts (B-5)

- **Why:** B-5. `create` checks `CLAIM_OPEN` and then inserts with no transaction or index
  (`server/src/plugins/matfinder/server/src/services/claims.ts:47–72`), so a double tap makes two open claims. `act`
  reads the claim outside the transaction (line 104) and never re-checks it (lines 115–137), so two admins can accept
  rival claims on one gym.
- **Depends on:** the B-7 step (`server/src/lib/indexes.ts`).
- **Files:**
  - `server/src/lib/indexes.ts` — add two entries to the `indexes` array, after `ba_user_email_uq`. Column names are
    Strapi's snake_case of the attributes in
    `server/src/plugins/matfinder/server/src/content-types/claim/schema.json` (table `matfinder_claims`; confirmed
    against a local test database: `school_document_id`, `user_id`, `status`). The type has no draft-and-publish, so
    there is one row per claim.

    ```ts
      // At most one accepted claim (owner) per gym, and one open claim per person per gym (B-5).
      { unique: true, sql: `CREATE UNIQUE INDEX IF NOT EXISTS matfinder_claims_accepted_uq ON ${t('matfinder_claims')} (school_document_id) WHERE status = 'accepted'` },
      { unique: true, sql: `CREATE UNIQUE INDEX IF NOT EXISTS matfinder_claims_open_uq ON ${t('matfinder_claims')} (school_document_id, user_id) WHERE status IN ('pending', 'contacted')` },
    ```

  - `server/src/plugins/matfinder/server/src/domain/errors.ts` — append the same helper the app has in
    `server/src/lib/errors.ts:15–19` (the plugin keeps its own copy, like `ToolError` in this file):

    ```ts
    /** True for a unique-index violation on SQLite or Postgres. Same rule as the app's lib/errors.ts. */
    export function isUniqueViolation(error: unknown): boolean {
      const e = error as { code?: string; message?: string } | null;
      return e?.code === '23505' || e?.code === 'SQLITE_CONSTRAINT_UNIQUE' || /unique constraint/i.test(e?.message ?? '');
    }
    ```

  - `server/src/plugins/matfinder/server/src/services/claims.ts`:
    - Line 3: add the import below it:
      `import { isUniqueViolation } from '../domain/errors';`
    - After line 32 (`adminName`), add:

      ```ts
      /** Thrown inside act()'s transaction when the claim changed after it was read, so every write rolls back. */
      class ClaimChanged extends Error {}
      ```

    - In `create`, replace lines 57–70 (the `await claims().create({...});` call) with the same call wrapped:

      ```ts
          try {
            await claims().create({
              data: {
                schoolDocumentId: school.documentId,
                schoolSlug: school.slug,
                schoolName: school.name,
                userId: user.documentId,
                name: input.name?.trim() || user.name || user.email,
                email: user.email,
                phone: input.phone.trim(),
                role: input.role,
                message: input.message?.trim() || null,
                status: 'pending',
              },
            });
          } catch (e) {
            // Two taps at once: the open-claim index (matfinder_claims_open_uq) lets only one through.
            if (isUniqueViolation(e)) return fail(409, 'CLAIM_OPEN', 'You already have a claim for this gym waiting for review.');
            throw e;
          }
      ```

      The checks on lines 48–55 stay: they give the normal, friendly answers. The cap of 5 open claims
      (`TOO_MANY_CLAIMS`) stays check-then-write; two simultaneous claims on two different gyms can make it 6. That's
      accepted: the cap is abuse friction, not an invariant.
    - Replace the whole `act` method (lines 102–138) with:

      ```ts
          /**
           * Moves a claim along (see domain/claims.ts). Accepting closes the gym's other open claims. The claim is read
           * inside the transaction and written only if its status is still the one read; otherwise everything rolls back
           * (409 INVALID_STATE). A second accept on the same gym hits matfinder_claims_accepted_uq (409 ALREADY_CLAIMED).
           */
          async act(documentId: string, action: ClaimAction, opts: { note?: string; admin?: any }): Promise<ServiceResult<{ status: ClaimStatus }>> {
            const now = new Date().toISOString();
            const note = opts.note?.trim();
            const handledBy = adminName(opts.admin);
            try {
              return await strapi.db.transaction(async () => {
                const claim = await claims().findOne({ documentId, fields: ['status', 'schoolDocumentId', 'adminNote'] });
                if (!claim) return fail(404, 'NOT_FOUND', 'No claim with that id.');
                const to = nextStatus(claim.status, action);
                if (!to) return fail(409, 'INVALID_STATE', `A ${claim.status} claim can't be ${action === 'contacted' ? 'marked contacted' : `${action}ed`}.`);
                // Rejecting a claim or removing an owner needs a reason, for the record.
                if ((action === 'reject' || action === 'remove-owner') && !note) {
                  return fail(422, 'VALIDATION_ERROR', action === 'reject' ? 'Say why the claim is rejected.' : 'Say why the owner is removed.');
                }

                if (action === 'accept') {
                  const other = await acceptedFor(claim.schoolDocumentId);
                  if (other && other.documentId !== documentId) return fail(409, 'ALREADY_CLAIMED', 'This gym already has an accepted claim. Remove that owner first.');
                  const rivals = await claims().findMany({
                    filters: { schoolDocumentId: claim.schoolDocumentId, status: { $in: OPEN }, documentId: { $ne: documentId } },
                    fields: ['status'],
                  });
                  for (const r of rivals) {
                    await claims().update({ documentId: r.documentId, data: { status: 'rejected', decidedAt: now, adminNote: 'Another claim was accepted.', handledBy } });
                  }
                }
                // Conditional write: only if the status is still the one read above.
                const { count } = await strapi.db.query(CLAIM as any).updateMany({
                  where: { documentId, status: claim.status },
                  data: {
                    status: to,
                    handledBy,
                    ...(action === 'contacted' ? { contactedAt: now } : { decidedAt: now }),
                    ...(note ? { adminNote: claim.adminNote ? `${claim.adminNote}\n${note}` : note } : {}),
                    updatedAt: now,
                  },
                });
                if (count === 0) throw new ClaimChanged();
                return ok({ status: to });
              });
            } catch (e) {
              if (e instanceof ClaimChanged) return fail(409, 'INVALID_STATE', 'Someone else just changed this claim. Reload and try again.');
              if (isUniqueViolation(e)) return fail(409, 'ALREADY_CLAIMED', 'This gym already has an accepted claim. Remove that owner first.');
              // Postgres: two admins accepting rival claims at once can lock each other's rows; one transaction is
              // aborted as a deadlock (40P01). Nothing was written, so it's the same answer as ClaimChanged.
              if ((e as { code?: string } | null)?.code === '40P01') return fail(409, 'INVALID_STATE', 'Someone else just changed this claim. Reload and try again.');
              throw e;
            }
          },
      ```

      The order of answers is unchanged (404, then 409 `INVALID_STATE`, then 422), so the existing integration test's
      expectations hold. `strapi.db.query(...).updateMany` returns `{ count }` (Strapi 5.58
      `@strapi/database/dist/entity-manager/index.js:342–367`). It's the query engine, so `updatedAt` is set by hand.
    - Add a new method after `byGym` (before line 164's `};`):

      ```ts
          /**
           * Run before matfinder_claims_open_uq is created (bootstrap): of several open claims by one person on one gym,
           * keep the newest and close the rest as rejected, with a note. Returns how many it closed. Safe on every boot.
           * Two accepted claims on one gym are NOT fixed here: a person decides, so the index fails and B-7's rule applies.
           */
          async closeDuplicateOpenClaims(): Promise<number> {
            const rows = await strapi.db.query(CLAIM as any).findMany({
              where: { status: { $in: OPEN } },
              select: ['id', 'schoolDocumentId', 'userId', 'adminNote'],
              orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            });
            const seen = new Set<string>();
            const now = new Date().toISOString();
            const note = 'Closed automatically: the same person has a newer open claim for this gym.';
            let closed = 0;
            for (const r of rows) {
              const key = `${r.schoolDocumentId}|${r.userId}`;
              if (!seen.has(key)) {
                seen.add(key);
                continue;
              }
              await strapi.db.query(CLAIM as any).update({
                where: { id: r.id },
                data: { status: 'rejected', decidedAt: now, handledBy: 'MatFinder (automatic)', adminNote: r.adminNote ? `${r.adminNote}\n${note}` : note, updatedAt: now },
              });
              closed += 1;
            }
            if (closed) strapi.log.warn(`[matfinder] closed ${closed} duplicate open claim(s) before adding matfinder_claims_open_uq`);
            return closed;
          },
      ```

  - `server/src/index.ts` — in `bootstrap()`, before `await createIndexes(strapi);`, add:

    ```ts
        // Existing duplicate open claims would make matfinder_claims_open_uq fail (B-5).
        await strapi.plugin('matfinder').service('claims').closeDuplicateOpenClaims();
    ```

    The plugin is always loaded (`assertMatFinderBuilt` in `server/config/plugins.ts` refuses to start otherwise),
    and its tables exist before the app's `bootstrap()` runs.
  - `server/tests/api.test.ts` — in `describe('gym claims')`, add after the second `it(...)` (after line 381, where it ends):

    ```ts
      it('a double tap makes one claim, and two admins accepting rivals makes one owner (B-5)', async (ctx) => {
        const RACE = 'sample-henderson-grappling-demo';
        const body = { schoolSlug: RACE, role: 'owner', phone: '702-555-0177' };
        const tapper = await signUp();
        const taps = await Promise.all([claim(tapper, body), claim(tapper, body)]);
        expect(taps.map((r) => r.status).sort()).toEqual([201, 409]);
        expect((await taps.find((r) => r.status === 409)!.json()).error.name).toBe('CLAIM_OPEN');

        const jwt = inject('adminJwt');
        if (!jwt) return ctx.skip();
        expect((await claim(await signUp(), { ...body, role: 'manager' })).status).toBe(201);
        const board = await (await fetch(`${API}/matfinder/claims?status=pending`, { headers: { Authorization: `Bearer ${jwt}` } })).json();
        const rivals = board.items.filter((x: { schoolSlug: string }) => x.schoolSlug === RACE);
        expect(rivals).toHaveLength(2);
        const accepts = await Promise.all(rivals.map((c: { documentId: string }) => act(jwt, c.documentId, 'accept')));
        expect(accepts.map((r) => r.status).sort()).toEqual([200, 409]);
        expect(['ALREADY_CLAIMED', 'INVALID_STATE']).toContain((await accepts.find((r) => r.status === 409)!.json()).error.name);
        const accepted = await (await fetch(`${API}/matfinder/claims?status=accepted`, { headers: { Authorization: `Bearer ${jwt}` } })).json();
        const owners = accepted.items.filter((x: { schoolSlug: string }) => x.schoolSlug === RACE);
        expect(owners).toHaveLength(1);
        // Leave the gym unclaimed for later tests.
        expect((await act(jwt, owners[0].documentId, 'remove-owner', 'Integration test cleanup.')).status).toBe(200);
      });
    ```

    `sample-henderson-grappling-demo` is a published sample gym (`server/src/seed/sample.ts:83`) that no other claim
    test touches.
  - `server/tests/unit/claims-dedupe.test.ts` — new file:

    ```ts
    import { describe, expect, it, vi } from 'vitest';
    import claimsService from '../../src/plugins/matfinder/server/src/services/claims';

    describe('closeDuplicateOpenClaims (B-5)', () => {
      it('keeps the newest open claim per person per gym and rejects the rest', async () => {
        const rows = [
          // Already sorted newest first, as the query asks.
          { id: 3, schoolDocumentId: 'g1', userId: 'u1', adminNote: null },
          { id: 2, schoolDocumentId: 'g1', userId: 'u1', adminNote: 'called once' },
          { id: 1, schoolDocumentId: 'g1', userId: 'u2', adminNote: null },
        ];
        const update = vi.fn(async () => ({}));
        const strapi: any = {
          db: { query: () => ({ findMany: async () => rows, update }) },
          log: { warn: vi.fn() },
          documents: () => ({}),
        };
        const closed = await claimsService({ strapi }).closeDuplicateOpenClaims();
        expect(closed).toBe(1);
        expect(update).toHaveBeenCalledTimes(1);
        const arg = (update.mock.calls[0] as any[])[0];
        expect(arg.where).toEqual({ id: 2 });
        expect(arg.data.status).toBe('rejected');
        expect(arg.data.adminNote).toMatch(/^called once\nClosed automatically/);
      });
    });
    ```

- **Data:**
  - On each boot, before the index is created, duplicate open claims (same gym, same person, `pending`/`contacted`) are
    closed as `rejected` with an explanatory `adminNote` and `handledBy: 'MatFinder (automatic)'`. The newest one
    stays open. Existing rows are otherwise untouched.
  - Two accepted claims on one gym are not merged automatically. If any exist, `matfinder_claims_accepted_uq` fails
    and, in production, Strapi refuses to start (B-7). *Deployment* has the pre-deploy check that rules this out.
  - Test on a copy: the unit test above covers the merge rule. To test against real-shaped data, copy a local
    development database to `.tmp/scratch-b5.db`, insert two open claims for one `(school_document_id, user_id)`
    with `sqlite3`, boot with `DATABASE_FILENAME=.tmp/scratch-b5.db npm run develop`, and check that one is now
    `rejected`. Never against production.
- **Callers updated:**
  - `act` is called by `server/src/plugins/matfinder/server/src/controllers/claims.ts` (admin accept, reject,
    contacted, remove-owner); signature and result shape are unchanged.
  - `create` is called by `controllers/claim.ts:33`; unchanged signature. The app's claim form
    (`mobile/lib/api/claims.ts`) already handles a 409 `CLAIM_OPEN`, which is what a double tap now gets.
  - `server/src/index.ts` calls the new `closeDuplicateOpenClaims`.
  - Admin UI: `admin/src/components/ClaimsTab.tsx:79–81` shows `error.message` from any failed action as a danger
    notification, so the new "Someone else just changed this claim" text appears there with no UI change. The app
    maps `CLAIM_OPEN` to its own text (`mobile/lib/claims.ts:28`).
- **Verify:**
  - `cd server && npm run typecheck && npm run build:plugin` → exit 0.
  - `cd server && npx vitest run tests/unit/claims-dedupe.test.ts tests/unit/claims.test.ts tests/unit/indexes.test.ts` → all pass.
  - `cd server && npm run test:integration:isolated` → all pass, including the new race test (needs
    `ALLOW_ADMIN_BOOTSTRAP`, which the isolated script sets).
  - `cd server && sqlite3 -readonly -json .tmp/test.db "select name from sqlite_master where type='index' and tbl_name='matfinder_claims' and name like '%_uq'" | node -e 'console.log(JSON.parse(require("fs").readFileSync(0,"utf8")).map(r=>r.name).sort().join(","))'`
    → `matfinder_claims_accepted_uq,matfinder_claims_open_uq`.
  - Negative test: the double-tap half of the new integration test (one 201, one 409 `CLAIM_OPEN`).
- **Done when:** the isolated integration suite passes with the race test, and both claim indexes exist in the test
  database.
- **Rollback:** revert the commit. The indexes stay in the database; with the old code a duplicate open claim then
  fails with a 500 instead of a 409. To remove them as well (local SQLite; on Postgres prefix the table's schema):
  `DROP INDEX IF EXISTS matfinder_claims_accepted_uq; DROP INDEX IF EXISTS matfinder_claims_open_uq;`. Claims that
  were closed as duplicates stay `rejected`; their `adminNote` says why, and an admin can't reopen them from the UI.
  That part isn't reversible.

### S4 — Claim lookups by gym id, and only for the gyms shown (B-12)

- **Why:** B-12. `mine` looks a claim up by the slug copied at claim time
  (`server/src/plugins/matfinder/server/src/services/claims.ts:75–78`), so it loses the claim when a gym's slug
  changes. `claimedSchoolIds()` (lines 140–144) loads every accepted claim, up to 10,000, on every directory, nearby
  and gym page request (`server/src/api/school/services/school.ts:88–89, 248, 279, 339`).
- **Depends on:** the B-5 step (`matfinder_claims_accepted_uq` guarantees at most one accepted row per gym, which
  the `limit` below relies on).
- **Files:**
  - `server/src/plugins/matfinder/server/src/services/claims.ts`:
    - Replace `mine` (lines 74–78) with:

      ```ts
          /** The user's latest claim on a gym, for the app ("Your claim is being reviewed"). Keyed by the gym's
           *  documentId, so the claim still shows after the gym's slug changes (B-12). */
          async mine(user: ClaimUser, schoolSlug: string) {
            const school = await docs(strapi, SCHOOL).findFirst({ status: 'published', filters: { slug: schoolSlug }, fields: ['slug'] });
            if (!school) return { status: null, createdAt: null };
            const latest = await claims().findFirst({
              filters: { schoolDocumentId: school.documentId, userId: user.documentId },
              sort: 'createdAt:desc',
              fields: ['status', 'createdAt'],
            });
            return { status: (latest?.status as ClaimStatus) ?? null, createdAt: latest?.createdAt ?? null };
          },
      ```

    - Replace `claimedSchoolIds` (lines 140–144) with:

      ```ts
          /** Of these gyms, the ones with an accepted claim: the public `claimed` flag. At most one accepted claim per
           *  gym (matfinder_claims_accepted_uq), so each chunk needs at most chunk.length rows. */
          async claimedAmong(schoolDocumentIds: string[]): Promise<Set<string>> {
            const out = new Set<string>();
            const ids = Array.from(new Set(schoolDocumentIds));
            for (let i = 0; i < ids.length; i += 500) {
              const chunk = ids.slice(i, i + 500);
              const rows = await claims().findMany({
                filters: { schoolDocumentId: { $in: chunk }, status: 'accepted' },
                fields: ['schoolDocumentId'],
                limit: chunk.length,
              });
              for (const r of rows) out.add(r.schoolDocumentId);
            }
            return out;
          },
      ```

      (Chunks of 500 keep the `IN (…)` list well under SQLite's and Postgres's bound-parameter limits.)
  - `server/src/api/school/services/school.ts`:
    - Replace lines 86–89 with:

      ```ts
        /** Of these gyms, the ones with an accepted owner claim (the MatFinder plugin); none when the plugin isn't loaded. */
        const claimedAmong = async (schoolDocumentIds: string[]): Promise<Set<string>> =>
          ((await (strapi.plugin('matfinder')?.service('claims') as any)?.claimedAmong(schoolDocumentIds)) as Set<string> | undefined) ?? new Set<string>();
      ```

    - `getDirectory`: delete line 248 (`const claimed = await claimedSchoolIds();`). After the `findAllPublished`
      call that assigns `schools` (ends line 254), add:
      `const claimed = await claimedAmong(schools.map((s) => s.documentId));`
    - `getNearby`: delete line 279 (`const claimed = await claimedSchoolIds();`). After
      `const shown = inRange.slice(0, MAX_NEARBY);` add:
      `const claimed = await claimedAmong(shown.map(({ s }) => s.documentId));`
    - `getBySlug`: replace line 339 with:
      `const claimed = (await claimedAmong([s.documentId])).has(s.documentId);`
- **Data:** none. The `schoolSlug` column stays (the admin board shows it); a `school` relation is deferred.
- **Callers updated:**
  - `claimedSchoolIds` had exactly one caller, the wrapper in `server/src/api/school/services/school.ts:88–89`,
    used at lines 248, 279 and 339. All are replaced above; nothing else calls it (searched `server/src`,
    `server/tests`, `mobile/`).
  - `mine` is called by `controllers/claim.ts:41`; signature unchanged, response shape unchanged
    (`{ status, createdAt }`). The app calls it through `mobile/lib/api/claims.ts:14`
    (`GET /api/matfinder/claims/mine?school=<slug>`); no change.
  - The response field `claimed` in directory, nearby and gym-page payloads (`server/src/lib/directory.ts:61, 87`)
    is unchanged in name and meaning.
- **Verify:**
  - `cd server && npm run typecheck && npm run build:plugin` → exit 0.
  - `cd server && npm run test:integration:isolated` → all pass. The existing claim tests already check `claimed` on
    the directory (`claimed()` helper) and the gym page after accept and after remove-owner, and `mine` returning
    `pending`.
  - Add to the first claim test in `server/tests/api.test.ts` (after line 343):

    ```ts
        // Unknown gym: no claim, not an error.
        expect(await (await get('/api/matfinder/claims/mine?school=no-such-gym', owner)).json()).toEqual({ status: null, createdAt: null });
    ```

  - `curl -s 'http://localhost:1342/api/schools/nearby?lat=36.17&lng=-115.14&radius=60' | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8")).data;console.log(d.schools.every(s=>typeof s.claimed==="boolean"))'`
    → `true` (while the test server runs; `lat`, `lng`, `radius` are the parameters read in
    `server/src/api/school/controllers/school.ts:23–25`).
- **Done when:** the isolated integration suite passes, and `claimedSchoolIds` no longer appears in `server/src`
  (`grep -rn claimedSchoolIds server/src` → no output).
- **Rollback:** revert the commit. No data step.

### S5 — `add_gym_from_web` and slug-less `upsert_school` only create, never update an existing gym (B-1)

- **Why:** B-1 (🔴).
  - Today `upsertOnce` (`server/src/api/school/services/school.ts:159–175`) makes the slug from the name alone. It then
    updates any existing draft with that slug: city, location and description are replaced, and the result is
    auto-published.
  - The duplicate check (`server/src/plugins/matfinder/server/src/services/discovery.ts:41–60, 75–80`) looks only inside one city.
  - `addGymFromWeb` wraps `upsertDraft` in an outer `strapi.db.transaction` (`discovery.ts:112–127`). Its
    catch-and-retry (`school.ts:399–410`) then runs inside the same transaction, which a unique violation has already
    aborted on Postgres.
  - `upsert_school` without a `slug` has the same overwrite. Its own description promises it creates ("Without a slug
    … it creates a school", `server/src/plugins/matfinder/server/src/mcp/tools/upsert-school.ts:8`).
- **Decided behaviour (zero-decision):**
  1. `add_gym_from_web` always creates a new school.
     - Its slug is the first free one of: `slugify(name)`, then `slugify(name)-<citySlug>` (skipped if the base already
       ends with `-<citySlug>`), then `…-<citySlug>-2`, `-3`, and so on.
     - "Free" means no draft row in any city has that slug.
  2. `upsert_school` with a `slug` behaves as today: it updates that school, or creates one with that exact slug if
     it's unknown. Without a `slug`, it creates, with the same free-slug rule.
  3. The duplicate check looks at two sets:
     - gyms **in the same city** on every signal, as today (similar name, phone, website, Instagram, within 150 m);
     - gyms **in other cities** on the identity signals only: phone, website, Instagram, within 150 m.

     Name similarity isn't checked across cities. Chains ("Gracie Barra", "10th Planet") share names across cities,
     and with create-only slugs a shared name can no longer overwrite anything. A candidate from another city gets the
     extra reason `in another city (<citySlug>)`.
  4. `confirmNotDuplicate: true` skips the refusal and creates a **new** gym with a free slug. It never updates a
     candidate. To update an existing gym the agent uses `upsert_school` with its slug, which is what the tool
     description already says.
  5. The provenance stamp (`origin: 'web-agent'`, `sourceUrls`, `discoveredAt`) goes into the same create. There's no
     second update and no outer transaction.
- **Files:**
  - `server/src/lib/slugify.ts`: add at the end:

    ```ts
    /**
     * The first slug not in `taken`: `base`, then `base-<citySlug>` (unless `base` already ends with it), then that
     * with `-2`, `-3`… Used when creating a school, so a name already listed (in any city) never selects that school.
     */
    export function pickFreeSlug(base: string, citySlug: string, taken: ReadonlySet<string>): string {
      if (!taken.has(base)) return base;
      const withCity = base === citySlug || base.endsWith(`-${citySlug}`) ? base : `${base}-${citySlug}`;
      if (!taken.has(withCity)) return withCity;
      for (let n = 2; ; n++) {
        const candidate = `${withCity}-${n}`;
        if (!taken.has(candidate)) return candidate;
      }
    }
    ```

  - `server/src/api/school/services/school.ts`:
    - line 13: `import { pickFreeSlug, slugifyWithFallback } from '../../../lib/slugify';`
    - after `const invalid = …` (line 84), add:

      ```ts
      /** Thrown inside a create-only write when the chosen slug was taken meanwhile; the caller picks another. */
      class SlugTaken extends Error {}
      ```

    - `upsertOnce` (lines 159–237). Change the signature, add the create-only check, and add the extra create data:

      ```ts
      async function upsertOnce(
        input: UpsertSchoolInput,
        geocoded: MapBoxValue | undefined,
        opts: { createOnly?: boolean; extraOnCreate?: Record<string, unknown> } = {},
      ): Promise<UpsertSchoolResult> {
      ```

      - Right after the `existing` lookup (after line 172, before `if (!existing) {`), add:

        ```ts
        if (existing && opts.createOnly) throw new SlugTaken(slug);
        ```

      - Replace the create branch on line 229, `: await docs(SCHOOL).create({ data: { ...data, slug } });`, with:
        `: await docs(SCHOOL).create({ data: { ...data, ...(opts.extraOnCreate ?? {}), slug } });`.
      - Leave the rest of `upsertOnce` alone. (the B-3 step, S6, adds `previousStatus` to its result.)
    - add a helper after `resolveLocation` (after line 157):

      ```ts
      /** Every draft slug starting with `base`, in any city: the set pickFreeSlug avoids. */
      async function takenSlugs(base: string): Promise<Set<string>> {
        const rows = await docs(SCHOOL).findMany({ status: 'draft', filters: { slug: { $startsWith: base } }, fields: ['slug'], limit: 10000 });
        return new Set(rows.map((r: any) => r.slug as string));
      }
      ```

    - in the returned object, add `createDraft` after `upsertDraft` (after line 408, where `upsertDraft` ends):

      ```ts
      /**
       * Create a NEW school draft, never update one (add_gym_from_web, and upsert_school without a slug). The slug is
       * the name's, or the first free variant (pickFreeSlug), checked across every city. `extraOnCreate` is written in
       * the same create (add_gym_from_web's provenance). Each attempt is its own transaction, so a unique violation
       * (a concurrent create took the slug) is retried with a fresh slug, also on Postgres.
       */
      async createDraft(input: UpsertSchoolInput, extraOnCreate: Record<string, unknown> = {}): Promise<UpsertSchoolResult> {
        if (!input.name) throw invalid('required to create a school', ['name']);
        const { slug: _ignored, ...rest } = input;
        const geocoded = await geocodeIfNeeded(rest);
        const base = slugifyWithFallback(input.name, 'school');
        for (let attempt = 0; attempt < 3; attempt++) {
          const slug = pickFreeSlug(base, input.citySlug ?? 'city', await takenSlugs(base));
          try {
            return await strapi.db.transaction(() => upsertOnce({ ...rest, slug }, geocoded, { createOnly: true, extraOnCreate }));
          } catch (e) {
            if (!(e instanceof SlugTaken) && !isUniqueViolation(e)) throw e;
          }
        }
        throw invalid('could not find a free slug for this name; try again', ['name']);
      },
      ```

      `upsertOnce` already throws `required to create a school` for a missing `citySlug` or `address`. So
      `input.citySlug ?? 'city'` is only a type fallback and is never used to create.
  - `server/src/plugins/matfinder/server/src/services/discovery.ts`:
    - Replace `cityGyms` (lines 41–60) with two functions. `listFromWeb` (line 148) keeps calling
      `cityGyms(citySlug)`.

      ```ts
      type GymWithCity = ExistingGym & { citySlug: string | null };

      /** Every gym (draft versions) with its city, as duplicate-check signals. */
      async function allGyms(): Promise<GymWithCity[]> {
        const rows = await docs(strapi, SCHOOL).findMany({
          status: 'draft',
          fields: ['slug', 'name', 'location'],
          populate: { contact: true, city: { fields: ['slug'] } },
          limit: 10000,
        });
        return rows.map((r: any) => ({
          documentId: r.documentId,
          slug: r.slug,
          name: r.name,
          phone: r.contact?.phone,
          website: r.contact?.website,
          instagram: r.contact?.instagram,
          latitude: r.location?.latitude,
          longitude: r.location?.longitude,
          citySlug: r.city?.slug ?? null,
        }));
      }

      /** Every gym in a city (draft versions), as duplicate-check signals. */
      async function cityGyms(citySlug: string): Promise<ExistingGym[]> {
        return (await allGyms()).filter((g) => g.citySlug === citySlug);
      }
      ```

    - Replace `possibleDuplicates` (lines 75–80):

      ```ts
      /**
       * Same city: every signal. Other cities: phone, website, Instagram and distance only, since chains share names
       * across cities (and add_gym_from_web never overwrites, so a shared name is harmless).
       */
      async function possibleDuplicates(q: DuplicateQuery) {
        const city = await cityOrThrow(q.citySlug);
        const at = await locate(q, city.center);
        const signals = { ...q, latitude: at?.latitude, longitude: at?.longitude };
        const gyms = await allGyms();
        const sameCity = findDuplicates(signals, gyms.filter((g) => g.citySlug === q.citySlug));
        const cityOf = new Map(gyms.map((g) => [g.documentId, g.citySlug]));
        const elsewhere = findDuplicates(signals, gyms.filter((g) => g.citySlug !== q.citySlug), { names: false }).map((d) => ({
          ...d,
          reasons: [...d.reasons, `in another city (${cityOf.get(d.documentId) ?? 'none'})`],
        }));
        const candidates = [...sameCity, ...elsewhere].sort((a, b) => b.reasons.length - a.reasons.length || a.name.localeCompare(b.name));
        return { candidates, distanceChecked: !!at, at };
      }
      ```

    - Replace the body of `addGymFromWeb` from line 108 (`const sourceUrls = …`) through line 127:

      ```ts
      const sourceUrls = [...new Set(input.sourceUrls.map((u) => u.trim()))];
      const contact = Object.fromEntries(
        Object.entries({ phone: input.phone, website: input.website, instagram: input.instagram, email: input.email }).filter(([, v]) => v),
      );
      // Always a new gym (never an update of a same-named one), with its provenance in the same write.
      const created = await schools(strapi).createDraft(
        {
          name: input.name,
          citySlug: input.citySlug,
          address: input.address,
          // Geocoded once above; passing the coordinates saves createDraft a second lookup.
          ...(at ? { latitude: at.latitude, longitude: at.longitude } : {}),
          ...(input.shortDescription ? { shortDescription: input.shortDescription } : {}),
          ...(Object.keys(contact).length ? { contact } : {}),
        },
        { origin: 'web-agent', sourceUrls, discoveredAt: new Date().toISOString() },
      );
      return { documentId: created.documentId, slug: created.slug, sourceUrls };
      ```

    - Update the doc comment on lines 95–98 to: "Adds a NEW gym found on the web with its sources (never updates an
      existing one; a taken name gets a free slug such as `name-city`). Refuses a likely duplicate
      (DUPLICATE_SUSPECTED, with the candidates) unless the agent confirms it's a different gym."
  - `server/src/plugins/matfinder/server/src/domain/duplicates.ts`: `findDuplicates` (lines 106–124) gets an options argument. Replace the signature and the
    name line:

    ```ts
    /** Existing gyms that might be `candidate`, most signals first. `names: false` skips the name signal (other cities). */
    export function findDuplicates(candidate: GymSignals, existing: ExistingGym[], opts: { names?: boolean } = {}): Duplicate[] {
    ```

    and line 113 becomes:
    `if (opts.names !== false && similarNames(candidate.name, g.name)) reasons.push('similar name');`.
  - `server/src/plugins/matfinder/server/src/mcp/tools/add-gym-from-web.ts:9`: replace the description's sentence "It checks for duplicates first and returns
    DUPLICATE_SUSPECTED … confirmNotDuplicate: true." with: "It always creates a new listing and never changes an
    existing one. If the name is already taken (in any city), the slug gets the city added, e.g. gracie-barra-henderson.
    It checks for duplicates first (in this city by name, phone, website, Instagram or distance; in other cities by
    phone, website, Instagram or distance) and returns DUPLICATE_SUSPECTED with the candidates. If you're sure it's a
    different gym, call again with confirmNotDuplicate: true. To update an existing gym, use upsert_school with its
    slug."
  - `server/src/plugins/matfinder/server/src/mcp/tools/find-possible-duplicates.ts:26`: replace "Matches on a similar name in the same city, the same
    phone, website or Instagram, or being within 150 m." with "Matches on a similar name in the same city, or, in any
    city, the same phone, website or Instagram, or being within 150 m (a match in another city says so in its
    reasons)."
  - `server/src/plugins/matfinder/server/src/mcp/tools/upsert-school.ts`:
    - line 57: `run: (strapi, args) => (args.slug ? schoolService(strapi).upsertDraft(args) : schoolService(strapi).createDraft(args)),`.
    - In the description (line 8), replace "Without a slug (or with an unknown one) it creates a school, which needs
      name, citySlug and address." with "Without a slug it always creates a new school (if the name is taken, the slug
      gets the city added); with an unknown slug it creates one with that slug. Creating needs name, citySlug and
      address."
  - `server/src/plugins/matfinder/server/src/mcp/prompts/find-new-gyms.ts:18–19`: no change. The prompt already sends updates through `upsert_school` and
    new gyms through `add_gym_from_web`.
  - `server/src/plugins/matfinder/README.md:10`: "(with its `sourceUrls`; refuses likely duplicates)" becomes "(with its
    `sourceUrls`; always creates, never updates an existing gym; refuses likely duplicates)".
- **Data:** none.
  - No schema change and no new index. The existing `schools_slug_draft_uq` (`server/src/lib/indexes.ts` after the B-7 step; `server/src/index.ts:13` at the base commit) is the
    constraint `createDraft` relies on.
  - Existing gyms keep their slugs.
- **Callers updated:**
  - `findDuplicates` callers:
    - `discovery.ts` `possibleDuplicates` (above) and `listFromWeb` (line 150, unchanged: the default
      `names: true`);
    - `tests/unit/duplicates.test.ts`. Existing calls stay valid; a new test is added below.
  - `upsertDraft` callers (`upsert-school.ts`, `server/src/seed/sample.ts:324`) are unchanged. The seed always sends a
    `slug`.
  - `cityGyms` callers: `listFromWeb` (`discovery.ts:148`) only.
  - Admin *From the web* tab (`server/src/plugins/matfinder/server/src/../admin/src/components/FromWebTab.tsx`): no change. It reads `listFromWeb`, whose
    shape doesn't change.
- **Verify:**
  - Unit tests:
    - `tests/unit/slugify.test.ts`: add
      `expect(pickFreeSlug('gracie-barra', 'henderson', new Set(['gracie-barra']))).toBe('gracie-barra-henderson')`.
    - Add the `-2` case: the set also contains `gracie-barra-henderson`, and the result is
      `gracie-barra-henderson-2`.
    - Add the already-suffixed case: `pickFreeSlug('summerlin-bjj-las-vegas', 'las-vegas', new Set(['summerlin-bjj-las-vegas']))`
      → `'summerlin-bjj-las-vegas-2'`.
    - Add the free case: an empty set returns `base`.
  - `tests/unit/duplicates.test.ts`: add a test that
    `findDuplicates({ name: 'Sample Summerlin BJJ (Demo)' }, [summerlin], { names: false })` is `[]`. A second case:
    `findDuplicates({ name: 'X', phone: '702-555-0101' }, [summerlin], { names: false })[0].reasons` equals
    `['same phone']`.
  - `npm run test:unit` → passes.
  - Integration: add to `server/tests/api.test.ts`, in `describe('gyms from the web (MCP)')`:

    ```ts
    it('never overwrites: a confirmed same-name gym gets a new slug and the listed one is unchanged', async (ctx) => {
      if (!token) return ctx.skip();
      const before = await callTool(token, 'get_school_draft', { slug: 'sample-summerlin-bjj-demo' });
      const r = await callTool(token, 'add_gym_from_web', {
        citySlug: 'las-vegas',
        name: before.data.name,
        address: '3 Other Way, Las Vegas, NV',
        latitude: 36.25,
        longitude: -115.25,
        sourceUrls: ['https://example.com/other-summerlin'],
        confirmNotDuplicate: true,
      });
      expect(r.isError).toBe(false);
      expect(r.data.slug).toBe('sample-summerlin-bjj-demo-las-vegas');
      const after = await callTool(token, 'get_school_draft', { slug: 'sample-summerlin-bjj-demo' });
      expect(after.data).toMatchObject({ documentId: before.data.documentId, city: before.data.city, location: before.data.location, updatedAt: before.data.updatedAt });
    });

    it('a same-named gym in another city is created there; a shared phone across cities is flagged', async (ctx) => {
      if (!token) return ctx.skip();
      const hex = randomBytes(3).toString('hex');
      const citySlug = `it-city-${hex}`;
      const cityRes = await fetch(`${API}/content-manager/collection-types/api::city.city`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt()}` },
        body: JSON.stringify({
          name: `Integration City ${hex}`, slug: citySlug, timezone: 'America/Denver',
          center: { longitude: -105.27, latitude: 40.01, address: 'Integration City', zoom: 10.5, pitch: 0, bearing: 0 },
        }),
      });
      expect([200, 201]).toContain(cityRes.status);
      const lv = await callTool(token, 'get_school_draft', { slug: 'sample-summerlin-bjj-demo' });

      const flagged = await callTool(token, 'add_gym_from_web', {
        citySlug, name: 'Totally Different Grappling', address: '1 Pearl St', latitude: 40.02, longitude: -105.28,
        phone: lv.data.contact.phone, sourceUrls: ['https://example.com/tdg'],
      });
      expect(flagged.isError).toBe(true);
      expect(flagged.error.error).toBe('DUPLICATE_SUSPECTED');
      const c = flagged.error.candidates.find((x: { slug: string }) => x.slug === 'sample-summerlin-bjj-demo');
      expect(c.reasons).toEqual(expect.arrayContaining(['same phone', 'in another city (las-vegas)']));

      const created = await callTool(token, 'add_gym_from_web', {
        citySlug, name: lv.data.name, address: '2 Pearl St', latitude: 40.03, longitude: -105.29, sourceUrls: ['https://example.com/it-summerlin'],
      });
      expect(created.isError).toBe(false);
      expect(created.data.slug).toBe(`sample-summerlin-bjj-demo-${citySlug}`);
      const lvAfter = await callTool(token, 'get_school_draft', { slug: 'sample-summerlin-bjj-demo' });
      expect(lvAfter.data).toMatchObject({ city: { slug: 'las-vegas' }, location: lv.data.location, updatedAt: lv.data.updatedAt });
    });

    it('upsert_school without a slug creates, never updates a same-named gym', async (ctx) => {
      if (!token) return ctx.skip();
      const lv = await callTool(token, 'get_school_draft', { slug: 'sample-summerlin-bjj-demo' });
      const r = await callTool(token, 'upsert_school', { name: lv.data.name, citySlug: 'las-vegas', address: '4 Test Way', latitude: 36.2, longitude: -115.2 });
      expect(r.data).toMatchObject({ created: true });
      expect(r.data.slug).not.toBe('sample-summerlin-bjj-demo');
      expect((await callTool(token, 'get_school_draft', { slug: 'sample-summerlin-bjj-demo' })).data.updatedAt).toBe(lv.data.updatedAt);
    });
    ```

    - The `jwt()` helper already exists in that `describe` (`api.test.ts:169`).
    - The Content Manager create route and body (`POST /content-manager/collection-types/:model`, the fields as the
      body, `201`) are already used by the suite (`server/tests/api.test.ts:425–430`, for a draft-and-publish type).
      City has `draftAndPublish: false` (`city/schema.json:5`); ⚠️ not verified that the same body works for a
      non-draft type. If E8 finds a different shape, it follows the deviation protocol and doesn't improvise a seed
      change.
  - Order matters: the first new test makes `sample-summerlin-bjj-demo-las-vegas`, and the slug-less `upsert_school`
    test then gets `…-las-vegas-2`. Assert only `not.toBe`, as written, so the order doesn't break it.
  - The existing `flags a gym that is already listed` and `adds a new gym …` tests still pass unchanged.
  - Negative test: the first test above. With `confirmNotDuplicate: true` the listed gym's `updatedAt`, city and
    location don't change.
  - `npm run test:integration:isolated` → all pass.
- **Done when:** both suites pass, and no MCP write path updates a school except `upsert_school` called with that
  school's slug.
- **Rollback:**
  - Revert the commit; no data step.
  - Gyms created meanwhile with `-<city>` slugs stay valid. Their slugs are just longer.

### S6 — Don't auto-publish over a person's unpublished edits (B-3)

- **Why:** B-3.
  - `afterWriteDocument` (`server/src/plugins/matfinder/server/src/services/publishing.ts:23–33`) publishes whenever the draft differs from the live
    version.
  - When a person saved changes in the admin without publishing, the agent's next write publishes those changes along
    with its own.
  - After the agent's write the status is always `unpublished-changes`, so the check must use the status **before**
    the write.
- **Decided behaviour:**
  - Every write path reports the document's status just before it wrote, as `previousStatus` (internal, not in the
    tool output).
  - If that was `unpublished-changes`, the agent's change is saved to the draft, nothing is published, and the result
    says:
    - `status: 'unpublished-changes'`;
    - `notPublishedBecause: "The draft already had unpublished changes before this write (usually a person's edits in the admin), so nothing was published. A person reviews and publishes it in the admin."`
  - If it was `never-published` (a draft that has never gone live), the write is published **only** when the document
    is a school whose `origin` is `web-agent`: the agent's own gym that couldn't be published earlier (no location,
    say), which the agent is now fixing. Any other never-published draft (one a person made in the admin, or a
    `manual` gym `upsert_school` created that failed to publish) stays a draft, and the result says:
    - `notPublishedBecause: "This draft has never been published and wasn't added by the agent, so a person reviews and publishes it in the admin."`
  - Documents created by this write (`previousStatus` is `undefined`) and documents that were `published` behave as
    today: they're published.
  - The rule, for every state of `DraftStatus` (`server/src/plugins/matfinder/server/src/domain/status.ts`):

    | `previousStatus` | Publish? |
    |---|---|
    | `undefined` (created by this write) | yes |
    | `published` | yes |
    | `unpublished-changes` | no, `EARLIER_CHANGES` |
    | `never-published`, school with `origin: 'web-agent'` | yes |
    | `never-published`, anything else | no, `NEVER_PUBLISHED` |

  - With `autoPublish` off, nothing changes (nothing publishes anyway).
- **Files:**
  - `server/src/plugins/matfinder/server/src/services/publishing.ts`:

    ```ts
    /** The reason given when a write lands on a draft that already had unpublished changes. */
    export const EARLIER_CHANGES =
      "The draft already had unpublished changes before this write (usually a person's edits in the admin), so nothing was published. A person reviews and publishes it in the admin.";
    /** The reason given when a write lands on a never-published draft the agent didn't add. */
    export const NEVER_PUBLISHED =
      "This draft has never been published and wasn't added by the agent, so a person reviews and publishes it in the admin.";
    const SCHOOL_UID = 'api::school.school';
    ```

    Add that after the `AfterWrite` type (line 7). Then change `afterWriteDocument` (lines 23–33) to take
    `previousStatus`:

    ```ts
    /**
     * Publishes a document's draft when it differs from the live version, and reports where it stands. Not when the
     * draft already had unpublished changes before this write (`previousStatus`): those are someone else's, so they
     * stay a draft for a person to review.
     */
    async function afterWriteDocument(uid: string, documentId: string, previousStatus?: DraftStatus): Promise<AfterWrite> {
      const status = await statusOf(uid, documentId);
      if (status === 'published' || !autoPublish()) return { status };
      if (previousStatus === 'unpublished-changes') return { status, notPublishedBecause: EARLIER_CHANGES };
      if (previousStatus === 'never-published' && !(await addedByAgent(uid, documentId))) {
        return { status, notPublishedBecause: NEVER_PUBLISHED };
      }
      try {
        await docs(strapi, uid).publish({ documentId });
      } catch (e) {
        if ((e as { name?: string })?.name !== 'ValidationError') throw e;
        return { status, notPublishedBecause: (e as Error).message };
      }
      return { status: await statusOf(uid, documentId) };
    }
    ```

    Add this helper next to `statusOf` (inside the factory, after line 18):

    ```ts
    /** True for a school the agent added (origin web-agent). Only schools have an origin. */
    async function addedByAgent(uid: string, documentId: string): Promise<boolean> {
      if (uid !== SCHOOL_UID) return false;
      const draft = await docs(strapi, uid).findOne({ documentId, status: 'draft', fields: ['origin'] });
      return draft?.origin === 'web-agent';
    }
    ```

    `afterWrite` (lines 42–46) becomes:

    ```ts
    async afterWrite(uid: string, slug: string, previousStatus?: DraftStatus): Promise<AfterWrite> {
      const draft = await docs(strapi, uid).findFirst({ status: 'draft', filters: { slug }, fields: ['slug'] });
      if (!draft) throw new Error(`[matfinder] no ${uid} draft with slug ${slug} after a write`);
      return afterWriteDocument(uid, draft.documentId, previousStatus);
    },
    ```

    Also export `statusOf` from the returned object: add `statusOf,` next to `autoPublish,` on line 36. Update the
    comment on lines 9–12 to add: "…except over a draft that already had unpublished changes before the write."
  - `server/src/plugins/matfinder/server/src/mcp/index.ts:70–72`:

    ```ts
    // previousStatus is internal (where the document stood before this write); it isn't part of any tool's output.
    const { previousStatus, ...data } = await t.run(s, args ?? {});
    const live = t.publishes
      ? await s.plugin('matfinder').service('publishing').afterWrite(t.publishes, data.slug as string, previousStatus as DraftStatus | undefined)
      : {};
    return guard({ ...data, ...live }, t.shrinkHint);
    ```

    Add `import type { DraftStatus } from '../domain/status';` at the top.
  - `server/src/api/school/services/school.ts`:
    - `UpsertSchoolResult` (line 77) becomes
      `{ documentId: string; slug: string; created: boolean; changedFields: string[]; status: DraftStatus; previousStatus?: DraftStatus }`.
    - In `upsertOnce`, before the write (just before `const doc = existing`, line 225), add:
      `const previousStatus = existing ? await statusOf(strapi, SCHOOL, existing.documentId) : undefined;`.
      Add `previousStatus,` to the returned object (lines 230–236).
    - In `setScheduleDraft` (lines 429–435), after `const school = await bySlugOrThrow(...)`, add
      `const previousStatus = await statusOf(strapi, SCHOOL, school.documentId);`. The return becomes
      `return { slug, sessionCount: rows.length, byDay, previousStatus };`.
  - `server/src/lib/upsert.ts` (`upsertScalarDraft`, instructors and affiliations):
    - `UpsertResult` (line 7) gets `previousStatus?: DraftStatus`.
    - In `once`, before `const doc = existing` (line 54), add
      `const previousStatus = existing ? await statusOf(strapi, opts.uid, existing.documentId) : undefined;`.
    - The return on line 59 adds `previousStatus`.
  - `server/src/plugins/matfinder/server/src/services/knowledge.ts` (`upsert`, lines 27–60). It publishes itself, not through the MCP handler:
    - after `existing` is found (after line 45), add:

      ```ts
      const publishing = strapi.plugin('matfinder').service('publishing');
      const previousStatus = existing ? await publishing.statusOf(KNOWLEDGE_UID, existing.documentId) : undefined;
      ```

    - line 58 becomes
      `const live = (await publishing.afterWriteDocument(KNOWLEDGE_UID, saved.documentId, previousStatus)) as AfterWrite;`.

      The B-6 step (S7) restructures this function. Apply both. The final version is given in that step.
  - `server/src/plugins/matfinder/README.md:12–14` ("Agent writes go live"): add "…except when the draft already had
    unpublished changes before the write (a person's edits in the admin): then nothing is published, and
    `notPublishedBecause` says so."
  - Tool descriptions: `upsert-school.ts:8` and `add-gym-from-web.ts:9` already say "notPublishedBecause says why if it
    isn't". That stays true, so no change.
- **Data:** none.
- **Callers updated:**
  - `afterWrite` and `afterWriteDocument`: `server/src/plugins/matfinder/server/src/mcp/index.ts:71` and `server/src/plugins/matfinder/server/src/services/knowledge.ts:58`. The new parameter is
    optional, so `tests/unit/publishing.test.ts` still compiles.
  - `upsertDraft` result consumers:
    - `server/src/seed/sample.ts:316–324`. `publishIfNeeded` ignores the extra field; the seed publishes on its own.
    - `discovery.ts` (`createDraft`), which uses only `documentId` and `slug`.
  - Output schemas (`upsertOutput`, set_school_schedule's, add_gym_from_web's) are unchanged, because the handler
    strips `previousStatus`.
- **Verify:**
  - `tests/unit/publishing.test.ts`: add

    ```ts
    it("leaves a draft that already had unpublished changes for a person to review", async () => {
      const older = { ...draft, updatedAt: '2026-10-14T00:00:00.000Z' };
      const { service, state } = fakeStrapi({ draft, published: older });
      expect(await service.afterWrite(UID, 'agent-gym', 'unpublished-changes')).toEqual({ status: 'unpublished-changes', notPublishedBecause: EARLIER_CHANGES });
      expect(state.publishCalls).toBe(0);
      const live = fakeStrapi({ draft, published: older });
      expect(await live.service.afterWrite(UID, 'agent-gym', 'published')).toEqual({ status: 'published' });
      expect(live.state.publishCalls).toBe(1);
    });

    it('publishes a never-published draft only when the agent added it', async () => {
      const manual = fakeStrapi({ draft: { ...draft, origin: 'manual' } });
      expect(await manual.service.afterWrite(UID, 'agent-gym', 'never-published')).toEqual({ status: 'never-published', notPublishedBecause: NEVER_PUBLISHED });
      expect(manual.state.publishCalls).toBe(0);
      const agent = fakeStrapi({ draft: { ...draft, origin: 'web-agent' } });
      await agent.service.afterWrite(UID, 'agent-gym', 'never-published');
      expect(agent.state.publishCalls).toBe(1);
      const created = fakeStrapi({ draft });
      await created.service.afterWrite(UID, 'agent-gym', undefined);
      expect(created.state.publishCalls).toBe(1);
    });
    ```

    In the same file:
    - line 5: `type Row = { documentId: string; slug: string; updatedAt: string; origin?: string };` (the fake's
      `findOne` returns the whole draft row, so `origin` reaches `addedByAgent`);
    - line 2: `import publishing, { EARLIER_CHANGES, NEVER_PUBLISHED } from '../../src/plugins/matfinder/server/src/services/publishing';`.
    `UID` is already `'api::school.school'` (line 25).
  - Integration: add to `describe('MCP (curator tools)')` in `server/tests/api.test.ts`:

    ```ts
    it("doesn't publish over a person's unpublished edits", async (ctx) => {
      if (!token) return ctx.skip();
      const jwt = inject('adminJwt');
      const r = await callTool(token, 'upsert_school', {
        name: `Integration Person Edit ${randomBytes(3).toString('hex')} (Demo)`,
        citySlug: 'las-vegas', address: '5 Test Way, Las Vegas, NV', latitude: 36.19, longitude: -115.16,
      });
      expect(r.data.status).toBe('published');
      // A person saves a draft change in the admin without publishing.
      const save = await fetch(`${API}/content-manager/collection-types/api::school.school/${r.data.documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ neighborhood: 'Edited by a person' }),
      });
      expect(save.status).toBe(200);
      const u = await callTool(token, 'upsert_school', { slug: r.data.slug, pricing: { visitorsWelcome: true } });
      expect(u.data).toMatchObject({ status: 'unpublished-changes' });
      expect(u.data.notPublishedBecause).toMatch(/unpublished changes before this write/);
      const dir = (await (await get('/api/schools/directory?city=las-vegas')).json()).data.schools;
      expect(dir.find((s: { slug: string }) => s.slug === r.data.slug)).toMatchObject({ visitorsWelcome: null });
    });
    ```

    ⚠️ not verified: the 5.58 Content Manager draft-save route and body (`PUT
    /content-manager/collection-types/:model/:documentId`, fields as the body). E8 confirms it against the installed
    `@strapi/content-manager` routes before relying on it.
  - The existing `upsert_school publishes the gym straight to the directory, and its updates too` test still passes.
    That's the positive case: a live gym with no person's edits gets published.
  - Negative test: the new integration test. The directory still shows the old `visitorsWelcome: null`.
  - `npm run test:unit` and `npm run test:integration:isolated` → pass.
- **Done when:** both suites pass, and an MCP write never publishes a draft that was `unpublished-changes` before the
  write, or a never-published draft the agent didn't add.
- **Rollback:** revert the commit; no data step.

### S7 — One knowledge entry per gym and question, enforced by the database (B-6)

- **Why:** B-6.
  - `knowledge.upsert` (`server/src/plugins/matfinder/server/src/services/knowledge.ts:34–57`) finds an entry by gym plus case-insensitive question, then
    creates it if missing.
  - There's no transaction and no index, so two parallel `upsert_knowledge` calls create two entries, and the chat
    reads both.
  - The gym is a `manyToOne` relation (`server/src/plugins/matfinder/server/src/content-types/knowledge/schema.json`), stored in a join table. An index can't
    span the question column and the join table, so the key has to be one column on `matfinder_knowledge`.
- **Decided design:**
  - A new private attribute `dedupeKey`: `<school documentId or *>|<question, trimmed, NFKC, lowercase>`.
  - A unique index on draft rows: `published_at IS NULL`. Each document has exactly one draft row, and its published
    copy carries the same key.
  - The service writes the key on every write.
  - Rows without a key (seeded, created in the admin, or written before this change) have `NULL`, which never
    collides on SQLite or Postgres. They're still found by the old question-and-gym match, and get their key on the
    next agent write.
  - On a unique violation (a parallel create won), the service refetches by key and updates that entry.
- **Files:**
  - `server/src/plugins/matfinder/server/src/content-types/knowledge/schema.json`: add to `attributes`, after `sourceUrls`:

    ```json
    "dedupeKey": { "type": "text", "private": true }
    ```

    and, after `"options"` (line 10), hide it from the Content Manager the way the School schema hides `latitude`
    (`server/src/api/school/content-types/school/schema.json:12–21`, proven by the test at
    `server/tests/api.test.ts:597–607`):

    ```json
    "config": { "attributes": { "dedupeKey": { "hidden": true } } },
    ```

    `text`, not `string`: a 200-character question plus a documentId can pass 255 characters after normalising, which
    would overflow a Postgres `varchar(255)`. If an admin still edits a question, the next agent write finds the row by
    gym and question and re-keys it (below).
  - `server/src/plugins/matfinder/server/src/domain/knowledge.ts`: add after `KNOWLEDGE_CATEGORIES` (line 4):

    ```ts
    /** One entry per gym (or `*`, every gym) and question, matched case-insensitively: the unique draft key. */
    export const knowledgeKey = (schoolDocumentId: string | null, question: string) =>
      `${schoolDocumentId ?? '*'}|${question.trim().normalize('NFKC').toLowerCase()}`;
    ```

  - `server/src/plugins/matfinder/server/src/domain/errors.ts`: no change. `isUniqueViolation` was added there in the B-5 step (see *Shared edits*).

  - `server/src/plugins/matfinder/server/src/services/knowledge.ts`: replace `upsert` (lines 27–60) entirely. This includes the B-3 step's `previousStatus`.

    ```ts
    async upsert(input: KnowledgeInput): Promise<KnowledgeResult> {
      let school: { documentId: string } | null = null;
      if (input.schoolSlug) {
        school = await docs(strapi, 'api::school.school').findFirst({ status: 'draft', filters: { slug: input.schoolSlug }, fields: ['slug'] });
        if (!school) throw new ToolError('NOT_FOUND', `No gym with slug ${input.schoolSlug}. Find it with find_schools.`, { schoolSlug: input.schoolSlug });
      }

      const question = input.question.trim();
      const key = knowledgeKey(school?.documentId ?? null, question);
      const entries = docs(strapi, KNOWLEDGE_UID);
      const byKey = () => entries.findFirst({ status: 'draft', filters: { dedupeKey: key }, fields: ['question'] });

      let existing: { documentId: string; question: string } | null = null;
      if (input.id) {
        existing = await entries.findOne({ documentId: input.id, status: 'draft', fields: ['question'] });
        if (!existing) throw new ToolError('NOT_FOUND', `No knowledge entry with id ${input.id}.`, { id: input.id });
      } else {
        existing =
          (await byKey()) ??
          // The same gym and question, whatever its key: entries without a key yet (seeded, made in the admin, older),
          // and entries whose question an admin renamed after the key was written. Saving below re-keys the row.
          (await entries.findFirst({
            status: 'draft',
            filters: { question: { $eqi: question }, school: school ? { documentId: school.documentId } : { id: { $null: true } } },
            fields: ['question'],
          }));
      }

      const data = {
        question,
        answer: input.answer.trim(),
        category: input.category,
        school: school ? { set: [school.documentId] } : { set: [] },
        source: input.source,
        sourceUrls: input.sourceUrls?.length ? input.sourceUrls : null,
        dedupeKey: key,
      };
      const save = (target: { documentId: string } | null) =>
        target ? entries.update({ documentId: target.documentId, status: 'draft', data }) : entries.create({ data });

      const publishing = strapi.plugin('matfinder').service('publishing');
      let target = existing;
      let previousStatus: DraftStatus | undefined = target ? await publishing.statusOf(KNOWLEDGE_UID, target.documentId) : undefined;
      let saved;
      try {
        saved = await save(target);
      } catch (e) {
        if (!isUniqueViolation(e)) throw e;
        // Another entry holds this key: a parallel create won (update it), or an admin renamed that entry's question
        // after the key was written (a stale key: release it, then retry the same write).
        const holder = await byKey();
        if (!holder) throw e;
        if (holder.question.trim().normalize('NFKC').toLowerCase() === question.normalize('NFKC').toLowerCase()) {
          target = holder;
          previousStatus = await publishing.statusOf(KNOWLEDGE_UID, holder.documentId);
        } else {
          await strapi.db.query(KNOWLEDGE_UID as any).updateMany({ where: { documentId: holder.documentId, publishedAt: { $null: true } }, data: { dedupeKey: null } });
        }
        saved = await save(target);
      }
      const live = (await publishing.afterWriteDocument(KNOWLEDGE_UID, saved.documentId, previousStatus)) as AfterWrite;
      return { id: saved.documentId, created: !target, schoolSlug: input.schoolSlug, question, ...live };
    },
    ```

    - Imports at the top:
      - `import { knowledgeKey, type KNOWLEDGE_CATEGORIES } from '../domain/knowledge';` (replaces line 2);
      - `import { isUniqueViolation, ToolError } from '../domain/errors';` (replaces line 3);
      - `import type { DraftStatus } from '../domain/status';`.
    - ⚠️ not verified whether `strapi.db.query(...).updateMany` changes `updated_at`. Either way the stale-key release
      is correct; at worst the admin's entry shows "unpublished changes".
  - `server/src/lib/indexes.ts` (created in the B-7 step): add to the `indexes` array, after the B-5 claim entries:

    ```ts
      // One knowledge entry per gym and question (the plugin's knowledgeKey); NULL keys (admin-made, older rows) never collide.
      { unique: true, sql: `CREATE UNIQUE INDEX IF NOT EXISTS matfinder_knowledge_dedupe_draft_uq ON ${t('matfinder_knowledge')} (dedupe_key) WHERE published_at IS NULL` },
    ```

    ⚠️ not verified that Strapi 5.58 names the column `dedupe_key`. Strapi snake-cases attribute names for columns,
    and this file already relies on `published_at`. E8 checks it with `PRAGMA table_info(matfinder_knowledge)` before
    committing.
- **Data:**
  - Strapi's schema sync adds the nullable column at boot, before `bootstrap()` creates the index.
  - Existing rows get `NULL`. No backfill is needed: the service's fallback lookup finds them.
  - The index can't fail on existing duplicates, because they all have `NULL` keys.
  - Duplicates that already exist aren't merged. ⚠️ not verified whether production has any. A person can delete the
    extra one in the Content Manager. The admin's knowledge list, sorted by question, shows them side by side.
- **Callers updated:**
  - `server/src/plugins/matfinder/server/src/mcp/tools/upsert-knowledge.ts`: no change. Its input and output are the same, and the description's "asking
    twice doesn't duplicate it" is now true under concurrency.
  - `server/src/seed/sample.ts:290–300`: unchanged. It writes without a key, so its rows have `NULL`.
  - The gym chat's knowledge reader, `server/src/plugins/matfinder/server/src/services/gym-chat.ts`: reads published entries by gym. `dedupeKey` is private
    and not read. No change.
- **Verify:**
  - `tests/unit/` gets a new `knowledge-key.test.ts`, or add to `gym-chat.test.ts`, which already imports
    `domain/knowledge`:
    - `knowledgeKey('doc1', '  Is there Parking? ')` → `'doc1|is there parking?'`;
    - `knowledgeKey(null, 'X')` → `'*|x'`.
  - Integration: add to `describe('gym chat (scripted model)')` in `server/tests/api.test.ts`, after the test `an agent
    adds knowledge with upsert_knowledge…` (lines 468–495). It makes its own token, the same way that test does (lines
    470–476):

    ```ts
    it('parallel upserts of the same question make one entry', async (ctx) => {
      if (!jwt()) return ctx.skip();
      const tokenRes = await fetch(`${API}/admin/admin-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt()}` },
        body: JSON.stringify({ name: `it-knowledge-race-${randomBytes(3).toString('hex')}`, lifespan: null, adminPermissions: [{ action: 'plugin::matfinder.mcp.upsert-knowledge' }] }),
      });
      expect(tokenRes.status).toBe(201);
      const tokenKnowledge = (await tokenRes.json()).data.accessKey;
      const q = `Is there parking ${randomBytes(3).toString('hex')}?`;
      const args = { schoolSlug: 'sample-summerlin-bjj-demo', question: q, answer: 'Yes, in the back.', category: 'facilities', sourceUrls: ['https://example.com/p'] };
      const results = await Promise.all(
        [q, q, q.toUpperCase(), q].map((question) => callTool(tokenKnowledge, 'upsert_knowledge', { ...args, question })),
      );
      expect(results.every((r) => !r.isError)).toBe(true);
      expect(new Set(results.map((r) => r.data.id)).size).toBe(1);
      expect(results.filter((r) => r.data.created).length).toBe(1);
    });
    ```

    - Negative test: the third call sends the question in upper case and still gets the same id. The existing test on
      line 487 already covers the case-insensitive match, one call at a time.
    - The Content Manager hides the key. Same pattern as `api.test.ts:597–607`:

      ```ts
      it('hides dedupeKey from the Content Manager', async (ctx) => {
        if (!jwt()) return ctx.skip();
        const res = await fetch(`${API}/content-manager/content-types/plugin::matfinder.knowledge/configuration`, { headers: { Authorization: `Bearer ${jwt()}` } });
        expect(res.status).toBe(200);
        const layouts = JSON.stringify((await res.json()).data.contentType.layouts);
        expect(layouts).toContain('"question"');
        expect(layouts).not.toContain('"dedupeKey"');
      });
      ```

    - An admin rename doesn't make a duplicate. In the same block, using the Content Manager routes the file already
      uses (create at `api.test.ts:425`; update is `PUT` on the same path plus `/:documentId`):

      ```ts
      it('re-keys an entry an admin renamed instead of duplicating it', async (ctx) => {
        if (!jwt()) return ctx.skip();
        const tokenRes = await fetch(`${API}/admin/admin-tokens`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt()}` },
          body: JSON.stringify({ name: `it-knowledge-rename-${randomBytes(3).toString('hex')}`, lifespan: null, adminPermissions: [{ action: 'plugin::matfinder.mcp.upsert-knowledge' }] }),
        });
        const t = (await tokenRes.json()).data.accessKey;
        const tag = randomBytes(3).toString('hex');
        const base = { schoolSlug: 'sample-summerlin-bjj-demo', answer: 'Yes.', category: 'facilities', sourceUrls: ['https://example.com/p'] };
        const first = await callTool(t, 'upsert_knowledge', { ...base, question: `Showers ${tag}?` });
        const renamed = await fetch(`${API}/content-manager/collection-types/plugin::matfinder.knowledge/${first.data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt()}` },
          body: JSON.stringify({ question: `Changing rooms ${tag}?` }),
        });
        expect(renamed.status).toBe(200);
        const again = await callTool(t, 'upsert_knowledge', { ...base, question: `Changing rooms ${tag}?` });
        expect(again.data).toMatchObject({ id: first.data.id, created: false });
      });
      ```

      ⚠️ the Content Manager update route (`PUT …/:documentId`) is the same one S6 uses; E8 confirms it once for both.
  - Index present: after `scripts/test-server.sh start`, run
    `sqlite3 -json .tmp/test.db "SELECT name FROM sqlite_master WHERE type='index' AND name='matfinder_knowledge_dedupe_draft_uq'"`.
    It should return one row, checked with `node -e` (`JSON.parse(...).length === 1`).
  - SQLite serialises writes, so on SQLite the parallel test may pass even without the index. It proves no regression
    there, not the Postgres race. ⚠️ the Postgres race can't be run locally (no local Postgres). The index plus the
    catch-and-refetch is the same pattern `schools_slug_draft_uq` and `upsertDraft` already use.
- **Done when:**
  - the index exists on the test database;
  - four parallel `upsert_knowledge` calls with the same gym and question return one id;
  - a renamed entry is updated, not duplicated, and `dedupeKey` is hidden in the Content Manager;
  - both suites pass.
- **Rollback:**
  - Revert the commit.
  - The index stays until someone drops it: `DROP INDEX IF EXISTS matfinder_knowledge_dedupe_draft_uq`. With the
    attribute removed, Strapi's schema sync drops the `dedupe_key` column at boot.
  - ⚠️ not verified whether the sync drops a column that an index depends on, or fails. Drop the index first, in a
    one-off step the owner runs.

### S8 — Close the unused public cities endpoint (B-2)

- **Why:** B-2. `api::city.city.find` is granted to Public and Authenticated (`server/src/lib/permissions.ts:13, 17`),
  so `GET /api/cities` is open, with client-controlled `populate`. Whether that can reach gated gym fields
  (`contact`, drafts) is unverified, and no client calls the endpoint (searched `mobile/`, `server/src`; only the
  integration test at `server/tests/api.test.ts:74–76` does). Closing it removes the question.
- **Files:**
  - `server/src/lib/permissions.ts`:
    - Lines 13 and 17: remove `'api::city.city.find'` from both lists. Line 13 becomes
      `public: ['api::school.school.directory', 'api::school.school.nearby'],` and line 17 is deleted.
    - Lines 7–11 (the comment above `GRANTS`): add a sentence at the end:
      `No city action either: the app reads cities through the directory payload, and core find with populate could reach gym fields (B-2).`
    - After `seedPermissions` (after line 45), add:

      ```ts
      /**
       * Grants this app must not have. Removed on every boot, including ones made by hand in the admin, because
       * seedPermissions only ever adds (B-2).
       */
      export const REVOKED: Record<'public' | 'authenticated', string[]> = {
        public: ['api::city.city.find'],
        authenticated: ['api::city.city.find'],
      };

      export async function revokePermissions(strapi: Core.Strapi) {
        for (const [type, actions] of Object.entries(REVOKED)) {
          const role = await roles(strapi).findFirst({ filters: { type } } as any);
          if (!role) continue;
          for (const action of actions) {
            const rows = await permissions(strapi).findMany({ filters: { action, role: { id: role.id } } } as any);
            for (const row of rows) {
              await permissions(strapi).delete({ documentId: row.documentId } as any);
              strapi.log.info(`[matfinder] revoked ${action} from the ${type} role`);
            }
          }
        }
      }
      ```

  - `server/src/index.ts` — import `revokePermissions` alongside `seedPermissions`, and call it right after
    `await seedPermissions(strapi);`:

    ```ts
    import { backfillUserRoles, revokePermissions, seedPermissions } from './lib/permissions';
    // …
        await seedPermissions(strapi);
        await revokePermissions(strapi);
    ```

    The api-permissions plugin reads a role's permissions from the database on every request
    (`@strapi-community/plugin-api-permissions` 1.0.0-alpha.5, `dist/server/index.js:325–372`), so the revoke takes
    effect without a restart or cache flush.
  - `server/tests/api.test.ts` — replace lines 74–76 (`it('serves cities publicly (core find)', …)`) with:

    ```ts
      it('serves cities to no one, with or without populate (B-2)', async () => {
        const cookie = await signUp();
        for (const path of [
          '/api/cities',
          '/api/cities?populate=schools',
          '/api/cities?populate=*',
          '/api/cities?populate[schools][populate]=contact',
          '/api/cities?populate[schools][fields][0]=name&status=draft',
        ]) {
          expect((await get(path)).status).toBe(403);
          expect((await get(path, cookie)).status).toBe(403);
        }
      });
    ```

    Signed out is 403, not 401: the Public role still has other grants, so the plugin authenticates the request and
    then forbids the action (`dist/server/index.js:374–392`).
  - `server/tests/unit/permissions.test.ts` — new file, for the revoke on an existing database (the test server
    starts from an empty one, where the grant never exists):

    ```ts
    import { describe, expect, it, vi } from 'vitest';
    import { GRANTS, revokePermissions } from '../../src/lib/permissions';

    describe('permissions (B-2)', () => {
      it('grants no city action', () => {
        expect([...GRANTS.public, ...GRANTS.authenticated].some((a) => a.startsWith('api::city.'))).toBe(false);
      });

      it('deletes an existing city.find grant on both roles and nothing else', async () => {
        const roles = [{ id: 1, documentId: 'r-pub', type: 'public' }, { id: 2, documentId: 'r-auth', type: 'authenticated' }];
        const rows = [
          { documentId: 'p1', action: 'api::city.city.find', roleId: 1 },
          { documentId: 'p2', action: 'api::city.city.find', roleId: 2 },
          { documentId: 'p3', action: 'api::school.school.directory', roleId: 1 },
        ];
        const deleted: string[] = [];
        const strapi: any = {
          log: { info: vi.fn(), error: vi.fn() },
          documents: (uid: string) =>
            uid === 'plugin::api-permissions.role'
              ? { findFirst: async ({ filters }: any) => roles.find((r) => r.type === filters.type) ?? null }
              : {
                  findMany: async ({ filters }: any) => rows.filter((p) => p.action === filters.action && p.roleId === filters.role.id),
                  delete: async ({ documentId }: any) => void deleted.push(documentId),
                },
        };
        await revokePermissions(strapi);
        expect(deleted.sort()).toEqual(['p1', 'p2']);
      });
    });
    ```

- **Data:** on the first boot after deploy, the two `api::city.city.find` rows in `api_permissions_permissions` (and
  their role links) are deleted. Nothing else changes. No backup needed: the rows carry no data beyond the action
  name, and reverting the commit re-creates them (`seedPermissions` adds missing grants on boot).
- **Callers updated:** none in the app (no client calls `/api/cities`). Docs: `docs/architecture.md:172`, the
  routes table row "`GET /api/cities` | Everyone | Core find.", becomes
  "`GET /api/cities` | Nobody (closed, B-2) | Core find, not granted to any role.". `server/tests/api.test.ts:74–76` is replaced
  above. The historical plan files under `docs/plan/` still list the grant; they aren't changed (they record the
  plan, and 05 is updated at E9).
- **Verify:**
  - `cd server && npx vitest run tests/unit/permissions.test.ts` → 2 passed.
  - `cd server && npm run test:integration:isolated` → all pass, including the five 403 pairs.
  - `curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:1342/api/cities?populate=*'` → `403` (while the test
    server runs).
  - Negative test: the integration test above (signed out and signed in, plain and populated).
  - Regression: `curl -s 'http://localhost:1342/api/schools/directory?city=las-vegas' | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8")).data;console.log(d.city.slug, d.schools.length>0)'`
    → `las-vegas true` (the app's real city source still works).
- **Done when:** every `/api/cities` variant returns 403 signed out and signed in, and the directory still returns
  the city.
- **Rollback:** revert the commit; the next boot re-adds the grant.

### S9 — Prove the curator token sees only MatFinder tools, and document the token scope (B-4)

- **Why:** B-4.
  - In Strapi 5.58, a token with Content Manager permissions also sees the built-in tools (delete, unpublish, discard
    draft, and Media Library deletes).
  - The app's safety claim ("no tool deletes") holds only for a token restricted to `plugin::matfinder.mcp.*`.
  - `server/tests/api.test.ts:122–126` already checks that such a token lists exactly the 11 tools. What's missing:
    - a contrast test showing that a content permission adds built-in tools, so the risk stays visible if Strapi
      changes;
    - an explicit check for delete-style names;
    - the documented rule and how to rotate the token.
  - The production token's actual permissions are an owner question (ESCALATE, see Open questions). Nothing here
    touches production.
- **Files:**
  - `server/tests/api.test.ts`, in `describe('MCP (curator tools)')`. Leave the exact-list test on lines 122–126 as it
    is, and add after it:

    ```ts
    it('the curator token lists no built-in content tools (delete, unpublish, discard, media)', async (ctx) => {
      if (!token) return ctx.skip();
      const { body } = await mcp(token, 'tools/list');
      const names: string[] = body.result.tools.map((t: { name: string }) => t.name);
      expect(names.filter((n) => /^(create|update|delete|publish|unpublish|discard)_|media|upload/i.test(n))).toEqual([]);
    });

    it('a token that also holds a Content Manager permission sees extra built-in tools (why the curator token must not)', async (ctx) => {
      const jwt = inject('adminJwt');
      if (!jwt) return ctx.skip();
      const res = await fetch(`${API}/admin/admin-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({
          name: `it-wide-${randomBytes(3).toString('hex')}`,
          lifespan: null,
          adminPermissions: [
            ...TOOLS.map((t) => ({ action: `plugin::matfinder.mcp.${t.replace(/_/g, '-')}` })),
            { action: 'plugin::content-manager.explorer.delete', subject: 'api::school.school' },
          ],
        }),
      });
      expect(res.status).toBe(201);
      const wide = (await res.json()).data.accessKey;
      const { body } = await mcp(wide, 'tools/list');
      const extra = body.result.tools.map((t: { name: string }) => t.name).filter((n: string) => !TOOLS.includes(n));
      expect(extra.length).toBeGreaterThan(0);
    });
    ```

    - ⚠️ not verified:
      - the built-in tool names in 5.58 (`node_modules` isn't installed);
      - whether `adminPermissions` accepts `{ action, subject }` for a content-type action in the admin-tokens API.
    - The contrast test is written to need neither the names nor the exact count.
    - If E8 finds the contrast test can't be set up as written (for example, the subject shape differs), it follows
      the deviation protocol and asks. It doesn't drop the test silently.
  - `server/src/plugins/matfinder/README.md`: after the "MCP tools." bullet (line 11), add a bullet:

    ```md
    - **The curator token holds only MatFinder actions.** Grant only `plugin::matfinder.mcp.*` (Settings → Admin Tokens →
      Plugins → MatFinder) and no Content Manager or Media Library permission. With any of those, Strapi's own MCP tools
      appear for that token too, including delete, unpublish, discard-draft and media-delete tools, and Strapi deletions
      are permanent. `tests/api.test.ts` checks both: the MatFinder-only token lists exactly the 11 tools, and a token
      with one Content Manager permission lists more. **Rotating it:** create a new admin token with the same MatFinder
      actions, put it in the Claude client's MCP config, check `tools/list`, then delete the old token.
    ```

  - Change the last sentence of the "Agent writes go live" bullet (line 14), "No tool unpublishes or deletes.", to:
    "No MatFinder tool unpublishes or deletes (Strapi's built-in tools can, for a token with content permissions; see
    below)."
  - `server/src/plugins/matfinder/server/src/mcp/index.ts:17–19`: change the comment "No tool unpublishes, deletes or uploads media." to "No MatFinder tool
    unpublishes, deletes or uploads media. A token with Content Manager permissions also gets Strapi's built-in tools,
    which can (see the plugin README)."
  - 03 and 05 in the run folder: already *doc fixed* at checkpoint B. E9 adds the token rule to 05 › MCP › Limits. No
    app file change.
- **Data:** none.
- **Callers updated:** none. Tests and docs only.
- **Verify:**
  - `npm run test:integration:isolated` → the two new tests pass alongside the existing exact-list test.
  - Negative test: the first new test. The curator token's list has no create, update, delete, publish, unpublish,
    discard, media or upload names.
- **Done when:** both new tests pass, and the README states the token rule and the rotation steps.
- **Rollback:** revert the commit.

### S10 — Pin the prerelease auth packages, and mark claim emails unverified (B-10)

- **Why:** B-10. The three prerelease plugins are on caret ranges (`server/package.json:31–33`), so a fresh
  `npm install` without the lockfile, or a lockfile refresh, can pull a new beta/alpha. And claims carry the account
  email, which nothing verifies (`server/src/lib/auth.ts`: no email verification), while the admin shows it as
  identity (`admin/src/components/ClaimsTab.tsx:145–147`).
- **Files:**
  - `server/package.json` — lines 31–33 become (the versions are what `server/package-lock.json` resolves today):

    ```json
        "@strapi-community/plugin-api-permissions": "1.0.0-alpha.5",
        "@strapi-community/plugin-better-auth": "1.0.0-beta.7",
        "@strapi-community/plugin-better-auth-dashboard": "1.0.0-beta.1",
    ```

  - `server/package-lock.json` — regenerated with `cd server && npm install --package-lock-only --ignore-scripts`.
    Only the root entry's three specifiers change; no resolved version changes.
  - `server/src/plugins/matfinder/admin/src/components/ClaimsTab.tsx` — replace lines 145–147 with:

    ```tsx
                          <Typography
                            variant="pi"
                            textColor="neutral600"
                            ellipsis
                            title={`${c.email}: not verified. Anyone can sign up with any address, so confirm who they are by phone.`}
                          >
                            {c.email} (unverified)
                          </Typography>
    ```

  - `server/src/plugins/matfinder/admin/src/claims.ts` — line 50, the `contacted` hint, becomes:

    ```ts
        hint: "You reached the owner and are confirming who they are. The account email isn't verified, so confirm by phone. Note how (call, email) and what you agreed.",
    ```

- **Data:** none.
- **Callers updated:** none. `ClaimDialog.tsx` and `ClaimsWidget.tsx` don't show the email (searched
  `admin/src`). The app never shows claim emails.
- **Verify:**
  - `cd server && node -e 'const p=require("./package.json").dependencies,l=require("./package-lock.json").packages;for(const n of ["@strapi-community/plugin-api-permissions","@strapi-community/plugin-better-auth","@strapi-community/plugin-better-auth-dashboard"]){const ok=p[n]===l["node_modules/"+n].version&&l[""].dependencies[n]===p[n];console.log(n,p[n],ok)}'`
    → three lines ending in `true`.
  - `cd server && git diff --stat package-lock.json` → only a handful of lines changed (the root specifiers);
    `git diff package-lock.json | grep '"version"'` → no output.
  - `cd server && npm run build:plugin` → exit 0; then `grep -rl "(unverified)" src/plugins/matfinder/dist/admin` →
    at least one file.
  - Optional, for the owner: the visual check. Start the throwaway server with `scripts/test-server.sh start`, sign in
    at `http://localhost:1342/admin` with the admin `tests/global-setup.ts` registers, open MatFinder → Claims → All
    claims, and see `<email> (unverified)`; then `scripts/test-server.sh stop`. It isn't part of "Done when": the
    built-bundle check above already proves the label ships.
- **Done when:** the pin check prints three lines ending in `true`, `git diff package-lock.json | grep '"version"'`
  prints nothing, and the built admin bundle contains "(unverified)".
- **Rollback:** revert the commit (both files).

### S11 — Gym chat: a daily total for everyone, and a cap on conversation size (B-8)

- **Why:** B-8. Today the only limit is 40 questions per account per day, counted in memory
  (`server/src/plugins/matfinder/server/src/gym-chat/limits.ts:12`). Sign-up is free and unverified (`server/src/lib/auth.ts:15`),
  so N accounts get N × 40 questions. Earlier turns come from the browser and are billed every turn. The existing
  checks allow up to 12 questions × 500 characters plus 24 replies × 20,000 characters, about 486k characters.
- **Decisions in this step:**
  - **The daily total:**
    - It's counted in memory, per process, like the per-account count. Strapi Cloud runs one process
      (`limits.ts:82–83`).
    - A deploy or restart starts the count over. That's accepted for a cost guard, as the per-account count already
      accepts it.
    - The default is 200 questions per UTC day, changed with `AI_GYM_CHAT_DAILY_TOTAL`.
  - **Order of the checks:**
    - When the total is used up, everyone gets `service_limit`, even someone who has questions left.
    - A question counts toward the total only if the per-account check passes too.
    - The check and the two increments run synchronously, with no `await` between them, so concurrent requests can't
      overshoot.
  - **Conversation size:** the whole conversation as sent may be at most 60,000 characters, or the answer is
    `chat_too_long`. The app already offers "New chat" for that code (`mobile/lib/gym-chat.ts:58`). A long real chat
    now ends sooner than 12 questions. That's the accepted cost of a per-turn bound of about 15k input tokens, plus
    the 30,000-character gym context.
  - **Provider spending limit:** set in the Anthropic console, not in code. See the Deployment notes.
- **Files:**
  - `server/src/plugins/matfinder/server/src/gym-chat/limits.ts`:
    1. In `GYM_CHAT_LIMITS`, add this after `answerChars`:

       ```ts
         /** Characters of the whole conversation as the browser sends it (questions, earlier answers and their thinking).
          * Each turn bills all of it, so this bounds a turn's input whatever the turn count. */
         chatChars: 60_000,
       ```

    2. In `checkConversation`, add this line before the final `return null;`:

       ```ts
         if (messages.reduce((n, m) => n + messageSize(m), 0) > GYM_CHAT_LIMITS.chatChars) return 'chat_too_long';
       ```

    3. Replace the whole `DailyCounter` class with:

       ```ts
       export class DailyCounter {
         private counts = new Map<string, number>();
         private day = '';

         constructor(
           private readonly limit: number,
           private readonly now: () => Date = () => new Date(),
         ) {}

         /** A new UTC day starts every key over. */
         private roll() {
           const today = this.now().toISOString().slice(0, 10);
           if (today !== this.day) {
             this.day = today;
             this.counts.clear();
           }
         }

         /** Whether `key` is under the limit today. Counts nothing. */
         has(key: string): boolean {
           this.roll();
           return (this.counts.get(key) ?? 0) < this.limit;
         }

         /** Counts one question for `key`. False, and nothing counted, when the key is at the limit. */
         take(key: string): boolean {
           if (!this.has(key)) return false;
           this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
           return true;
         }
       }
       ```

  - `server/src/plugins/matfinder/server/src/gym-chat/errors.ts`: in `PERSON_ERRORS`, add this after `daily_limit`:

    ```ts
      service_limit: "Ask about this gym has reached today's limit. Try again tomorrow.",
    ```

  - `server/src/plugins/matfinder/server/src/config.ts`:
    - In `MatFinderConfig`, after `adminChatModel`:

      ```ts
        /** Gym chat questions per UTC day from everyone together (AI_GYM_CHAT_DAILY_TOTAL), counted in memory. */
        gymChatDailyTotal: number;
      ```

    - In `DEFAULT_CONFIG`, add `gymChatDailyTotal: 200,`.
    - In `validateConfig`, before the `aiScripted` check, add:

      ```ts
        if (!Number.isInteger(config.gymChatDailyTotal) || (config.gymChatDailyTotal as number) < 1) {
          throw new Error('matfinder: gymChatDailyTotal must be a whole number of at least 1');
        }
      ```

    - In `getConfig`'s returned object, add `gymChatDailyTotal: read('gymChatDailyTotal'),`.
  - `server/config/plugins.ts`: in `matfinder.config`, add this after `adminChatModel`:

    ```ts
            // Gym chat questions per day from everyone together (B-8); empty means 200. Not a number: boot fails.
            gymChatDailyTotal: Number(env('AI_GYM_CHAT_DAILY_TOTAL', '') || 200),
    ```

  - `server/src/plugins/matfinder/server/src/services/gym-chat.ts`:
    - After `const daily = new DailyCounter(GYM_CHAT_LIMITS.questionsPerDay);` (line 40), add:

      ```ts
        /** Everyone's questions today. Made on first use, so it reads the plugin config Strapi has loaded by then. */
        let total: DailyCounter | null = null;
        const everyone = () => (total ??= new DailyCounter(getConfig(strapi).gymChatDailyTotal));
        const EVERYONE = '*';
      ```

    - Replace line 89, `if (!daily.take(request.userKey)) return errorResponse('daily_limit');`, with:

      ```ts
            // The total first: when it's used up nobody is charged a question. Synchronous, so no request slips between.
            if (!everyone().has(EVERYONE)) return errorResponse('service_limit');
            if (!daily.take(request.userKey)) return errorResponse('daily_limit');
            everyone().take(EVERYONE);
      ```

  - `server/.env.example`: after `AI_ADMIN_CHAT_MODEL=`, add:

    ```
    # Gym chat questions per day (UTC) from everyone together, counted in memory (a restart starts over). Empty = 200.
    AI_GYM_CHAT_DAILY_TOTAL=
    ```

  - `mobile/lib/gym-chat.ts`: in `SERVER_CODES`, add `'service_limit',` after `'daily_limit',`.
  - `server/tests/unit/gym-chat.test.ts`:
    - In `describe('the conversation’s limits')`, add:

      ```ts
        it('refuses a conversation over 60,000 characters in all, even when each turn is within its own limit', () => {
          const assistant = (content: string) => ({ id: Math.random().toString(), role: 'assistant', content });
          const turns = Array.from({ length: 4 }, () => [user('Hi'), assistant('x'.repeat(15_500))]).flat();
          expect(checkConversation([...turns, user('Hi')])).toBe('chat_too_long');
          expect(checkConversation([...turns.slice(0, 6), user('Hi')])).toBeNull();
        });

        it('says whether a key is under the limit without counting', () => {
          const counter = new DailyCounter(1, () => new Date('2026-10-21T10:00:00Z'));
          expect([counter.has('a'), counter.has('a'), counter.take('a'), counter.has('a')]).toEqual([true, true, true, false]);
        });
      ```

    - In `describe('a gym chat turn (real chat(), fake model)')`, add:

      ```ts
        it('stops everyone at the daily total, and counts a question only when the account may ask', async () => {
          const { service } = fakeStrapi({ aiApiKey: 'sk-test', gymChatDailyTotal: 2 });
          const read = async (response: Response) => (await response.text()).includes('"code":"service_limit"');
          const ask = async (userKey: string) => {
            const fake = fakeText();
            fake.setResponses([{ text: 'Yes.' }]);
            return read(await service.turn(await service.parseBody(runInput(['Hi'])), { userKey, slug: 'sample-summerlin-bjj-demo', responseController: new AbortController(), adapter: fake as any }));
          };
          expect(await ask('a')).toBe(false);
          expect(await ask('b')).toBe(false);
          expect(await ask('c')).toBe(true); // the third question today, from anyone
        });
      ```

  - `mobile/lib/gym-chat.test.ts`: add a case next to the `daily_limit` one (line 40):

    ```ts
      expect(chatErrorView(Object.assign(new Error("Ask about this gym has reached today's limit. Try again tomorrow."), { code: 'service_limit' }))).toEqual({
        text: "Ask about this gym has reached today's limit. Try again tomorrow.",
        newChat: false,
      });
    ```

- **Data:** none.
- **Callers updated:**
  - `PERSON_ERRORS`: read by `personErrorOf` (`errors.ts:27`, passes our codes through) and `errorResponse`
    (`services/gym-chat.ts:51`).
  - The app's `SERVER_CODES` (`mobile/lib/gym-chat.ts:27`): updated above.
  - `MatFinderConfig`: `getConfig` is used in `services/gym-chat.ts` and `controllers/gym-chat.ts`, which read
    other fields and are unaffected.
  - PR #47 (M19, the admin assistant) is open and may touch `config.ts` and `errors.ts`. See the notes.
- **Verify:**
  - `cd server && npm run build:plugin`: exits 0. This is the plugin's compile step; `npm run typecheck` excludes
    `src/plugins/**`.
  - `cd server && npm run test:unit -- tests/unit/gym-chat.test.ts`: all pass, including the three new cases.
  - `cd mobile && npm run typecheck && npm run test:unit -- lib/gym-chat.test.ts`: pass.
  - `cd server && npm run test:integration:isolated`: the existing "gym chat (scripted model)" tests still pass. Stop
    any `npm run develop` first.
  - Negative test: the unit case above. The third question of the day, from a new account, gets `service_limit`.
- **Done when:** the three new unit cases pass, and the integration suite is green.
- **Rollback:** revert the commit. There's no data step. Remove `AI_GYM_CHAT_DAILY_TOTAL` from Strapi Cloud if it was
  set; leaving it set is harmless.

### S12 — Better Auth: read the client IP that reaches Strapi, and a probe to find it (B-9)

- **Why:** B-9. Here's how better-auth 1.7.7 decides whose rate-limit bucket a request goes into:
  - It reads `advanced.ipAddress.ipAddressHeaders` in order. The default is `["x-forwarded-for"]`
    (`@better-auth/core/dist/utils/ip.mjs`, `DEFAULT_IP_HEADERS`).
  - Without `trustedProxies`, it trusts a header only if it has a single value. A comma chain resolves to no IP
    (`getIPFromHeader`, `if (forwardedIps.length !== 1) return null`).
  - With no IP, every request goes into one bucket, `"no-trusted-ip|<path>"`. Better Auth then logs, once per
    process: "Rate limiting could not determine a client IP and is falling back to a single shared per-path bucket"
    (`better-auth/dist/api/rate-limiter/index.mjs`, `resolveRateLimitConfig`).
  - Sign-in and sign-up allow 3 requests per 10 s per bucket (`getDefaultSpecialRules`). The limiter is on only when
    `NODE_ENV=production` (`create-context.mjs:172`).
  - The Strapi plugin copies every Koa request header into the `Request` it hands Better Auth
    (`@strapi-community/plugin-better-auth/dist/server/index.js`, `handleAuthRequest`).
- **What Vercel sends:**
  - Vercel's docs say it overwrites `x-forwarded-for` with the client's public IP. They say `x-real-ip` and
    `x-vercel-forwarded-for` carry the same value. `x-vercel-forwarded-for` is the one a proxy on top of Vercel
    doesn't overwrite (https://vercel.com/docs/headers/request-headers).
  - Those docs describe requests to a Vercel deployment. They don't say what reaches an *external* origin through a
    rewrite (`mobile/vercel.ts`), or what Strapi Cloud's own ingress adds.
  - ⚠️ not verified: the headers production Strapi actually receives, on the web path (through Vercel) and on the
    native path (straight to Strapi Cloud, `mobile/lib/auth-client.native.ts:8`).
- **Decisions in this step:**
  - **Configurable, with no default change:** `ipAddressHeaders` and `trustedProxies` come from env vars. When they're
    unset, behaviour is exactly as today.
  - **A probe that logs no values:** `AUTH_IP_PROBE=true` makes the first 20 requests to `/api/auth/*` log which IP
    headers arrived and how many comma-separated entries each had. It never logs the values.
  - **Production values:** chosen from the probe's output with the table in the Deployment notes. That's an owner
    step after merge, not part of E8.
- **Files:**
  - `server/src/lib/auth-ip.ts`: new file.

    ```ts
    /**
     * Where Better Auth reads the client IP for its rate limits (B-9). Unset means Better Auth's default: x-forwarded-for,
     * trusted only when it holds a single address. Behind a proxy chain no IP resolves, and every request then shares one
     * rate-limit bucket.
     *   AUTH_IP_HEADERS       comma list, tried in order (for example x-vercel-forwarded-for,x-forwarded-for)
     *   AUTH_TRUSTED_PROXIES  comma list of proxy IPs or CIDR ranges, skipped from the right of a chain
     */
    export type IpAddressOptions = { ipAddressHeaders?: string[]; trustedProxies?: string[] };

    const list = (value: string | undefined) =>
      (value ?? '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

    export function ipAddressOptions(env: Record<string, string | undefined> = process.env): IpAddressOptions {
      const headers = list(env.AUTH_IP_HEADERS);
      const proxies = list(env.AUTH_TRUSTED_PROXIES);
      return { ...(headers.length ? { ipAddressHeaders: headers } : {}), ...(proxies.length ? { trustedProxies: proxies } : {}) };
    }
    ```

    Better Auth already logs a warning for an invalid `trustedProxies` entry and ignores it (`create-context.mjs:91–95`).
    Nothing more is added for that.
  - `server/src/lib/auth.ts`:
    - Add `import { ipAddressOptions } from './auth-ip';` after the `strapiAdapter` import.
    - Replace line 25 with:

      ```ts
        // REQUIRED: without generateId, foreign keys break on first sign-up. ipAddress: see src/lib/auth-ip.ts (B-9).
        advanced: { database: { generateId: 'serial' }, ipAddress: ipAddressOptions() },
      ```

    S13 (C15 server) edits this file too; apply both.
  - `server/src/middlewares/auth-ip-probe.ts`: new file. Strapi loads `src/middlewares/<name>.ts` as
    `global::<name>`.

    ```ts
    import type { Core } from '@strapi/strapi';

    const HEADERS = ['x-forwarded-for', 'x-real-ip', 'x-vercel-forwarded-for', 'forwarded', 'cf-connecting-ip', 'true-client-ip'];
    const MAX_LINES = 20;

    /**
     * B-9 diagnostic, off unless AUTH_IP_PROBE=true: for the first 20 requests to /api/auth/* per process, logs which
     * client-IP headers arrived and how many comma-separated entries each held. Never the values (they're personal data).
     */
    export default (_config: unknown, { strapi }: { strapi: Core.Strapi }) => {
      let lines = 0;
      return async (ctx: any, next: () => Promise<void>) => {
        if (process.env.AUTH_IP_PROBE === 'true' && lines < MAX_LINES && ctx.path.startsWith('/api/auth/')) {
          lines += 1;
          const shape = HEADERS.map((h) => {
            const v = ctx.request.headers[h];
            return `${h}=${typeof v === 'string' ? v.split(',').filter((s: string) => s.trim()).length : 'absent'}`;
          }).join(' ');
          strapi.log.info(`[matfinder] auth ip probe ${lines}/${MAX_LINES}: ${ctx.path} ${shape}`);
        }
        await next();
      };
    };
    ```

  - `server/config/middlewares.ts`: add `'global::auth-ip-probe',` right after `'strapi::logger',`.
  - `server/.env.example`: after `BETTER_AUTH_DASHBOARD_SECRET=`, add:

    ```
    # Where Better Auth reads the client IP for rate limits (src/lib/auth-ip.ts). Empty = Better Auth's default.
    AUTH_IP_HEADERS=
    AUTH_TRUSTED_PROXIES=
    # Diagnostic: log which IP headers reach /api/auth (names and counts, never values) for 20 requests. Leave false.
    AUTH_IP_PROBE=false
    ```

  - `server/tests/unit/auth-ip.test.ts`: new file. It uses Better Auth's own resolver, `getIP`, exported from
    `better-auth/api`, a direct dependency. Under vitest `NODE_ENV=test`, so an IP that can't be resolved comes back as
    `'127.0.0.1'` (`ip.mjs`, `if (isTest() || isDevelopment()) return LOCALHOST_IP`). In production it comes back as
    `null`, which means the shared bucket.

    ```ts
    import { getIP } from 'better-auth/api';
    import { describe, expect, it } from 'vitest';
    import { ipAddressOptions } from '../../src/lib/auth-ip';

    const UNRESOLVED = '127.0.0.1'; // tests only; production gets null → the shared "no-trusted-ip" bucket
    const req = (headers: Record<string, string>) => new Request('http://localhost/api/auth/sign-in/email', { headers });
    const ip = (headers: Record<string, string>, env: Record<string, string> = {}) =>
      getIP(req(headers), { advanced: { ipAddress: ipAddressOptions(env) } } as never);

    describe('the client IP for rate limits (B-9)', () => {
      it('reads nothing from empty settings, and lower-cases and trims the lists', () => {
        expect(ipAddressOptions({})).toEqual({});
        expect(ipAddressOptions({ AUTH_IP_HEADERS: ' X-Vercel-Forwarded-For , x-forwarded-for,', AUTH_TRUSTED_PROXIES: '76.76.21.0/24' })).toEqual({
          ipAddressHeaders: ['x-vercel-forwarded-for', 'x-forwarded-for'],
          trustedProxies: ['76.76.21.0/24'],
        });
      });

      it('by default, a forwarded chain resolves to no IP (the shared bucket)', () => {
        expect(ip({ 'x-forwarded-for': '203.0.113.7' })).toBe('203.0.113.7');
        expect(ip({ 'x-forwarded-for': '203.0.113.7, 76.76.21.21' })).toBe(UNRESOLVED);
      });

      it('reads a configured single-value header first', () => {
        const env = { AUTH_IP_HEADERS: 'x-vercel-forwarded-for,x-forwarded-for' };
        expect(ip({ 'x-vercel-forwarded-for': '203.0.113.7', 'x-forwarded-for': '203.0.113.7, 76.76.21.21' }, env)).toBe('203.0.113.7');
        expect(ip({ 'x-forwarded-for': '198.51.100.9' }, env)).toBe('198.51.100.9'); // the native path, no Vercel header
      });

      it('with trusted proxies, takes the first untrusted address from the right', () => {
        expect(ip({ 'x-forwarded-for': '203.0.113.7, 76.76.21.21' }, { AUTH_TRUSTED_PROXIES: '76.76.21.0/24' })).toBe('203.0.113.7');
      });
    });
    ```

    The `76.76.21.x` addresses are placeholders, not Vercel's real egress ranges. They only exercise the parser.
- **Data:** none.
- **Callers updated:**
  - `auth` is loaded by the Better Auth plugin from `src/lib/auth` (`auth.ts:9` comment).
  - The new middleware is global, but it only reads headers, and only when `AUTH_IP_PROBE=true`.
  - No frontend change.
- **Verify:**
  - `cd server && npm run typecheck && npm run test:unit -- tests/unit/auth-ip.test.ts`: pass.
  - **Production-mode rate limit, locally.** This uses a scratch SQLite database (`.tmp/test.db`, which the script
    deletes and reseeds) and throwaway secrets, with nothing from production. Stop `npm run develop` first, since the
    script builds into the same `dist/`. The script doesn't set `NODE_ENV`, and Strapi defaults it to `development`
    (`@strapi/core/dist/configuration/index.js:23`), which turns the limiter off. So the commands below set
    `NODE_ENV=production` themselves; the script's `launch` inherits it.

    ```bash
    cd server && NODE_ENV=production TEST_PORT=1343 scripts/test-server.sh start
    ```

    ```bash
    for ip in 198.51.100.1 198.51.100.2 198.51.100.3 198.51.100.4; do curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:1343/api/auth/sign-in/email -H 'Content-Type: application/json' -H 'Origin: http://localhost:8083' -H "X-Forwarded-For: $ip, 76.76.21.21" -d '{"email":"nobody@example.test","password":"wrong-password"}'; done
    ```

    → `401 401 401 429`. Four different clients share one bucket; this reproduces B-9. The server log also has the
    "falling back to a single shared per-path bucket" warning:
    `grep -c 'single shared per-path bucket' .tmp/test-server.log` → `1`.

    ```bash
    cd server && TEST_PORT=1343 scripts/test-server.sh stop && NODE_ENV=production TEST_PORT=1343 AUTH_IP_HEADERS=x-vercel-forwarded-for,x-forwarded-for scripts/test-server.sh start
    ```

    The same loop, with `-H "X-Vercel-Forwarded-For: $ip"` added → `401 401 401 401`: four clients, four buckets.
    Then the loop with one fresh address, `198.51.100.50` (not used above, so its bucket is empty), sent four times
    as both headers → `401 401 401 429`: the limit still applies per client. Finish with
    `TEST_PORT=1343 scripts/test-server.sh stop`.
  - **Probe:** start the test server as above with `AUTH_IP_PROBE=true` and send one request:

    ```bash
    curl -s -o /dev/null http://localhost:1343/api/auth/get-session -H 'X-Forwarded-For: 203.0.113.7, 76.76.21.21'
    ```

    Then `grep 'auth ip probe' .tmp/test-server.log` → one line containing `x-forwarded-for=2 x-real-ip=absent`, and
    `grep -c '203.0.113.7' .tmp/test-server.log` → `0` (no values logged). Without `AUTH_IP_PROBE`, the first grep
    finds nothing.
  - Negative test: the default-settings case in the unit test, and the `401 401 401 429` run, show that a chain is not
    trusted unless configured.
- **Done when:** the unit tests pass, and the two local production-mode runs print the sequences above.
- **Rollback:** revert the commit, and unset `AUTH_IP_HEADERS`, `AUTH_TRUSTED_PROXIES` and `AUTH_IP_PROBE` in Strapi
  Cloud. There's no data step.

### S13 — Account deletion, server side (C15 server)

- **Why:** G1/C15 (A-10). The live web app collects names and emails, and offers no way to delete an account
  (03 › Privacy).
- **Facts this depends on:**
  - better-auth 1.7.7 has `POST /api/auth/delete-user`, on only when `user.deleteUser.enabled` is set (otherwise 404,
    `better-auth/dist/api/routes/update-user.mjs:278`).
  - It takes an optional `password`. If the password is missing, it accepts a session less than 1 day old
    (`freshAge`, default `3600 * 24`, `create-context.mjs:149`).
  - It runs `beforeDelete(user)`, then `internalAdapter.deleteUser`, which deletes the user's sessions, accounts and
    user row (`db/internal-adapter.mjs:232–245`). Then it clears the session cookie.
  - The Strapi plugin's adapter turns those calls into `strapi.documents(uid).delete`
    (`@strapi-community/plugin-better-auth/dist/adapter/index.js:521–550`).
  - Claims store the user's **documentId** as `userId` (`services/claims.ts:65`), not Better Auth's numeric id.
- **Decisions in this step:**
  - **The password is always required.** A `hooks.before` rejects `/delete-user` without one, so a stolen session
    cookie alone can't delete an account.
  - **Claims, the conservative choice:**
    - Open claims (`pending`, `contacted`) become `withdrawn`, since the claimant is gone.
    - Every claim by the user loses its contact details: name `Deleted account`, email `deleted@matfinder.invalid`
      (`.invalid` is a reserved domain, RFC 2606), phone `—`, and no message. An admin note records the date.
    - Accepted claims stay `accepted`, so the gym still shows "Claimed by the owner" until an admin uses Remove
      owner. Nothing an admin decided is undone automatically.
    - Claim rows are kept, not deleted, so the admin's history of decisions stays intact.
  - **Order:** the claims are cleared in `beforeDelete`, so if that fails the account isn't deleted (Better Auth
    returns an error, and the user can try again). If the user row's delete fails after claims were cleared, the
    claims stay cleared. That's accepted.
  - No verification email: the app has no email sender, so `sendDeleteAccountVerification` stays unset.
  - **Reports and saved gyms** don't exist yet at this step. S16 (UX-3) and S17 (UX-4) each add one line to the same
    `beforeDelete`, so deleting an account also removes the user's saved gyms and open reports and unlinks their
    resolved reports.
- **Files:**
  - `server/src/plugins/matfinder/server/src/services/claims.ts`: add this method to the returned object, after
    `byGym`:

    ```ts
        /**
         * The user deleted their account (Better Auth's beforeDelete): their open claims are withdrawn, and every claim of
         * theirs keeps its gym and decision but loses the claimant's name, email, phone and message. Accepted claims stay
         * accepted until an admin removes the owner. Uses the query engine so the placeholders skip the email/required
         * validation of the document service.
         */
        async forgetUser(userDocumentId: string): Promise<{ claims: number }> {
          const q = strapi.db.query(CLAIM as any);
          const now = new Date().toISOString();
          return strapi.db.transaction(async () => {
            const rows = await q.findMany({ where: { userId: userDocumentId }, select: ['id', 'status', 'adminNote'] });
            for (const r of rows) {
              await q.update({
                where: { id: r.id },
                data: {
                  ...(OPEN.includes(r.status) ? { status: 'withdrawn', decidedAt: now } : {}),
                  name: 'Deleted account',
                  email: 'deleted@matfinder.invalid',
                  phone: '—',
                  message: null,
                  adminNote: [r.adminNote, `The claimant deleted their account on ${now.slice(0, 10)}.`].filter(Boolean).join('\n'),
                },
              });
            }
            return { claims: rows.length };
          });
        },
    ```

    `OPEN` is already imported (line 2). The `withdrawn` state for a never-accepted claim is new. The claimant
    already sees `withdrawn` the same way as `rejected` ("Claim it" again, 03 › F15), and the admin board lists it
    under its status.
  - `server/src/plugins/matfinder/server/src/domain/claims.ts`: add this line to the state comment at the top:
    ` *   pending | contacted → withdrawn (the claimant deleted their account; services/claims.ts forgetUser)`.
    `NEXT` doesn't change; this move isn't an admin action.
  - `server/src/lib/auth.ts`:
    - Add `import { APIError, createAuthMiddleware } from 'better-auth/api';` with the other imports. Both are
      exported by better-auth 1.7.7 (`dist/api/index.d.mts:4053`).
    - Add these two options to the `betterAuth({ … })` object, after `session`:

      ```ts
        // Account deletion (C15): always with the password, and the user's claims are cleared first (see forgetUser).
        user: {
          deleteUser: {
            enabled: true,
            beforeDelete: async (user) => {
              const row = await strapi.documents('plugin::better-auth.user' as any).findFirst({ filters: { id: Number(user.id) }, fields: ['documentId'] });
              if (!row?.documentId) return;
              const { claims } = await strapi.plugin('matfinder').service('claims').forgetUser(row.documentId);
              strapi.log.info(`[matfinder] account deleted: ${claims} claim(s) cleared`);
            },
          },
        },
        hooks: {
          before: createAuthMiddleware(async (ctx) => {
            if (ctx.path === '/delete-user' && !ctx.body?.password) {
              throw new APIError('BAD_REQUEST', { message: 'Enter your password to delete your account.' });
            }
          }),
        },
      ```

      `strapi` is the typed global (`@strapi/types/dist/index.d.ts:13`), as already used in `src/lib/permissions.ts`.
      `Number(user.id)` matches how the plugin's own session resolver looks the user up.
- **Data:** no schema change. Deleting an account removes that user's `ba_user`, `ba_session` and `ba_account` rows,
  and rewrites their `matfinder_claims` rows as above, when a user asks.
- **Callers updated:**
  - No existing caller of `delete-user`. The app calls it in S24 (C15 app).
  - `claims.forgetUser` is called only from `auth.ts`.
  - The admin claims board (`services/claims.ts` `list`) shows the placeholder values with no change.
- **Verify:**
  - `cd server && npm run typecheck && npm run build:plugin`: exit 0.
  - `server/tests/api.test.ts`: add this block, then run `cd server && npm run test:integration:isolated`. Henderson is
    also claimed by S3's race test, so this test finds its own claim by `documentId`, taken from the board by the
    test's unique email before the account is deleted.

    ```ts
    describe('account deletion (C15)', () => {
      const SLUG = 'sample-henderson-grappling-demo';
      const post = (path: string, body: unknown, cookie?: string) =>
        fetch(`${API}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: WEB_ORIGIN, ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });

      it('needs the password, removes the account and its sessions, and clears its claims', async (ctx) => {
        const email = `it-del-${randomBytes(5).toString('hex')}@example.test`;
        const password = randomBytes(12).toString('hex');
        const up = await post('/api/auth/sign-up/email', { name: 'Delete Me', email, password });
        expect(up.status).toBe(200);
        const cookie = up.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
        expect((await post('/api/matfinder/claims', { schoolSlug: SLUG, role: 'manager', phone: '702-555-0142', message: 'Front desk.' }, cookie)).status).toBe(201);
        const jwt = inject('adminJwt');
        if (!jwt) return ctx.skip();
        const boardOf = async (status: string) =>
          (await (await fetch(`${API}/matfinder/claims?status=${status}`, { headers: { Authorization: `Bearer ${jwt}` } })).json()).items as { documentId: string; email: string }[];
        const claimId = (await boardOf('pending')).find((x) => x.email === email)!.documentId;

        expect((await post('/api/auth/delete-user', {}, cookie)).status).toBe(400); // no password
        const wrong = await post('/api/auth/delete-user', { password: 'not-the-password' }, cookie);
        expect(wrong.status).toBe(400);
        expect((await wrong.json()).code).toBe('INVALID_PASSWORD');
        const done = await post('/api/auth/delete-user', { password }, cookie);
        expect(done.status).toBe(200);
        expect(await done.json()).toEqual({ success: true, message: 'User deleted' });

        expect(await (await get('/api/auth/get-session', cookie)).json()).toBeNull();
        expect((await post('/api/auth/sign-in/email', { email, password })).status).toBe(401);

        const board = await boardOf('withdrawn');
        expect(board.find((x) => x.documentId === claimId)).toMatchObject({ name: 'Deleted account', email: 'deleted@matfinder.invalid', phone: '—', message: null, status: 'withdrawn' });
        expect(JSON.stringify(board)).not.toContain(email);
      });
    });
    ```

  - Negative tests: no password → 400; a wrong password → 400 `INVALID_PASSWORD`; the old cookie → no session; the old
    credentials → 401; the claimant's email no longer appears anywhere on the claims board.
  - ⚠️ to confirm in E8:
    - that Henderson is published in the sample seed (the claim needs a published gym);
    - (resolved) `?status=withdrawn` and `?status=pending` are accepted: `controllers/claims.ts:5` lists all five
      states.
- **Done when:** the new integration test passes, and the rest of the suite stays green.
- **Rollback:** revert the commit, and the endpoint goes back to 404. Accounts deleted while it was live **can't be
  restored** by a revert. That's the purpose of the feature; Strapi Cloud's database backups, where the plan has them,
  are the only way back.

### S14 — The agent can't set "Schedule verified" (UX-1)

- **Why:** G1 (UX: trust), checkpoint A C2 / A-1. Today `upsert_school` takes `lastVerifiedAt`, so the only trust
  signal in the app ("Schedule verified {date}") can be written by the agent. After this, only a person sets it: in the
  Content Manager (the School edit view's `lastVerifiedAt` date field, then Publish).
- **Decision taken (zero-decision rule):** the tool **silently ignores** a `lastVerifiedAt` argument instead of
  rejecting the call. Reason: an older prompt or a cached tool list that still sends it should not make every school
  update fail; the field simply doesn't change. The tool description says so, so a well-behaved agent stops sending it.
  The tool name `upsert_school` is frozen and doesn't change.
- **Files:**
  - `server/src/plugins/matfinder/server/src/mcp/tools/upsert-school.ts`
    - Delete line 53 (`lastVerifiedAt: date.nullable().optional().describe(...)`). If `date` is then unused in the
      import on line 1, keep it: UX-2 adds `noticeUntil: date…` to the same file. (If UX-2 isn't implemented, remove
      `date` from the import so lint passes.)
    - Line 57, as S5 (B-1) left it:
      `run: (strapi, args) => (args.slug ? schoolService(strapi).upsertDraft(args) : schoolService(strapi).createDraft(args)),`
      Replace it with the version below. It keeps S5's create-only branch and strips `lastVerifiedAt` on both
      branches (defence in depth: whether or not Strapi's MCP layer strips unknown keys, the service's field loop at
      `server/src/api/school/services/school.ts:190–192` skips `undefined`):

      ```ts
      run: (strapi, args) => {
        const input = { ...args, lastVerifiedAt: undefined };
        return input.slug ? schoolService(strapi).upsertDraft(input) : schoolService(strapi).createDraft(input);
      },
      ```

      If S5's line isn't there, STOP (deviation protocol): don't fall back to a plain `upsertDraft` call, which brings
      back B-1.
    - Line 8, `description`: append this sentence to the end of the string:
      `" lastVerifiedAt (\"Schedule verified\" in the app) is set only by a person in the admin; this tool never changes it."`
  - `server/src/api/school/services/school.ts` — **no change.** `UpsertSchoolInput.lastVerifiedAt` (line 74) and the
    field loop (line 190) stay: the sample seed (`server/src/seed/sample.ts:72` etc.) writes it through
    `upsertDraft`, and that is a person-authored fixture, not the agent.
  - `server/src/plugins/matfinder/admin/src/components/GymsTab.tsx:159–161` — no change: its label ("When someone last
    confirmed the schedule and prices") becomes true for new writes.
- **Data:** none. Existing `lastVerifiedAt` values stay as they are, including any the agent set before this change
  (see Open questions: whether to clear them on `origin = 'web-agent'` gyms).
- **Callers updated:** the tool's own test (below). `get_school_draft` and `find_schools` still *read* the field;
  unchanged. `add_gym_from_web` never accepted it (`server/src/plugins/matfinder/server/src/mcp/tools/add-gym-from-web.ts:12–19`).
- **Verify:**
  - `cd server && npm run typecheck` → exit 0.
  - Add to `server/tests/api.test.ts`, inside `describe('MCP (curator tools)')` after the `upsert_school publishes…`
    test:

    ```ts
    it('upsert_school never changes lastVerifiedAt (only a person sets "verified")', async (ctx) => {
      if (!token) return ctx.skip();
      const slug = 'sample-summerlin-bjj-demo';
      const before = await callTool(token, 'get_school_draft', { slug });
      await callTool(token, 'upsert_school', { slug, lastVerifiedAt: '2001-01-01', neighborhood: 'Summerlin' });
      const after = await callTool(token, 'get_school_draft', { slug });
      expect(after.data.lastVerifiedAt).toBe(before.data.lastVerifiedAt);
      const { body } = await mcp(token, 'tools/list');
      const tool = body.result.tools.find((t: { name: string }) => t.name === 'upsert_school');
      expect(Object.keys(tool.inputSchema.properties)).not.toContain('lastVerifiedAt');
    });
    ```

    The test deliberately doesn't assert `isError`: whether the MCP layer strips or rejects the unknown key, the
    stored date must not change.
  - `cd server && npm run test:integration:isolated` → all pass (stop `npm run develop` first; the script builds into
    `dist/`).
- **Done when:** the new integration test passes and `tools/list` shows no `lastVerifiedAt` on `upsert_school`.
- **Rollback:** revert the commit. No data step.

### S15 — Gym notice and the public trust fields (backend) (UX-2)

- **Why:** G1 (UX), checkpoint A C6 (per-gym notice, A-2 / A-19), C3 (verified date and source on the public preview,
  A-1), C19 (separate drop-in and trial chips: the directory needs `freeTrial`). This step is backend only; UX-5
  shows the fields.
- **Decisions taken:**
  - The notice is two School fields, `notice` (string, max 140) and `noticeUntil` (date, optional). It shows while
    `noticeUntil` is empty or on/after the city-local date. The server filters it, so an expired notice never reaches
    the app. 140 characters fits a chip-sized line ("Closed Nov 27 for Thanksgiving").
  - "The source" on the preview is a derived public boolean `addedFromWeb` (`origin === 'web-agent'`), not
    `sourceUrls` (private by design, and they can be Google Maps or Instagram links). The raw `origin` stays private;
    `server/tests/api.test.ts:245–248` keeps asserting it never appears. ⚠️ owner decision recorded as an assumption:
    see Open questions.
  - The directory and nearby items gain `lastVerifiedAt`, `addedFromWeb`, `freeTrial` and `notice`. None is gated
    (03 F10 gates schedule beyond today, coaches, contact, prices beyond the drop-in fee).
- **Files:**
  - `server/src/api/school/content-types/school/schema.json` — add after `lastVerifiedAt` (line 109–111):

    ```json
    "notice": {
      "type": "string",
      "maxLength": 140
    },
    "noticeUntil": {
      "type": "date"
    },
    ```

  - `server/src/lib/directory.ts`
    - Add, after `hasCoords` (line 42):

      ```ts
      /** The gym's notice while it applies: no end date, or an end date on or after the city-local date. */
      export function activeNotice(notice: string | null | undefined, until: string | null | undefined, localDate: string): string | null {
        const text = notice?.trim();
        if (!text) return null;
        return !until || until >= localDate ? text : null;
      }
      ```

    - `DIRECTORY_FIELDS` (lines 45–62): append `'lastVerifiedAt', 'addedFromWeb', 'freeTrial', 'notice'` after
      `'claimed'`, in that order.
    - `toDirectoryItem` (lines 68–89): after `claimed,` add:

      ```ts
      // "Schedule verified" date (set only by a person, UX-1) and whether the agent added the gym from the web.
      lastVerifiedAt: s.lastVerifiedAt ?? null,
      addedFromWeb: s.origin === 'web-agent',
      freeTrial: s.pricing?.freeTrial === true,
      notice: activeNotice(s.notice, s.noticeUntil, now.localDate),
      ```

  - `server/src/api/school/services/school.ts`
    - Line 35: `const DIRECTORY_FIELDS_QUERY = ['slug', 'name', 'location', 'neighborhood', 'postalCode', 'lastVerifiedAt', 'origin', 'notice', 'noticeUntil'];`
      (`origin` is `private: true` in the schema; the Document Service still returns it when asked by name, and
      `toDirectoryItem` only emits the derived boolean.)
    - Line 39: `pricing: { fields: ['visitorsWelcome', 'dropInFee', 'currency', 'freeTrial'] },`
    - Import `activeNotice` in the existing `lib/directory` import on line 16.
    - `getBySlug` return object (lines 344–391): after `lastVerifiedAt: s.lastVerifiedAt ?? null,` add:

      ```ts
      addedFromWeb: s.origin === 'web-agent',
      notice: now ? activeNotice(s.notice, s.noticeUntil, now.localDate) : (s.notice?.trim() || null),
      ```

      (`getBySlug` has no `fields` list, so `notice`, `noticeUntil` and `origin` are already loaded.)
    - `UpsertSchoolInput` (lines 58–75): add `notice?: string | null;` and `noticeUntil?: string | null;`.
    - `upsertOnce` field loop, line 190: change to

      ```ts
      for (const field of ['name', 'shortDescription', 'neighborhood', 'postalCode', 'lastVerifiedAt', 'notice', 'noticeUntil'] as const) {
        if (input[field] === undefined) continue;
        // An empty notice removes it, like null.
        const value = field === 'notice' && typeof input.notice === 'string' && !input.notice.trim() ? null : input[field];
        write(field, value, existing?.[field]);
      }
      ```

    - `getDraft` return object (lines 548–570): after `lastVerifiedAt: s.lastVerifiedAt ?? null,` add
      `notice: s.notice ?? null, noticeUntil: s.noticeUntil ?? null,` (the raw values, so the agent sees an expired
      notice too).
  - `server/src/plugins/matfinder/server/src/mcp/tools/upsert-school.ts` — add to the input object, where line 53 was
    (removed by UX-1):

    ```ts
    notice: z.string().max(140).nullable().optional().describe("A short notice shown on the gym's listing, e.g. 'Closed Nov 27 for Thanksgiving'. Only from the gym's own pages or posts. null or an empty string removes it"),
    noticeUntil: date.nullable().optional().describe('YYYY-MM-DD: the last day the notice applies. Omit or null to show it until it is removed'),
    ```

  - `server/src/plugins/matfinder/server/src/mcp/tools/get-school.ts:31` — after `lastVerifiedAt: z.string().nullable(),`
    add `notice: z.string().nullable(), noticeUntil: z.string().nullable(),`.
  - `server/src/plugins/matfinder/server/src/gym-chat/context.ts`
    - `PublicGym` type (ends line 31): add `notice?: string | null;`.
    - In `gymText`, immediately before the `lastVerifiedAt` line (line 127), add:
      `if (gym.notice) lines.push(\`Notice from the gym: ${data(gym.notice)}\`);`
      (`getBySlug` feeds the chat at `server/src/plugins/matfinder/server/src/services/gym-chat.ts:87`, so the
      expired-notice filter applies here too.)
- **Data:** two new nullable columns on `schools` (`notice`, `notice_until`), created by Strapi's schema sync at boot.
  Existing rows get `null`: no notice. No backfill. Draft and published rows both get the columns.
- **Callers updated:**
  - Public directory and nearby: both build items through `toDirectoryItem` (`school.ts:268`, `school.ts:313`), so
    both gain the four fields. The integration test `server/tests/api.test.ts:65` compares keys to
    `DIRECTORY_FIELDS`, so it follows automatically.
  - Mobile types: `mobile/lib/api/schools.ts` `DirectorySchool` and `SchoolPage` — updated in UX-5 (extra JSON fields
    don't break the current app; it ignores them).
  - `mobile/e2e/explore-to-school.spec.ts:5` declares a partial local type; no change needed.
  - The Content Manager shows the two new fields on the School edit view automatically (person path for C6).
- **Verify:**
  - `server/tests/unit/directory.test.ts`:
    - Add `origin: 'web-agent', notice: 'Closed Oct 1', noticeUntil: '2026-10-01',` to the `school` fixture (line 6)
      and `freeTrial: true` to its `pricing`.
    - In `flattens relations and pricing…` (line 55) add to the `toMatchObject`:
      `lastVerifiedAt: '2026-09-15', addedFromWeb: true, freeTrial: true, notice: 'Closed Oct 1'`.
    - In `defaults missing pieces` (line 67) add: `lastVerifiedAt: null, addedFromWeb: false, freeTrial: false, notice: null`.
    - New test:

      ```ts
      it('activeNotice: shows until the end date, hides after it, and hides blanks', () => {
        expect(activeNotice('Closed', null, '2026-11-27')).toBe('Closed');
        expect(activeNotice('Closed', '2026-11-27', '2026-11-27')).toBe('Closed');
        expect(activeNotice('Closed', '2026-11-26', '2026-11-27')).toBeNull();
        expect(activeNotice('   ', null, '2026-11-27')).toBeNull();
        expect(activeNotice(null, null, '2026-11-27')).toBeNull();
      });
      ```

      (import `activeNotice` from `../../src/lib/directory`).
  - `server/tests/unit/gym-chat.test.ts`: in the first test's gym (line ~28) add `notice: 'Closed Nov 27'` and
    `expect(text).toContain('Notice from the gym: Closed Nov 27');`.
  - `server/tests/api.test.ts`, in `describe('MCP (curator tools)')`:

    ```ts
    it('upsert_school sets a notice that shows on the directory until its end date', async (ctx) => {
      if (!token) return ctx.skip();
      const slug = 'sample-henderson-grappling-demo';
      const item = async () => (await (await get('/api/schools/directory?city=las-vegas')).json()).data.schools.find((s: { slug: string }) => s.slug === slug);
      await callTool(token, 'upsert_school', { slug, notice: 'Closed Nov 27 (Demo)', noticeUntil: null });
      expect(await item()).toMatchObject({ notice: 'Closed Nov 27 (Demo)' });
      await callTool(token, 'upsert_school', { slug, noticeUntil: '2000-01-01' });
      expect((await item()).notice).toBeNull();
      await callTool(token, 'upsert_school', { slug, notice: '', noticeUntil: null });
      expect((await item()).notice).toBeNull();
    });
    ```

    This relies on auto-publish (default on in the test server). If the B-3 step changes publishing so a write
    to a gym with a person's unpublished edits doesn't publish, this sample gym has none, so the test still holds.
  - Negative test (privacy): the existing `adds a new gym…` test (`api.test.ts:245–248`) still asserts `origin`,
    `sourceUrls` and `discoveredAt` are absent from directory and page payloads; add `expect(listed.addedFromWeb).toBe(true);`
    after line 243.
  - `cd server && npm run typecheck && npm run test:unit && npm run test:integration:isolated` → all pass.
- **Done when:** the directory returns `notice`, `lastVerifiedAt`, `addedFromWeb` and `freeTrial` per gym, an expired
  notice returns `null`, and all three server suites pass.
- **Rollback:** revert the commit. **This deletes data:** at the next boot Strapi's schema sync drops the `notice`
  and `notice_until` columns of `schools` (`settings.forceMigration`, default `true`, isn't overridden in
  `server/config/database.ts`; `@strapi/database/dist/schema/diff.js:167–170`), so every notice saved since this step
  is lost. Export them first if they matter (Content Manager › Schools, or the Strapi Cloud backup in *Deployment* 2).
  No manual SQL is needed.

### S16 — "Report a problem" (backend and admin tab) (UX-3)

- **Why:** G1 (UX), checkpoint A C5 / A-2 (and it's the measurement the riskiest assumption needs: how often a
  schedule is wrong). A signed-in user reports a problem with a gym; the curator sees open reports on a new **Reports**
  tab of the MatFinder admin page and resolves them.
- **Decisions taken:**
  - Built like claims: a plugin content type `plugin::matfinder.report`, hidden from the Content Manager and the
    Content-Type Builder, with a content-API create route and admin list/act routes. Same `ServiceResult` / `reply`
    helpers (`server/src/plugins/matfinder/server/src/domain/result.ts`).
  - Signed-in users only (the Authenticated grant). Limits, mirroring claims (`domain/claims.ts:15`): one **open**
    report per user per gym (`409 REPORT_OPEN`), at most 10 open reports per user (`429 TOO_MANY_REPORTS`). A partial
    unique index backs the first rule against double taps.
  - States: `open` → `resolved`. Resolving takes an optional note. No notification to the reporter (no email provider,
    04 › Email).
  - The reporter's identity: only `userId` (private), like claims. No email or name is stored; the admin sees the gym,
    kind, message and age.
  - New RBAC action `plugin::matfinder.reports.review` ("Resolve problem reports"). Seeing the tab uses the existing
    `plugin::matfinder.read`. Super Admin gets the new action automatically, as with `claims.review`.
- **Files:**
  - `server/src/plugins/matfinder/server/src/content-types/report/schema.json` — new:

    ```json
    {
      "kind": "collectionType",
      "collectionName": "matfinder_reports",
      "info": {
        "singularName": "report",
        "pluralName": "reports",
        "displayName": "Problem report",
        "description": "A signed-in user says something on a gym's listing is wrong. Resolved by hand on the MatFinder admin page."
      },
      "options": { "draftAndPublish": false },
      "pluginOptions": {
        "content-manager": { "visible": false },
        "content-type-builder": { "visible": false }
      },
      "attributes": {
        "schoolDocumentId": { "type": "string", "required": true },
        "schoolSlug": { "type": "string", "required": true },
        "schoolName": { "type": "string", "required": true },
        "userId": { "type": "string", "required": true, "private": true },
        "kind": { "type": "enumeration", "enum": ["schedule", "price", "closed", "contact", "other"], "required": true },
        "message": { "type": "text", "maxLength": 1000 },
        "status": { "type": "enumeration", "enum": ["open", "resolved"], "default": "open", "required": true },
        "adminNote": { "type": "text", "private": true },
        "resolvedBy": { "type": "string" },
        "resolvedAt": { "type": "datetime" }
      }
    }
    ```

  - `server/src/plugins/matfinder/server/src/content-types/report/index.ts` — new, same as `claim/index.ts`:
    `import schema from './schema.json'; export default { schema };`
  - `server/src/plugins/matfinder/server/src/content-types/index.ts` — import `report` and export
    `{ claim, knowledge, report }` (UX-4 adds `'saved-gym'` to the same object).
  - `server/src/plugins/matfinder/server/src/domain/reports.ts` — new:

    ```ts
    /** Problem reports: what a user can report and the open limit. Pure, so it's unit-tested apart from Strapi. */
    export type ReportKind = 'schedule' | 'price' | 'closed' | 'contact' | 'other';
    export type ReportStatus = 'open' | 'resolved';
    export const REPORT_KINDS: ReportKind[] = ['schedule', 'price', 'closed', 'contact', 'other'];
    /** At most this many open reports per user (stops one account flooding the board). */
    export const MAX_OPEN_REPORTS_PER_USER = 10;
    ```

  - `server/src/plugins/matfinder/server/src/domain/errors.ts` — no change: `isUniqueViolation` was added in the B-5
    step.

  - `server/src/plugins/matfinder/server/src/services/reports.ts` — new:

    ```ts
    import type { Core } from '@strapi/strapi';
    import { isUniqueViolation } from '../domain/errors';
    import { MAX_OPEN_REPORTS_PER_USER, type ReportKind, type ReportStatus } from '../domain/reports';
    import { fail, ok, type ServiceResult } from '../domain/result';

    const REPORT = 'plugin::matfinder.report';
    const SCHOOL = 'api::school.school';
    const ADMIN_FIELDS = ['schoolDocumentId', 'schoolSlug', 'schoolName', 'kind', 'message', 'status', 'adminNote', 'resolvedBy', 'resolvedAt', 'createdAt'] as const;

    export type ReportUser = { documentId: string };
    export type NewReport = { schoolSlug: string; kind: ReportKind; message?: string };

    const docs = (strapi: Core.Strapi, uid: string) => strapi.documents(uid as any) as any;
    const adminName = (admin?: { firstname?: string | null; lastname?: string | null; email?: string | null }) =>
      [admin?.firstname, admin?.lastname].filter(Boolean).join(' ') || admin?.email || 'an admin';

    /** "Something's wrong with this gym": made in the app by a signed-in user, resolved by hand in the admin. */
    export default ({ strapi }: { strapi: Core.Strapi }) => {
      const reports = () => docs(strapi, REPORT);
      const REPORT_OPEN = fail(409, 'REPORT_OPEN', 'You already reported a problem with this gym. We’ll look at it soon.');

      return {
        async create(user: ReportUser, input: NewReport): Promise<ServiceResult<{ status: ReportStatus }>> {
          const school = await docs(strapi, SCHOOL).findFirst({ status: 'published', filters: { slug: input.schoolSlug }, fields: ['slug', 'name'] });
          if (!school) return fail(404, 'NOT_FOUND', 'No published gym with that slug.');
          if (await reports().findFirst({ filters: { schoolDocumentId: school.documentId, userId: user.documentId, status: 'open' } })) return REPORT_OPEN;
          const open = await reports().count({ filters: { userId: user.documentId, status: 'open' } });
          if (open >= MAX_OPEN_REPORTS_PER_USER) return fail(429, 'TOO_MANY_REPORTS', `You can have at most ${MAX_OPEN_REPORTS_PER_USER} open reports.`);
          try {
            await reports().create({
              data: {
                schoolDocumentId: school.documentId,
                schoolSlug: school.slug,
                schoolName: school.name,
                userId: user.documentId,
                kind: input.kind,
                message: input.message?.trim() || null,
                status: 'open',
              },
            });
          } catch (e) {
            // The partial unique index (server/src/lib/indexes.ts) catches a double tap the check above missed.
            if (isUniqueViolation(e)) return REPORT_OPEN;
            throw e;
          }
          return ok({ status: 'open' as ReportStatus });
        },

        /** The admin board, newest first. */
        async list(status?: ReportStatus) {
          const items = await reports().findMany({ filters: status ? { status } : {}, fields: [...ADMIN_FIELDS], sort: 'createdAt:desc', limit: 500 });
          return { items: items.map(({ id, ...rest }: any) => rest) };
        },

        /** Open count, for the tab badge (in the plugin's /summary). */
        async summary() {
          return { open: await reports().count({ filters: { status: 'open' } }) };
        },

        /** open → resolved, once: the conditional update refuses a report another admin resolved first. */
        async resolve(documentId: string, opts: { note?: string; admin?: any }): Promise<ServiceResult<{ status: ReportStatus }>> {
          const report = await reports().findOne({ documentId, fields: ['status'] });
          if (!report) return fail(404, 'NOT_FOUND', 'No report with that id.');
          const note = opts.note?.trim();
          const { count } = await strapi.db.query(REPORT as any).updateMany({
            where: { documentId, status: 'open' },
            // The query engine doesn't set updatedAt itself (unlike the Document Service), so it's set here, as in S3.
            data: { status: 'resolved', resolvedAt: new Date(), updatedAt: new Date(), resolvedBy: adminName(opts.admin), ...(note ? { adminNote: note } : {}) },
          });
          if (!count) return fail(409, 'INVALID_STATE', 'This report is already resolved.');
          return ok({ status: 'resolved' as ReportStatus });
        },

        /**
         * The user deleted their account (auth.ts beforeDelete, S13): their open reports are deleted, and resolved ones
         * are kept for the curator's history with the reporter unlinked. Query engine, so the placeholder skips
         * validation.
         */
        async forgetUser(userDocumentId: string): Promise<{ deleted: number; unlinked: number }> {
          const q = strapi.db.query(REPORT as any);
          const { count: deleted } = await q.deleteMany({ where: { userId: userDocumentId, status: 'open' } });
          const { count: unlinked } = await q.updateMany({ where: { userId: userDocumentId }, data: { userId: 'deleted-account', updatedAt: new Date() } });
          return { deleted, unlinked };
        },
      };
    };
    ```

  - `server/src/plugins/matfinder/server/src/services/index.ts` — import `reports from './reports'` and add `reports`
    to the exported object.
  - `server/src/lib/auth.ts` — in `beforeDelete` (added in S13), after the `forgetUser` line for claims, add:

    ```ts
              await strapi.plugin('matfinder').service('reports').forgetUser(row.documentId);
    ```
  - `server/src/plugins/matfinder/server/src/controllers/report.ts` — new (content API), modelled on
    `controllers/claim.ts`:

    ```ts
    import type { Core } from '@strapi/strapi';
    import { z } from '@strapi/utils';
    import { REPORT_KINDS } from '../domain/reports';
    import { reply } from '../domain/result';

    const NewReport = z.object({
      schoolSlug: z.string().min(1).max(255),
      kind: z.enum(REPORT_KINDS as [string, ...string[]]),
      message: z.string().max(1000).optional(),
    });

    const userOf = (ctx: any) => ctx.state.user ?? ctx.state.auth?.credentials?.user ?? null;

    /** Content API (the app): a signed-in user reports a problem with a gym's listing. */
    export default ({ strapi }: { strapi: Core.Strapi }) => ({
      async create(ctx) {
        const user = userOf(ctx);
        if (!user?.documentId) return ctx.unauthorized('Sign in to report a problem');
        const parsed = NewReport.safeParse(ctx.request.body ?? {});
        if (!parsed.success) {
          const issue = parsed.error.issues[0];
          ctx.status = 422;
          ctx.body = { data: null, error: { status: 422, name: 'VALIDATION_ERROR', message: `${issue.path.join('.')}: ${issue.message}` } };
          return;
        }
        reply(ctx, await strapi.plugin('matfinder').service('reports').create(user, parsed.data as any), true);
      },
    });
    ```

  - `server/src/plugins/matfinder/server/src/controllers/reports.ts` — new (admin):

    ```ts
    import type { Core } from '@strapi/strapi';
    import { reply } from '../domain/result';
    import type { ReportStatus } from '../domain/reports';

    const STATUSES: ReportStatus[] = ['open', 'resolved'];

    /** Admin API: the problem-report board and its one action. */
    export default ({ strapi }: { strapi: Core.Strapi }) => {
      const service = () => strapi.plugin('matfinder').service('reports');
      return {
        async find(ctx) {
          const status = ctx.query.status as ReportStatus | undefined;
          if (status && !STATUSES.includes(status)) return ctx.badRequest(`status must be one of ${STATUSES.join(', ')}`);
          ctx.body = await service().list(status);
        },
        async resolve(ctx) {
          const note = typeof ctx.request.body?.note === 'string' ? ctx.request.body.note : undefined;
          reply(ctx, await service().resolve(ctx.params.documentId, { note, admin: ctx.state.user }));
        },
      };
    };
    ```

  - `server/src/plugins/matfinder/server/src/controllers/index.ts` — import `report` and `reports`; export
    `{ claim, claims, 'gym-chat': gymChat, gyms, report, reports }` (UX-4 adds `saved`).
  - `server/src/plugins/matfinder/server/src/permissions.ts`
    - `ACTIONS`: add `reportsReview: 'plugin::matfinder.reports.review',`.
    - `ACTION_DEFS`: add `{ uid: 'reports.review', displayName: 'Resolve problem reports', subCategory: 'Reports' },`.
  - `server/src/plugins/matfinder/server/src/routes/index.ts`
    - Admin routes, after the claims routes (line 15):

      ```ts
      { method: 'GET', path: '/reports', handler: 'reports.find', config: { policies: allow(ACTIONS.read) } },
      { method: 'POST', path: '/reports/:documentId/resolve', handler: 'reports.resolve', config: { policies: allow(ACTIONS.reportsReview) } },
      ```

    - Content-API routes, after `/claims/mine` (line 27): `{ method: 'POST', path: '/reports', handler: 'report.create' },`
    - Update the comment on lines 18–22 to list `plugin::matfinder.report.create` among the seeded grants.
  - `server/src/plugins/matfinder/server/src/services/gyms.ts:43–45` — add the open count to the summary:

    ```ts
    const [claims, reports] = await Promise.all([
      strapi.plugin('matfinder').service('claims').summary(),
      strapi.plugin('matfinder').service('reports').summary(),
    ]);
    const fromWeb = { total: web.total, notLive: web.notLive, thisWeek: web.thisWeek };
    return { gyms: { total, published, unpublishedChanges, neverPublished, fromWeb, claimed: claims.claimed }, claims, reports };
    ```

  - `server/src/lib/permissions.ts:18–25` — add to `GRANTS.authenticated`, with a comment line
    `// Report a problem with a gym (MatFinder plugin).`: `'plugin::matfinder.report.create',`.
  - `server/src/lib/indexes.ts` (created in the B-7 step) — add to the `indexes` array, after the knowledge entry:

    ```ts
      // One open problem report per user per gym (the plugin's reports service maps a violation to 409 REPORT_OPEN).
      { unique: true, sql: `CREATE UNIQUE INDEX IF NOT EXISTS matfinder_reports_open_uq ON ${t('matfinder_reports')} (school_document_id, user_id) WHERE status = 'open'` },
    ```

    ⚠️ not verified: the column names `school_document_id` and `user_id` (Strapi 5's snake_case of the attribute
    names). Check on the scratch database first (Verify, step 1). A failure stops a production boot (B-7 step).
  - Admin UI (`server/src/plugins/matfinder/admin/src/`):
    - `reports.ts` — new:

      ```ts
      export type ReportStatus = 'open' | 'resolved';
      export type ReportKind = 'schedule' | 'price' | 'closed' | 'contact' | 'other';
      export type Report = {
        documentId: string; schoolDocumentId: string; schoolSlug: string; schoolName: string;
        kind: ReportKind; message: string | null; status: ReportStatus;
        adminNote: string | null; resolvedBy: string | null; resolvedAt: string | null; createdAt: string;
      };
      export const KIND_LABELS: Record<ReportKind, string> = {
        schedule: 'Schedule is wrong',
        price: 'Price is wrong',
        closed: 'Closed or moved',
        contact: 'Contact details are wrong',
        other: 'Something else',
      };
      ```

    - `permissions.ts` — add `reviewReports: [{ action: 'plugin::matfinder.reports.review', subject: null }],`
      (`useRBAC` reports it as `allowedActions.canReview`).
    - `tabs.ts` — `TABS` becomes `gyms`, `claims`, `{ id: 'reports', label: 'Reports' }`, `from-web` (Reports third).
    - `components/ReportsTab.tsx` — new, modelled on `components/ClaimsTab.tsx` (same imports, `Layouts.Action`
      filter select, `Table.Root` with loading and empty states, `singleFlight`, `useNotification`):
      - Filter (kept in `?status=` like ClaimsTab): `open` (label "Open", the default), `resolved` ("Resolved"),
        `all` ("All reports"). Requests: `open` → `GET /matfinder/reports?status=open`; `resolved` →
        `GET /matfinder/reports?status=resolved`; `all` → `GET /matfinder/reports` with no param.
      - Columns: **Gym** (`schoolName` as a link to `editGymPath(schoolDocumentId)`, `age(createdAt)` under it —
        import `age` from `../claims`), **Problem** (`KIND_LABELS[kind]`, `message` under it, ellipsis with a
        `Tooltip` holding the full message; `—` when empty), **Status** (`Badge`: open → "Open", variant `warning`;
        resolved → "Resolved", variant `success`; under it `formatDay(resolvedAt) · resolvedBy` and `adminNote` when
        present).
      - Actions column only when `canReview`: on an open report, one `IconButton` (`Check` icon) labelled
        "Mark resolved". Clicking it posts `POST /matfinder/reports/:documentId/resolve` with `{}` (no note dialog in
        this round), then shows the success notification "Report resolved.", refreshes the list and calls
        `onChanged?.()`. On error, the danger notification shows `e.response.data.error.message`, or
        "That didn’t work. Try again.".
      - Empty states: open → "No open reports. People report problems from a gym's page in the app."; others →
        "No reports with this status."; load failure → toast "Couldn't load the reports. Try again." and empty text
        "Couldn't load the reports.".
    - `pages/MatFinderPage.tsx`:
      - `loadCounts` (lines 24–31): read `reports: { open: number }` from the summary and set
        `reports: s.reports.open` in `setCounts`.
      - Add after the claims `Tabs.Content` (line 75):
        `<Tabs.Content value="reports"><ReportsTab onChanged={loadCounts} /></Tabs.Content>` and import `ReportsTab`.
      - Subtitle (line 41): "Every gym in the directory, owners' claims, problem reports, and the gyms the agent found on the web."
- **Data:** a new table `matfinder_reports`, created empty at boot; one new partial unique index. No existing data
  touched.
- **Callers updated:** the plugin's `/summary` gains `reports` (read by `MatFinderPage.tsx`; the homepage widgets read
  other keys and ignore it). `server/tests/api.test.ts` summary assertions use `toMatchObject` and are unaffected.
  Mobile caller: UX-8.
- **Verify:**
  1. Column names on the throwaway test database (no production data, no local `.env` read: `test-server.sh` passes
     throwaway values for every secret):

     ```bash
     cd server && scripts/test-server.sh start && sqlite3 .tmp/test.db ".schema matfinder_reports" && sqlite3 .tmp/test.db ".indexes matfinder_reports"; scripts/test-server.sh stop
     ```

     → the table has `school_document_id` and `user_id` columns and `matfinder_reports_open_uq` is listed. The `stop`
     runs whatever the checks return.
  2. Add to `server/tests/api.test.ts` a `describe('problem reports')` block, using the file's `signUp`, `json` style
     helpers (copy the `json` helper from `describe('gym claims')`) and `inject('adminJwt')`:

     ```ts
     const report = (cookie: string | undefined, body: Record<string, unknown>) => fetch(`${API}/api/matfinder/reports`, json('POST', body, cookie));
     it('a signed-in user reports a problem; repeats, bad input and signed-out calls are refused', async () => {
       expect((await report(undefined, { schoolSlug: SLUG, kind: 'schedule' })).status).toBeGreaterThanOrEqual(401);
       const user = await signUp();
       expect((await report(user, { schoolSlug: 'no-such-gym', kind: 'schedule' })).status).toBe(404);
       expect((await report(user, { schoolSlug: SLUG, kind: 'nonsense' })).status).toBe(422);
       const res = await report(user, { schoolSlug: SLUG, kind: 'schedule', message: 'Monday open mat moved to 8pm.' });
       expect(res.status).toBe(201);
       expect(await res.json()).toEqual({ status: 'open' });
       const again = await report(user, { schoolSlug: SLUG, kind: 'price' });
       expect(again.status).toBe(409);
       expect((await again.json()).error.name).toBe('REPORT_OPEN');
     });
     it('an admin sees the report without the reporter id and resolves it once; a read-only admin gets 403', async (ctx) => {
       const jwt = inject('adminJwt');
       if (!jwt) return ctx.skip();
       const board = await (await fetch(`${API}/matfinder/reports?status=open`, { headers: { Authorization: `Bearer ${jwt}` } })).json();
       const r = board.items.find((x: { schoolSlug: string }) => x.schoolSlug === SLUG);
       expect(r).toMatchObject({ kind: 'schedule', message: 'Monday open mat moved to 8pm.', status: 'open' });
       expect(r).not.toHaveProperty('userId');
       const summary = await (await fetch(`${API}/matfinder/summary`, { headers: { Authorization: `Bearer ${jwt}` } })).json();
       expect(summary.reports.open).toBeGreaterThanOrEqual(1);
       const resolve = (token: string) => fetch(`${API}/matfinder/reports/${r.documentId}/resolve`, json('POST', {}, undefined, token));
       expect((await resolve(await readOnlyAdmin(jwt))).status).toBe(403);
       expect((await resolve(jwt)).status).toBe(200);
       expect((await resolve(jwt)).status).toBe(409);
     });
     ```

     `SLUG` is `'sample-summerlin-bjj-demo'`; move `readOnlyAdmin` (now inside `describe('gym claims')`) to file scope
     so both blocks can use it.
  3. Double-tap race (the index): in the same block,

     ```ts
     it('two simultaneous reports on one gym make one open report', async () => {
       const user = await signUp();
       const slug = 'sample-henderson-grappling-demo';
       const [a, b] = await Promise.all([report(user, { schoolSlug: slug, kind: 'closed' }), report(user, { schoolSlug: slug, kind: 'closed' })]);
       expect([a.status, b.status].sort()).toEqual([201, 409]);
     });
     ```

  4. Account deletion (C-4 of checkpoint C): add to S13's `describe('account deletion (C15)')`, which has the `post`
     helper:

     ```ts
     it("deletes the user's open reports and unlinks resolved ones", async (ctx) => {
       const jwt = inject('adminJwt');
       if (!jwt) return ctx.skip();
       const email = `it-delrep-${randomBytes(5).toString('hex')}@example.test`;
       const password = randomBytes(12).toString('hex');
       const up = await post('/api/auth/sign-up/email', { name: 'Reporter', email, password });
       const cookie = up.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
       const marker = `delete-me-${randomBytes(4).toString('hex')}`;
       expect((await post('/api/matfinder/reports', { schoolSlug: 'sample-summerlin-bjj-demo', kind: 'other', message: marker }, cookie)).status).toBe(201);
       expect((await post('/api/auth/delete-user', { password }, cookie)).status).toBe(200);
       const board = await (await fetch(`${API}/matfinder/reports`, { headers: { Authorization: `Bearer ${jwt}` } })).json();
       expect(JSON.stringify(board)).not.toContain(marker);
     });
     ```

     Negative check: the report's marker is gone from the admin board after deletion.
  5. `cd server && npm run typecheck && npm run build:plugin && npm run test:integration:isolated` → pass.
  6. Admin UI, scripted check: none beyond the build (the tab is a thin view over the tested routes). Manual check for
     the owner, optional: open `/admin/plugins/matfinder?tab=reports` on the test server.
- **Done when:** the four new integration tests pass, the plugin builds, and the Reports tab appears with a badge
  count.
- **Rollback:** revert the commit. **This deletes data:** removing the `report` content type makes Strapi's schema
  sync drop the `matfinder_reports` table, with every report and its index, at the next boot
  (`@strapi/database/dist/schema/diff.js:337–358`). Export the reports first if they matter (the Strapi Cloud backup
  in *Deployment* 2). No manual SQL is needed. The api-permissions grant row for `plugin::matfinder.report.create` stays and points at a missing action (harmless);
  delete it in Settings → API permissions if wanted.

### S17 — Saved gyms (backend) (UX-4)

- **Why:** G1 (UX), checkpoint A C12 / A-7 (a return trigger: Marco saves gyms for his next Vegas trip).
- **Decisions taken:** a plugin content type `plugin::matfinder.saved-gym` (one row per user per gym), signed-in only,
  at most 200 per user (`429 TOO_MANY_SAVED`). `PUT` saves (idempotent), `DELETE` removes (idempotent), `GET` lists the
  user's saved, still-published gyms, newest first. Unpublished or removed gyms drop out of the list silently; their
  rows stay.
- **Files:**
  - `server/src/plugins/matfinder/server/src/content-types/saved-gym/schema.json` — new:

    ```json
    {
      "kind": "collectionType",
      "collectionName": "matfinder_saved_gyms",
      "info": {
        "singularName": "saved-gym",
        "pluralName": "saved-gyms",
        "displayName": "Saved gym",
        "description": "A gym a signed-in user saved in the app."
      },
      "options": { "draftAndPublish": false },
      "pluginOptions": {
        "content-manager": { "visible": false },
        "content-type-builder": { "visible": false }
      },
      "attributes": {
        "schoolDocumentId": { "type": "string", "required": true },
        "userId": { "type": "string", "required": true, "private": true }
      }
    }
    ```

  - `server/src/plugins/matfinder/server/src/content-types/saved-gym/index.ts` — new, same shape as `claim/index.ts`.
  - `server/src/plugins/matfinder/server/src/content-types/index.ts` — export `'saved-gym': savedGym` as well
    (`import savedGym from './saved-gym'`).
  - `server/src/plugins/matfinder/server/src/services/saved.ts` — new:

    ```ts
    import type { Core } from '@strapi/strapi';
    import { isUniqueViolation } from '../domain/errors';
    import { fail, ok, type ServiceResult } from '../domain/result';

    const SAVED = 'plugin::matfinder.saved-gym';
    const SCHOOL = 'api::school.school';
    export const MAX_SAVED_PER_USER = 200;

    const docs = (strapi: Core.Strapi, uid: string) => strapi.documents(uid as any) as any;

    /** Gyms a signed-in user saved: the app's "Saved gyms" list and the bookmark on a gym page. */
    export default ({ strapi }: { strapi: Core.Strapi }) => {
      const saved = () => docs(strapi, SAVED);
      const published = (slug: string) => docs(strapi, SCHOOL).findFirst({ status: 'published', filters: { slug }, fields: ['slug'] });

      return {
        async list(user: { documentId: string }) {
          const rows = await saved().findMany({ filters: { userId: user.documentId }, fields: ['schoolDocumentId'], sort: 'createdAt:desc', limit: MAX_SAVED_PER_USER });
          const ids = rows.map((r: any) => r.schoolDocumentId);
          if (!ids.length) return { items: [] };
          const schools = await docs(strapi, SCHOOL).findMany({
            status: 'published',
            filters: { documentId: { $in: ids } },
            fields: ['slug', 'name', 'neighborhood'],
            populate: { city: { fields: ['slug', 'name'] } },
            limit: ids.length,
          });
          const byId = new Map(schools.map((s: any) => [s.documentId, s]));
          return {
            items: ids
              .map((id: string) => byId.get(id))
              .filter(Boolean)
              .map((s: any) => ({ slug: s.slug, name: s.name, neighborhood: s.neighborhood ?? null, city: s.city ? { slug: s.city.slug, name: s.city.name } : null })),
          };
        },

        async save(user: { documentId: string }, slug: string): Promise<ServiceResult<{ saved: true }>> {
          const school = await published(slug);
          if (!school) return fail(404, 'NOT_FOUND', 'No published gym with that slug.');
          if (await saved().findFirst({ filters: { userId: user.documentId, schoolDocumentId: school.documentId } })) return ok({ saved: true as const });
          if ((await saved().count({ filters: { userId: user.documentId } })) >= MAX_SAVED_PER_USER) {
            return fail(429, 'TOO_MANY_SAVED', `You can save at most ${MAX_SAVED_PER_USER} gyms.`);
          }
          try {
            await saved().create({ data: { userId: user.documentId, schoolDocumentId: school.documentId } });
          } catch (e) {
            if (!isUniqueViolation(e)) throw e; // a double tap: already saved
          }
          return ok({ saved: true as const });
        },

        async remove(user: { documentId: string }, slug: string): Promise<ServiceResult<{ saved: false }>> {
          const school = await docs(strapi, SCHOOL).findFirst({ status: 'draft', filters: { slug }, fields: ['slug'] });
          if (school) await strapi.db.query(SAVED as any).deleteMany({ where: { userId: user.documentId, schoolDocumentId: school.documentId } });
          return ok({ saved: false as const });
        },

        /** The user deleted their account (auth.ts beforeDelete, S13): all their saved gyms go. */
        async forgetUser(userDocumentId: string): Promise<{ deleted: number }> {
          const { count } = await strapi.db.query(SAVED as any).deleteMany({ where: { userId: userDocumentId } });
          return { deleted: count };
        },
      };
    };
    ```

    (`remove` looks the gym up by its draft row so a gym that was unpublished can still be removed from the list.)
  - `server/src/plugins/matfinder/server/src/services/index.ts` — add `saved`.
  - `server/src/lib/auth.ts` — in `beforeDelete` (S13), after the reports line S16 added, add:

    ```ts
              await strapi.plugin('matfinder').service('saved').forgetUser(row.documentId);
    ```
  - `server/src/plugins/matfinder/server/src/controllers/saved.ts` — new:

    ```ts
    import type { Core } from '@strapi/strapi';
    import { reply } from '../domain/result';

    const userOf = (ctx: any) => ctx.state.user ?? ctx.state.auth?.credentials?.user ?? null;

    /** Content API (the app): the signed-in user's saved gyms. */
    export default ({ strapi }: { strapi: Core.Strapi }) => {
      const service = () => strapi.plugin('matfinder').service('saved');
      const withUser = (fn: (ctx: any, user: any) => Promise<void>) => async (ctx: any) => {
        const user = userOf(ctx);
        if (!user?.documentId) return ctx.unauthorized('Sign in to save gyms');
        await fn(ctx, user);
      };
      return {
        find: withUser(async (ctx, user) => {
          ctx.body = await service().list(user);
        }),
        save: withUser(async (ctx, user) => reply(ctx, await service().save(user, ctx.params.slug))),
        remove: withUser(async (ctx, user) => reply(ctx, await service().remove(user, ctx.params.slug))),
      };
    };
    ```

  - `server/src/plugins/matfinder/server/src/controllers/index.ts` — add `saved`.
  - `server/src/plugins/matfinder/server/src/routes/index.ts` — content-API routes:

    ```ts
    { method: 'GET', path: '/saved', handler: 'saved.find' },
    { method: 'PUT', path: '/saved/:slug', handler: 'saved.save' },
    { method: 'DELETE', path: '/saved/:slug', handler: 'saved.remove' },
    ```

  - `server/src/lib/permissions.ts` `GRANTS.authenticated` — add, with a comment `// Saved gyms (MatFinder plugin).`:
    `'plugin::matfinder.saved.find', 'plugin::matfinder.saved.save', 'plugin::matfinder.saved.remove',`.
  - `server/src/lib/indexes.ts` — add to the `indexes` array, after the reports entry:
    `` { unique: true, sql: `CREATE UNIQUE INDEX IF NOT EXISTS matfinder_saved_gyms_uq ON ${t('matfinder_saved_gyms')} (user_id, school_document_id)` }, ``
    (same ⚠️ on column names as the reports step; same scratch-database check).
- **Data:** a new empty table `matfinder_saved_gyms` and one unique index.
- **Callers updated:** `server/src/lib/auth.ts` `beforeDelete` (above). Mobile caller: UX-9. CORS: no change;
  `server/config/middlewares.ts` doesn't set `methods`, so Strapi's defaults, which include `PUT` and `DELETE`, apply
  (*Current state*).
- **Verify:**
  - Scratch-database check as in UX-3 step 1, for `.schema matfinder_saved_gyms` and `matfinder_saved_gyms_uq`.
  - `server/tests/api.test.ts`, new `describe('saved gyms')`:

    ```ts
    const call = (method: string, path: string, cookie?: string) => fetch(`${API}/api/matfinder${path}`, { method, headers: cookie ? { cookie } : {} });
    it('saves, lists, de-duplicates and removes; signed-out calls are refused; one user never sees another’s list', async () => {
      expect((await call('GET', '/saved')).status).toBeGreaterThanOrEqual(401);
      expect((await call('PUT', '/saved/sample-summerlin-bjj-demo')).status).toBeGreaterThanOrEqual(401);
      const a = await signUp();
      const b = await signUp();
      expect((await call('PUT', '/saved/no-such-gym', a)).status).toBe(404);
      expect((await call('PUT', '/saved/sample-summerlin-bjj-demo', a)).status).toBe(200);
      expect((await call('PUT', '/saved/sample-summerlin-bjj-demo', a)).status).toBe(200);
      const list = await (await call('GET', '/saved', a)).json();
      expect(list.items.map((g: { slug: string }) => g.slug)).toEqual(['sample-summerlin-bjj-demo']);
      expect(list.items[0]).toMatchObject({ name: expect.any(String), city: { slug: 'las-vegas' } });
      expect((await (await call('GET', '/saved', b)).json()).items).toEqual([]);
      expect((await call('DELETE', '/saved/sample-summerlin-bjj-demo', a)).status).toBe(200);
      expect((await (await call('GET', '/saved', a)).json()).items).toEqual([]);
    });
    ```

  - Account deletion (C-4 of checkpoint C): add to S13's `describe('account deletion (C15)')`. It reads the throwaway
    test database read-only through `better-sqlite3` (a direct dependency, `server/package.json:39`); the integration
    tests in one file run one after another, so the row count is stable:

    ```ts
    it("deletes the user's saved gyms", async (ctx) => {
      if (process.env.API_URL && !process.env.API_URL.includes(':1342')) return ctx.skip(); // reads the local test DB
      const db = new Database('.tmp/test.db', { readonly: true });
      const count = () => (db.prepare('SELECT COUNT(*) AS n FROM matfinder_saved_gyms').get() as { n: number }).n;
      const email = `it-delsave-${randomBytes(5).toString('hex')}@example.test`;
      const password = randomBytes(12).toString('hex');
      const up = await post('/api/auth/sign-up/email', { name: 'Saver', email, password });
      const cookie = up.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
      expect((await fetch(`${API}/api/matfinder/saved/sample-summerlin-bjj-demo`, { method: 'PUT', headers: { cookie } })).status).toBe(200);
      const before = count();
      expect((await post('/api/auth/delete-user', { password }, cookie)).status).toBe(200);
      expect(count()).toBe(before - 1);
      db.close();
    });
    ```

    Add `import Database from 'better-sqlite3';` at the top of `api.test.ts`. The path is relative to `server/`, where
    vitest runs, and matches `DATABASE_FILENAME` in `scripts/test-server.sh`. The first line skips it when `API_URL` points at
    another server.
  - `cd server && npm run typecheck && npm run build:plugin && npm run test:integration:isolated` → pass.
- **Done when:** the saved-gyms integration test and the deletion test pass, including the cross-user negative
  check.
- **Rollback:** revert the commit. **This deletes data:** removing the `saved-gym` content type makes Strapi's schema
  sync drop the `matfinder_saved_gyms` table, with every user's saved gyms, at the next boot
  (`@strapi/database/dist/schema/diff.js:337–358`). Back up first if they matter (*Deployment* 2). No manual SQL is
  needed. The three grant rows stay, harmless.

### S18 — Notice, "verified" and source on the preview; drop-in and trial chips (mobile) (UX-5)

- **Why:** G1 (UX), checkpoint A C3, C6, C19 (and N13: "Members only" reads as "no trial"). Needs UX-2 deployed or
  running locally.
- **Decisions taken (copy):**
  - "Members only" becomes **"No drop-ins"** everywhere it appears (preview chip, list card chip, checklist). A gym
    with `freeTrial` also gets a **"Free first class"** chip, so "no drop-ins" and "trial available" read separately.
  - The verified line on the preview reuses the gym page's wording: "Schedule verified Sep 15, 2026", "… (may be out of
    date)" after 90 days, "Schedule not verified yet".
  - Source line: "Added by MatFinder's AI agent from the gym's web pages" when `addedFromWeb`, otherwise
    "Added by the MatFinder team".
  - The notice is a warning-coloured row with an `alert-circle-outline` icon, the notice text as written, at the top of
    the preview (under the name) and of the gym page (under the header).
- **Files:**
  - `mobile/lib/api/schools.ts`
    - `DirectorySchool` (lines 10–29): add after `claimed`:

      ```ts
      /** "Schedule verified" date (YYYY-MM-DD), set only by a person; null when never verified. */
      lastVerifiedAt: string | null;
      /** The AI agent added this gym from the web (not the team by hand). */
      addedFromWeb: boolean;
      /** The gym offers a free first class. */
      freeTrial: boolean;
      /** A short notice from the gym while it applies ("Closed Nov 27"), else null. */
      notice: string | null;
      ```

    - `SchoolPage` (lines 71–105): add `addedFromWeb: boolean;` and `notice: string | null;` after `lastVerifiedAt`.
  - `mobile/lib/verified.ts` — new (moves the date logic out of `SchoolHeader.tsx` so the preview can share it):

    ```ts
    export const STALE_DAYS = 90;

    /** `2026-09-15` → `Sep 15, 2026` (a plain date: no time zone shift). */
    export function formatDate(date: string): string {
      const [y, m, d] = date.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    }

    /** "Schedule verified Sep 15, 2026", with "(may be out of date)" after 90 days, or "Schedule not verified yet". */
    export function verifiedLine(lastVerifiedAt: string | null, today: string | null): { text: string; stale: boolean } {
      if (!lastVerifiedAt) return { text: 'Schedule not verified yet', stale: false };
      const stale = !!today && (Date.parse(today) - Date.parse(lastVerifiedAt)) / 86_400_000 > STALE_DAYS;
      return { text: `Schedule verified ${formatDate(lastVerifiedAt)}${stale ? ' (may be out of date)' : ''}`, stale };
    }

    export const sourceLine = (addedFromWeb: boolean) =>
      addedFromWeb ? "Added by MatFinder's AI agent from the gym's web pages" : 'Added by the MatFinder team';
    ```

  - `mobile/lib/verified.test.ts` — new: `verifiedLine(null, '2026-10-29')` → `{ text: 'Schedule not verified yet', stale: false }`;
    `verifiedLine('2026-09-15', '2026-10-29')` → `{ text: 'Schedule verified Sep 15, 2026', stale: false }`;
    `verifiedLine('2026-06-01', '2026-10-29')` → stale `true` and text ending `(may be out of date)`;
    `sourceLine(true)` / `sourceLine(false)` → the two strings above. (`mobile/vitest.config.mts` already includes
    `lib/**/*.test.ts`.)
  - `mobile/components/school/SchoolHeader.tsx`
    - Delete `STALE_DAYS` and `formatDate` (lines 8–14); import `{ verifiedLine, sourceLine }` from `@/lib/verified`.
      Check for other importers of `formatDate` from this file first:
      `grep -rn "SchoolHeader'" mobile/app mobile/components mobile/lib` — if any file imports `formatDate` from it,
      point it at `@/lib/verified`.
    - Replace lines 24–25 and the text on line 36 with `const v = verifiedLine(school.lastVerifiedAt, today);` and
      `{v.text}`; use `v.stale` where `stale` was used.
    - Under the verified row (after line 38), add
      `<Text style={styles.source}>{sourceLine(school.addedFromWeb)}</Text>` with style
      `source: { ...t.type.body, fontSize: 13, color: t.colors.textSecondary }`.
  - `mobile/components/school/NoticeBanner.tsx` — new:

    ```tsx
    import { Ionicons } from '@expo/vector-icons';
    import { Text, View } from 'react-native';
    import { makeStyles, useTheme } from '@/theme/ThemeProvider';

    /** The gym's own notice while it applies ("Closed Nov 27 for Thanksgiving"). Renders nothing without one. */
    export function NoticeBanner({ notice }: { notice: string | null }) {
      const styles = useStyles();
      const { colors } = useTheme();
      if (!notice) return null;
      return (
        <View role="alert" accessibilityLabel={`Notice: ${notice}`} style={styles.row}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
          <Text style={styles.text}>{notice}</Text>
        </View>
      );
    }

    const useStyles = makeStyles((t) => ({
      row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, alignSelf: 'flex-start', backgroundColor: t.colors.warningBg, borderRadius: t.radii.chip, paddingHorizontal: 8, paddingVertical: 4 },
      text: { ...t.type.bodySemibold, fontSize: 14, color: t.colors.warning, flexShrink: 1 },
    }));
    ```

    (`colors.warning`, `colors.warningBg` and `radii.chip` already exist: `SchoolHeader.tsx:34, 49`.)
  - `mobile/app/schools/[slug]/index.tsx` — after `<SchoolHeader … />` (line 116) add `<NoticeBanner notice={s.notice} />`
    and import it.
  - `mobile/components/explore/SchoolPreview.tsx`
    - After the `head` view (line 83) add `<NoticeBanner notice={school.notice} />`.
    - Chips (lines 89–90): replace the "Members only" chip with
      `{school.visitorsWelcome === false && <Chip label="No drop-ins" icon="lock-closed-outline" />}` and add after it
      `{school.freeTrial && <Chip label="Free first class" />}`.
    - After the chips view (line 95), add:

      ```tsx
      <View style={styles.trust}>
        <Text style={[styles.trustText, verified.stale && styles.stale]}>{verified.text}</Text>
        <Text style={styles.trustText}>{sourceLine(school.addedFromWeb)}</Text>
      </View>
      ```

      with `const verified = verifiedLine(school.lastVerifiedAt, now.localDate);` near line 69, imports from
      `@/lib/verified` and `../school/NoticeBanner`, and styles
      `trust: { gap: 2, marginTop: 10 }`, `trustText: { ...t.type.body, fontSize: 13, color: t.colors.textSecondary }`,
      `stale: { color: t.colors.warning }`.
  - `mobile/components/explore/SchoolCard.tsx:11` — `"Members only"` → `"No drop-ins"`. Update the comment on line 9 to
    "no drop-ins".
  - `mobile/lib/week.ts:132` — `{ ok: false, strong: 'No drop-ins', rest: ': ask before you visit' }`. The free first
    class isn't repeated here: the drop-in item below it already shows "First class free" or ", or your first class
    free" (`week.ts:134–142`).
  - `mobile/lib/week.test.ts:116` — expected item becomes `{ ok: false, strong: 'No drop-ins', rest: ': ask before you visit' }`;
    add one case with `visitorsWelcome: false, freeTrial: true` and no drop-in fee, expecting exactly one item whose
    `strong` mentions the free class (`'First class free'`).
- **Data:** none.
- **Callers updated:** every reader of `DirectorySchool` compiles with the wider type (it only adds fields):
  `mobile/app/index.tsx`, `mobile/lib/filters.ts`, `mobile/lib/filters.test.ts` (its `school()` fixture builder must
  add the four new fields with defaults `lastVerifiedAt: null, addedFromWeb: false, freeTrial: false, notice: null`, or
  `tsc` fails), `mobile/lib/explore.ts`, `SchoolCard.tsx`, `SchoolPreview.tsx`, `mobile/hooks/useDirectory.ts`.
  `mobile/lib/gym-chat.test.ts` builds a `SchoolPage` pricing only — check with `tsc`; add `addedFromWeb: false,
  notice: null` to any full `SchoolPage` fixture `tsc` flags.
- **Verify:**
  - `cd mobile && npm run typecheck && npm run test:unit` → pass.
  - `mobile/e2e/explore-to-school.spec.ts`: after the preview opens (the step that clicks a gym in the list), add
    `await expect(page.getByText(/^Schedule (verified|not verified yet)/).first()).toBeVisible();` and
    `await expect(page.getByText(/^Added by (the MatFinder team|MatFinder's AI agent)/).first()).toBeVisible();`.
    The sample seed has no notices, so no notice assertion here (covered by the server test in UX-2).
  - `cd mobile && npm run test:e2e` → pass (it starts the throwaway Strapi on :1342; stop `npm run develop` in
    `server/` first).
- **Done when:** the preview shows the verified and source lines, "Members only" no longer appears anywhere in
  `mobile/` (`grep -rn "Members only" mobile/app mobile/components mobile/lib` → no output), and all mobile suites pass.
- **Rollback:** revert the commit.

### S19 — "Open mat" filter (mobile) (UX-6)

- **Why:** G1 (UX), checkpoint A C16 / A-19: 01's success scene is "an open mat tonight", and open mats can't be
  filtered.
- **Decision taken:** a toggle chip **"Open mat"** matching gyms whose week includes an `open_mat` class
  (`programs` includes `'open_mat'`). Combined with "Training today" it does **not** mean "an open mat today" (that
  would need today's class type rule, and "Training today" counts any class); it narrows to gyms that run open mats.
  URL param `openmat=1`. Placed after "Visitors welcome".
- **Files:**
  - `mobile/lib/filters.ts`
    - Line 4 comment: `?q=&today=1&visitors=1&openmat=1&style=gi|nogi`.
    - `Filters` (line 5): add `openMat: boolean`; `NO_FILTERS` (line 7): `openMat: false`.
    - `parseFilters`: `openMat: first(params.openmat) === '1',`.
    - `filtersToParams`: `openmat: f.openMat ? '1' : undefined,`.
    - `hasActiveFilters`: `… || f.openMat || …`.
    - `applyFilters`: add `&& (!f.openMat || s.programs.includes('open_mat'))`.
  - `mobile/components/explore/FilterBar.tsx:38` — after the Visitors toggle add
    `{toggle('Open mat', filters.openMat, { ...filters, openMat: !filters.openMat })}`; update the comment on line 6.
  - `mobile/lib/filters.test.ts`
    - Give two fixtures `programs: ['open_mat']` (`jj` and `hg`) via the `school()` builder.
    - New case: `applyFilters(schools, { ...NO_FILTERS, openMat: true }, noon)` → `['jj', 'hg']`.
    - Lines 60–62 build full `Filters` literals: add `openMat: false` to each.
    - Lines 70 and 74: add `openMat: false` to the expected objects; add a case
      `parseFilters({ openmat: '1' })` → `{ ...NO_FILTERS, openMat: true }` and
      `filtersToParams({ ...NO_FILTERS, openMat: true }).openmat` → `'1'`.
- **Data:** none. **Callers updated:** `mobile/app/index.tsx`, two edits:
  - line 99, the map camera's key, so turning Open mat on or off re-fits the map like the other filters:

    ```ts
    const filtersKey = `${filters.q.trim()}|${filters.today}|${filters.visitors}|${filters.style ?? ''}|${filters.openMat}`;
    ```

  - line 40, the search params type: add `openmat?: string;` after `style?: string;`.
  It uses `parseFilters`, `filtersToParams`, `hasActiveFilters`, `NO_FILTERS` and `FilterBar` through these
  functions otherwise, with no other edit.
- **Verify:**
  - `cd mobile && npm run typecheck && npm run test:unit` → pass.
  - In `mobile/e2e/explore-to-school.spec.ts`, before the "Training today" step, add:

    ```ts
    await page.locator('[aria-label="Open mat"]').click();
    await expect(page).toHaveURL(/openmat=1/);
    const openMat = directory.schools.filter((s) => (s as any).programs?.includes('open_mat'));
    await expect.poll(() => listNames(page)).toEqual(openMat.map((s) => s.name).sort());
    await page.locator('[aria-label="Open mat"]').click();
    await expect(page).not.toHaveURL(/openmat=1/);
    ```

    and add `programs: string[]` to the local `DirectorySchool` type on line 5 (then drop the `as any`).
  - `cd mobile && npm run test:e2e` → pass.
- **Done when:** the Open mat chip filters the list to the API's open-mat gyms and round-trips through the URL.
- **Rollback:** revert the commit.

### S20 — "Add to calendar" as an .ics download (mobile web) (UX-7)

- **Why:** G1 (UX), checkpoint A C18 / N12: Add to calendar is Google-only.
- **Decisions taken:**
  - Web only. The native app has no file-writing or sharing package (`mobile/package.json` has neither
    `expo-file-system` nor `expo-sharing`), and adding one is a native rebuild; native keeps the Google link.
  - The existing "Add to calendar" button stays the Google link (the e2e test at
    `mobile/e2e/explore-to-school.spec.ts:77` looks for it). Under the actions row, on web, a text link:
    **"Apple Calendar or Outlook? Download .ics"**.
  - Times in the file are UTC (`…Z`), converted from the city's time zone, so no `VTIMEZONE` block is needed and every
    calendar app places it right.
- **Files:**
  - `mobile/lib/week.ts` — add after `calendarUrl` (line ~121):

    ```ts
    /** Minutes the time zone is ahead of UTC at `utcMs` (negative west of Greenwich). */
    function tzOffsetMinutes(utcMs: number, timeZone: string): number {
      const p = Object.fromEntries(
        new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
          .formatToParts(new Date(utcMs))
          .map((x) => [x.type, x.value]),
      );
      return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - utcMs) / 60_000;
    }

    /** A city-local date and `HH:mm` as the UTC instant (two passes settle DST edges). */
    export function zonedToUtc(date: string, hhmm: string, timeZone: string): Date {
      const [y, m, d] = date.split('-').map(Number);
      const [h, mi] = hhmm.split(':').map(Number);
      const wall = Date.UTC(y, m - 1, d, h, mi);
      const first = wall - tzOffsetMinutes(wall, timeZone) * 60_000;
      return new Date(wall - tzOffsetMinutes(first, timeZone) * 60_000);
    }

    const icsStamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
    /**
     * RFC 5545 line folding: a line longer than 75 octets (UTF-8 bytes, not characters) continues on the next line
     * after a space, which counts toward that line's 75. Never splits a character.
     */
    const utf8 = new TextEncoder();
    const fold = (line: string) => {
      const out: string[] = [];
      let cur = '';
      let bytes = 0;
      for (const ch of line) {
        const n = utf8.encode(ch).length;
        const limit = out.length ? 74 : 75;
        if (bytes + n > limit) {
          out.push(cur);
          cur = '';
          bytes = 0;
        }
        cur += ch;
        bytes += n;
      }
      out.push(cur);
      return out.join('\r\n ');
    };

    /** One class as an .ics file (Apple Calendar, Outlook…), same fields as `calendarUrl`. */
    export function calendarIcs(e: { uid: string; title: string; date: string; start: string; end: string; timeZone: string; location?: string | null; details?: string }, now = new Date()): string {
      const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//MatFinder//EN',
        'BEGIN:VEVENT',
        `UID:${e.uid}@matfinder`,
        `DTSTAMP:${icsStamp(now)}`,
        `DTSTART:${icsStamp(zonedToUtc(e.date, e.start, e.timeZone))}`,
        `DTEND:${icsStamp(zonedToUtc(e.date, e.end, e.timeZone))}`,
        `SUMMARY:${icsText(e.title)}`,
        ...(e.location ? [`LOCATION:${icsText(e.location)}`] : []),
        ...(e.details ? [`DESCRIPTION:${icsText(e.details)}`] : []),
        'END:VEVENT',
        'END:VCALENDAR',
      ];
      return lines.map(fold).join('\r\n') + '\r\n';
    }
    ```

  - `mobile/lib/week.test.ts`, in `describe('add to calendar')`:

    ```ts
    it('zonedToUtc follows daylight saving time', () => {
      expect(zonedToUtc('2026-10-12', '19:00', 'America/Los_Angeles').toISOString()).toBe('2026-10-13T02:00:00.000Z');
      expect(zonedToUtc('2026-12-01', '19:00', 'America/Los_Angeles').toISOString()).toBe('2026-12-02T03:00:00.000Z');
    });
    it('an .ics event in UTC, escaped', () => {
      const ics = calendarIcs({ uid: 'u1', title: 'Open mat at Summerlin, Demo', date: '2026-10-12', start: '19:00', end: '20:30', timeZone: 'America/Los_Angeles', location: '1 Main St' }, new Date('2026-10-01T00:00:00Z'));
      expect(ics).toContain('DTSTART:20261013T020000Z\r\n');
      expect(ics).toContain('DTEND:20261013T033000Z\r\n');
      expect(ics).toContain('SUMMARY:Open mat at Summerlin\\, Demo\r\n');
      expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    });
    it('folds long lines at 75 UTF-8 bytes, never inside a character', () => {
      const ics = calendarIcs({ uid: 'u2', title: `Open mat at ${'Académie Jiu-Jitsu Brésilienne '.repeat(4)}`, date: '2026-10-12', start: '19:00', end: '20:30', timeZone: 'America/Los_Angeles' }, new Date('2026-10-01T00:00:00Z'));
      const bytes = new TextEncoder();
      for (const line of ics.split('\r\n')) expect(bytes.encode(line).length).toBeLessThanOrEqual(75);
      expect(ics.replace(/\r\n /g, '')).toContain('Académie Jiu-Jitsu Brésilienne');
    });
    ```

    (import `calendarIcs` and `zonedToUtc` in the file's existing import on line 3.)
  - `mobile/components/school/NextClassCard.tsx`
    - Import `Platform`, `Pressable` from `react-native` and `calendarIcs` from `@/lib/week`.
    - Build the event once and reuse it for both links: replace lines 47–55 with

      ```ts
      const event = {
        title: `${classTypeLabel(s.classType)} at ${school.name}`,
        date: addDays(now.localDate, next.daysAhead),
        start: s.start,
        end: s.end,
        timeZone: school.city?.timezone ?? 'UTC',
        location: school.location?.address,
        details: [styleLabel(s.style), s.notes].filter(Boolean).join(' · '),
      };
      const calendar = calendarUrl(event);
      const downloadIcs = () => {
        const ics = calendarIcs({ ...event, uid: `${school.slug}-${event.date}-${s.start.replace(':', '')}` });
        const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `${school.slug}-${event.date}.ics`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      };
      ```

    - After the actions view (line 80), add:

      ```tsx
      {Platform.OS === 'web' && (
        <Pressable accessibilityRole="button" accessibilityLabel="Download .ics" onPress={downloadIcs} style={styles.ics}>
          <Text style={styles.icsText}>
            Apple Calendar or Outlook? <Text style={styles.icsLink}>Download .ics</Text>
          </Text>
        </Pressable>
      )}
      ```

      with styles `ics: { marginTop: 10, alignSelf: 'flex-start' }`,
      `icsText: { ...t.type.body, fontSize: 13, color: t.colors.textSecondary }`,
      `icsLink: { ...t.type.bodySemibold, color: t.colors.redText, textDecorationLine: 'underline' }`.
      (`document` and `URL` are available on web; `SchoolTopBar.tsx:14–17` already uses `window`/`navigator` the same
      way, so the DOM types are in the project's `tsconfig`.)
- **Data:** none. **Callers updated:** none (`calendarUrl`'s signature is unchanged).
- **Verify:**
  - `cd mobile && npm run typecheck && npm run test:unit` → pass.
  - `mobile/e2e/explore-to-school.spec.ts`, after line 77:

    ```ts
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download .ics' }).click()]);
    expect(download.suggestedFilename()).toMatch(/\.ics$/);
    const ics = await (await import('node:fs/promises')).readFile((await download.path())!, 'utf8');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toMatch(/DTSTART:\d{8}T\d{6}Z/);
    ```

    (This needs the gym page's next-class card to have a class; the sample gym the test opens has a schedule.)
  - `cd mobile && npm run test:e2e` → pass.
- **Done when:** on the web build the gym page offers the .ics link and the downloaded file parses as above.
- **Rollback:** revert the commit.

### S21 — "Report a problem" in the app (mobile) (UX-8)

- **Why:** G1 (UX), checkpoint A C5. Needs UX-3.
- **Decisions taken (copy):**
  - Entry points: on the preview, under the trust lines (UX-5), a link **"Something wrong? Report a problem"**; on the
    gym page, after the Contact section, the same link. Both open `/schools/[slug]/report`, which sends a signed-out
    user to sign in and back (same pattern as `/schools/[slug]/claim`).
  - The screen: title "Report a problem", the gym name, a radio group of the five kinds with labels
    "Schedule is wrong", "Price is wrong", "Closed or moved", "Contact details are wrong", "Something else"; an
    text field labelled "What's wrong?", with the hint "Optional, except for Something else" under it (max 1000, placeholder "For example: the Monday open mat is now at
    8 pm"); button "Send report" ("Sending…" while pending); hint "Only the MatFinder team sees your report."
  - "Something else" requires a message: the button shows the inline error "Tell us what's wrong." when empty.
  - Success: "Thanks, we'll check it" / "We'll look at {gym name} and fix the listing if it's wrong." and a
    "Back to the gym" button.
  - Server errors: `REPORT_OPEN` → "You already reported a problem with this gym. We'll look at it soon.";
    `TOO_MANY_REPORTS` → "You have several open reports. We'll get to them first."; otherwise the server message.
- **Files:**
  - `mobile/lib/api/reports.ts` — new:

    ```ts
    import { apiPost } from './client';

    export type ReportKind = 'schedule' | 'price' | 'closed' | 'contact' | 'other';
    export type NewReport = { schoolSlug: string; kind: ReportKind; message?: string };

    /** Report a problem with a gym (MatFinder plugin, account only). Throws ApiError with code REPORT_OPEN… */
    export function createReport(report: NewReport): Promise<{ status: 'open' }> {
      return apiPost('/api/matfinder/reports', report);
    }
    ```

  - `mobile/lib/reports.ts` — new: `REPORT_KINDS: { value: ReportKind; label: string }[]` with the five labels above,
    in that order; `reportErrorMessage(code: string | undefined, fallback: string): string` mapping the two codes to
    the copy above (same shape as `claimErrorMessage` in `mobile/lib/claims.ts:22–33`); and
    `messageProblem(kind: ReportKind, message: string): string | null` → `"Tell us what's wrong."` when
    `kind === 'other' && !message.trim()`, else `null`.
  - `mobile/lib/reports.test.ts` — new: the two error codes, the fallback, and `messageProblem` for `other` empty /
    `other` filled / `schedule` empty.
  - `mobile/app/schools/[slug]/report.tsx` — new screen, built from `app/schools/[slug]/claim.tsx` (same imports,
    `useSession` gate with `<Redirect href={{ pathname: '/sign-in', params: { redirect: \`/schools/${slug}/report\` } }} />`,
    `useSchool(slug)` for the name, `useMutation` calling `createReport`, the radio group pattern from claim.tsx
    lines 115–130 using `REPORT_KINDS`, the multiline input pattern from lines 150–163, the success card from lines
    46–63 with the copy above, and the same `useStyles`). Under the input, a hint line "Optional, except for Something else", styled
    `{ ...t.type.body, fontSize: 13, color: t.colors.textSecondary }` (the same as `ReportLink`'s text). Default kind:
    `schedule`. `Stack.Screen` title
    "Report a problem"; on success "Report sent".
  - `mobile/components/school/ReportLink.tsx` — new:

    ```tsx
    import { Ionicons } from '@expo/vector-icons';
    import { router } from 'expo-router';
    import { Pressable, Text } from 'react-native';
    import { makeStyles, useTheme } from '@/theme/ThemeProvider';

    /** "Something wrong? Report a problem": opens the report screen (which asks a signed-out user to sign in). */
    export function ReportLink({ slug }: { slug: string }) {
      const styles = useStyles();
      const { colors } = useTheme();
      return (
        <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/schools/[slug]/report', params: { slug } })} style={styles.row}>
          <Ionicons name="flag-outline" size={15} color={colors.textSecondary} />
          <Text style={styles.text}>
            Something wrong? <Text style={styles.link}>Report a problem</Text>
          </Text>
        </Pressable>
      );
    }

    const useStyles = makeStyles((t) => ({
      row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, alignSelf: 'flex-start' },
      text: { ...t.type.body, fontSize: 13, color: t.colors.textSecondary },
      link: { ...t.type.bodySemibold, color: t.colors.redText, textDecorationLine: 'underline' },
    }));
    ```

  - `mobile/components/explore/SchoolPreview.tsx` — after the trust view (UX-5), add `<ReportLink slug={school.slug} />`.
  - `mobile/app/schools/[slug]/index.tsx` — after `<ContactList … />` (line 169), add `<ReportLink slug={s.slug} />`.
- **Data:** none. **Callers updated:** none existing. Typed routes (`experiments.typedRoutes` in `mobile/app.json`)
  are generated by the dev server, not by `expo export`. If `tsc` reports `'/schools/[slug]/report'` as an unknown
  route, run `cd mobile && npx expo customize tsconfig.json`, which generates the route types without the dev server
  (https://docs.expo.dev/router/reference/typed-routes/), then `npm run typecheck` again.
  - `mobile/app/_layout.tsx` — register the screen after the `claim` one (line 49), the same way:
    `<Stack.Screen name="schools/[slug]/report" options={{ title: 'Report a problem' }} />`.
- **Verify:**
  - `cd mobile && npm run typecheck && npm run test:unit` → pass.
  - `mobile/e2e/explore-to-school.spec.ts`, after the signed-in gym page checks (before the claim step):

    ```ts
    await page.getByRole('link', { name: /Report a problem/ }).click();
    await expect(page.getByText('Report a problem').first()).toBeVisible();
    await page.getByRole('radio', { name: 'Schedule is wrong' }).click();
    await page.getByLabel("What's wrong?").fill('E2E: Monday open mat moved (Demo)');
    await page.getByRole('button', { name: 'Send report' }).click();
    await expect(page.getByText("Thanks, we'll check it")).toBeVisible();
    await page.getByRole('button', { name: 'Back to the gym' }).click();
    ```

    Give the text input `accessibilityLabel="What's wrong?"`.
  - `cd mobile && npm run test:e2e` → pass.
- **Done when:** a signed-in user can send a report from the gym page and sees the confirmation; a signed-out user is
  sent to sign in first.
- **Rollback:** revert the commit.

### S22 — Saved gyms in the app (mobile) (UX-9)

- **Why:** G1 (UX), checkpoint A C12. Needs UX-4.
- **Decisions taken (copy and placement):**
  - A bookmark `RoundButton` in the gym page's top bar, left of Share: icon `bookmark-outline` / label "Save gym"
    when not saved; icon `bookmark` / label "Saved. Tap to remove" when saved. (The gym page is signed-in only, so the
    button needs no signed-out state.)
  - The Account screen, signed in, gets a **"Saved gyms"** section above Appearance: one row per gym (name, then
    "neighborhood · city" in secondary text), tapping opens the gym page. Empty: "Tap the bookmark on a gym's page to
    save it here."
  - Sign-out removes the saved list from the cache, like the gated school pages.
- **Files:**
  - `mobile/lib/api/client.ts`
    - Line 61: the method union becomes `'GET' | 'POST' | 'PUT' | 'DELETE'`.
    - Add after `apiPost` (line 59):

      ```ts
      /** PUT to a Strapi path (no body), with the session like apiGet. */
      export async function apiPut<T>(path: string): Promise<T> {
        return request<T>(path, { method: 'PUT' });
      }

      /** DELETE a Strapi path, with the session like apiGet. */
      export async function apiDelete<T>(path: string): Promise<T> {
        return request<T>(path, { method: 'DELETE' });
      }
      ```

  - `mobile/lib/api/saved.ts` — new:

    ```ts
    import { apiDelete, apiGet, apiPut } from './client';

    export type SavedGym = { slug: string; name: string; neighborhood: string | null; city: { slug: string; name: string } | null };

    export const getSaved = () => apiGet<{ items: SavedGym[] }>('/api/matfinder/saved');
    export const saveGym = (slug: string) => apiPut<{ saved: true }>(`/api/matfinder/saved/${encodeURIComponent(slug)}`);
    export const unsaveGym = (slug: string) => apiDelete<{ saved: false }>(`/api/matfinder/saved/${encodeURIComponent(slug)}`);
    ```

  - `mobile/hooks/useSaved.ts` — new:

    ```ts
    import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
    import { getSaved, saveGym, unsaveGym } from '@/lib/api/saved';
    import { useSession } from './useSession';

    /** The signed-in user's saved gyms, and a toggle for one gym. */
    export function useSaved() {
      const session = useSession();
      return useQuery({ queryKey: ['saved'], queryFn: getSaved, enabled: !!session.data?.user });
    }

    export function useToggleSaved(slug: string) {
      const queryClient = useQueryClient();
      const saved = useSaved();
      const isSaved = !!saved.data?.items.some((g) => g.slug === slug);
      const toggle = useMutation({
        mutationFn: () => (isSaved ? unsaveGym(slug) : saveGym(slug)),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['saved'] }),
      });
      return { isSaved, toggle };
    }
    ```

  - `mobile/components/school/SchoolTopBar.tsx` — in the `right` view (line 40), before the Share `RoundButton`:

    ```tsx
    <RoundButton
      label={isSaved ? 'Saved. Tap to remove' : 'Save gym'}
      icon={isSaved ? 'bookmark' : 'bookmark-outline'}
      onPress={() => !toggle.isPending && toggle.mutate()}
    />
    ```

    with `const { isSaved, toggle } = useToggleSaved(slug);` at the top of `SchoolTopBar` and the import from
    `@/hooks/useSaved`. If `right` has no `gap` style, add `gap: 8` to it.
  - `mobile/app/account.tsx`
    - In the signed-in branch, after the signed-in `Card` (line 64), render `<SavedGyms />`, a local component in the
      same file:

      ```tsx
      function SavedGyms() {
        const styles = useStyles();
        const saved = useSaved();
        const items = saved.data?.items ?? [];
        return (
          <>
            <SectionTitle>Saved gyms</SectionTitle>
            {saved.isPending ? null : items.length === 0 ? (
              <Text style={styles.hint}>Tap the bookmark on a gym&apos;s page to save it here.</Text>
            ) : (
              items.map((g) => (
                <Pressable key={g.slug} accessibilityRole="link" accessibilityLabel={g.name} onPress={() => router.push({ pathname: '/schools/[slug]', params: { slug: g.slug } })} style={styles.savedRow}>
                  <Text style={styles.savedName}>{g.name}</Text>
                  <Text style={styles.hint}>{[g.neighborhood, g.city?.name].filter(Boolean).join(' · ')}</Text>
                </Pressable>
              ))
            )}
          </>
        );
      }
      ```

      Styles: `savedRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: t.colors.outline }`,
      `savedName: { ...t.type.bodySemibold, fontSize: 16, color: t.colors.text }`. Import `useSaved`.
      Because the signed-in branch is a single `Card` expression inside a ternary (lines 58–74), wrap it as
      `<>{card}<SavedGyms /></>`.
    - `signOut` (line 51): add `queryClient.removeQueries({ queryKey: ['saved'] });`. (If a later change for B nit N1 has
      already replaced these calls with `queryClient.clear()`, nothing to add.)
  - `mobile/app/schools/[slug]/index.tsx:81` — the "Sign in again" handler: add the same
    `queryClient.removeQueries({ queryKey: ['saved'] });` (same N1 caveat).
- **Data:** none. **Callers updated:** `request()` in `client.ts` is shared; widening its method union changes no
  existing call.
- **Verify:**
  - `cd mobile && npm run typecheck && npm run test:unit` → pass.
  - `mobile/e2e/explore-to-school.spec.ts`, on the signed-in gym page:

    ```ts
    await page.getByRole('button', { name: 'Save gym' }).click();
    await expect(page.getByRole('button', { name: 'Saved. Tap to remove' })).toBeVisible();
    await page.goto('/account');
    await expect(page.getByRole('link', { name: target.name })).toBeVisible();
    await page.goBack();
    ```

    (`target` is the gym the test already opened, line 46.)
  - The cross-user negative test is in UX-4 (server).
  - `cd mobile && npm run test:e2e` → pass.
- **Done when:** saving a gym on its page lists it on Account, and removing it clears the list.
- **Rollback:** revert the commit.

### S23 — Installable web app (manifest) (UX-10)

- **Why:** G1 (UX), checkpoint A C13 / A-7: a home-screen icon is the cheapest return trigger for the web app, which
  is the only shipped client.
- **Decisions taken:** a static `manifest.webmanifest` and icons in `mobile/public/` (Expo copies `public/` into the
  web export), linked from a customized `public/index.html`. No service worker (offline isn't a goal; Chrome's install
  criteria no longer require one ⚠️ not verified for every browser; iOS "Add to Home Screen" uses
  `apple-touch-icon`). Names: `"name": "MatFinder"`, `"short_name": "MatFinder"`; colours from
  `mobile/theme/tokens.ts:96` (`bg` `#F4F1EA`) and `:114` (`redFill` `#D02621`).
- **Files:**
  - `mobile/public/index.html` — generate the default template with `cd mobile && npx expo customize public/index.html`
    (choose that file only), then add inside `<head>`:

    ```html
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
    <meta name="theme-color" content="#D02621" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="MatFinder" />
    ```

    ⚠️ not verified: that Expo SDK 57 with `"web": { "output": "single" }` (`mobile/app.json`) uses
    `public/index.html` as the template. Verify step 2 checks the exported `dist/index.html`. If the links are missing
    there, STOP and ask (deviation protocol); don't switch the output mode.
  - `mobile/public/manifest.webmanifest` — new:

    ```json
    {
      "name": "MatFinder",
      "short_name": "MatFinder",
      "description": "Find a Jiu-Jitsu class you can drop in on today.",
      "start_url": "/",
      "scope": "/",
      "display": "standalone",
      "background_color": "#F4F1EA",
      "theme_color": "#D02621",
      "icons": [
        { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
        { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
        { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
      ]
    }
    ```

  - Icons, generated from the existing 1024×1024 `mobile/assets/images/icon.png` with macOS `sips` (no new package):

    ```bash
    mkdir -p mobile/public/icons
    sips -z 192 192 mobile/assets/images/icon.png --out mobile/public/icons/icon-192.png
    sips -z 512 512 mobile/assets/images/icon.png --out mobile/public/icons/icon-512.png
    sips -z 180 180 mobile/assets/images/icon.png --out mobile/public/icons/apple-touch-icon.png
    ```

  - `mobile/e2e/serve.mjs` `TYPES` (line ~13): add `'.webmanifest': 'application/manifest+json',`.
- **Data:** none. **Callers updated:** none. Vercel serves static files before the SPA rewrite
  (`mobile/vercel.ts:24–25`), so `/manifest.webmanifest` and `/icons/*` are served as files. ⚠️ not verified: the
  `Content-Type` Vercel sends for `.webmanifest`; browsers accept the manifest regardless.
- **Verify:**
  1. `cd mobile && EXPO_PUBLIC_WEB_API_BASE= npx expo export -p web --clear` → exit 0.
  2. `node -e "const h=require('fs').readFileSync('mobile/dist/index.html','utf8'); if(!h.includes('rel=\"manifest\"')) process.exit(1)"` → exit 0
     (run from the repo root), and
     `node -e "const m=JSON.parse(require('fs').readFileSync('mobile/dist/manifest.webmanifest','utf8')); if(m.icons.length!==3||m.display!=='standalone') process.exit(1)"` → exit 0, and
     `ls mobile/dist/icons` lists the three PNGs.
  3. Add to `mobile/e2e/explore-to-school.spec.ts` (or a new `mobile/e2e/manifest.spec.ts`):

     ```ts
     test('the web app is installable: manifest linked and served', async ({ page, request }) => {
       await page.goto('/');
       await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
       const res = await request.get('/manifest.webmanifest');
       expect(res.status()).toBe(200);
       expect((await res.json()).name).toBe('MatFinder');
       expect((await request.get('/icons/icon-512.png')).status()).toBe(200);
     });
     ```

  4. `cd mobile && npm run test:e2e` → pass.
- **Done when:** the exported web build links and serves the manifest and icons, and the e2e check passes.
- **Rollback:** revert the commit (deletes `mobile/public/`).

### S24 — The app: a privacy page and "Delete account" (C15 app)

- **Why:** G1/C15 (A-10).
- **Depends on:** S13 (C15 server), deployed first (*Deployment* 4).
- **Decisions in this step:**
  - **Where the page is:** `/privacy`, linked from the Account screen and the sign-up form. It's readable signed out.
  - **What's on it:** only facts this spec could check in code or in 03 › Privacy. **The owner reviews the text
    before deploy.** It isn't legal advice, and it makes no promise the code doesn't keep. There's no contact line
    until the owner gives an address (open question).
  - **Deleting:** Account → "Delete account" opens an inline confirm card with the consequences, a password field and
    "Delete my account". It's inline because React Native Web has no native confirm dialog.
  - **After deleting:** every cached query is cleared (`queryClient.clear()`), the session is refetched, and the
    screen shows "Your account was deleted." above the guest card.
- **Files:**
  - `mobile/app/privacy.tsx`: new file.

    ```tsx
    import { ScrollView, Text, View } from 'react-native';
    import { RankBar, SectionTitle } from '@/components/kit';
    import { makeStyles } from '@/theme/ThemeProvider';

    // Owner to review before deploy. Facts from docs/designs/matfinder/03-requirements.md › Privacy and the code; not legal
    // text. Change it whenever what the app stores or sends changes.
    const UPDATED = 'YYYY-MM-DD'; // E8: the date of this commit

    const SECTIONS: { title: string; body: string[] }[] = [
      {
        title: 'Without an account',
        body: [
          'You can use the map, search and next sessions without an account. MatFinder keeps nothing about you then.',
          'Your light or dark setting is saved on your device only.',
          'Requests pass through our hosting providers, Strapi Cloud (the server) and Vercel (the web app), which keep their own request logs.',
        ],
      },
      {
        title: 'Your location',
        body: [
          'If you allow it, your location centers the map and shows how far each gym is. It is used on your device and is not sent to MatFinder’s server.',
          'The map comes from Mapbox, so Mapbox sees which area of the map you are looking at.',
        ],
      },
      {
        title: 'Your account',
        body: [
          'A free account shows full gym pages. It holds your name, your email and your password, which is stored only as a hash.',
          'A cookie (in the phone app, secure storage on your device) keeps you signed in for up to 30 days. Each sign-in is stored with your IP address and your browser or device type.',
        ],
      },
      {
        title: 'Claiming a gym',
        body: ['If you claim a gym, MatFinder keeps the name, email, phone number, role and message you send, so an admin can check you run it. Only MatFinder admins see them.'],
      },
      {
        title: 'Saved gyms and problem reports',
        body: [
          'Gyms you save are stored with your account so you can find them again.',
          'If you report a problem with a gym, MatFinder keeps the gym, the kind of problem and your message, linked to your account. Only MatFinder admins see reports.',
        ],
      },
      {
        title: 'Ask about this gym',
        body: [
          'When it is available, your questions and the chat so far are sent to Anthropic, whose AI model writes the answers.',
          'MatFinder’s logs record that you asked about a gym, but not what you asked.',
        ],
      },
      {
        title: 'What MatFinder doesn’t have',
        body: ['There is no analytics or advertising code in the app, and MatFinder sends you no email.'],
      },
      {
        title: 'Deleting your account',
        body: [
          'Go to Account, then Delete account. It removes your account and your saved gyms, and signs you out on every device. Claims still waiting for review are withdrawn, and your name, email and phone number are removed from every claim you made; a claim already accepted stays until an admin removes it. Reports you sent that are still open are deleted; resolved ones are kept without anything linking them to you. It can’t be undone.',
        ],
      },
    ];

    export default function PrivacyScreen() {
      const styles = useStyles();
      return (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <RankBar stripes={2} width={52} />
          <Text role="heading" style={styles.title}>
            Privacy
          </Text>
          <Text style={styles.updated}>Last updated {UPDATED}</Text>
          {SECTIONS.map((s) => (
            <View key={s.title} style={styles.section}>
              <SectionTitle>{s.title}</SectionTitle>
              {s.body.map((p) => (
                <Text key={p} style={styles.body}>
                  {p}
                </Text>
              ))}
            </View>
          ))}
        </ScrollView>
      );
    }

    const useStyles = makeStyles((t) => ({
      scroll: { flex: 1, backgroundColor: t.colors.bg },
      content: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: t.layout.gutter, paddingBottom: 48, gap: 16 },
      title: { ...t.type.display, fontSize: 34, lineHeight: 36, color: t.colors.text, marginTop: 8 },
      updated: { ...t.type.body, fontSize: 13, color: t.colors.textSecondary },
      section: { gap: 6 },
      body: { ...t.type.body, fontSize: 15, lineHeight: 22, color: t.colors.textSecondary },
    }));
    ```

    Each fact and its source:
    - Nothing kept without an account: there are no analytics (04 › Analytics).
    - Theme on the device: `theme/ThemeProvider` ("saved on this device", `account.tsx:16`).
    - Location: 03 › Privacy; `hooks/useUserLocation.ts`.
    - Password hash: Better Auth's credential account stores `password` as a hash (`ba_account.password`,
      `update-user.mjs:287` verifies against `account.password` as a hash).
    - 30 days: `auth.ts:16`.
    - IP and user agent: the `ba_session.ipAddress` and `userAgent` columns
      (`server/src/extensions/better-auth/content-types/session/schema.json`).
    - Claims: `claim/schema.json`; the admin board only (`services/claims.ts` `ADMIN_FIELDS`).
    - Chat logs: `services/gym-chat.ts:121–124`, which logs user, gym, timing and usage, not the question.
    - No email: 04 › Email.

  - `mobile/app/_layout.tsx`: after the `account` screen (line 52), add
    `<Stack.Screen name="privacy" options={{ title: 'Privacy' }} />`.
  - `mobile/app/account.tsx`:
    1. Imports:
       - Change the React Native import to
         `import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';`.
       - Change the theme import to `import { makeStyles, useTheme, type ThemePreference } from '@/theme/ThemeProvider';`.
         It's already imported this way; keep it.
    2. Add this component above `AccountScreen`:

       ```tsx
       /** "Delete account": an inline confirm with the password (C15). Better Auth deletes the account and its sessions. */
       function DeleteAccount({ onDeleted }: { onDeleted: () => void }) {
         const styles = useStyles();
         const { colors } = useTheme();
         const [open, setOpen] = useState(false);
         const [password, setPassword] = useState('');
         const [busy, setBusy] = useState(false);
         const [error, setError] = useState<string | null>(null);

         async function confirm() {
           if (busy || !password) return;
           setError(null);
           setBusy(true);
           const { error: err } = await authClient.deleteUser({ password });
           setBusy(false);
           if (err) return setError(err.code === 'INVALID_PASSWORD' ? "That password isn't right." : (err.message ?? 'Something went wrong. Try again.'));
           onDeleted();
         }

         if (!open) return <ActionButton label="Delete account" variant="outline" onPress={() => setOpen(true)} style={styles.action} />;
         return (
           <Card style={styles.card}>
             <Label tone="red">Delete account</Label>
             <Text style={styles.body}>
               {"This removes your account and your saved gyms, and signs you out on every device. Claims still waiting for review are withdrawn, and your name, email and phone number are removed from all your claims. It can't be undone."}
             </Text>
             <TextInput
               nativeID="delete-password"
               accessibilityLabel="Your password"
               style={styles.input}
               value={password}
               onChangeText={setPassword}
               placeholder="Your password"
               placeholderTextColor={colors.textDim}
               secureTextEntry
               autoComplete="current-password"
               onSubmitEditing={confirm}
             />
             {!!error && (
               <Text role="alert" style={styles.error}>
                 {error}
               </Text>
             )}
             <ActionButton label={busy ? 'Deleting…' : 'Delete my account'} onPress={confirm} disabled={busy || !password} style={styles.action} />
             <ActionButton
               label="Cancel"
               variant="outline"
               disabled={busy}
               onPress={() => {
                 setOpen(false);
                 setPassword('');
                 setError(null);
               }}
             />
           </Card>
         );
       }
       ```

    3. In `AccountScreen`:
       - After `const [signingOut, setSigningOut] = useState(false);`, add
         `const [deleted, setDeleted] = useState(false);`.
       - Add:

         ```tsx
           async function afterDelete() {
             // Nothing from the deleted account may stay on screen: gated gym pages, claim status, chat status.
             queryClient.clear();
             setDeleted(true);
             await session.refetch();
           }
         ```

       - In the JSX:
         - Right after the signed-in `</Card>` and inside the `user ? (…)` branch, wrap the branch in a fragment and
           add `<DeleteAccount onDeleted={afterDelete} />` after the card.
         - In the guest branch, put this before the guest `<Card>`, also wrapped in a fragment:

           ```tsx
           {deleted && (
             <Card style={styles.card}>
               <Text style={styles.name}>Your account was deleted.</Text>
             </Card>
           )}
           ```

         - After the appearance hint (`<Text style={styles.hint}>…</Text>`), add:

           ```tsx
                 <Pressable accessibilityRole="link" onPress={() => router.push('/privacy')} hitSlop={8} style={styles.privacy}>
                   <Text style={styles.link}>Privacy</Text>
                 </Pressable>
           ```

    4. In `useStyles`, add:

       ```ts
         input: { ...t.type.body, fontSize: 16, color: t.colors.text, backgroundColor: t.colors.field, borderWidth: 1, borderColor: t.colors.outline, borderRadius: t.radii.field, paddingHorizontal: 14, paddingVertical: 12 },
         error: { ...t.type.body, fontSize: 13, color: t.colors.redText },
         privacy: { marginTop: 24, alignSelf: 'flex-start' },
         link: { ...t.type.label, fontSize: 15, color: t.colors.redText },
       ```

       These are copied from `app/schools/[slug]/claim.tsx:194–203,212`. The token names `field`, `outline`,
       `textDim`, `redText` and `radii.field` exist there.
    5. Sign-out is unchanged: `removeQueries(['school'])`. Changing it is nit N1, not in this step.
  - `mobile/components/sign-up-form.tsx`: after the "Already have an account?" `<Text>` block (line 102), add:

    ```tsx
              <Text className="text-center text-sm">
                <Pressable onPress={() => router.push('/privacy')}>
                  <Text className="text-sm underline underline-offset-4">How MatFinder uses your data</Text>
                </Pressable>
              </Text>
    ```

  - `mobile/e2e/account.spec.ts`: new file.

    ```ts
    import { expect, test } from '@playwright/test';
    import { randomBytes } from 'node:crypto';

    test('privacy page is public and linked from sign-up', async ({ page }) => {
      await page.goto('/sign-up');
      await page.getByText('How MatFinder uses your data').click();
      await expect(page).toHaveURL('/privacy');
      await expect(page.getByRole('heading', { name: 'Privacy' })).toBeVisible();
      await expect(page.getByText(/is not sent to MatFinder’s server/)).toBeVisible();
    });

    test('sign up → delete account (password required) → the account is gone', async ({ page }) => {
      const email = `e2e-del-${randomBytes(5).toString('hex')}@example.test`;
      const password = randomBytes(12).toString('hex');
      await page.goto('/sign-up?redirect=%2Faccount');
      await page.locator('input#name').fill('E2E Delete');
      await page.locator('input#email').fill(email);
      await page.locator('input#password').fill(password);
      await page.getByRole('button', { name: 'Create account' }).click();
      await expect(page.getByText(email)).toBeVisible();

      await page.getByRole('button', { name: 'Delete account' }).click();
      await page.getByLabel('Your password').fill('not-the-password');
      await page.getByRole('button', { name: 'Delete my account' }).click();
      await expect(page.getByRole('alert')).toHaveText("That password isn't right.");

      await page.getByLabel('Your password').fill(password);
      await page.getByRole('button', { name: 'Delete my account' }).click();
      await expect(page.getByText('Your account was deleted.')).toBeVisible();
      await expect(page.getByText("You're browsing as a guest")).toBeVisible();

      await page.goto('/sign-in');
      await page.locator('input#email').fill(email);
      await page.locator('input#password').fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page.getByRole('alert')).toBeVisible();
    });
    ```

    ⚠️ to confirm in E8:
    - (resolved) the sign-in form's inputs are `input#email` and `input#password` (`mobile/components/sign-in-form.tsx:44, 60`);
    - that `router.dismissTo('/account')` lands on Account after sign-up from a direct visit. If not, add
      `await page.goto('/account')` after sign-up.
- **Data:** none beyond S13 (C15 server).
- **Callers updated:**
  - `authClient.deleteUser`: new in the app. It exists on Better Auth's client for the `/delete-user` endpoint.
    ⚠️ to confirm: `npm run typecheck` is the check; if the method name differs, stop and ask.
  - `_layout.tsx`: new route registered.
  - `sign-up-form.tsx` and `account.tsx`: links added.
  - No API helper in `mobile/lib/api/` changes.
- **Verify:**
  - `cd mobile && npm run typecheck && npm run lint && npm run test:unit`: pass.
  - `cd mobile && npm run test:e2e`: both new tests pass, and the existing two stay green. Stop
    `npm run develop` in `server/` first.
  - Negative tests: the wrong password shows the alert and keeps the account (the next step deletes it with the right
    password); after deletion, sign-in fails.
  - On native, optional and run by hand: in the iOS Simulator, Account → Delete account → the confirm card → delete →
    the guest card. The web e2e covers the same code path.
- **Done when:** both e2e tests pass, and `/privacy` shows the reviewed text.
- **Rollback:** revert the commit. There's no data step in this step.

### S25 — Location: say why before asking, and what happens when it's denied (C17)

- **Why:** G1/C17 (A-21). `useUserLocation` asks for permission as soon as Explore or a gym page opens
  (`mobile/hooks/useUserLocation.ts:14–27`), with no reason given. A denial is silent: the map just shows the city.
- **Decisions in this step:**
  - **No prompt on open.** On open, the hook reads the permission without asking:
    - granted: it reads the position, as today;
    - denied: the hook state is `denied`;
    - not decided yet, or unreadable (the web without `navigator.permissions`, which makes
      `getForegroundPermissionsAsync` throw, `expo-location/build/ExpoLocation.web.js:44–47`): the state is `ask`.
  - **The system prompt appears only after a tap** on "Use my location", in Explore.
  - **Explore shows one line under the header,** in the existing notice style (`app/index.tsx:214–219`):
    - `ask`: "Allow your location to center the map and see how far each gym is." plus a "Use my location" link;
    - `denied`: "Showing {city name}. Allow location to see distances.". The city name is `data.city.name`, the
      default city's name from the API, not a hard-coded "Las Vegas".
  - **Refresh** re-reads the position only if permission is already granted. It never prompts.
  - **The gym page** keeps using `user.location` for its distance. It never prompts and shows no line.
- **Files:**
  - `mobile/hooks/useUserLocation.ts`: replace the whole file with:

    ```ts
    import * as Location from 'expo-location';
    import { useCallback, useEffect, useState } from 'react';
    import type { Coordinates } from '@/lib/geo';

    /** checking: reading the permission; ask: not decided yet (Explore offers "Use my location"); granted; denied. */
    export type LocationStatus = 'checking' | 'ask' | 'granted' | 'denied';
    type State = { status: LocationStatus; location: Coordinates | null };

    /**
     * The device location, if the user allows it. Opening a screen never shows the system prompt: it reads the permission,
     * and only `ask()` (a tap on "Use my location") prompts. Callers fall back to the city center when the location is
     * null, and hide distances (03 › F7).
     */
    export function useUserLocation() {
      const [state, setState] = useState<State>({ status: 'checking', location: null });

      const read = useCallback(async () => {
        try {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setState({ status: 'granted', location: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } });
        } catch {
          setState({ status: 'denied', location: null });
        }
      }, []);

      useEffect(() => {
        let live = true;
        (async () => {
          let status: Location.PermissionStatus | null = null;
          try {
            ({ status } = await Location.getForegroundPermissionsAsync());
          } catch {
            status = null; // the web without navigator.permissions: treat as not decided
          }
          if (!live) return;
          if (status === Location.PermissionStatus.GRANTED) return void read();
          setState({ status: status === Location.PermissionStatus.DENIED ? 'denied' : 'ask', location: null });
        })();
        return () => {
          live = false;
        };
      }, [read]);

      /** The system prompt, after the user tapped "Use my location". */
      const ask = useCallback(async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== Location.PermissionStatus.GRANTED) return setState({ status: 'denied', location: null });
          await read();
        } catch {
          setState({ status: 'denied', location: null });
        }
      }, [read]);

      /** Pull-to-refresh and the Refresh button: a new position only when already allowed. Never prompts. */
      const refresh = useCallback(() => {
        if (state.status === 'granted') void read();
      }, [state.status, read]);

      return { ...state, ask, refresh };
    }
    ```

  - `mobile/app/index.tsx`:
    1. In `handleRefresh` (lines 131–134), replace `user.locate();` with `user.refresh();`.
    2. After the `{!hasMapboxToken && (…)}` notice block (ends at line 219), add:

       ```tsx
                   {user.status === 'ask' && (
                     <View style={styles.notice}>
                       <Ionicons name="navigate-outline" size={16} color={colors.textSecondary} />
                       <Text style={styles.noticeText}>Allow your location to center the map and see how far each gym is.</Text>
                       <Pressable accessibilityRole="button" onPress={user.ask} hitSlop={8}>
                         <Text style={styles.noticeAction}>Use my location</Text>
                       </Pressable>
                     </View>
                   )}
                   {user.status === 'denied' && (
                     <View style={styles.notice}>
                       <Ionicons name="navigate-outline" size={16} color={colors.textSecondary} />
                       <Text style={styles.noticeText}>
                         Showing {data.city.name}. Allow location to see distances.
                       </Text>
                     </View>
                   )}
       ```

    3. In `useStyles`, add `noticeAction: { ...t.type.label, fontSize: 13, color: t.colors.redText },` after
       `noticeText`.
  - `mobile/app/schools/[slug]/index.tsx`: no change. It reads only `user.location` (line 107). Under the new hook it
    stops prompting on open, which is intended.
  - `mobile/e2e/location.spec.ts`: new file.

    ```ts
    import { expect, test } from '@playwright/test';

    test.describe('location not decided', () => {
      test('Explore says why before asking, and what a denial means', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByText('Allow your location to center the map and see how far each gym is.')).toBeVisible();
        await page.getByRole('button', { name: 'Use my location' }).click();
        await expect(page.getByText(/^Showing Las Vegas\. Allow location to see distances\.$/)).toBeVisible();
      });
    });

    test.describe('location allowed', () => {
      test.use({ permissions: ['geolocation'], geolocation: { latitude: 36.1699, longitude: -115.1398 } });
      test('no notice, and gyms show distances', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByText(/MatFinder · Las Vegas/)).toBeVisible();
        await expect(page.getByText('Use my location')).toHaveCount(0);
        await expect(page.getByText(/\d+\.\d mi/).first()).toBeVisible();
      });
    });
    ```

    Notes on this test:
    - "Las Vegas" is in the test because the sample seed's city is Las Vegas, as the existing e2e already asserts
      (`explore-to-school.spec.ts:26`). The app takes the name from the API.
    - ⚠️ not verified: that Playwright's headless Chromium answers an ungranted `getCurrentPosition` with
      `PERMISSION_DENIED` rather than leaving it pending. If the first test times out on the denial line, stop and ask
      before changing the approach.
    - The existing `explore-to-school.spec.ts` doesn't touch location, and it now sees the `ask` line, which it doesn't
      assert against.
- **Data:** none.
- **Callers updated:**
  - `useUserLocation`: used in `app/index.tsx` (uses `locate`, changed to `refresh`, plus the new `status` and `ask`) and
    `app/schools/[slug]/index.tsx` (uses `location` only).
  - `locate` is removed, and `npm run typecheck` fails on any other user of it. The two above are all that `grep`
    found.
- **Verify:**
  - `cd mobile && npm run typecheck && npm run lint`: pass.
  - `cd mobile && npm run test:e2e`: `location.spec.ts` passes, and the existing specs stay green.
  - On native, optional and run by hand: a fresh Simulator install opens Explore with no system prompt, shows the
    `ask` line, and the prompt appears only after "Use my location".
  - Negative test: in the first e2e test, a denial shows the city line and no distances.
- **Done when:** both location e2e tests pass, and no screen shows the system prompt on open.
- **Rollback:** revert the commit. There's no data step.

## Environment variables

| Variable | App | Change | Example value | Notes |
|---|---|---|---|---|
| `AI_GYM_CHAT_DAILY_TOTAL` | backend | add | `200` | Server only. Gym chat questions per UTC day from everyone together, in memory. Empty = 200; not a number = boot fails (B-8) |
| `AUTH_IP_HEADERS` | backend | add | `x-vercel-forwarded-for,x-forwarded-for` | Server only. Empty = Better Auth's default. The production value comes from the probe table in *Deployment* (B-9) |
| `AUTH_TRUSTED_PROXIES` | backend | add | `192.0.2.10,10.0.0.0/24` | Server only. Usually empty: ⚠️ not verified whether Vercel publishes fixed egress ranges (B-9) |
| `AUTH_IP_PROBE` | backend | add | `false` | Server only. `true` only for the one-off production check, then back to `false` (B-9) |

No frontend variables change. No variable is removed.

## Deployment

The implementing agent stops at the last commit on the branch. Everything below is for the owner, after review and
merge.

1. **Before merging, owner read-only checks on production:**
   1. Strapi Cloud runtime logs: no `[matfinder] index failed` line. If there is one, that index was never created,
      and after the B-7 step Strapi would refuse to boot. Remove the duplicate rows it names first.
   2. Production admin → MatFinder → Claims → Accepted: no gym appears twice. If one does, remove one owner before
      deploying B-5.
   3. Settings → Admin Tokens: which permissions the curator's MCP token holds (B-4's escalation). If it holds any
      Content Manager or Media Library permission, rotate it using the README steps the B-4 step adds (MatFinder
      actions only), and update the token in the Claude client.
   4. ⚠️ not verified: what Strapi Cloud does with a deploy that fails to boot (keeps the previous build, or goes
      down). Find out before relying on "refuses to start" being safe.
2. **Backup:** take a Strapi Cloud backup before the deploy that includes B-11 (the `varchar` → `text` column change).
   ⚠️ not verified how Strapi 5.58 alters these columns on Postgres; there's no local Postgres to test it. The same
   backup is the only way to keep notices, reports and saved gyms if S15, S16 or S17 is ever reverted: Strapi's schema
   sync drops removed columns and tables at boot.
3. **PR #47 (M19) is open** and edits `server/src/plugins/matfinder/server/src/config.ts` and the gym-chat error
   helpers that B-8 also edits. Whichever merges second resolves the conflict by hand, keeping both
   `adminChatModel` and `gymChatDailyTotal`.
4. **Deploy order:** Strapi first, then the web app.
   - Schema changes (new columns, new plugin content types) are applied by Strapi's schema sync at boot, before
     `bootstrap()` creates the indexes. There are no migration files.
   - The web app calls routes that 404 until Strapi is live: `/api/auth/delete-user` (C15), the report and saved-gym
     routes (UX-8, UX-9). The preview changes (UX-5) degrade safely if the app ships first.
5. **Environment, Strapi Cloud:**
   - Leave `AI_GYM_CHAT_DAILY_TOTAL` empty for 200, or set the owner's number.
   - Before ever setting `AI_API_KEY` in production, set a monthly spending limit on the Anthropic account.
6. **Better Auth IP (B-9), after the Strapi deploy:**
   1. Search Strapi Cloud's logs for `single shared per-path bucket`. If it isn't there after sign-ins have happened,
      the default already resolves an IP: leave the variables unset and stop.
   2. Set `AUTH_IP_PROBE=true` and let Strapi Cloud redeploy.
   3. Load https://matfinder.vercel.app once. Then call the server directly, which is the native app's path, with a
      forged Vercel header, to see whether Strapi Cloud's ingress strips it:

      ```bash
      curl -s -o /dev/null https://whimsical-book-9f2752414b.strapiapp.com/api/auth/get-session -H 'X-Vercel-Forwarded-For: 192.0.2.1'
      ```

   4. Read the `auth ip probe` log lines (header names and counts only), set `AUTH_IP_PROBE=false`, and apply the
      first matching row:

      | Web request (through Vercel) shows | Direct request (with the forged header) shows | Set |
      |---|---|---|
      | `x-forwarded-for=1` | `x-forwarded-for=1` | nothing: the default works; B-9 is closed |
      | `x-vercel-forwarded-for=1` | `x-vercel-forwarded-for=1` (the forged header got through) | **stop and decide**: trusting this header would let anyone who calls Strapi Cloud directly pick a new rate-limit bucket on every sign-in attempt |
      | `x-vercel-forwarded-for=1` | `x-vercel-forwarded-for=absent`, `x-forwarded-for=1` | `AUTH_IP_HEADERS=x-vercel-forwarded-for,x-forwarded-for` |
      | `x-vercel-forwarded-for=1` | `x-vercel-forwarded-for=absent`, `x-forwarded-for` ≥ 2 or absent, `x-real-ip=1` | `AUTH_IP_HEADERS=x-vercel-forwarded-for,x-real-ip,x-forwarded-for` |
      | anything else | anything else | stop and decide with the probe lines |

      The rows are checked top to bottom; the "forged header got through" row comes before any row that trusts
      `x-vercel-forwarded-for`.

7. **After deploy, Strapi admin → Settings → Roles:** confirm Super Admin has "Resolve problem reports" (UX-3), and
   grant it to any other role that should resolve reports.

## Open questions

Owner decisions. Each step states the default it implements, so none of these blocks the build.

1. **B-4:** which permissions the production curator token holds today (*Deployment* 1.3).
2. **B-8:** keep Opus 5.5 for the gym chat, or a cheaper model; and the daily total (200 is a placeholder with no cost
   model behind it).
3. **B-10:** accept running beta/alpha auth packages in production as a recorded risk.
4. **B-9:** if the probe shows Strapi Cloud passes a forged `X-Vercel-Forwarded-For` through, trusting that header
   would let anyone who calls Strapi Cloud directly get a fresh sign-in rate-limit bucket on every attempt, which
   opens a password-guessing path. The probe table stops there; the choice (leave the default shared bucket, or find
   another header the ingress does overwrite) is yours.
5. **C15:**
   - review the privacy page text before deploy;
   - give a contact address for it (left off until given);
   - accepted claims of a deleted account stay accepted, so the gym still shows "Claimed by the owner". Confirm, or
     change to withdrawn.
6. **UX-1:** "verified" dates the agent already set are kept. Clearing them (`last_verified_at = NULL` where
   `origin = 'web-agent'`, after a backup) is an owner decision, not a step.
7. **UX-2/UX-5:** showing publicly that a gym was "Added by MatFinder's AI agent from the gym's web pages". `origin` is
   private in the schema today; the public field is a derived `addedFromWeb`.
8. **Copy and limits:** "No drop-ins" (replacing "Members only"), "Free first class", the five report kinds, the
   140-character notice, 10 open reports per user, 200 saved gyms.
9. **B-1:** the duplicate check across cities matches on phone, website, Instagram and distance, not name, because
   chains share names. Matching names too is a one-line switch in the B-1 step.
10. **B-3 (S6), never-published drafts:** the agent publishes a never-published draft only if it's a school the
    agent added (`origin: 'web-agent'`). A draft a person made, or one `upsert_school` created that failed to publish,
    waits for a person. Confirm, or choose "never publish a never-published draft".
11. **C15, reports and saved gyms on deletion:** saved gyms and open reports are deleted; resolved reports are kept
    with the reporter unlinked. Confirm, or choose to delete every report.
12. **Checkpoint A escalations still open:** A-3 (owners), A-4/A-5 (the sign-in gate), A-6 (Jess), A-13 (native
    builds), A-20 (order vs M15–M20), and drafts by default (C1).

**Not verified, each checked inside its step in E8:**
- column names Strapi derives for new attributes (`dedupe_key`, `school_document_id`, `user_id`): a scratch-database
  check before the index is relied on;
- the Strapi 5.58 Content Manager routes and the admin-token `subject` shape used by the B-4 test; the built-in MCP
  tool names;
- whether Strapi's MCP layer strips or rejects an unknown `lastVerifiedAt` (the UX-1 test passes either way);
- Expo SDK 57 `output: single` using `public/index.html` (UX-10 has a STOP rule);
- Playwright's headless answer to an ungranted location request (C17);
- whether `dash()` (`@better-auth/infra`) sends anything off the server (B nit N8). If it does, the privacy page needs
  a line.
