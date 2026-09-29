# MatFinder

## One-liner
MatFinder is a map-first directory of Brazilian Jiu-Jitsu schools that helps anyone, whether a local or a traveler, find the right place to train and know what to expect before they walk in.

## The problem
Finding a BJJ school today means piecing together scraps:

- **Map searches are noisy.** "Jiu jitsu near me" returns MMA gyms, karate dojos, and closed businesses mixed in with real BJJ academies.
- **The information that matters is buried or missing.** Class schedules live in Instagram highlights, drop-in policies and fees are unknown until you DM someone, and Gi vs. No-Gi, kids programs, women's classes, or open mats are rarely stated anywhere searchable.
- **Two groups feel this, for different reasons:**
  - **Travelers** have a few days in an unfamiliar city and need to know *today* where they can drop in, whether visitors are welcome, and what it costs.
  - **Locals** (beginners choosing a first school, or practitioners switching gyms) are making a longer-term decision and want to compare schools on style, schedule, affiliation, and price.

The result: people give up, pick the closest option blindly, or show up to a closed door or a class that doesn't fit.

## The value
**Before:** 30+ minutes across Google Maps, school websites, and Instagram, and often still unsure whether you can train there.

**After:** Open MatFinder, see the BJJ schools on a map around you (or around the city you're heading to), search or filter by what matters, and open a school page that answers the real questions: what they teach, when classes run, whether drop-ins are welcome and what they cost, their affiliation, and how to get in touch. You decide in minutes.

Every listing is **curated**, so the directory is trustworthy: only real BJJ schools, with consistent, comparable information. Letting schools claim and maintain their own listings comes later (see *What success looks like*).

## Product category
**Content / directory product.** A curated, searchable, map-based directory. It is designed to grow into a **two-sided platform** later, when school owners can claim and update their own listings, but the proof of concept is editorial: the MatFinder team maintains the data.

## What success looks like
A year in, a purple belt lands in a new city on a Thursday, opens MatFinder in the taxi, and sees three schools within 15 minutes, one with an open mat tonight that welcomes visitors, with a $20 mat fee. They show up with the right gear and get a great roll.

Across town, a parent compares two schools with kids programs, sees the schedules side by side, and books a trial class.

School owners have started emailing to *claim* their listing, because MatFinder is sending people through their door, and the curated data is the reason the directory is trusted in the first place.

---

### Launch market
- **Las Vegas, NV** (confirmed). The proof of concept is seeded with Las Vegas-area BJJ schools only. Vegas suits both sides of the product: a local community, plus a constant flow of visiting grapplers (conventions, fight weeks, tourism). The data model must not hard-code Vegas; more cities are added later.

### ⚠️ Open assumptions (unconfirmed)
- **Monetization:** assumed to be none for the proof of concept. The value to prove is "people find and choose a school faster."

### 🅿️ Parked for stage 4 (tech decisions)
- **Client:** Expo / React Native **plus React Native Web**, so the app can be tested in a browser (and in Expo Go or dev builds) without an App Store commitment. Builds on the existing `mobile/` app, which already has `react-native-web`.
  - Note: `@rnmapbox/maps` is native-only. The web build needs a `mapbox-gl` map via a platform-specific file (`*.web.tsx`).
- **Backend:** reuse the existing `server/` (Strapi 5) and the `strapi-plugin-map-box` location field as the starting point.
- **Strapi MCP:** the user wants the app connected to Strapi's built-in MCP server. That requires upgrading Strapi from **5.33.3 to 5.49 or later**, where the MCP server is stable. Its purpose (content operations vs. an in-app feature) gets defined in stage 3.
