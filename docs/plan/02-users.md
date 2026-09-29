# Users & Usage

## Personas

### Marco, the visiting grappler
- **Background:** Purple belt who has trained for 5 years at home in Chicago. In Las Vegas for four days for a trade show (or a fight week, or a vacation) with a couple of free evenings or mornings. Packed a gi and rash guard.
- **Current workaround:** Googles "BJJ Las Vegas", opens a handful of gym websites and Instagram pages trying to find a schedule, then DMs two gyms asking "do you take drop-ins, how much?" and waits for replies. Often ends up not training.
- **Tech comfort:** High. Phone-first and in a hurry, usually standing in a hotel lobby or an Uber.
- **What matters to them:** something on *today or tomorrow*, **visitors welcome**, drop-in fee, Gi vs. No-Gi, open mat times, distance from the Strip, and what to bring.

### Jess, the local beginner
- **Background:** 32, moved to Henderson last year, has never trained, and has been meaning to try BJJ after watching a friend compete. Nervous about walking into a room of experienced fighters.
- **Current workaround:** Google Maps plus reviews. Can't tell a BJJ academy from an MMA fight gym, doesn't know what "affiliation" means, and can't find prices anywhere.
- **Tech comfort:** Medium. Comfortable with apps, but doesn't know the BJJ vocabulary.
- **What matters to them:** **beginner-friendly / fundamentals classes**, free trial, price, distance from home, class times that fit around work, women's classes, and a welcoming vibe.

### The curator (MatFinder team)
- **Background:** Runs MatFinder and personally maintains the curated Las Vegas listings. Knows the local BJJ scene and has limited time.
- **Current workaround:** None yet. The alternative is hand-entering every school, schedule, and change into an admin panel.
- **Tech comfort:** High. Comfortable in the Strapi admin and in Claude.
- **What matters to them:** adding and updating schools **fast**, ideally by telling an AI assistant ("add this school, here's their schedule page") and reviewing the result, while staying confident nothing goes live without a human check.

## Jobs-to-be-done
- **When** I'm in a new city with a free evening, **Marco** wants to find a school with a class or open mat *today* that welcomes visitors, **so they can** train without cold-DMing gyms or wasting a trip.
- **When** I'm deciding whether and where to start BJJ, **Jess** wants to see beginner-friendly schools near home with their class times, trial offers, and prices, **so they can** pick one with confidence and actually show up.
- **When** I learn about a new school or a schedule change, **the curator** wants to add or update the listing in minutes, with AI doing the data entry and a human approving it, **so they can** keep the directory accurate without it becoming a part-time job.

## Primary user journey
*(Marco and Jess. They share one flow and emphasize different filters.)*

1. **Discovery:** For the proof of concept, a direct link to the web build (React Native Web) or the Expo app. Later: search, Reddit/BJJ forums, word of mouth, and school owners sharing their listing.
2. **First use:** The app opens on a **full-screen map centered on the user's location**, falling back to Las Vegas if location is off or they're outside the area. School pins are visible immediately, with a search bar on top.
3. **Narrowing down:** Marco taps **"Training today"** to show only schools with a session left today, then **"Visitors welcome."** Jess searches "Henderson" and scans the preview cards for fundamentals classes (a dedicated beginner filter is a v2 item). Pins update as filters change.
4. **Aha moment:** Tapping a pin opens a preview card: *"Open mat tonight · 7:00 pm · Visitors welcome · $20 drop-in · 12 min away."* The question they came with is answered on one card, no DMs needed.
5. **Sign in to see details:** Opening the full school page requires an account. A signed-out user who taps "View school" gets a sign-up / sign-in prompt and lands back on that school page afterwards. Browsing the map, search, filters, and preview cards stays open to everyone.
6. **Decide:** The **school page** shows the full weekly schedule, program types (Gi, No-Gi, kids, women's, fundamentals), drop-in/trial policy and pricing, affiliation, address with **directions**, and contact links (website, Instagram, phone).
7. **Ongoing use:** Marco reopens it (already signed in) the next morning (or next trip) to check what's on today. Jess comes back to compare two schools before committing to a trial.

### Curator journey
1. The curator hears about a new school or a schedule change.
2. They tell Claude (connected to MatFinder's Strapi through **MCP**): *"Add 10th Planet Las Vegas, here's their site and schedule."*
3. The assistant creates or updates the school **as a draft**, including location and a structured schedule.
4. The curator reviews the draft in the Strapi admin (or asks Claude to summarize the changes) and **publishes**. Only then does it appear in the app.

## Core loop
- **The repeated action:** Open MatFinder, see **what's on today near me**, pick a session, go train.
- **What pulls users back:** Schedules change every day of the week, so the answer to "where can I train today?" is different each time. Travelers return on every trip, and locals return when their usual class doesn't fit or they want an extra open mat.
- **Curator's loop:** keep listings fresh. Stale schedules break the user loop, so the curator workflow (AI-assisted entry plus human publish) is part of the core loop, not an afterthought.

---

### Confirmed decisions
- **Schedules are weekly and recurring** (e.g., "Mon/Wed 6:30 pm No-Gi"), stored in the school's local time zone (America/Los_Angeles for Vegas). One-off exceptions (holiday closures, seminars) are **out of scope** for the proof of concept.
- **Browse anonymously, sign in for details.** The map, search, filters, and preview cards are public. The **full school page requires an account.** Saving favorites is still out of scope for the proof of concept (accounts make it an easy v2).
- **AI writes drafts, humans publish.** Content created through MCP is never auto-published.

### 🅿️ Parked for stage 4 (tech decisions)
- **Auth:** the user chose the **Strapi Better Auth plugin** (`@strapi-community/plugin-better-auth`). Known implications: beta ("not for production" per its maintainers, fine for a proof of concept); needs Strapi 5.45 or later (satisfied by the 5.49+ upgrade already planned for MCP); replaces Users & Permissions, so public read access moves to `plugin-api-permissions` (alpha). **Verify:** Better Auth's Expo/React Native client support (`@better-auth/expo`) works through the Strapi plugin.
