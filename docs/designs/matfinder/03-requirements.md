# Functional Requirements

> As-is, 2026-10-28, at `main` `4f6074c`. Each line is something the product does today, from the code (`mobile/`,
> `server/`). The original requirements (R1–R14) are in `docs/plan/03-requirements.md`. Where today's product
> differs from them, the line below says so.

## Core features (as built)

### Explore (map and list, public)
- **F1. Opens on Explore, with no onboarding.** A full-screen map with one pin per published gym in the default
  city (Las Vegas). A bottom sheet, or a left panel on wide screens, lists the same gyms.
- **F2. "What's on today" is visible with no taps.**
  - Pins show today's state (`PinTone` in `mobile/lib/explore.ts`): green "On now" when a class is on now; red with a
    start time when any class is left later today, whether soon or later; muted when none is left today.
  - The sheet reads "N of M training today". N uses the same rule as the *Training today* filter (`isTrainingToday`).
  - The list is grouped On now / Starting soon (within 90 min) / Later today / Not today.
  - "Now" is always the city's time, never the phone's.
- **F3. Filters:** *Training today* (a session today that hasn't ended), *Visitors welcome* (`pricing.visitorsWelcome`
  is true), and *Gi / No-Gi* (choose one). Filters combine with AND.
- **F4. Sort** by start time (the default) or by distance.
- **F5. Text search** over gym name, neighborhood, ZIP and team. It runs on the phone against the loaded city.
  Searching a place doesn't move the map, and plan R5 ("search by area") is met only through those fields.
- **F6. Shareable views.** Filters, sort and the selected gym are kept in the URL.
- **F7. Your location** centers the map and shows distances when you allow it.
  - If you're more than 60 mi from the city center, or a filter is on, the map fits the listed gyms instead. The city
    is `EXPO_PUBLIC_DEFAULT_CITY` (default `las-vegas`).
  - If you deny location, the map centers on the city, distances are hidden, and nothing explains why.
- **F8. Preview card** (public), opened by tapping a pin or a card. It shows:
  - today's next session, with progress if it's live;
  - visitors welcome or members only;
  - the drop-in fee and styles;
  - Claimed, where it applies;
  - "View gym". Guests also see "Full schedule, coaches and contact with a free account".
- **F9. States:** loading, error with Try again, "No gyms match" with Clear, cached data kept when a refresh fails,
  and a list-only mode when there's no Mapbox public (`pk.`) token.

### Gym page (signed in only)
- **F10. Sign-in gate.** Guests are sent to sign in and come back to the gym afterwards. The server enforces it:
  the public API returns only preview fields.
- **F11. The gym page shows, top to bottom:**
  - Back and Share;
  - area, distance and team, plus "Schedule verified {date}", flagged after 90 days (see F20);
  - the claim line and the description;
  - Ask about this gym;
  - the next class, with a countdown, Directions and add to calendar (a Google Calendar link);
  - a "Can I train here today?" checklist (`visitChecklist`, `mobile/lib/week.ts`). Each line is ✓, ✗ or "ask the
    gym":
    - visitors welcome, members only, or visitor policy not listed (`pricing.visitorsWelcome`);
    - the drop-in fee, free drop-in, first class free, or price not listed (`pricing.dropInFee`, `pricing.freeTrial`);
    - when the next class is today: whether it's Gi, No-Gi or both, and for a gi class whether there's gi rental
      (`amenities.giRental`);
    - showers and parking, when listed;
  - price tiles (drop-in, first class, monthly, or "Ask");
  - programs (a program is a session's `classType`: Fundamentals, Kids, Women's, Open mat…) and styles;
  - this week's schedule;
  - coaches;
  - amenities and gallery;
  - getting there (map, address, Directions);
  - contact (call, email, website, Instagram, team site);
  - about.
- **F12. Session ended:** a 401 on the gym page shows "Your session has ended" with Sign in again.

### Accounts
- **F13.** Sign up (name, email, a password of 8+ characters), sign in and sign out, with email and password only.
  There's no email verification, password reset or account deletion. A session lasts 30 days and is extended each day
  it's used.
- **F14. Account screen:** your name and email with Sign out, or a guest pitch. Plus Appearance (System / Light /
  Dark).

### Claims (new since the plan, M12)
- **F15.** A signed-in user can claim a gym: name, role (owner, manager, head instructor or staff), phone and a note.
  - The gym page then shows "being reviewed", and later "Claimed by the owner".
  - Up to 5 open claims per user. One open claim per gym per user, so several people can claim the same gym. No new
    claims once the gym has an owner (`server/src/plugins/matfinder/server/src/services/claims.ts`).
