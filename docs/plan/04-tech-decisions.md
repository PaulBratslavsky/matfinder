# Tech Decisions

For each decision: what was chosen, what else was considered, and why it fits the requirements (`03-requirements.md`). Versions were checked against npm on **2026-09-27**.

## Reference architecture (binding conventions)

| Reference | Code reuse | Binding conventions extracted |
|---|---|---|
| **`metravel-explore`** (PaulBratslavsky/metravel-explore) | **Yes, as the source.** MatFinder lives in its **own repo** (`PaulBratslavsky/matfinder`), seeded with `metravel-explore`'s `server/` and `mobile/` at commit `ae220cc` (no git history, no Next.js `client/`, no plugin submodule). | **Keep:** Strapi app in `server/`; Expo Router app in `mobile/` (routes in `mobile/app/`, tabs layout); location stored with the **`strapi-plugin-map-box`** custom field; the typed `qs`-based fetch wrapper pattern in `mobile/lib/api/`; **TanStack Query** for client data (already a dependency). **Replace:** the demo `location`/`category` content types become MatFinder's content model (stage 5). **Not copied:** `client/` (Next.js; see *Frontend framework*) and the `plugins/strapi-plugin-map-box` submodule. |
| **`strapi-plugin-map-box`** (PaulBratslavsky/strapi-plugin-map-box, npm `0.0.4`) | Used as a dependency | Location = the plugin's custom field (Mapbox geocoding + pin in the admin). Consumed from **npm**, not the git submodule (see *Backend / CMS*). |

## Defaults applied (confirmed or overridden)

- **Backend / CMS:** Strapi v5 ✅ (upgrade the existing app)
- **Database:** PostgreSQL ✅ (replaces the current SQLite)
- **Backend hosting:** Strapi Cloud ✅
- **Frontend:** **Expo + React Native + React Native Web**, overriding the skill's first-class list. One codebase for iOS, Android, and web (user's choice)
- **Auth:** ⚠️ **Better Auth plugin** (`@strapi-community/plugin-better-auth`) instead of the default Users & Permissions. **Explicitly chosen by the user**, beta/not-for-production status acknowledged
- **Styling:** Tailwind ✅, via **NativeWind** + **React Native Reusables**

## Backend / CMS
- **Choice:** **Strapi v5, upgraded from 5.33.3 to the latest 5.x** (5.55.1 at time of writing). **Hard floor: 5.49** (built-in MCP server stable), which also covers Better Auth's 5.45 minimum. Node **24 LTS** (current Strapi engines allow `>=20 <=24`; Node 20 reaches end of life in 2026).
- **Plugins:**
  - `strapi-plugin-map-box` **from npm** (`0.0.4`): the location custom field. The seeded `config/plugins.ts` still points at `../plugins/strapi-plugin-map-box` (the old submodule path in `metravel-explore`), which doesn't exist here, so switching to the npm package is part of M0. Strapi Cloud builds from the `server/` root anyway, so a sibling-folder plugin would never deploy.
  - `@strapi-community/plugin-better-auth` + `plugin-api-permissions` + `plugin-better-auth-dashboard` (see *Auth*).
  - **Built-in MCP server** (see *MCP server*).
  - **Removed:** `@strapi/plugin-users-permissions` (a hard requirement of Better Auth).
  - **Not used:** GraphQL (REST is enough), i18n (English only).
