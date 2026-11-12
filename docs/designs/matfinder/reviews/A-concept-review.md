# Checkpoint A: Concept review

- **Targets:** `01-product.md`, `02-users.md`, `03-requirements.md` (as-is)
- **Date:** 2026-10-28 · **EGM:** v0.1.0
- **Reviewers (dispatch option):** `egm:egm-zoom-out` BRAINSTORM (1), `egm:egm-design` (1), `egm:egm-comprehension`
  (1), `strapi-product-egm:skeptical-customer` (1)
- **Standard:** `reviews/standards/product-brief-standard.md`
- **Totals:** 🔴 3 · 🟡 19 · 🟢 14 (after merging duplicates across reviewers)

**Status (2026-10-28):** the owner chose "apply all". Every PROPOSE FIX doc edit is in 01–03. The six ESCALATE items
(A-3, A-4, A-5, A-6, A-13, A-20) and the auto-publish question are still open; 03 marks A-13 and A-20 as open
questions. Change candidates C1–C19 wait for E5.

In existing-app mode, a fix here does one of two things:
- **doc:** the as-is files get corrected.
- **change:** the finding becomes a candidate for this round's app changes, which you pick from at E5.

## Root causes
- **RC1. Trust isn't backed.**
  - AI-found gyms go live without review (`autoPublish`).
  - The agent itself can set "Schedule verified": `upsert_school` takes `lastVerifiedAt` as "when the listing was last
    checked against the source" (`P/mcp/tools/upsert-school.ts:53`). Yet the admin labels it "when a person last
    confirmed" (`A/components/GymsTab.tsx:159`).
  - There's no way to report a wrong schedule, and no way to mark a closure.
  - → A-1, A-2, A-12, A-20
- **RC2. Nothing is measured**, so the riskiest assumption, the early signal and "better UX" can't be checked. → A-2,
  A-9
- **RC3. The sign-in gate sits in the middle of the core loop.** It blocks Marco, blocks search engines, and has no
  password reset. → A-4, A-5, A-10
- **RC4. Jess is a persona the product doesn't serve.** The filters, labels and loop are Marco's. → A-6, A-7, A-21
- **RC5. Doc gaps:** codes, rules and labels used without definitions. → A-14 to A-19 and the nits

## Findings

### A-1. "Every listing is curated" vs auto-publish and an agent-set verified date (🔴 Blocker)
- **Lens:** design (B1), skeptical-customer (3, 14), zoom-out (3), comprehension (6). Four lenses agree.
- **Scope:**
  - 01 › The value;
  - 02 › Curator journey;
  - 03 › F11, F18, F20.
- **Finding:**
  - 01 promises curated listings, but agent writes publish straight away.
  - "Schedule verified {date}" is the only trust signal, and nothing says who may set it. The code lets the agent set
    it (RC1).
- **Recommendation:**
  - Describe publishing truthfully.
  - Define "verified" as a person's check.
  - Consider draft-by-default for new gyms (`MATFINDER_AUTO_PUBLISH=false` already exists).
- **Resolution:** PROPOSE FIX (doc + change).
  - **Doc edit:** 01 › The value. Replace "Every listing is curated…" with: "Listings are found by an AI agent from gyms'
    own pages and published straight away. The curator reviews them after they're live. 'Schedule verified' can be set
    by the agent (`upsert_school`) or a person, so it doesn't promise a human check."
  - **Doc edit:** 03 › F20. Add the same rule for who sets the date, and that a gym past 90 days shows "(may be out of
    date)" and an unset one "Schedule not verified yet" (`M/components/school/SchoolHeader.tsx:36`).
  - **Change candidates:**
    - C1: new gyms publish as drafts;
    - C2: only a person sets "verified";
    - C3: show the verified date and the source on the public preview.

### A-2. The riskiest assumption can't be tested (🔴 Blocker)
- **Lens:** design (B2), zoom-out (1), skeptical-customer (15, 18)
- **Scope:** 01 › Riskiest assumption, Hypothesis; 03 › Integrations, Out of scope
- **Finding:**
  - Nothing records a gym page view, a Directions tap, a return or a wrong schedule.
  - Holiday closures, the main "closed door" case, can't be shown.
  - Owners can't be shown any traffic.
- **Recommendation:**
  - Add hosted analytics on a few actions.
  - Add "Report wrong info".
  - Add a free-text closure notice per gym.
