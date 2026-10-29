# Checkpoint B: Design review

- **Targets:** `04-tech-decisions.md`, `05-tech-requirements.md` (as built, after Checkpoint R), and the codebase
- **Date:** 2026-10-28 · **EGM:** v0.1.0
- **Reviewers (dispatch option):** `egm:egm-design` (1), `egm:egm-zoom-out` (1), `strapi-product-egm:strapi-code-auditor`
  (1), `strapi-product-egm:strapi-fact-checker` (1)
- **Standard:** `reviews/standards/strapi-design-standard.md`
- **Totals:** 🔴 1 · 🟡 15 · 🟢 18 (after merging duplicates across reviewers)
- **Security advisories:** none affect the locked versions (Strapi 5.58.0; better-auth 1.7.7 is the patched floor for
  the September 2026 advisories; kysely, `@tanstack/*` and Expo are clear). `node_modules` wasn't installed, so the
  fact-checker read the lockfiles and upstream source at the matching tags.

In existing-app mode, **PROPOSE FIX means "change the app"**. 04–05 stay as-built until E9. The exceptions are
statements the fact-checker proved wrong; those were corrected in 03–05 straight away (marked *doc fixed*).

## Root causes
- **RC-B1. The agent write path trusts itself.** It upserts by a name-only slug, publishes the whole draft, and can be
  handed delete tools by token scope. → B-1, B-3, B-4
- **RC-B2. Invariants live in app code, not the database.** Check-then-write claims and knowledge, and a bootstrap
  that shrugs off failed indexes. → B-5, B-6, B-7
- **RC-B3. Public surface nobody uses.** `city.find`, mounted core routers, `nearby`. → B-2, N9, N10
- **RC-B4. Cost and abuse guards assume honest single-process traffic.** → B-8, B-9
- **RC-B5. Beta/alpha auth in production, recorded as a footnote.** → B-10

## Findings

### B-1. `add_gym_from_web` can overwrite and move an existing live gym (🔴 Blocker)
- **Lens:** design (B1), code-auditor (9)
- **Scope:** 05 › MCP server › Custom tools; `P/services/discovery.ts:99–127`; `S/src/api/school/services/school.ts:159–175, 399–408`
- **Finding:** The slug comes from the name alone (`slugifyWithFallback(input.name)`), and `upsertOnce` updates any
  existing draft with that slug, replacing its city, location and description, then auto-publishes. The duplicate check
  only looks inside one city. A chain name already listed in another city ("10th Planet", "Gracie Barra") never raises
  `DUPLICATE_SUSPECTED`; in the same city, `confirmNotDuplicate: true` ("it's a different gym") overwrites the
  existing one. Also, `upsertDraft`'s retry runs inside `addGymFromWeb`'s outer transaction, so on Postgres a unique
  violation aborts the transaction and the retry can't work. Confirmed in the code by the Elephant.
- **Recommendation:** make the add path create-only: on a taken slug use `name-city` (then `-2`), and check slugs
  across all cities. Do the provenance stamp in the same write, with no outer transaction.
- **Resolution:** PROPOSE FIX (change). Must land before multi-city (M16).

### B-2. Public `GET /api/cities` with client `populate` may leak gated or draft gym data (🟡 Major)
- **Lens:** design (M6), code-auditor (1), R (N13). Three lenses agree.
- **Scope:** `S/src/lib/permissions.ts:13`; `S/src/api/city/routes/city.ts`; `S/tests/api.test.ts:74–75`
- **Finding:** Whether the alpha api-permissions plugin strips `?populate[schools][populate]=contact` (or
  `status=draft`) is unverified. If it doesn't, the sign-in gate (03 F10) is bypassed. The app never calls
  `/api/cities`.
- **Recommendation:** remove `api::city.city.find` from `GRANTS`, revoke it on boot, and add a test that
  `populate=schools`, `populate=*` and nested populates return no school data.
- **Resolution:** PROPOSE FIX (change).

### B-3. Auto-publish publishes a person's unpublished edits and can overwrite their fixes (🟡 Major)
- **Lens:** zoom-out (3), design (M2), code-auditor (6). Three lenses agree.
- **Scope:** `P/services/publishing.ts:23–33`; 05 › MCP › Publishing, Human correction loops
- **Recommendation:** before the agent's write, read the draft status (`statusOf`, already in the code). If it's
  already `unpublished-changes`, write but don't publish, and return `notPublishedBecause: 'unpublished edits by a
  person'`.
