# Tech Decisions

> As built: reconstructed from `PaulBratslavsky/matfinder` @ `4f6074c` (2026-10-28), then updated in E9 to branch
> `egm/trust-safety-ux` @ `7a4644e` (2026-10-29), after the 25 steps of `06-change-spec.md`. This describes the code,
> not intentions. "Why" is filled in only where `docs/plan/*` or the code's own comments say why. Elsewhere
> "Considered" reads "unknown (pre-existing)". Paths are relative to the repo root.

## Reference architecture (binding conventions)

| Reference | Code reuse | Conventions in this repo |
|---|---|---|
| `PaulBratslavsky/metravel-explore` @ `ae220cc` | `server/` and `mobile/` were seeded from it (`README.md`) | Strapi app in `server/`, Expo app in `mobile/`. The local plugin follows the `@strapi/sdk-plugin` layout (`server/src/plugins/matfinder/{server,admin}/src`, built to `dist/` before `develop`/`build`, `server/package.json` scripts) |
| `PaulBratslavsky/maison-tanstack` (`strapi/src/plugins/maison`) | The `matfinder` plugin is modeled on it (`docs/plan/07-matfinder-plugin.md`) | Its MCP tool pattern, one admin action per tool, homepage widgets, a tabbed admin page and request → review → accept boards |

### The local `matfinder` plugin (B-13)
- **Why it's a plugin:** the plan models it on the maison plugin, for what a plugin gives here: an admin page with
  tabs, homepage widgets, its own RBAC actions (`plugin::matfinder.read`, `.claims.review`, `.reports.review`, and one
  `.mcp.<tool>` per tool) and MCP tool registration in `register()` (`docs/plan/07-matfinder-plugin.md`,
  `server/src/plugins/matfinder/server/src/permissions.ts`, `.../mcp/index.ts`).
- **It owns four content types:** `claim`, `knowledge`, `report` and `saved-gym`
  (`.../server/src/content-types/index.ts`).
- **It couples to the app both ways:**
  - the plugin reads and writes the app's `api::school.school` (the MCP tools, `services/discovery.ts`,
    `services/gyms.ts`);
  - the app calls the plugin's services: `claims.claimedAmong` from the school service
    (`server/src/api/school/services/school.ts`), `claims.closeDuplicateOpenClaims` from `bootstrap()`
    (`server/src/index.ts`), and the three `forgetUser` services from Better Auth's `beforeDelete`
    (`server/src/lib/auth.ts`).
- **It can't import the app's `src/lib/*`**, so it keeps copies of small helpers in `.../server/src/domain/`. For
  example, `isUniqueViolation` in `domain/errors.ts` says "Same rule as the app's lib/errors.ts", and `domain/status.ts`
  sits next to `server/src/lib/drafts.ts`.
- **Its data depends on a build artifact.** ⚠️ framework behavior: Strapi skips a plugin whose `dist/` is missing, and
  booting without it would drop its tables and token grants (the code comment names the claims table and the grants), so `assertMatFinderBuilt()` refuses to start
  (`server/config/plugins.ts:6–16`).
- **Deferred:** moving `claim` and `knowledge` into `src/api/` with the same `collectionName` (06 › Non-goals).

## Defaults applied
- **Backend / CMS:** Strapi v5. `@strapi/strapi` 5.58.0 (`server/package.json`).
- **Database:** PostgreSQL in production. `DATABASE_CLIENT` selects the client, with SQLite at `.tmp/data.db` as the
  default for local work (`server/config/database.ts`). ⚠️ not in code: that Strapi Cloud runs Postgres (hosting
  setting).
- **Backend hosting:** Strapi Cloud. `@strapi/plugin-cloud` 5.58.0 (`server/package.json`). ⚠️ not in code: the
  project name, region and plan.
- **Frontend:** Expo (React Native, plus React Native Web for the browser) (`mobile/package.json`).
- **Auth:** Better Auth through `@strapi-community/plugin-better-auth` 1.0.0-beta.7, pinned exactly. Users &
  Permissions is not installed (`server/config/plugins.ts`).
- **Styling:** NativeWind ^4.2.7 on Tailwind ^3.4.19 (`mobile/package.json`).

## External services: required or optional (B-15)