- **Resolution:** PROPOSE FIX (change).
  - **Change candidates:**
    - C4: privacy-respecting analytics on gym view, Directions, Call, Add to calendar and 7-day return. Vercel Web
      Analytics or PostHog, chosen at stage 4.
    - C5: "Report a problem" on the preview and the gym page, feeding an admin list.
    - C6: a per-gym notice ("Closed Nov 27") shown on the preview and the page.
  - **Doc edit:** 01 › Hypothesis › *How the product tests the riskiest assumption*. Name C4–C5 as the test once
    built.

### A-3. Claiming gives an owner nothing (🔴 Blocker)
- **Lens:** skeptical-customer (17), design (M7), zoom-out (6)
- **Scope:** 02 › Gym-owner journey; 03 › F16
- **Finding:**
  - An accepted claim adds a badge and no rights.
  - An owner whose listing was written by an AI can't fix it.
  - So owners have no reason to claim, and a wrong listing invites a takedown request.
- **Recommendation:**
  - Zoom-out: don't build owner editing.
  - Instead, take corrections from owners and apply them through the curator.
- **Resolution:** ESCALATE. Only you know whether owners are a goal this round.
  - **Option (zoom-out):** C7, "Owner? Send a correction", which feeds the C5 list. The curator applies it with the
    MCP tools.

### A-4. The sign-in gate traces to no user need and slows Marco (🟡 Major)
- **Lens:** design (M4), zoom-out (2), skeptical-customer (2), comprehension (5). Four lenses agree.
- **Scope:** 02 › step 5; 03 › F10, F13
- **Finding:**
  - The address, Directions, contact details and the full schedule all need an email and password account.
  - The account gives the user nothing back.
  - There's no password reset.
  - The reason for the gate isn't stated anywhere.
- **Recommendation:**
  - State why the gate exists, or remove it.
  - At least make the address and Directions public, and add a password reset.
- **Resolution:** ESCALATE. Why does the gate exist, and are you open to moving it?

### A-5. Discovery may be the real riskiest assumption (🟡 Major)
- **Lens:** design (M3), skeptical-customer (1), zoom-out (2)
- **Scope:** 01 › Riskiest assumption; 02 › step 1
- **Finding:** MatFinder can only be reached by a link. There's no SEO and no store listing, and the indexable content
  sits behind the gate.
- **Recommendation:** public, indexable gym pages on the Vercel domain.
- **Resolution:** ESCALATE, together with A-4. If the gate moves, C8 (public, indexable gym pages) becomes possible.

### A-6. Jess isn't served at the narrowing step (🟡 Major)
- **Lens:** design (M5), skeptical-customer (7, 8, 9, 10)
- **Scope:** 02 › Jess, step 3; 03 › F3, F5, F7, Out of scope
- **Finding:**
  - The filters are Marco's.
  - There's no beginner or free-trial filter, and no "first class free" badge.
  - "Gi / No-Gi" is unexplained.
  - A place search doesn't move the map.
  - There's no "what to expect on your first class".
- **Recommendation:** either make Jess secondary, or add a beginner/trial filter, plain labels and place search (M15).
- **Resolution:** ESCALATE. Is Jess a primary persona this round?
  - **Change candidates:**
    - C9: Beginner-friendly and Free trial filters, plus a badge on cards;
    - C10: a one-line explanation of Gi / No-Gi;
    - C11: a "Your first class here" block.

### A-7. The core loop is close to one-off for both personas (🟡 Major)
- **Lens:** design (M6), skeptical-customer (5, 12)
- **Scope:** 02 › Core loop
- **Finding:**
  - Jess stops needing the app once she joins a gym.
  - Marco returns once per Vegas trip, and nothing brings him back.
  - "Locals return when their usual class doesn't fit" has no evidence.
- **Recommendation:** mark it unconfirmed, and add a return trigger, or a persona who does return.
- **Resolution:** PROPOSE FIX (doc + change).
  - **Doc edit:** 02 › Core loop. Mark "What pulls users back" as `⚠️ assumption, unconfirmed`, and add: "For Jess the
    product is a one-time choice; for Marco, once per Vegas trip."
  - **Change candidates:**
    - C12: saved gyms;
    - C13: the web app installable to the home screen (a web manifest).

### A-8. Riskiest assumption marked unconfirmed, while the Hypothesis is marked confirmed (🟡 Major)
- **Lens:** design (M1), comprehension (4)
- **Scope:** 01, lines 36–39 and 47
- **Resolution:** PROPOSE FIX (doc). You confirmed the Hypothesis, which states the riskiest assumption.
  - **Doc edit:** 01 › Riskiest assumption. Replace the ⚠️ line with "Confirmed by the owner, 2026-10-28".
  - Early signal stays unconfirmed.