- **Resolution:** PROPOSE FIX (change). Linked to checkpoint A's open question 6 (drafts by default, C1): if you
  choose drafts by default, B-3 still matters for `upsert_school` on live gyms.

### B-4. The curator token's scope isn't stated, and Strapi's built-in tools can delete and unpublish (🟡 Major)
- **Lens:** fact-checker (1), design (M1), zoom-out (7). Three lenses agree.
- **Scope:** 03 › AI / agent access; 04 › MCP; 05 › MCP › Limits
- **Finding:** In 5.58 a token with content permissions also sees `delete_<type>`, `unpublish_<type>`,
  `discard_<type>_draft` and the Media Library delete tools. "Deletions are permanent" (Strapi docs). `ba_user` is
  shown in the Content Manager, so user tools may be listed too (fact-checker's inference). *Doc fixed* in 03 and 05.
- **Recommendation:** state that the curator token holds only `plugin::matfinder.mcp.*` actions; add an integration
  test that such a token's tool list has no built-in content tools; document token rotation.
- **Resolution:** PROPOSE FIX (change: test and doc) + ESCALATE: which permissions does the production curator token
  hold today?

### B-5. Claims: check-then-write races and no database constraint (🟡 Major)
- **Lens:** design (M3), code-auditor (2, 3), zoom-out (10)
- **Scope:** `P/services/claims.ts:47–72, 103–138`
- **Finding:** create checks `CLAIM_OPEN` and the cap of 5, then inserts, with no transaction or index; a double tap
  makes two open claims. `act()` reads the claim outside the transaction (line 104) and doesn't re-read it inside;
  two admins accepting rival claims can both succeed.
- **Recommendation:** partial unique indexes `(school_document_id) WHERE status='accepted'` and
  `(school_document_id, user_id) WHERE status IN ('pending','contacted')` in `bootstrap()`; re-read the claim inside
  the transaction with a conditional update on `status`; map unique violations to 409.
- **Resolution:** PROPOSE FIX (change). Low risk at today's volume (one curator), cheap to fix.

### B-6. Knowledge entries can be duplicated (🟡 Major)
- **Lens:** design (M4)
- **Scope:** `P/services/knowledge.ts:34–58`
- **Finding:** an entry is matched by gym plus case-insensitive question, outside any transaction and with no index.
  Parallel `upsert_knowledge` calls create duplicates, and the chat reads both.
- **Recommendation:** a unique index on draft rows (school, `lower(question)`) and the catch-and-refetch the school
  service already uses.
- **Resolution:** PROPOSE FIX (change).

### B-7. A failed bootstrap index silently drops uniqueness; there's no migration policy (🟡 Major)
- **Lens:** design (M5), code-auditor (5), zoom-out (11). Three lenses agree.
- **Scope:** `S/src/index.ts:29–35`; 04 › Database › Migrations
- **Finding:** every uniqueness guarantee here, including the fixes for B-1, B-5 and B-6, depends on these indexes.
  The SQL isn't schema-qualified (`DATABASE_SCHEMA`), and the unused `mysql` branch can't run partial indexes.
- **Recommendation:** in production, refuse to boot when a unique index fails (the same pattern as
  `assertMatFinderBuilt`); dedupe existing rows before adding new indexes; record the migration policy in 04.
- **Resolution:** PROPOSE FIX (change).

### B-8. The gym chat's cost guard can be bypassed (🟡 Major)
- **Lens:** zoom-out (4), design (M7), code-auditor (4). Three lenses agree.
- **Scope:** `P/gym-chat/limits.ts:77–102`; `P/services/gym-chat.ts`; `S/src/lib/auth.ts:15`; `S/config/plugins.ts:41–42`
- **Finding:** the count is per account, in memory, reset on every deploy, and sign-ups are free and unverified. No
  global cap. Earlier turns come from the client and are billed (up to 24 × 20k characters). The default model is
  `claude-opus-5-5`. Today the only real guard is that `AI_API_KEY` isn't set in production.
- **Recommendation:** a global daily cap checked first (`daily.take('*')`, a few lines); persist the counter or
  accept resets; rate-limit sign-up (see B-9); cap or sign client history; set a spending limit on the provider
  account.
- **Resolution:** PROPOSE FIX (change: the global cap, before the chat is turned on) + ESCALATE: the default model
  was your choice (`CLAUDE.md` › AI chat). Keep Opus 5.5, or use a cheaper model for the gym chat?

### B-9. Better Auth's rate limit may become one shared bucket behind Vercel (🟡 Major)
- **Lens:** fact-checker (2), design (M8)
- **Scope:** 05 › Auth; `S/src/lib/auth.ts`
- **Finding:** better-auth 1.7.7's default limiter is on in production, in memory, 3 per 10 s on sign-in and sign-up,
  keyed by `x-forwarded-for`. A comma-separated chain isn't trusted by default, and with no trusted IP all requests
  share one `"no-trusted-ip"` bucket. Vercel's `/api` rewrite in front of Strapi Cloud is likely to produce such a
  chain. ⚠️ not verified: the headers production actually receives.
- **Recommendation:** set `advanced.ipAddress.ipAddressHeaders` (or `trustedProxies`) for the Vercel → Strapi Cloud
  path, after checking the real headers in E8 against a non-production server.
- **Resolution:** PROPOSE FIX (change).

### B-10. Beta/alpha auth stack runs real accounts with the risk unrecorded (🟡 Major)
- **Lens:** fact-checker (4), zoom-out (5), design (M8)
- **Scope:** 04 › Auth; `server/package.json`
- **Finding:** the plugin's README says not for production; api-permissions is alpha; prerelease caret ranges. Also
  from design M8: sign-up reveals whether an email exists, and claims carry an unverified email an admin may treat as
  identity. *Doc fixed* in 04 › Auth › Maturity.
- **Recommendation:** pin the three prerelease packages exactly; label the claim email "unverified" in the admin.
- **Resolution:** PROPOSE FIX (change: pinning, the label) + ESCALATE: do you accept running beta auth in production
  as a recorded risk? (Switching auth isn't proposed.)

### B-11. Web-sourced URLs are stored in 255-character columns (🟡 Major)
- **Lens:** code-auditor (7), design (nit), zoom-out (6)
- **Scope:** `S/src/components/school/contact.json`; `affiliation/schema.json`; `P/mcp/schemas.ts:17`; `normalize-contact.ts:15`
- **Finding:** long URLs are rejected, and a 249–255-character URL passes the tool check, then overflows after
  `https://` is added, giving a raw database error.
- **Recommendation:** change `contact.website`, `contact.instagram` and `affiliation.website` to `text` and raise the
  tool cap to 500, matching `sourceUrls`.
- **Resolution:** PROPOSE FIX (change). ⚠️ not verified: how Strapi 5.58 alters a `varchar` to `text` on Postgres at
  boot; E8 checks it against a local database first.

### B-12. Claims copy gym ids and names; `mine` is keyed by slug; `claimed` loads every accepted claim (🟡 Major)
- **Lens:** zoom-out (2, 9), code-auditor (14, 15), design (nit)
- **Scope:** `P/services/claims.ts:41, 76, 141`; `S/src/api/school/services/school.ts:339`
- **Recommendation:** look up `mine` by `schoolDocumentId`; compute `claimed` only for the gyms in the response (`$in`)
  and use `acceptedFor()` on the gym page. A real `school` relation is the long-term design.
- **Resolution:** PROPOSE FIX (change: the lookups). The relation migration is deferred.

### B-13. The local plugin couples both ways, duplicates code, and its data depends on a build artifact (🟡 Major)
- **Lens:** zoom-out (1)
- **Scope:** 04 › Reference architecture; `S/config/plugins.ts`; `S/src/lib/drafts.ts` vs `P/domain/status.ts`
- **Recommendation:** record the reason (admin UI, widgets, RBAC, MCP) in 04. Long term, move claim and knowledge into
  `src/api/` with the same `collectionName`.
- **Resolution:** PROPOSE FIX (doc at E9). The move is a large refactor with a data migration; deferred.

### B-14. 05's content model and Better Auth details are incomplete (🟡 Major)
- **Lens:** design (M9, M10), zoom-out (6)
- **Scope:** 05 › Content types, Components, Better Auth types, Permissions
- **Finding:** field types, `required` flags, inverse sides and "authored by" are missing outside School; the user
  UID `plugin::better-auth.user`, how controllers read the user, the no-role fallback, and a role × action matrix are
  missing.
- **Resolution:** PROPOSE FIX (doc at E9).

### B-15. External services aren't marked required or optional (🟡 Major)
- **Lens:** design (M11)
- **Scope:** 04 › Maps, AI, Auth
- **Resolution:** PROPOSE FIX (doc at E9): Mapbox tiles optional (list-only mode), geocoding required for address
  writes, the AI optional, `BETTER_AUTH_DASHBOARD_SECRET` fails closed.

### B-16. "Content History is an Enterprise feature" is wrong (🟡 Major)
- **Lens:** fact-checker (3)
- **Resolution:** PROPOSE FIX, *doc fixed* in 05 › Audit trail (Growth and Enterprise; Content Manager edits only).

## Nits (🟢)
| # | Lens | Finding | Resolution |
|---|---|---|---|
| N1 | auditor 10, zoom 12, R | Sign-out leaves the last user's claim status cached | PROPOSE FIX (change): `queryClient.clear()` in all three places |
| N2 | auditor 11, zoom 14, design | `ba_user` visible in the Content-Type Builder | PROPOSE FIX (change): hide it there |
| N3 | auditor 13 | The claims widget triggers the full summary scan every 15 s | PROPOSE FIX (change): a claims-only count route |
| N4 | auditor 17, zoom 13 | `config/server.ts` comment says "8 tools in src/mcp" | PROPOSE FIX (change) |
| N5 | auditor 8 | `city.name` `unique: true` has no index | PROPOSE FIX (change): add `lower(name)` unique index |
| N6 | design | Admin CSP allows `connect-src https:` and `'unsafe-inline'` | PROPOSE FIX (change): narrow to Mapbox and Anthropic hosts, tested in the admin first |
| N7 | zoom 8, design | YAGNI: `mysql` branch, `JWT_SECRET`, unused `LocationMap` props, `getBoundingBox`, `formatMiles`, 7 unused `components/ui` files, the `logo` fetch | PROPOSE FIX (change): remove. **Except** `AI_ADMIN_CHAT_MODEL`: DECLINE, PR #47 (M19) uses it |
| N8 | fact 6 | What `dash()` contacts: `kvUrl` defaults to `kv.better-auth.com` and isn't overridden | PROPOSE FIX (change): verify in the 0.2.14 source in E8; set `kvUrl` or confirm it's unused |
| N9 | auditor 16 | Core routers for school, instructor, affiliation stay mounted | PROPOSE FIX (change): `createCoreRouter(uid, { only: [] })` or remove |
| N10 | auditor 12 | Public `nearby` is unused and uncached server-side | DECLINE for now: approved M16 uses it. Revisit with M16 |
| N11 | design | Claim cap and chat quota are in services, not route policies | DECLINE: works as built; recorded |
| N12 | design | Replay path after a publish failure not documented | PROPOSE FIX (doc at E9) |
| N13 | design | Response shapes for `claims/mine`, `chat/status`, admin routes; chat request body | PROPOSE FIX (doc at E9) |
| N14 | design, zoom | Version floors (MCP ≥ 5.49, Better Auth ≥ 5.45) unstated | PROPOSE FIX (doc at E9) |
| N15 | fact 5 | Cookie attributes credited to the Strapi plugin | PROPOSE FIX, *doc fixed* (they're Better Auth's defaults) |
| N16 | fact 7 | The "MCP missing" fallback is unreachable on 5.58 | PROPOSE FIX, *doc fixed* |
| N17 | fact 8 | `engines` leaves out Node 26, which Strapi supports | DECLINE: Strapi Cloud's Node version is the one that matters, and 22/24 are covered |
| N18 | zoom 15 | Test-infra detail belongs in a README | DECLINE: Checkpoint R asked for it under the as-built standard |

## Counts
- PROPOSE FIX: 30. 21 are app changes; 9 are doc-only (B-13, B-14, B-15, B-16, N12–N16). B-16, N15 and N16, and the
  doc parts of B-4 and B-10, are already applied.
- ESCALATE: 3 (inside B-4, B-8, B-10)
- DECLINE: 4 (N10, N11, N17, N18), plus the `AI_ADMIN_CHAT_MODEL` part of N7
- CONTEST: 0