- **F16.** Admins with the `claims.review` permission (Super Admin by default) mark a claim contacted, accept it,
  reject it with a note, or remove an owner. Accepting a claim rejects that gym's other open claims. **A claim gives
  the owner no editing rights.**

  | Claim state | Reached by | The claimant sees | Other users see |
  |---|---|---|---|
  | `pending` | the claim is sent | "Your claim is being reviewed. We'll contact you to confirm." | "Own or run this gym? Claim it" |
  | `contacted` | an admin marks it | the same as `pending` | "Own or run this gym? Claim it" |
  | `accepted` | an admin accepts it | "Claimed by the owner" | "Claimed by the owner", and no claim link |
  | `rejected` | an admin rejects it, or another claim is accepted | "Claim it" again, with no word that it was rejected | no change |
  | `withdrawn` | an admin removes the owner | "Claim it" again | "Claim it" again |

  The transitions are in `server/src/plugins/matfinder/server/src/domain/claims.ts`, and the wording is in
  `mobile/components/school/ClaimLine.tsx`. Nothing tells a claimant their claim was rejected.

### Built, not live

#### Ask about this gym (M17–M18, off in production)
- **F17.** A signed-in user can ask an AI questions about one gym. The answer streams in and comes only from that
  gym's data and the gym knowledge entries (see *Content* below).
  - Traces to Jess's "what will my first class be like" questions (02 › Jess), which the page doesn't answer.
  - Up to 4 suggested questions, 500 characters per question, 12 questions per chat, 40 per user per day. The daily
    count is kept in memory per Strapi process, and there's no total daily cap. With no email verification (F13), a
    new account gets a fresh 40.
  - Nothing is saved.
  - The button is hidden until the server reports the chat is ready, which needs an AI key.

### Curator workflow
- **F18.** The curator asks Claude, connected through MCP, to find gyms on the web (`find_new_gyms`) or to add and
  update them. The tools:
  - check for duplicates (name, phone, website, Instagram, within 150 m);
  - add the gym with its source pages;
  - set the weekly schedule and pricing;
  - add knowledge entries;
  - **publish straight away by default.** The plan said drafts only (R13–R14).
- **F19.** In the Strapi admin, the MatFinder area has three tabs: Gyms, Claims and From the web (the gyms the agent
  found, with status, source pages, possible duplicates and the date found). Homepage widgets
  show "Gym directory" and "Claims to review". Gyms, coaches, teams and knowledge are edited in the Content Manager.
- **F20.** Each gym shows "Schedule verified {date}" from `lastVerifiedAt`.
  - **Who sets it:** the agent, through `upsert_school` ("when the listing was last checked against the source"), or a
    person in the admin, whose form labels it "when a person last confirmed". So the date doesn't promise a human
    check.
  - Past 90 days the page adds "(may be out of date)". With no date it reads "Schedule not verified yet"
    (`mobile/components/school/SchoolHeader.tsx`).
  - Nothing reminds the curator about stale gyms, other than the `staleDays` filter in the MCP `find_schools` tool.

#### Nearby search (built in the backend, not used by the app yet)
- **F21.** Nearby search by location and radius (`GET /api/schools/nearby`, M14). The app still loads one city.
  It's the backend for M15 (place search) and M16 (Explore by location), which serve Jess's "near home" need and
  aren't built.

## Account & auth
- **End-user accounts: yes.** They're needed for the gym page, claims and the chat. Browsing needs none.
- **Admin accounts: yes,** in the Strapi admin, for the curator.
- **Roles:**
  - **Public:** the directory, nearby and cities.
  - **Authenticated:** the full gym page, claims and the chat.
  - **Admin:** everything, with MatFinder `read` and `claims.review` permissions.
  - **MCP token:** the MatFinder tools a given token is granted.

## Content the product manages

### Editorial content (admin or AI through MCP)
- **Gym (School):** identity, description, location, contact, pricing, amenities, weekly schedule, media, its team,
  coaches and city, plus the web sources it was found from.
- **Team (Affiliation), Coach (Instructor), City.**
- **Gym knowledge (the knowledge base):** question-and-answer entries, for one gym or for all, that the chat (F17) may
  use.

### User-generated content
- **Accounts** (name, email).
- **Claims.**

### Reusable shapes
- A schedule session, pricing, contact and amenities.

### Flexible layouts
- None.

## Localization & drafts
- **i18n:** none. The app is English only.
- **Draft & publish:** on for gyms, coaches, teams and knowledge. Agent writes publish straight away unless
  `autoPublish` is off.