### A-9. The early signal and the "better UX" goal can't be measured (🟡 Major)
- **Lens:** design (M2)
- **Scope:** 01 › Early signal; 03 › Change goals
- **Resolution:** PROPOSE FIX (doc), tied to C4.
  - **Doc edit:** 01 › Early signal. "Measurable once C4 ships: the share of preview opens that lead to Directions or a
    gym page, and 7-day returns."

### A-10. No password reset, privacy policy or account deletion, on a live site collecting emails (🟡 Major)
- **Lens:** skeptical-customer (11, 19), design (M11, M4), zoom-out (9)
- **Scope:** 03 › F13, Non-functional › Privacy
- **Finding:**
  - These are framed as "before an App Store release", but the web app collects names and emails today.
  - "Your location never leaves the phone" is too strong: map tile requests show Mapbox the area being viewed.
- **Resolution:** PROPOSE FIX (doc + change).
  - **Doc edit:** 03 › Privacy. "Your exact location isn't sent to MatFinder's server. Map tile requests show Mapbox the
    area on screen."
  - **Change candidates:**
    - C14: password reset (needs an email provider);
    - C15: a privacy policy page and account deletion.

### A-11. The chat's cost limit can be bypassed (🟡 Major)
- **Lens:** design (M9)
- **Scope:** 03 › F13, F17
- **Finding:**
  - There's no email verification, so new accounts multiply the 40-a-day quota.
  - The counter is in memory (`P/gym-chat/limits.ts`).
  - There's no global budget.
- **Resolution:** PROPOSE FIX (doc), with the design question carried to checkpoint B.
  - **Doc edit:** 03 › F17. "Counted in memory per Strapi process; no total daily cap."

### A-12. Scraped pages write straight to production, and agents can't unpublish (🟡 Major)
- **Lens:** design (M10), skeptical-customer (16)
- **Scope:** 03 › F18, AI / agent access
- **Resolution:** PROPOSE FIX (doc + change).
  - **Doc edit:** 03 › AI / agent access. Name the risk: "a wrong or injected page can publish a wrong phone number,
    link or gym, and only a person in the admin can take it down."
  - **Change candidate:** C1 (draft-by-default) covers it.

### A-13. "An installed native build depends on /api" contradicts "isn't in any store" (🟡 Major)
- **Lens:** comprehension (3), design (M12)
- **Scope:** 03 › Constraints
- **Resolution:** ESCALATE. Is any native build installed outside the Simulator (TestFlight, your phone)?
  - If none, the constraint becomes "the endpoints the deployed web build calls; additive changes only".

### A-14. Milestone codes and the frozen MCP tool names are never defined (🟡 Major)
- **Lens:** comprehension (1, 2)
- **Scope:** 01 › Where the product has moved on; 03 › Constraints, F15–F21
- **Resolution:** PROPOSE FIX (doc).
  - **Doc edit:** 03 › Constraints. Add a table of M12–M20, each with a one-line scope, its status and its plan file.
    Also list the 11 tool names from `P/mcp/index.ts`.

### A-15. Claim rules contradict each other (🟡 Major)
- **Lens:** comprehension (7)
- **Scope:** 03 › F15–F16
- **Finding:** "One claim per gym at a time" vs "accepting rejects that gym's other open claims".
- **Resolution:** PROPOSE FIX (doc). The code allows one open claim **per user per gym** (`CLAIM_OPEN`,
  `P/services/claims.ts:52`), so several people can claim the same gym.
  - **Doc edit:** F15. Change "one claim per gym at a time" to "one open claim per gym per user; none once the gym has
    an owner".

### A-16. The "Can I train here today?" checklist is never described (🟡 Major)
- **Lens:** comprehension (8)
- **Scope:** 02 › step 6; 03 › F11
- **Resolution:** PROPOSE FIX (doc).
  - **Doc edit:** F11. List the checklist items and the fields they read (`M/lib/week.ts:127-167`).

### A-17. Four personas, the gym owner has no real workaround, and tenancy isn't stated (🟡 Major)
- **Lens:** design (M7, M13)
- **Scope:** 02 › Personas; 01 › Product category
- **Resolution:** PROPOSE FIX (doc).
  - **Doc edit:** 02. Move the curator and the gym owner under an "Operators" heading.
  - Give the owner a real workaround: their Google Business Profile, Instagram and own website.
  - Add to 01, 02 and 03: "Single-tenant and team-curated. Owner editing is not built."

