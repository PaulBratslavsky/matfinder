# Functional Requirements

## Core features (MVP)

### Map
- **R1.** The app opens on a full-screen map **centered on the user's current location**, falling back to the **Las Vegas city center** when location permission is denied or the user is outside a covered city.
- **R2.** Every published school appears as a **pin** at its location. At proof-of-concept scale (Las Vegas, under ~150 schools), all pins for the city may load at once.
- **R3.** Tapping a pin opens a **preview card** (public, no sign-in) showing: school name, logo, distance from the user (when location is known), **next session today** (e.g., "Open mat · 7:00 pm"), a **visitors-welcome** badge, the **drop-in fee**, and training styles (Gi / No-Gi). The card has a **"View school"** action.
- **R4.** The user can **re-center** on their location and pan/zoom freely.

### Search & filters
- **R5.** **Text search** by school name or area (neighborhood, city, ZIP). Results update both the map pins and a result list.
- **R6.** **"Training today"** filter: only schools with **at least one session today whose end time has not passed**, evaluated in the **school's local time zone** (not the device's). This is the core-loop filter.
- **R7.** **"Visitors welcome"** filter: only schools that accept drop-ins.
- **R8.** **Gi / No-Gi** filter: schools offering at least one session in the selected style.
- **R9.** Filters combine (AND) with each other and with text search. An empty result shows a helpful empty state ("No sessions left today, try tomorrow" / clear filters).