| Service | Used for | Without it | Where |
|---|---|---|---|
| Postgres (Strapi Cloud) | all data | Strapi doesn't start | `server/config/database.ts` |
| Mapbox map tiles | the map on Explore and the location field in the admin | optional: Explore says "The map needs a Mapbox token. Every gym is still listed below." | `mobile/app/index.tsx:217`, `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` |
| Mapbox geocoding | turning an address into coordinates on MCP school writes | required for agent writes with an address: they fail with `GEOCODE_FAILED` (5 s timeout) | `server/src/lib/geocode.ts` |
| Anthropic (gym chat) | "Ask about this gym" | optional: `chat/status` says `ready: false`, and the gym page hides the chat | `.../services/gym-chat.ts`, `mobile/app/schools/[slug]/index.tsx:123`, `AI_API_KEY` |
| Better Auth dashboard (`dash()`) | the admin's Better Auth dashboard | fails closed: with `BETTER_AUTH_DASHBOARD_SECRET` unset, the dashboard refuses requests instead of using a default key | `server/src/lib/auth.ts:42–46` |
| Vercel | the web app, and the `/api` rewrite that keeps the auth cookie first-party | the web app is down; native apps call Strapi directly (`EXPO_PUBLIC_STRAPI_URL`) | `mobile/vercel.ts` |

- not verified: whether `dash()` (`@better-auth/infra` ^0.2.14) also contacts `kv.better-auth.com` (its `kvUrl`
  default), B nit N8. It wasn't in this change's scope. The code comment says it reports to this Strapi server
  (`apiUrl`).

## Backend / CMS
- **Choice:** Strapi 5.58.0. Node `engines` is `>=22.12.0 <=24.x.x`, as declared in `server/package.json` and not
  verified here.
- **Plugins:**
  - `better-auth`, `better-auth-dashboard`, `api-permissions` (`config/plugins.ts`);
  - `strapi-plugin-map-box` ^0.0.5, a custom location field;
  - the local `matfinder` plugin (`src/plugins/matfinder`, above);
  - `@strapi/plugin-cloud`.
- **Why:** reused from the seed repo. The upgrade from 5.33.3 was made for the built-in MCP server
  (`docs/plan/01-product.md` › *Parked for stage 4*).

## Database
- **Choice:** Postgres (production) or SQLite (local and tests), switched by `DATABASE_CLIENT`
  (`server/config/database.ts`). The file still has a `mysql` branch, but `createIndexes` refuses any client other
  than Postgres or SQLite, so Strapi can't boot on MySQL (`server/src/lib/indexes.ts`).
