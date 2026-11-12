# Checkpoint C: Change readiness

- **Targets:** `06-change-spec.md` (25 steps), with the codebase @ `4f6074c` and the installed packages
- **Date:** 2026-10-29 · **EGM:** v0.1.0
- **Reviewers (dispatch option):** `egm:egm-implementation-readiness` (1), `egm:egm-codebase-details` (1),
  `strapi-product-egm:strapi-fact-checker` (1)
- **Standard:** `reviews/standards/strapi-change-spec-standard.md`
- **Totals:** 🔴 1 · 🟡 10 · 🟢 13 (after merging duplicates across reviewers)
- **Verdict:** not ready. Every finding is a text edit to 06; none needs new scope.
- **Fact-checker:** 28 claims checked, 24 confirmed, 3 wrong (C-2, C-11), 1 merged.

Resolve labels: in this checkpoint, PROPOSE FIX edits `06`.

**Status (2026-10-29):** the owner chose "apply all". Every PROPOSE FIX is applied in 06 (marked *applied* below).
Two fixes went further than the reviewer's text, after the Elephant checked the code:
- C-9 / N4: the key column hides with the repo's proven `config.attributes.<field>.hidden` (as School hides
  `latitude`, with a test), not the unverified `visible: false`.
- C-2: *Deployment* 2's backup now also covers reverting S15–S17.

## Root causes
- **RC-C1. The spec was drafted in four parallel parts against the base commit**, and the assembly reconciled only the
  index list, one helper and `GRANTS`. Every other file edited by more than one step was left for the implementer to
  merge. → C-1, C-6
- **RC-C2. Strapi's schema sync was assumed to be additive.** In 5.58 it drops removed columns and tables
  (`forceMigration`, default `true`). → C-2
- **RC-C3. A rule was stated for the case that prompted it, not for every state of the enum.** → C-3, C-9 (repeats
  Lesson 4)

## Findings

### C-1. S14 (UX-1) undoes the B-1 fix in `upsert-school.ts` (🔴 Blocker)
- **Lens:** codebase-details (Blocker 1), implementation-readiness (M1). Two lenses agree.
- **Scope:** S5 › `upsert-school.ts` line 57 (06 line 1080); S14 › the same line (06 line 2377); *Shared edits*.
- **Finding:** S5 sets line 57 to `args.slug ? upsertDraft(args) : createDraft(args)`. S14 replaces it with
  `upsertDraft({ ...args, lastVerifiedAt: undefined })`, which brings back the overwrite of a same-named gym. *Shared
  edits* lists only UX-1 and UX-2 for this file. Confirmed by the Elephant in 06.
- **Recommendation:** S14 gives the post-S5 line, stripping `lastVerifiedAt` on both branches. *Shared edits* lists
  S2, S5, S14 and S15 for this file.
- **Resolution:** PROPOSE FIX. *Applied.*

### C-2. Three rollbacks say data stays; Strapi deletes it (🟡 Major)
- **Lens:** all three. fact-checker (1, 2), codebase-details (5), implementation-readiness (M2).
- **Scope:** S15, S16, S17 › Rollback (06 lines 2570, 2928, 3102).
- **Finding:** Strapi's schema sync drops the columns of removed attributes and the tables of removed content types at
  boot (`settings.forceMigration`, default `true`; `@strapi/database/dist/schema/diff.js:167–170, 337–358`). S7's own
  rollback and `server/config/plugins.ts:7–9` already say so. Reverting S15–S17 silently deletes every notice, report
  and saved gym. The manual `DROP` statements are pointless.
- **Recommendation:** say plainly that reverting deletes that data, add "export first if it matters", and remove the
  manual SQL. *Deployment* gets the backup step for these too.
- **Resolution:** PROPOSE FIX. *Applied.*

### C-3. B-3 (S6) doesn't decide what happens to a never-published human draft (🟡 Major)
- **Lens:** codebase-details (3)
- **Scope:** S6 › Decided behaviour, `afterWriteDocument`.
- **Finding:** only `unpublished-changes` stops the publish. A draft a person made in the admin and never published
  gets published, whole, by the agent's next write. That's B-3's problem in a different state.