## Integrations
- **Mapbox:** map tiles on web and native, and geocoding.
- **Directions:** Apple Maps on iOS, Google Maps elsewhere.
- **Calendar:** a Google Calendar link.
- **AI:** Anthropic, for the gym chat.
- **Claude:** through MCP, for curation.
- **No email, analytics, crash reporting or push notifications.**

## AI / agent access (MCP)
- **Yes.** 11 MatFinder tools and a `find_new_gyms` prompt, plus Strapi's content-manager tools, through Strapi's
  built-in MCP server. The MatFinder tools can create, update and publish, but can't delete, unpublish or upload
  media. Strapi's built-in tools can delete and unpublish, if the curator's token has content permissions.
- **Risk:** the agent reads gyms' web pages and publishes what it writes. A wrong or injected page can publish a wrong
  phone number, link or gym, and only a person in the admin can take it down.

## Non-functional (as built)
- **Platforms:** iOS, Android and web from one codebase. Only the web build is public.
- **Scale today:** 1 city, 20 gyms, and one confirmed real account (the owner's).
- **Caching:** the public directory responses are cached for 60 s.
- **Offline:** nothing is saved on the device, so a cold start offline shows an error.
- **Time:** all of "today" uses the city's time zone.
- **Privacy:** your exact location isn't sent to MatFinder's server (the nearby API would take coordinates, but the
  app doesn't call it yet). Map tile requests show Mapbox the area on screen. There's no privacy policy, password
  reset or account deletion, although the live web app already collects names and emails.

## Out of scope today (not built)
- Favorites or saved gyms, reminders, notifications.
- A beginner, kids, women's or open-mat filter. Programs are shown but can't be filtered.
- Reviews and check-ins.
- Owner editing of a claimed listing.
- Search by place, and more cities in the app (plan 08 M15–M16).
- Password reset, social sign-in.
- Holiday and seminar exceptions to schedules, and closure notices. A holiday closure is the main way a correct listing still sends someone to a closed door.
- Booking and payments.
- App Store release.

---

## Change goals (owner, 2026-10-28)
> "I want to review current features and recommend updates or refactor that improve ux and make the app better"

## Constraints
- **Live in production** (Strapi Cloud with Postgres, and Vercel) with 20 real gyms and real accounts. Data changes
  need to be migrations or idempotent bootstrap steps. No resets.
- **Must not change:**
  - the public URLs: https://matfinder.vercel.app and the Strapi Cloud origin;
  - the `/api` endpoints the Expo app calls, which an installed native build depends on;
  - the MCP tool names and the `find_new_gyms` prompt that curation uses.
- **Plans already approved but not built:** M15 and M16 (plan 08), and M19 (open as PR #47) and M20 (plan 09).
  Recommendations should build on these, not undo them. ⚠️ Open question (A-20): the order of this work vs. the
  trust and measurement changes.
- ⚠️ Open question (A-13): the `/api` freeze assumes an installed native build. If none exists outside the Simulator,
  this becomes "the endpoints the deployed web build calls; additive changes only".

### MatFinder MCP tool names (frozen)
`add_gym_from_web`, `find_possible_duplicates`, `find_schools`, `get_school_draft`, `list_pending_drafts`,
`list_reference_data`, `set_school_schedule`, `upsert_affiliation`, `upsert_instructor`, `upsert_knowledge`,
`upsert_school`, and the prompt `find_new_gyms` (`server/src/plugins/matfinder/server/src/mcp/`).

### Milestones
| Code | Scope | Status | Plan |
|---|---|---|---|
| M10 | Plugin scaffold, MCP move, admin page, Directory widget | Merged (#33) | `docs/plan/07-matfinder-plugin.md` |
| M11 | Gyms from the web | Merged (#34) | 07 |
| M12 | Claims | Merged (#35) | 07 |
| M13 | Agent writes go live (`autoPublish`) | Merged (#36) | 07 |
| M14 | Coordinates and the nearby API | Merged (#42) | `docs/plan/08-nearby-and-place-search.md` |
| M15 | Search suggestions (place search) | Not built (issue #40) | 08 |
| M16 | Explore by location and radius | Not built (issue #41) | 08 |
| M17 | Gym knowledge and the gym chat API | Merged (#45) | `docs/plan/09-ai-chat.md` |
| M18 | "Ask about this gym" in the app | Merged (#46) | 09 |
| M19 | MatFinder assistant tab in the admin | Open as PR #47 | 09 |
| M20 | Saved admin chats, unanswered questions | Not built | 09 |

M0–M9 are the original proof of concept (`docs/plan/06-build-spec.md`). PR and issue numbers are in
`PaulBratslavsky/matfinder`.
