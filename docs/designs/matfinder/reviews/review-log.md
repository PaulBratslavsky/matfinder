# Review log: MatFinder (existing-app mode)

- **Skill:** strapi-product-egm 0.2.4 · **EGM:** v0.1.0
- **App:** `PaulBratslavsky/matfinder` @ `4f6074c`, reviewed on branch `egm/app-review` (uncommitted)

## Checkpoint A: Concept (2026-10-28)
- **Targets:** 01–03 (as-is).
- **Reviewers:** egm-zoom-out (BRAINSTORM), egm-design, egm-comprehension, skeptical-customer. All four were fresh
  subagents given only the file paths and the standard.
- **Findings:** 🔴 3 · 🟡 19 · 🟢 14.
- **Labels:** 29 PROPOSE FIX · 6 ESCALATE · 1 DECLINE · 0 CONTEST.
- **Owner's choice:** apply all doc fixes. Applied the same day.
- **Still open (escalated):**
  - A-4/A-5: why the gym page needs sign-in, and whether it could be public and indexable;
  - A-3: whether gym owners are a goal this round;
  - A-6: whether Jess is a primary persona this round;
  - A-13: whether any native build is installed outside the Simulator;
  - A-20: the order of M15–M16 and M19–M20 vs. the trust and measurement changes;
  - auto-publish vs. drafts for new gyms.
- **What the review caught that the Elephant missed:**
  - 01 promised "every listing is curated" while the code auto-publishes and lets the agent set "Schedule verified".
    Four lenses found it independently.
  - The riskiest assumption had no way to be tested: no analytics, no report button.
  - 03's claim rule ("one claim per gym") was wrong. The code allows one open claim per user per gym.
- **Elephant checks while applying fixes:** the claim-state wording was taken from `ClaimLine.tsx` instead of being
  marked "not verified". That showed a gap the reviewers didn't name: a rejected claimant gets no message.
- **Re-run:** none. The fixes were edits to wording and facts and add no new scope.

## Checkpoint R: Reconstruction (2026-10-28)
- **Targets:** 04–05 (as built). **Reviewer:** egm-codebase-details, REVIEW mode, with `server/` and `mobile/`.
- **Findings:** 🔴 2 · 🟡 11 · 🟢 13. Verdict: did not pass.
- **Labels:** 26 PROPOSE FIX, all applied directly (facts, not decisions). 0 ESCALATE.
- **What the review caught:**
  - `claimed` was written up as a stored write; it's computed on every read.
  - The MCP permission ids were wrong (`_` vs `-`), which would mislead anyone granting a token.
  - Auto-publish publishes the whole draft, including a person's unpublished edits.
- **Elephant checks:** every Blocker and Major was confirmed in the code before editing. One reviewer nit was
  overstated: `components/kit` is a single component, not "the app's real component kit".
- **Carried to B:** the CSP breadth, auto-publish of human drafts, `ba_user` editable in the admin, the sign-out cache,
  and the unverified `/api/cities?populate=schools` exposure.

## Checkpoint B: Design (2026-10-28)
- **EGM:** v0.1.0 · **Reviewers:** egm-design, egm-zoom-out, strapi-code-auditor, strapi-fact-checker · **Dispatch
  option:** 1 · **Re-run:** not yet
- **Findings:** 🔴 1 · 🟡 15 · 🟢 18 → 30 PROPOSE FIX · 3 ESCALATE · 4 DECLINE · 0 CONTEST. Scope (E5, 2026-10-29): "all Blockers and Majors, plus your change goals".
- **What the review caught:** `add_gym_from_web` overwrites a same-named gym (design only); a possible sign-in-gate
  bypass through public `/api/cities` (three lenses); Strapi 5.58's built-in delete tools behind the curator token
  (fact-checker, against upstream source); a likely shared rate-limit bucket behind Vercel.
- **Doc errors the fact-checker found in the Elephant's text:** Content History's plan, cookie defaults credited to
  the wrong package, an unreachable fallback described as live.
- **Reviewer quality:** no wrong findings. The auditor's "the app's real component kit" (R) and zoom-out's
  "test detail belongs in a README" pulled against earlier advice; both recorded, neither acted on.
- **Lessons:** 8–10 below.

## E6: Change spec (2026-10-29)
- **Scope:** B-1 to B-12 (app changes) plus G1, the owner's UX goal, served by checkpoint A candidates C2, C3, C5, C6,
  C12, C13, C15–C19. Deferred: B-13 to B-16 (docs, E9), every B nit, and the candidates waiting on an owner decision
  (C1, C4, C7–C11, C14).
- **How it was written:** four forked drafters, one per area (agent write path; claims and database; auth, cost and
  privacy; UX), each reading the code read-only. The Elephant assembled 25 steps, `S1`–`S25`, so they don't collide
  with the project's `M10`–`M20`, and reconciled the index list, one shared helper and `GRANTS`.
- **Elephant checks while assembling:** `strapi start` doesn't set `NODE_ENV` (Strapi defaults it to `development`),
  and CORS already allows `PUT`/`DELETE`. Both were open items in the drafts.

## Checkpoint C: Change readiness (2026-10-29)
- **EGM:** v0.1.0 · **Reviewers:** egm-implementation-readiness, egm-codebase-details, strapi-fact-checker · **Dispatch
  option:** 1 · **Re-run:** none