- **Recommendation:** publish only when the previous status is `undefined` (created by this write) or `published`; for
  `never-published`, publish only when `origin` is `web-agent` (the agent's own unlocated or failed drafts). Add a unit
  case for each state.
- **Resolution:** PROPOSE FIX, with that rule. *Applied* (S6: rule table, `addedByAgent`, unit test).

### C-4. Account deletion leaves reports and saved gyms, and the privacy copy contradicts S13 (🟡 Major)
- **Lens:** codebase-details (4)
- **Scope:** S13 › `forgetUser`, `beforeDelete`; S24 › `privacy.tsx`, the confirm card; S16, S17.
- **Finding:** S16 and S17 add rows keyed by the user, which deletion doesn't touch. The page and the card say
  "Claims you made are closed", but S13 keeps accepted claims accepted.
- **Recommendation:** in `beforeDelete`, delete the user's saved gyms and their open reports, and clear the reporter on
  resolved ones. Add privacy lines for both. Copy: "Open claims are withdrawn; your name, email and phone are removed
  from all of them."
- **Resolution:** PROPOSE FIX. Ordering: S13 comes before S16–S17, so the cleanup moves into S16 and S17 (each adds
  its own lines to `beforeDelete`). *Applied*, with a deletion test in each.

### C-5. S19 (UX-6) misses `filtersKey` in `mobile/app/index.tsx` (🟡 Major)
- **Lens:** codebase-details (6), implementation-readiness (M5). Two lenses agree.
- **Scope:** S19 › Callers updated; `mobile/app/index.tsx:99`, `:40`.
- **Finding:** the map camera's key leaves out `openMat`, so toggling the filter doesn't re-fit the map. Confirmed by
  the Elephant.
- **Recommendation:** add `|${filters.openMat}` to `filtersKey`, and `openmat?: string` to the params type.
- **Resolution:** PROPOSE FIX. *Applied.*

### C-6. *Shared edits* is incomplete (🟡 Major)
- **Lens:** codebase-details (7), implementation-readiness (nit 1). Two lenses agree.
- **Scope:** *Shared edits*.
- **Finding:** these files are edited by several steps but aren't listed: `services/claims.ts`, `mcp/index.ts`,
  `find-possible-duplicates.ts`, the plugin README and `index.ts` files, `mobile/app/account.tsx`,
  `SchoolPreview.tsx`, `schools/[slug]/index.tsx`, `week.ts` and its test, `filters.test.ts`,
  `explore-to-school.spec.ts`, `server/tests/api.test.ts` and `.env.example`. The order of the inserted blocks in
  `account.tsx` and the e2e spec isn't given.
- **Recommendation:** list every file edited by more than one step, with the step order and the block order.
- **Resolution:** PROPOSE FIX. *Applied.*

### C-7. S1's index check can't produce its expected output (🟡 Major)
- **Lens:** codebase-details (2)
- **Scope:** S1 › Verify (`name like '%_uq'`).
- **Finding:** Strapi names every link-table unique index `<join>_uq`, and `_` is a LIKE wildcard. The query returns
  many more rows than the step expects.
- **Recommendation:** query `name IN (…)` with the exact index names, and count the rows.
- **Resolution:** PROPOSE FIX. *Applied.*

### C-8. B-9's recommended header can let a direct caller dodge the sign-in rate limit (🟡 Major)
- **Lens:** implementation-readiness (M3)
- **Scope:** S12; *Deployment* 6 (rows 2–3 of the probe table); *Open questions* 4.
- **Finding:** if Strapi Cloud's ingress doesn't strip `X-Vercel-Forwarded-For`, a caller who calls Strapi Cloud
  directly can send a new value on every request and get a fresh bucket each time. That's a sign-in brute-force path.
  The probe only sends the owner's own requests, so it can't tell. Open question 4 understates it.
- **Recommendation:** the direct curl sends a forged `X-Vercel-Forwarded-For: 192.0.2.1`. If the probe shows that
  header on the direct request, rows 2–3 route to "stop and decide". Reword open question 4.
- **Resolution:** PROPOSE FIX. *Applied.*

### C-9. B-6 still allows a duplicate after an admin renames a question (🟡 Major)
- **Lens:** implementation-readiness (M4)
- **Scope:** S7 › `knowledge.upsert`, the fallback lookup.
- **Finding:** the fallback only looks at rows with a `NULL` key. After an admin renames Q1 to Q2 (key still K1), the
  agent's upsert of Q2 creates a second entry, contradicting "an admin edit leaves a stale key, which the service
  handles".
- **Recommendation:** the fallback matches the gym and the question whatever the key, and re-keys the row it finds.
- **Resolution:** PROPOSE FIX. *Applied.*

### C-10. S10's admin UI check can't be set up as described (🟡 Major)
- **Lens:** implementation-readiness (M6)
- **Scope:** S10 › Verify, Done when.
- **Finding:** the isolated integration run stops its server when it finishes, `register-admin` works once per
  database and `global-setup.ts` has already used it, and the "in-app browser" isn't named.
- **Recommendation:** "Done when" becomes the scripted checks (the exact pins in `package-lock.json`, and the label
  string in the built admin bundle). The visual check is optional.
- **Resolution:** PROPOSE FIX. *Applied.*

### C-11. S21's typed-routes fallback runs a command that doesn't generate types (🟡 Major)
- **Lens:** fact-checker (3)
- **Scope:** S21 › Callers updated.
- **Finding:** `npx expo export` never calls the typed-routes generator. Expo's docs give `npx expo customize
  tsconfig.json`, or starting the dev server.
- **Recommendation:** replace the fallback with `cd mobile && npx expo customize tsconfig.json`, then
  `npm run typecheck`.
- **Resolution:** PROPOSE FIX. *Applied.*

## Nits (🟢)
| # | Lens | Finding | Resolution |
|---|---|---|---|
| N1 | details 8, readiness 6 | S3: two concurrent accepts on Postgres can deadlock (`40P01`) and return 500 instead of 409 | *Applied*: map `40P01` to 409 `INVALID_STATE` in `act`'s catch |
| N2 | details 9, readiness 4 | S3 and S13 both say Henderson is claimed by no other test | *Applied*: S13 finds its claim by `documentId` (only two sample gyms exist) |
| N3 | details 10, readiness 2 | S17's CORS ⚠️ contradicts *Current state* | *Applied*: remove the conditional |
| N4 | details 11, readiness 7 | S7 `dedupeKey` is `varchar(255)` and can overflow on Postgres | *Applied*: make it `text` |
| N5 | details 12 | The plugin tsconfig "not verified strict"; `domain/result.ts:10` says it isn't | *Applied*: state it |
| N6 | details 13 | S16 `reports.resolve` doesn't set `updatedAt` with the query engine, unlike S3 | *Applied* |
| N7 | details 13, readiness 12 | S20 `.ics` folding counts characters, not the 75 octets RFC 5545 counts | *Applied*: fold by UTF-8 bytes |
| N8 | details 13, readiness 3 | Line drift: `createDraft` "after line 410"; `api.test.ts:64`; S3 "after line 377" | *Applied* |
| N9 | readiness 2 | ⚠️ items the code already answers (CM create route, configuration path, `?status=withdrawn`, sign-in input ids) | *Applied*: replace with the citations |
| N10 | readiness 5 | S12's last loop doesn't name a fresh IP, so the expected statuses can be wrong | *Applied* |
| N11 | readiness 8 | S18 shows "No drop-ins, but your first class is free" and "First class free" together | *Applied*: drop the duplicate line |
| N12 | readiness 9, 10 | S21 label says "optional" when "Something else" requires text; route not in `_layout.tsx`. S16 verify starts Strapi with no stop and may read a local `.env` | *Applied* |
| N13 | readiness 11, 12 | S5 `listFromWeb` loads all gyms per city; S8 leaves `docs/architecture.md:172` listing `/api/cities` as public | `cityGyms`: DECLINE (fine at 20 gyms). Architecture doc: *applied* in S8 |

## Counts
- PROPOSE FIX: 23 (C-1 to C-11, N1–N12, and the architecture-doc half of N13)
- ESCALATE: 0. C-3's rule and C-4's cleanup are conservative defaults, recorded under *Open questions* in 06.
- DECLINE: 1 (the `cityGyms` half of N13)
- CONTEST: 0
