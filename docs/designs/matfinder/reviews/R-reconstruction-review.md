# Checkpoint R: Reconstruction review

- **Targets:** `04-tech-decisions.md`, `05-tech-requirements.md` (as built)
- **Date:** 2026-10-28 · **EGM:** v0.1.0
- **Reviewers (dispatch option):** `egm:egm-codebase-details` REVIEW (1), with `server/` and `mobile/` as the codebase
- **Standard:** `reviews/standards/as-built-standard.md`
- **Totals:** 🔴 2 · 🟡 11 · 🟢 13 · verdict: does not pass

R's findings correct facts, not decisions, so every PROPOSE FIX was applied directly (existing-app mode, E3). The
Elephant checked each Blocker and Major against the code before editing. All of them held.

## Findings

### R-1. `claimed` described as a stored write; it's derived at read time (🔴 Blocker)
- **Scope:** 05 › Operations › Transactional workflow steps; Custom routes.
- **Finding:** No school field `claimed` exists. `claimedSchoolIds()` (`P/services/claims.ts:141`, `limit: 10000`)
  runs on each directory, nearby and bySlug read. The public `claimed` field wasn't listed in any "Returns" cell.
- **Resolution:** PROPOSE FIX, applied. 05 › school type (no stored field), Custom routes (`claimed` in all three
  payloads, the 10,000 cap), Operations.

### R-2. MCP action ids written with underscores (🔴 Blocker)
- **Scope:** 04 › MCP server; 05 › MCP server › Auth; Permissions › Admin.
- **Finding:** `actionUid` turns `_` into `-` (`P/mcp/index.ts:34–38`). The `find_new_gyms` prompt is gated by the
  `add_gym_from_web` action. With no `strapi.ai.mcp`, the tools are skipped with a warning.
- **Resolution:** PROPOSE FIX, applied in 04 and 05.

### R-3. Claim transaction marked "not verified" (🟡 Major)
- **Resolution:** PROPOSE FIX, applied. 05 cites `strapi.db.transaction` at `P/services/claims.ts:115`.

### R-4. The gym chat log doesn't include the model, and does include the user id (🟡 Major)
- **Resolution:** PROPOSE FIX, applied. Field list corrected under Reproducibility; the user id is listed under
  User-data exposure.

### R-5. "All middlewares run on create, update and clone" is wrong (🟡 Major)
- **Finding:** `slug` and `userRole` run on create only. Plus: `slug` covers city and has a fallback, `normalizeContact`
  covers the affiliation website, and `schoolCoordinates` drops client-sent lat/lng.
- **Resolution:** PROPOSE FIX, applied.

### R-6. Raw SQL indexes incomplete, failures silent (🟡 Major)
- **Finding:** `schools_lat_lng_idx` missing; a failed index is only logged; `city.name` uniqueness isn't enforced by
  the database.
- **Resolution:** PROPOSE FIX, applied in 05 › city type, `bootstrap()`, Silent failure modes, Uniqueness.

### R-7. Claim business rules missing (🟡 Major)
- **Resolution:** PROPOSE FIX, applied. 05 › `plugin::matfinder.claim` › Rules: states, error codes, zod limits,
  notes, `handledBy`, the 500-row admin list.

### R-8. Auto-publish publishes the whole draft; the CSP is broader than described (🟡 Major)
- **Finding:** `afterWriteDocument` publishes the current draft, including a person's unpublished edits. A
  non-validation publish error rethrows after the draft is saved. `upsert_knowledge` publishes through its service.
  The CSP allows `connect-src https:` and `script-src 'unsafe-inline' blob:`.
- **Resolution:** PROPOSE FIX, applied in 05 › MCP Publishing, Human correction loops, Transactional steps, Global
  middlewares, and in 04 › MCP. The security weight of both goes to checkpoint B.

### R-9. Better Auth extensions covered only by name (🟡 Major)
- **Resolution:** PROPOSE FIX, applied. 05 › Better Auth types now lists fields and which types the admin shows
  (`ba_user` is visible and editable).

### R-10. Plugin admin UI and the boot guard undocumented (🟡 Major)
- **Resolution:** PROPOSE FIX, applied. New 05 › Plugin admin UI section, including `assertMatFinderBuilt()`.

### R-11. Test infrastructure undocumented (🟡 Major)
- **Resolution:** PROPOSE FIX, applied. 05 › Tests › Test infrastructure, and a "Tests only" env var list.

### R-12. Device location undocumented (🟡 Major)
- **Resolution:** PROPOSE FIX, applied in 05 › Pages, State management and 04 › Frontend.

### R-13. Uncited claims (🟡 Major)
- **Resolution:** PROPOSE FIX, applied. Schema paths for city, instructor and affiliation; "`M/` inventory" replaced
  with files; 04's env-prefix line cited; the "skill's default" aside removed.

## Nits (🟢)
| # | Finding | Resolution |
|---|---|---|
| N1 | Unstated env defaults (`WEB_ORIGINS`, `BETTER_AUTH_URL`, `PORT`), geocoding fallback and limits, `dash()` fails closed | PROPOSE FIX, applied (05 › env vars) |
| N2 | `mysql` branch and `DATABASE_URL` / `_SCHEMA` / `_CONNECTION_TIMEOUT` | PROPOSE FIX, applied (04, 05) |
| N3 | `@better-auth/infra`, the dashboard plugin version, `@tanstack/ai-client` not listed | PROPOSE FIX, applied (04) |
| N4 | Gym chat limits incomplete; quota spent before the call; 400 vs RUN_ERROR | PROPOSE FIX, applied (05 › Cost guards, Silent failures) |
| N5 | Nearby `truncated`, gyms without a timezone or coordinates dropped | PROPOSE FIX, applied (05 › Custom routes) |
| N6 | Boot helper caps and caching; backfill bypasses middlewares | PROPOSE FIX, applied (05 › `bootstrap()`) |
| N7 | `instructor.name` required, `origin` default, `withCount` | PROPOSE FIX, applied |
| N8 | "Session ended" also on 403 | PROPOSE FIX, applied |
| N9 | Sign-out leaves `['my-claim']` and `['gym-chat-status']` cached | PROPOSE FIX, applied (05 › State); carried to B as a bug candidate |
| N10 | `components/kit` and the use of `components/ui` | PROPOSE FIX, applied. The Elephant checked: `kit/` holds only `RankBar` |
| N11 | `safeRedirect` undocumented | PROPOSE FIX, applied, with its exact rule from the code |
| N12 | Judgment wording ("Not handled: …") | PROPOSE FIX, applied as plain facts |
| N13 | `/api/cities?populate=schools` might expose schools | PROPOSE FIX, applied as `⚠️ not verified`. Checking it needs a running server, so it waits for E8 or a test; carried to B |

**Re-run:** not needed. Every finding was a factual correction, each was checked against the code, and none changes a
decision.