- **Module organization:** **`src/api/<name>` folders** (Strapi's native unit), plus the MCP tools as **app-level code** (`src/mcp/…`, registered from `src/index.ts` `register()`). **No new local plugins.** Nothing needs its own admin UI or cross-project reuse, and local plugins add a build step `strapi develop` doesn't watch.
- **Why:** R12–R14 (curator in the admin), R13 (MCP), R10 (Better Auth), and reuse of the existing app and map field.

## Database
- **Choice:** **PostgreSQL**: local via Docker Compose, Strapi Cloud's managed Postgres in production.
- **Considered:** keeping SQLite locally (current setup).
- **Why:** dev/prod parity, and Better Auth on SQLite has known boot-time issues (early DB-open `SqliteError`). Postgres is the documented, safer path for this beta plugin.

## Backend hosting
- **Choice:** **Strapi Cloud**, project root directory = **`server`**, deploying from the repo's main branch.
- **Region:** US (closest to the Las Vegas launch market).
- **Plan:** free/lowest tier for the proof of concept. ⚠️ Verify current plan options at https://cloud.strapi.io.
- **Why:** zero infrastructure, managed Postgres and media/CDN included, deploy-on-push.

## Frontend framework
- **Choice:** **Expo (upgrade SDK 54 → 57) + Expo Router + React Native Web**, in `mobile/`.
- **Considered:** keeping the Next.js client for web alongside Expo for native (two frontends to build); Next.js only (no native path).
- **Why:** one codebase for iOS, Android, and web (non-functional requirement: *Platforms*), testable in a browser without an App Store release. Better Auth's Expo guide targets SDK 55 or later, which drives the upgrade.
- **Routes live in:** `mobile/app/` (Expo Router) · **Public env prefix:** `EXPO_PUBLIC_` (browser/app-safe values only; everything under it ships in the bundle).
- **The Next.js `client/` from `metravel-explore`: not carried over.** It stays in the source repo.
- **Maps (both platforms Mapbox, matching the admin field):**
  - Native: `@rnmapbox/maps`.
  - Web: `react-map-gl` + `mapbox-gl`, via platform-specific files (`SchoolMap.tsx` / `SchoolMap.web.tsx`) behind one shared props interface.
- **Client data:** TanStack Query (already installed). Filters live in URL/search params so web links are shareable.
- **UI kit:** **React Native Reusables** (shadcn/ui-style components copied into the repo) on **NativeWind v4** (stable, Tailwind v3). Chosen over Uniwind (Tailwind v4, newer), HeroUI Native (web support not clearly documented), Tamagui (non-Tailwind, steeper curve), and React Native Paper (Material look). Brings ready-made sign-in/sign-up blocks for the login gate. NativeWind v5 (Tailwind v4) is still a release candidate; stay on v4.
- ⚠️ **Native testing trade-off:** `@rnmapbox/maps` contains native code, so the app **does not run in Expo Go**. Native testing uses **development builds**: free on iOS Simulator and Android Emulator, Android APKs sideload freely, and installing on **physical iPhones** requires an Apple Developer account (internal distribution/TestFlight, not App Store review). **Web is the zero-friction test surface.**

## Frontend hosting
- **Choice:** **Vercel**, serving the Expo **web export** (`npx expo export -p web` → `dist/`), project root `mobile/`.
- **Same-origin API proxy (important):** configure a Vercel **rewrite** `/api/:path*` → `https://<project>.strapiapp.com/api/:path*` (in `vercel.ts`, the current recommended config format; `vercel.json` also works). The web app calls **relative `/api/...`**, so Better Auth's session cookie is **first-party** on the Vercel domain. Without this, cross-site cookies between `*.vercel.app` and `*.strapiapp.com` are blocked by Safari and by third-party-cookie restrictions in other browsers, and web sign-in would silently fail.
- **Why:** free tier, git-push deploys, preview URLs per branch, and rewrites solve the cookie problem without custom infrastructure.

## Auth
- **Choice:** **`@strapi-community/plugin-better-auth`** (latest `1.0.0-beta.7`) + **`plugin-api-permissions`** (`1.0.0-alpha.5`) + **`plugin-better-auth-dashboard`** (`1.0.0-beta.1`), on **`better-auth` 1.7.x**.
- **Acknowledged:** beta (maintainers say **"do not use in production"**; fine for this proof of concept, re-evaluate before launch); api-permissions is **alpha**; needs Strapi 5.45 or later; **Users & Permissions removed**; content-API roles (Public / Authenticated) managed in **Settings → API Permissions**.
- **Providers enabled:** **email + password only** (R10). No social, magic link, or 2FA in the proof of concept.
- **Expo support (verified):** the Strapi plugin loads a normal `betterAuth()` instance from `server/src/lib/auth.ts` (which we own) and resolves sessions via `auth.api.getSession({ headers })` on every content-API request. So:
  - **Server:** add Better Auth's official **`expo()`** plugin (`@better-auth/expo`); `trustedOrigins` = the Vercel URL(s), the app scheme `matfinder://`, and `exp://` for development.
  - **Native client:** `createAuthClient` + `expoClient({ scheme: 'matfinder', storage: SecureStore })`; API calls send `Cookie: await authClient.getCookie()`.
  - **Web client:** normal browser cookies over the same-origin proxy (above).
  - **Fallback (only if the proxy approach fails; ask before switching):** Better Auth's `bearer()` plugin with an `Authorization` header.
- **Why:** user preference; the login gate (R10); a modern session model with a clear upgrade path to social login and account deletion later.

## Media / file storage
- **Choice:** Strapi Cloud media (bundled CDN) in production; Strapi's local upload provider in development.
- **Why:** school logos and galleries (R11) at proof-of-concept scale; no extra vendor.

## CI/CD
- **Backend:** Strapi Cloud auto-deploy on push to `main` (root `server/`).
- **Web:** Vercel git integration (root `mobile/`, build `npx expo export -p web`, output `dist`), with preview deploys per branch.
- **Native:** local dev builds (`npx expo run:ios|android`); **EAS Build** internal distribution optional for sharing with testers.

## Email / notifications
- **Choice:** **none** for the proof of concept (no email verification or password reset, per stage 3). Add Resend (or similar) when reset/verification ships.

## Payments
- **Choice:** n/a.

## Analytics & monitoring
- **Choice:** none for the proof of concept. Candidates later: PostHog (product analytics), Sentry (errors, with Expo support).

## MCP server (AI agent access)
- **Enabled:** **yes.** Strapi's built-in MCP server (stable since 5.49): `mcp: { enabled: true }` in `server/config/server.ts`; endpoint `POST /mcp`; auth = **Admin token** (not a content-API token).
- **Approach: purpose-built domain tools only** (user decision), registered app-level via `strapi.ai.mcp.registerTool(...)` in `register()`. Each tool gets **its own admin permission action**, and the curator's token is **scoped to those actions only**, so Strapi's generic CRUD tools are *not* exposed (their full-record `update` has silently destroyed data in the field).
- **Candidate tools** (finalized in stage 5): `find_schools`, `get_school`, `upsert_school` (partial update, **always writes a draft**), `set_school_schedule`, `upsert_instructor`, `upsert_affiliation`, `list_affiliations`, `list_pending_drafts`. **No publish or delete tools exist.**
- **Known limitations accepted:** no media upload via MCP (curator uploads photos and logos in the admin); stateless requests; results size-guarded (under ~950 KB on the wire).
- **Client:** Claude Desktop / Claude Code over HTTP with `Authorization: Bearer <admin token>`.
- **Why:** R13–R14 (AI drafts, humans publish) and the least-privilege requirement.

## Optional dependencies & degradation
| Dependency | Required? | If missing / down |
|---|---|---|
| Mapbox token | Required for maps | App shows the **school list** (search and filters still work) with a "map unavailable" notice. The admin map field degrades to manual address/coordinates. |
| Better Auth | Required | Browsing (public) works; the school page shows "sign-in temporarily unavailable." |
| MCP server | Optional | Curator falls back to the Strapi admin. App unaffected. |
| Device location | Optional | Map centers on the Las Vegas city center; distance is hidden on cards. |

## Styling
- **Choice:** Tailwind via **NativeWind v4**.
- **Component library:** **React Native Reusables** (shadcn/ui for React Native; components live in `mobile/components/ui/`).

## Tooling housekeeping (from the source-repo review)
- **Package manager: npm in both `server/` and `mobile/`.** Delete the stale/mixed `yarn.lock` files (Yarn 1 in `server/`, Yarn 4 in `mobile/`) and regenerate `package-lock.json`; stop committing `mobile/.yarn/install-state.gz`. Strapi Cloud, Expo/EAS, and the Better Auth docs all default to npm.