- **Pool:** 2–10 connections. SSL is set by env vars (`config/database.ts`).
- **Migrations:** none. `database/migrations/` holds only `.gitkeep`.
  - Schema changes (new attributes, the plugin's new content types) are applied by Strapi's schema sync at boot.
    ⚠️ framework behavior: the sync also **drops** the columns of removed attributes and the tables of removed content
    types (`settings.forceMigration`, default `true`; checked at checkpoint C in `@strapi/database`), so reverting a
    change that adds a field or a type deletes its data.
  - Schema extras are raw SQL `CREATE … IF NOT EXISTS`, run by `createIndexes()` from `bootstrap()`
    (`server/src/lib/indexes.ts`, `server/src/index.ts`). On Postgres the table names are qualified with
    `DATABASE_SCHEMA` (`tableRef`).

## Backend hosting
- **Choice:** Strapi Cloud. ⚠️ not in code: the region, plan and auto-deploy branch.
- ⚠️ not in code: what Strapi Cloud does with a deploy that fails to boot (keeps the previous build, or goes down). It
  matters because a failed unique index now stops a production boot (05 › *Lifecycles*).

## Frontend framework
- **Choice:** Expo SDK ^57 with expo-router ~57.0.24, React 19.2.3, React Native 0.86.3 and react-native-web ~0.21.0
  (`mobile/package.json`).
- **Considered:** the plan chose Expo plus React Native Web, so the app can be tested in a browser without an App Store
  release (`docs/plan/01-product.md`).
- **Routes live in:** `mobile/app/` (file-based, one Stack, `mobile/app/_layout.tsx`).
- **Public env prefix:** `EXPO_PUBLIC_` (`mobile/.env.example`, `mobile/hooks/useDirectory.ts`).
- **Device location:** expo-location, foreground permission only, asked only after a tap on "Use my location"
  (`mobile/hooks/useUserLocation.ts`).

## Frontend hosting
- **Web:** Vercel, configured in `mobile/vercel.ts`:
  - build `npx expo export -p web`, output `dist`;
  - `/api/(.*)` is rewritten to `STRAPI_ORIGIN` so the auth cookie is first-party;
  - an SPA fallback to `/index.html`.
  - The build fails if `STRAPI_ORIGIN` is unset.
- **Installable web app:** `web.output` is `single` (`mobile/app.json`), so Expo uses `mobile/public/index.html`. It
  links `manifest.webmanifest` and the icons in `mobile/public/icons/`, and sets `theme-color` and the Apple web-app
  tags. There's no service worker. not verified: the content type Vercel serves `.webmanifest` with, and the install
  prompt on real devices.
- **Native:** no store builds. ⚠️ not in code: whether any EAS build or TestFlight exists (there's no `eas.json`).

## Auth
- **Choice:** Better Auth ^1.7.7, configured in `server/src/lib/auth.ts`:
  - email and password, minimum length 8, no email verification;
  - sessions expire after 30 days, refreshed once a day (`updateAge` 1 day);
  - account deletion on (`user.deleteUser.enabled`), with a `before` hook that refuses `/delete-user` without a
    password;
  - the client IP for rate limits comes from `advanced.ipAddress`, built from `AUTH_IP_HEADERS` and
    `AUTH_TRUSTED_PROXIES` (`server/src/lib/auth-ip.ts`). Both empty means Better Auth's default;
  - plugins `expo()`, `jwt()` and `dash()` (from `@better-auth/infra` ^0.2.14), plus the admin dashboard plugin
    `@strapi-community/plugin-better-auth-dashboard` 1.0.0-beta.1;
  - `generateId: 'serial'`;
  - `trustedOrigins` = `WEB_ORIGINS`, `matfinder://`, and `exp://` outside production.
- **Content-API permissions:** `@strapi-community/plugin-api-permissions` 1.0.0-alpha.5. The grants are seeded, and
  some revoked, in `server/src/lib/permissions.ts`.
- **Client:** `better-auth` and `@better-auth/expo` ^1.7.7.
  - Native keeps the session in SecureStore and sends it as a `Cookie` header (`mobile/lib/auth-client.native.ts`).
  - Web uses browser cookies (`mobile/lib/auth-client.web.ts`).
- **Why:** the user chose it in planning (`docs/plan/02-users.md` › *Parked for stage 4*).
- **Maturity:** the Better Auth plugin's README says "BETA… should not be used in production". The three prerelease
  Strapi packages are pinned exactly in `server/package.json` (B-10): `plugin-better-auth` 1.0.0-beta.7,
  `plugin-better-auth-dashboard` 1.0.0-beta.1 and `plugin-api-permissions` 1.0.0-alpha.5. better-auth `^1.7.7` stays a
  caret range; it's the floor that fixes the September 2026 advisories. Running them in production is an open owner
  decision (06 › Open questions 3).

## Media / file storage
- **Choice:** Strapi's upload plugin with the default provider. No provider is set in `config/plugins.ts`.
  ⚠️ not in code: which provider Strapi Cloud uses for storage.

## CI/CD
- **Backend:** ⚠️ not in code: Strapi Cloud deploys from `main` (hosting setting).
- **Frontend:** Vercel deploys from `main` (host-native). ⚠️ not in code: the Git integration settings.
- **CI:** no `.github/workflows/`. The tests run locally (`server/tests`, `mobile/e2e`). CodeRabbit and Vercel checks
  run on PRs. ⚠️ not in code: those are GitHub app settings.

## Email / notifications
- **Choice:** none. Better Auth has no email sender configured (`server/src/lib/auth.ts`), and the app has no push
  notifications (`mobile/package.json`). So there's no password reset (06 › Non-goals, C14), and the admin shows claim
  emails as "(unverified)" (`.../admin/src/components/ClaimsTab.tsx`).

## Payments
- **Choice:** n/a.

## Analytics & monitoring
- **Choice:** none in either app (`mobile/package.json`, `server/package.json`).
- **Logs:** `strapi::logger`, with `[matfinder]` lines from the plugin and the app (`server/config/middlewares.ts`,
  `.../services/gym-chat.ts`, `server/src/lib/indexes.ts`, `server/src/lib/auth.ts`). The `global::auth-ip-probe`
  middleware logs header names and counts, never values, when `AUTH_IP_PROBE=true`
  (`server/src/middlewares/auth-ip-probe.ts`).

## MCP server (AI agent access)
- **Enabled:** yes. `mcp.enabled` comes from `MCP_ENABLED`, default true (`server/config/server.ts`).
- **Tools:**
  - 11 custom tools and one prompt, registered by the `matfinder` plugin in `register()`
    (`src/plugins/matfinder/server/src/mcp/index.ts`, `register.ts`);
  - plus Strapi's built-in content-manager and Media Library tools, listed to a token only when it holds the matching
    content permissions.
  - Each custom tool needs the admin-token action `plugin::matfinder.mcp.<tool>` with underscores turned into hyphens
    (`upsert_school` → `mcp.upsert-school`, `src/plugins/matfinder/server/src/mcp/index.ts`).
  - The comment in `config/server.ts` still says "8 MatFinder tools"; the code registers 11 (B nit N4, not in scope).
- **The curator token holds only MatFinder actions** (B-4). The plugin README states the rule and how to rotate the
  token (`server/src/plugins/matfinder/README.md`). `server/tests/api.test.ts` proves that a MatFinder-only token lists
  exactly the 11 tools, and that one Content Manager permission adds Strapi's own. ⚠️ not in code: which permissions
  the production token holds.
- **Agent writes publish by default:** `autoPublish` (`MATFINDER_AUTO_PUBLISH`, read in `server/config/plugins.ts`;
  default true in `src/plugins/matfinder/server/src/config.ts`), except over a person's unpublished edits, or over a never-published
  draft the agent didn't add (05 › MCP server › Publishing).
- **Why:** curation through Claude (`docs/plan/03-requirements.md` › *AI / agent access*). Auto-publish was decided in
  M13 (`CLAUDE.md` › *Status*). The publishing exceptions are B-3 (06 › S6).

## AI (gym chat)
- **Choice:** TanStack AI 0.71.0 with `@tanstack/ai-anthropic` 0.23.0, both pinned exactly (`server/package.json`).
  The app uses `@tanstack/ai-react` 0.31.1 and `@tanstack/ai-client` 0.40.1.
- **Model:** from `AI_GYM_CHAT_MODEL` (`config/plugins.ts`, default `claude-opus-5-5`). Keeping it is an open owner
  decision (06 › Open questions 2).
- **On or off:** the chat is on only with `AI_API_KEY`, or with `MATFINDER_AI_SCRIPTED` for tests
  (`src/plugins/matfinder/server/src/services/gym-chat.ts`).
- **Cost guard:** limits per user per day and per chat, and a daily total for everyone (`AI_GYM_CHAT_DAILY_TOTAL`,
  default 200), all counted in memory (05 › Operations › Cost guards).
- **Why:** plan 09 (`docs/plan/09-ai-chat.md`).

## Maps
- **Choice:** Mapbox.
  - Native uses `@rnmapbox/maps` ^10.3.5 (`mobile/components/LocationMap.tsx`).
  - Web uses `react-map-gl` ^8.1.3 with `mapbox-gl` ^3.32.0 (`mobile/components/LocationMap.web.tsx`).
  - The admin uses `strapi-plugin-map-box`.
  - Server geocoding is in `server/src/lib/geocode.ts`.
  - Which of these are required: see *External services* above.
- **Why:** reused from the seed repo (`docs/plan/03-requirements.md` › *Integrations*).

## Data fetching
- **Choice:** TanStack Query ^5.104.0 (`mobile/package.json`). On native it is wired to `expo-network` and AppState
  (`mobile/app/_layout.tsx`).

## Styling
- **Choice:** NativeWind with Tailwind, and design tokens in `mobile/theme/tokens.ts`. The UI primitives in
  `mobile/components/ui/` are React Native Reusables style (`docs/plan/04-tech-decisions.md`).
- **Component library:** the local `components/ui/*`, of which most aren't used (see 05 › *Pages & components*).