### A-18. The chat (F17) and the nearby API (F21) trace to no user need (🟡 Major)
- **Lens:** design (M8)
- **Scope:** 03 › F17, F21; 01 › Hypothesis
- **Resolution:** PROPOSE FIX (doc).
  - **Doc edit:** move F17 and F21 under "Built, not live".
  - Trace F17 to Jess's "what to expect" questions, and F21 to M15–M16 place search.
  - Change the Hypothesis to "F1–F16, F18–F20".

### A-19. Holiday closures and open-mat filtering (🟡 Major)
- **Lens:** zoom-out (8), skeptical-customer (3, 4)
- **Scope:** 03 › Out of scope; 01 › What success looks like
- **Finding:** the success scene is "an open mat tonight", but open mats can't be filtered.
- **Resolution:** PROPOSE FIX (change).
  - **Change candidates:** C6 (closure notice, see A-2) and C16: an Open mat filter or tag, using the existing
    `classType`.

### A-20. Pause chat, claims and multi-city until there's usage data (🟡 Major)
- **Lens:** zoom-out (5, 6, 7)
- **Scope:** 03 › Constraints ("build on M15, M16, M19, M20")
- **Finding:** at 1 city and 20 gyms these add cost and scope before trust is proven. Zoom-out suggests only the thin
  slice of M15: geocode and pan the map.
- **Resolution:** ESCALATE. This conflicts with your constraint to build on the approved plans. You decide the order.

### A-21. Location is asked for with no reason, and a denial isn't explained (🟡 Major)
- **Lens:** skeptical-customer (6, 8), design (N3), zoom-out (7)
- **Scope:** 03 › F7
- **Resolution:** PROPOSE FIX (change).
  - **Change candidate:** C17: one line before the prompt saying why location is needed, and one line when it's
    denied ("Showing Las Vegas. Allow location to see distances").

### A-22. Pin colors, the count rule and the claim states are under-specified (🟡 Major, merged)
- **Lens:** comprehension (9, 10)
- **Scope:** 03 › F2, F15
- **Resolution:** PROPOSE FIX (doc).
  - **Doc edit:** F2.
    - Green = a class is on now.
    - Red with a time = any class later today, whether "soon" or "later".
    - Muted = none left today.
    - The count uses the *Training today* rule.
  - **Doc edit:** F15. Add a table of each claim state and what the claimant and other users see.

## Nits (🟢)
| # | Lens | Finding | Resolution |
|---|---|---|---|
| N1 | comprehension 11 | "Program" isn't defined | PROPOSE FIX (doc): "a program = a `classType` (Fundamentals, Kids, Women's, Open mat…)" |
| N2 | comprehension 12 | The field behind *Visitors welcome* isn't named | PROPOSE FIX (doc): `pricing.visitorsWelcome` |
| N3 | comprehension 13 | The "From the web" tab isn't described | PROPOSE FIX (doc): one sentence |
| N4 | comprehension 14 | "Knowledge base" is used before it's defined | PROPOSE FIX (doc): link forward |
| N5 | comprehension 15 | Which admin roles can review claims | PROPOSE FIX (doc): those with `claims.review` (Super Admin by default) |
| N6 | comprehension 16 | How the default city is chosen, and what the 60 mi is measured from | PROPOSE FIX (doc): `EXPO_PUBLIC_DEFAULT_CITY`, measured from the city center |
| N7 | comprehension 17 | "Map token" is vague | PROPOSE FIX (doc): the Mapbox `pk.` token |
| N8 | comprehension 18 | The West Hartford example | PROPOSE FIX (doc): explain it's your real search, which found nothing |
| N9 | comprehension 19 | 02's gym page list repeats F11 | PROPOSE FIX (doc): point to F11 |
| N10 | comprehension 20 | User count is worded three ways | PROPOSE FIX (doc): "one confirmed real account (yours)" everywhere |
| N11 | comprehension 21 | Which Claude client and token setup | DECLINE: setup is in `CLAUDE.md` and the plugin README, out of scope for a product brief |
| N12 | skeptical-customer 6 | Add to calendar is Google-only | PROPOSE FIX (change): C18, an .ics download |
| N13 | skeptical-customer 13 | "Members only" reads as "no trial" | PROPOSE FIX (change): C19, separate drop-in and trial chips |
| N14 | design N1, N2 | Unsourced figures; technology names in requirements | PROPOSE FIX (doc): mark the figures unconfirmed and say "add to calendar" |
