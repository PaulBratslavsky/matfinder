# Users & Usage

> As-is, 2026-10-28, at `main` `4f6074c`. The personas come from `docs/plan/02-users.md`. The journey follows the
> code in `mobile/app/` and was confirmed with the owner.

## Personas

### Marco, the visiting grappler
- **Background:** a purple belt from Chicago with four days in Las Vegas and a couple of free evenings. He packed a gi.
- **Current workaround:** Googles "BJJ Las Vegas", opens gym websites and Instagram pages looking for a schedule,
  then messages two gyms about drop-ins and waits. He often ends up not training.
- **Tech comfort:** high. He's on his phone and in a hurry.
- **What matters to him:** a class today or tomorrow, visitors welcome, the drop-in fee, Gi vs. No-Gi, and distance.

### Jess, the local beginner
- **Background:** 32, moved to Henderson last year, and has never trained. Nervous about walking in.
- **Current workaround:** Google Maps and reviews. She can't tell a BJJ academy from an MMA gym and can't find prices.
- **Tech comfort:** medium, and she doesn't know the BJJ vocabulary.
- **What matters to her:** beginner classes, a free trial, price, distance from home, and times that fit around work.

## Operators
The product is single-tenant and team-curated. Owner editing is not built.

### The curator (the MatFinder team, today the owner)
- **Background:** runs MatFinder and keeps the Las Vegas listings current with limited time.
- **Current workaround:** asks Claude, connected to production through MCP, to find and add gyms from the web
  (`find_new_gyms`). Corrections are made in the Strapi admin.
- **Tech comfort:** high.

### The gym owner (new since the plan)
- **Background:** owns or runs a listed gym.
- **Current workaround:** they keep their Google Business Profile, Instagram and own website up to date, and answer
  visitors' messages there. In MatFinder they can only ask to claim their listing after signing in. The team reviews
  the claim in the admin. A claim doesn't let the owner edit anything.

## Jobs-to-be-done
- **When** he's in a new city with a free evening, **Marco** wants to find a class or open mat *today* that welcomes
  visitors, **so he can** train without messaging gyms.
- **When** she's deciding whether and where to start, **Jess** wants to see beginner-friendly schools near home with
  times, trial offers and prices, **so she can** pick one and actually show up.
- **When** the curator learns of a new gym or a schedule change, **they** want the listing added or fixed in minutes,
  **so the** directory stays accurate without becoming a part-time job.
- **When** they find their gym on MatFinder, **the gym owner** wants it marked as theirs, **so that** people trust the
  listing, and later so they can keep it up to date.

## Primary user journey (Marco and Jess, as built)
1. **Discovery:** a link to https://matfinder.vercel.app. The app isn't in any store, and there are no
   marketing pages, no SEO pages and no store listing.
2. **First use:** Explore (`/`) opens straight away, with no onboarding.
   - The app asks for location permission right away.
   - A full-screen map shows one pin per Las Vegas gym.
   - Pins are colored by today's classes: green "On now", red with a start time, or muted.
   - A bottom sheet (a left panel on wide screens) reads "N of M training today" and lists gyms grouped as On now,
     Starting soon, Later today and Not today.
   - Times are always Las Vegas time, whatever the phone's time zone.
3. **Narrowing down:**
   - The filters are *Training today*, *Visitors welcome* and *Gi / No-Gi*.
   - The list sorts by start time or distance.
   - A text search covers name, neighborhood, ZIP and team.
   - Filters and the selected gym are kept in the URL, so a filtered view can be shared.
   - Searching a place name ("Henderson") only matches gyms whose neighborhood or name contains it. It doesn't move
     the map. ("West Hartford" was the owner's own real search, which found nothing.)
4. **Aha moment:** tapping a pin or card opens a preview showing:
   - today's next session, with progress if it's live;
   - visitors welcome or members only;
   - the drop-in fee;
   - styles;
   - Claimed, where it applies.
5. **Sign-in gate:** "View gym" needs an account. A guest sees "Full schedule, coaches and contact with a free
   account". Sign-in or sign-up (email and password) returns them to the gym page.
6. **Decide:** the gym page (03 › F11) answers the questions from the preview in full: the next class with
   Directions, the "Can I train here today?" checklist, prices, the week's schedule and contact. "Ask about this gym" opens an AI chat when it's turned on, which it isn't in production yet.
7. **Ongoing use:** Marco reopens the app on later days or trips and is still signed in (30-day sliding session). There
   are no favorites, reminders or notifications to bring him back.

### Curator journey (as built)
1. The curator asks Claude to run `find_new_gyms` (or names a gym).
2. Through the MatFinder MCP tools, Claude checks for duplicates, adds the gym with its source pages, sets the schedule
   and pricing, and **publishes it straight away** (`autoPublish`, on by default).
3. The curator reviews new gyms in the admin's MatFinder area. The "From the web" tab lists the gyms the agent found,
   with their status, source pages, possible duplicates and when they were found. Fixes are made in the Content
   Manager.

### Gym-owner journey (as built)
Sign in → gym page → "Own or run this gym? Claim it" → form (name, role, phone, note) → "being reviewed". Then the team
accepts or rejects it in the admin, and the gym page reads "Claimed by the owner".

## Core loop
- **The repeated action:** open MatFinder, see *what's on today near me*, pick a session, go train.
- **What pulls users back:** ⚠️ assumption, unconfirmed. The answer to "where can I train today?" changes every day.
  Travelers return each trip, and locals return when their usual class doesn't fit. For Jess the product is a
  one-time choice; for Marco, once per Vegas trip.
- **Nothing in the app prompts a return.** There are no saved gyms and no notifications. Returning depends on the user
  remembering the app.
- **Curator's loop:** keep schedules accurate. Each gym page shows "Schedule verified {date}", flagged after 90 days.
