# MatFinder

> As-is, 2026-10-28. This file describes the product as it runs today, at `main` `4f6074c`. It comes from
> `docs/plan/01-product.md`, the code and the owner's interview answers. The original plan stays in `docs/plan/` as
> background. Where this file and the plan differ, the product has moved on since the plan was written.

## One-liner
MatFinder is a map-first directory of Brazilian Jiu-Jitsu schools, starting in Las Vegas. Locals and travelers use it to
find where they can train and to know what to expect before they walk in.

## The problem
Finding a BJJ school means piecing together scraps:

- Map searches mix real BJJ academies with MMA gyms, karate dojos and closed businesses.
- Schedules sit in Instagram highlights.
- Drop-in policies and fees stay unknown until you message the gym.
- Gi vs. No-Gi, kids, women's and open-mat classes are rarely stated anywhere searchable.

Two groups feel this:

- **Travelers** have a few days in a city and need to know where they can drop in *today* and what it costs.
- **Locals** choosing a first school, or switching schools, want to compare style, schedule and price.

## The value
- **Before:** 30+ minutes (⚠️ estimate, unsourced) across Google Maps, gym websites and Instagram, often still unsure whether you can train there.
- **After:** open MatFinder and see the BJJ schools around you on a map. Filter by *training today*, *visitors welcome*
  and *Gi / No-Gi*, then open a school page that answers the real questions: schedule, drop-in policy and price,
  affiliation, contact.

Listings are found by an AI agent from gyms' own pages and published straight away. The curator reviews them after
they're live. "Schedule verified" can be set by the agent (`upsert_school`) or a person, so it doesn't promise a human
check (see 03 › F20).

## Today's workaround
Google or map searches, then each gym's website and Instagram, then direct messages to ask about drop-ins and fees.
Source: the personas in `docs/plan/02-users.md`.

## Riskiest assumption
Confirmed by the owner, 2026-10-28 (the plan never named one): **visitors and beginners trust
MatFinder's curated schedules enough to show up without checking with the gym first, and the curator can keep those
schedules accurate as listings grow.** A wrong schedule sends someone to a closed door, which breaks the core loop.

## Early signal
⚠️ assumption, unconfirmed: the plan defines no first-month signal, and the app records no analytics (see 03). The
candidate drafted for review: people who open a school page come back to the app within a week, and nobody reports a
listing whose schedule was wrong. Measurable only once analytics ship (change candidate C4): the share of preview
opens that lead to Directions or a gym page, and 7-day returns.

## Hypothesis
> Confirmed by the owner, 2026-10-28.

For **Marco, the visiting grappler** (and Jess, the local beginner), who today **searches Google, gym websites and
Instagram and then messages gyms to ask about drop-ins**, **MatFinder** lets them **open the app, see what's on today
near them, pick a session and go train**, so they **train on the day without messaging anyone**. The product as built is
**F1–F16 and F18–F20 in 03** (F17 and F21 are built but not live): a public map and list of today's classes in one city, and a gym page behind a free account. The
riskiest assumption is **that people trust the curated schedules enough to show up without checking with the gym, and
that the curator can keep them accurate.**

- **What's new:** one view answers "where can I train today, as a visitor, and for how much", across every gym in the
  city. Today that answer is spread across a dozen websites and inboxes.
- **How the product tests the riskiest assumption:** it can't yet. It records no visits, returns or reports of a wrong
  schedule (no analytics, no "report a problem"). The only trust signal shown is "Schedule verified {date}", which the
  agent can set. Once built, analytics (C4) and "Report a problem" (C5) are the test.

## Product category
A **content / directory product**, curated by the MatFinder team. It has started to become **two-sided**: school owners
can now ask to claim their listing (built in M12, plan 07). Single-tenant and team-curated: owner editing is not built.

## What success looks like
A year in, a purple belt lands in a new city on a Thursday and opens MatFinder in the taxi. They see three schools within
15 minutes, one with an open mat tonight that welcomes visitors, with a $20 mat fee. They show up with the right gear.
Across town, a parent compares two schools' kids programs and books a trial. School owners claim their listings because
MatFinder sends people through their door. (Unchanged from `docs/plan/01-product.md`. Today open mats can't be
filtered; see 03 › Out of scope.)

---

### Where it stands (2026-10-28)
- **Live in production since 2026-10-19:** web at https://matfinder.vercel.app, backend on Strapi Cloud. The iOS app has
  run in the Simulator but isn't in any store.
- **Market:** Las Vegas only, with 20 real gyms added through the curator's AI workflow.
- **Users:** one confirmed real account, the owner's (owner, 2026-10-28).
- **Monetization:** none.

### Where the product has moved on from the plan
- **AI-added listings go live straight away.** The plan said "AI writes drafts, humans publish" (`docs/plan/02-users.md`,
  *Confirmed decisions*). Since M13, agent writes publish by default (`autoPublish: true` in
  `server/src/plugins/matfinder/server/src/config.ts`), and `MATFINDER_AUTO_PUBLISH=false` turns that off.
- **Claims exist.** Claiming was listed as out of scope for v1, and was then built in M12 (plan 07).
- **No city picker.** Plan 08 (2026-10-19) drops the city picker in favor of your location and a radius. Only the
  backend half (M14, `GET /api/schools/nearby`) is built. M15 search suggestions and M16 Explore by location are not.
  (Milestone codes are defined in 03 › Milestones.)
- **Ask about this gym.** An AI chat on the school page (M17–M18, plan 09). It's built, but stays off in production
  until an AI key is set.
- **The README is out of date.** It still says "proof of concept … deployment is next".