- **Findings:** 🔴 1 · 🟡 10 · 🟢 13 → 23 PROPOSE FIX · 0 ESCALATE · 1 DECLINE · 0 CONTEST.
- **Owner's choice:** apply all. Applied the same day.
- **What the review caught:**
  - S14 would have undone S5's Blocker fix in the same line of `upsert-school.ts` (two lenses).
  - Three rollbacks said data survives a revert; Strapi's schema sync drops removed columns and tables (all three
    lenses).
  - B-3's fix covered `unpublished-changes` only; a never-published human draft would still be published.
  - A trusted Vercel header could open a sign-in brute-force path if the ingress passes a forged one.
- **Reviewer quality:** no wrong findings. The fact-checker checked 28 claims (24 confirmed).
- **Lessons:** 11–14 below.

## E8: Implementation (2026-10-29)
- **Branch:** `egm/trust-safety-ux`, 25 commits, not pushed. Every suite passes; the log is
  `reviews/E8-implementation-log.md`.
- **How:** five fresh implementing agents, one batch at a time, each with only the spec, the code and a one-page brief.
  The Elephant reviewed each batch's diff and decided every stop.
- **What the spec got wrong:** 4 stops, all test or type details (none needed a design change); about 10 small
  corrections. No step needed a design decision the spec hadn't made: checkpoint C's zero-decision bar held.
- **Lessons:** 15–16 below.

## Lessons
1. **As-is briefs should say who sets each trust field.** A field such as `lastVerifiedAt` reads as a human check in
   the UI, while the code lets an agent write it. Existing-app mode's E1 should ask "who or what writes each field the
   user is asked to trust?", and 03 should record the answer. (Checkpoint A, A-1.)
2. **In existing-app mode, check every "the product promises X" sentence against config defaults.** The as-is 01 kept
   the plan's promise ("curated") after a milestone (M13) flipped the default. Existing-app mode should diff 01's
   value claims against the code's defaults before checkpoint A. (A-1, A-12.)
3. **Constraints copied from the owner need a reality check.** "An installed native build depends on /api" was
   written as a constraint while 01 said no build is in any store. The Elephant should check each constraint against
   01's "Where it stands" before the review. (A-13.)
4. **Count states from code, not from the plan.** The claim rule and the claim states were both under-specified until
   checked against `domain/claims.ts` and `ClaimLine.tsx`. Existing-app mode's 03 template could ask for a state table
   for every status enum. (A-15, A-22.)
5. **Derived fields look like stored ones.** The Elephant described `claimed` as written on accept because the API
   returns it. E2 should ask, for every response field not in a schema: "where is this computed, and what are its
   limits?" (Checkpoint R, R-1.)
6. **Copy identifiers from the code that builds them.** The MCP action ids were written from the tool names, not from
   `actionUid`. Any id or permission string in 04–05 should be traced to the function that forms it. (R-2.)
7. **"All X do Y" sentences need one check per X.** The middleware line was true for five of seven. (R-5.)
8. **Trace every upsert key across tenants.** The Elephant documented `add_gym_from_web` as "add" without asking what
   key it upserts on. E2 should list, for each write tool, its identity key and its scope (global vs per city), and
   05 should state what happens on a collision. (Checkpoint B, B-1.)
9. **A permission sentence must name the token, not the tool.** "Agents can't delete" was true of the custom tools
   and false of the token. In MCP apps, 05 should state the token's scope and what Strapi's built-in tools add at that
   scope. (B-4.)
10. **Every public grant needs a caller.** `city.find` was granted with no caller in the app. The as-built standard
    could require each Public/Authenticated grant to name the frontend call that needs it. (B-2.)
11. **A spec drafted in parallel parts needs a shared-files pass before review.** List every file more than one part
    names, give the step order and the final text where two steps edit the same lines, and put that list in the spec.
    Reconciling only the overlaps you know about left a Blocker. (Checkpoint C, C-1, C-6.)
12. **A rollback sentence about the schema needs the ORM's sync behaviour checked.** Strapi 5 drops removed columns and
    tables at boot (`forceMigration`, default `true`), so "the column stays" is a data-loss claim. The as-built 04
    should record the sync setting. (C-2.)
13. **A rule that fires on one enum state must list every state.** Lesson 4 again: B-3's fix named
    `unpublished-changes` and left `never-published` to chance, and B-6's fallback handled one key state. Each such
    rule now gets a state table in 06. (C-3, C-9.)
14. **Before writing "⚠️ not verified", look for the repo's own answer.** The Content Manager routes, the hidden-field
    pattern, the claim status filter and the sign-in input ids were all already in the code or its tests. (C, N9.)
15. **Specs for apps with a stack navigator should warn about hidden screens.** Expo Router keeps earlier screens
    mounted, so e2e text checks match hidden copies; two of the four stops came from it. A change spec's e2e lines
    should default to `filter({ visible: true })` or role-scoped queries. (E8, S21, S24.)
16. **Copy UI labels and response shapes from the code, never from what they "should" say.** The sign-in button is
    "Continue", and a `null` session is an empty 204. Both were written from expectation. That's lesson 6 again, now
    for UI text and HTTP edge cases. (E8, S13, S24.)