### School page (requires sign-in)
- **R10.** Signed-out users who tap "View school" are prompted to **sign up or sign in**, then returned to the school they were viewing.
- **R11.** The school page shows:
  - **Overview:** name, logo, photo gallery, short description.
  - **Location:** address, embedded map, and a **"Directions"** action that opens the device's native maps app.
  - **Weekly schedule:** grouped by day, each session showing time, class type (e.g., Fundamentals, Advanced, Open mat, Kids, Women's, Competition), and style (Gi / No-Gi), with **today highlighted**.
  - **Programs offered:** derived from, or consistent with, the schedule.
  - **Drop-in & pricing:** visitors-welcome flag, drop-in fee, free-trial offer, monthly membership price range.
  - **Instructors & affiliation:** head instructor(s) with **belt rank** (and optional photo and short bio), plus the school's **affiliation/team** (e.g., Gracie Barra, 10th Planet, Atos, independent).
  - **Amenities:** e.g., showers, parking, gi rental, women's-only classes, kids area.
  - **Contact:** phone, email, website, Instagram (tap to call, email, or open).

### Curator workflow
- **R12.** The curator can create and edit schools, instructors, and affiliations in the **Strapi admin**, including placing the school on a map / geocoding the address.
- **R13.** The curator can ask an **AI assistant (Claude) connected through MCP** to create or update schools (details, location, schedule, pricing, amenities). AI-made changes are saved as **drafts** only.
- **R14.** Nothing appears in the app until a human **publishes** it in the Strapi admin.

## Account & auth
- **End-user accounts: yes.** Required to view full school pages (R10). Browsing (map, search, filters, preview cards) needs no account.
  - Sign-in method for the proof of concept: **email + password** only.
  - Users can sign up, sign in, and sign out; the session persists across app restarts on native and page reloads on web.
- **Editorial admin accounts: yes.** The curator (and any future editors) use Strapi admin accounts. Separate from end-user accounts.
- **Roles needed:**
  - **Public:** read the map/list/preview data only.
  - **Authenticated:** read full school details.
  - **Admin/editor:** manage all content (Strapi admin).
  - **AI agent (MCP):** create and update content as **drafts**; **cannot publish or delete**.

## Content the product manages

### Editorial content (managed in Strapi admin, or by AI through MCP)
- **School:** the core listing. Identity, description, location, contact, pricing and drop-in policy, amenities, weekly schedule, media, and links to its affiliation, instructors, and city.
- **Affiliation:** a BJJ team or association (Gracie Barra, 10th Planet, Atos, Checkmat, "Independent", …). Shared by many schools.
- **Instructor:** a coach with name, belt rank, optional photo and bio. Linked to the school(s) they teach at.
- **City:** a covered market (Las Vegas for the proof of concept) with its map center, default zoom, and **time zone**. Keeps the product from hard-coding Vegas and gives schedules their time zone.

### User-generated content (created via API)
- **End-user account:** identity only (name, email) for the proof of concept. No reviews, favorites, or other user content.

### Reusable shapes (likely Strapi components)
- **Schedule session:** day of week, start time, end time, class type, style (Gi / No-Gi / both), and optional notes. Repeats many times per school.
- **Pricing / drop-in policy:** visitors welcome, drop-in fee, free trial, monthly price range, currency.
- **Contact & social links:** phone, email, website, Instagram (more networks later).
- **Location:** address and coordinates (the existing Mapbox custom field covers this).

### Flexible layouts (likely Strapi dynamic zones)
- **None for the proof of concept.** School pages have a fixed, consistent layout, which keeps listings comparable.

## Localization & drafts
- **Multi-language (Strapi i18n): no.** English only for the proof of concept.
- **Draft & publish: yes.** Required on **School**, **Instructor**, and **Affiliation**, because AI-made changes land as drafts and a human publishes (R13–R14). **City** is a small config-like type and doesn't need drafts.

## Integrations
- **Maps & geocoding:** interactive maps on every platform (native iOS/Android and web), address search / geocoding for the curator in the admin, and map tiles. The existing project already uses **Mapbox**.
- **Device location:** the user's location, used on-device for centering and distance. **Never sent to or stored on the server.**
- **Directions:** hand off to the device's native maps app (Apple Maps / Google Maps) via a link. No routing API needed.
- **AI assistant:** Claude (Desktop or Code) acting on content through Strapi's MCP server (see below).
- **Email:** ⚠️ not required if the proof of concept ships without email verification and password reset (see assumptions).

## AI / agent access (MCP)
- **AI agent reads/writes content: yes.**
  - **Write (drafts only):** School, Instructor, Affiliation, including schedules, pricing, amenities, and location.
  - **Read:** all of the above plus City, so the assistant can check what exists before creating (to avoid duplicate schools) and summarize pending drafts for review.
  - **No publish, no delete** through the agent.
  - **Media:** photos and logos are uploaded by the curator in the admin (Strapi's MCP server does not upload new media).
- → Candidate for **Strapi's built-in MCP server** (stable since v5.49). The enablement, token scoping, and the question of generic CRUD tools vs. purpose-built "upsert school / set schedule" tools are decided in stage 4.

## Non-functional requirements
- **Platforms:** one codebase serving **iOS, Android, and web**, so the product can be tested in a browser without an App Store release.
- **Performance:** the map with all Las Vegas pins is interactive within ~2 s on a typical 4G connection. Filter changes feel instant (under ~300 ms), which is achievable client-side at this scale.
- **Scale:** proof of concept: under ~150 schools, 1 city, fewer than 1,000 users. The data model must support many cities without schema changes.
- **Security:**
  - The sign-in gate is **enforced by the server**, not just hidden in the UI. Public API responses contain only preview-card fields; full school details (full schedule, instructors, contact, amenities, gallery) are returned **only to signed-in users**.
  - The AI agent's credentials are **least-privilege** (draft-only, no publish or delete) and are never shipped in the app.
  - No secrets in client bundles (web or native).
- **Privacy / compliance:** minimal personal data (name, email). The user's location stays on the device. ⚠️ A privacy policy and **in-app account deletion** are required before any App Store submission (Apple guideline 5.1.1(v)). Not needed for the proof of concept, but tracked.
- **Time correctness:** all "today" and "next session" logic uses the **school's city time zone**, so a traveler with a phone still set to Chicago time sees correct results.

## Out of scope for MVP
- School owners **claiming** or editing their own listings → v2 (the headline v2 feature)
- **Program-type filter** (beginner/fundamentals, kids, women's, competition). Programs are *shown* but not *filterable* → v2
- Reviews, ratings, check-ins
- **Saved/favorite schools** → easy v2 now that accounts exist
- Social sign-in (Google, Apple), magic links, 2FA
- One-off schedule exceptions: holiday closures, seminars, events
- Class booking, payments, memberships
- More cities (supported by the data model, not seeded)
- Multi-language content
- Push notifications
- App Store / Play Store submission (testing via web build, Expo Go, or dev builds)

---

### ⚠️ Open assumptions (unconfirmed)
- **No email verification or password reset in the proof of concept.** Email + password sign-up works immediately, with no email provider needed. Adding reset/verification later needs an email provider (e.g., Resend).
- **Distance on the preview card** is straight-line ("2.3 mi"), not drive time.
- **Instructors** can be linked to more than one school (e.g., someone who coaches at two academies). Most will have one.
