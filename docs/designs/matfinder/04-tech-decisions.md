# Tech Decisions

> As built: reconstructed from `PaulBratslavsky/matfinder` @ `4f6074c`, 2026-10-28. This describes the code, not
> intentions. "Why" is filled in only where `docs/plan/04-tech-decisions.md` or the code's own comments say why.
> Elsewhere "Considered" reads "unknown (pre-existing)". Paths are relative to the repo root.

## Reference architecture (binding conventions)

| Reference | Code reuse | Conventions in this repo |
|---|---|---|
| `PaulBratslavsky/metravel-explore` @ `ae220cc` | `server/` and `mobile/` were seeded from it (`README.md`) | Strapi app in `server/`, Expo app in `mobile/`. The local plugin follows the `@strapi/sdk-plugin` layout (`server/src/plugins/matfinder/{server,admin}/src`, built to `dist/` before `develop`/`build`, `server/package.json` scripts) |

## Defaults applied
- **Backend / CMS:** Strapi v5. `@strapi/strapi` 5.58.0 (`server/package.json`).
- **Database:** PostgreSQL in production. `DATABASE_CLIENT` selects the client, with SQLite at `.tmp/data.db` as the
  default for local work (`server/config/database.ts`). ⚠️ not in code: that Strapi Cloud runs Postgres (hosting
  setting).
- **Backend hosting:** Strapi Cloud. `@strapi/plugin-cloud` 5.58.0 (`server/package.json`). ⚠️ not in code: the
  project name, region and plan.
- **Frontend:** Expo (React Native, plus React Native Web for the browser) (`mobile/package.json`).
- **Auth:** Better Auth through `@strapi-community/plugin-better-auth` ^1.0.0-beta.7. Users & Permissions is not
  installed (`server/config/plugins.ts`).
- **Styling:** NativeWind ^4.2.7 on Tailwind ^3.4.19 (`mobile/package.json`).

## Backend / CMS
- **Choice:** Strapi 5.58.0. Node `engines` is `>=22.12.0 <=24.x.x`, as declared in `server/package.json` and not
  verified here.
- **Plugins:**
  - `better-auth`, `better-auth-dashboard`, `api-permissions` (`config/plugins.ts`);
  - `strapi-plugin-map-box` ^0.0.5, a custom location field;
  - the local `matfinder` plugin (`src/plugins/matfinder`);
  - `@strapi/plugin-cloud`.
- **Why:** reused from the seed repo. The upgrade from 5.33.3 was made for the built-in MCP server
  (`docs/plan/01-product.md` › *Parked for stage 4*).

## Database
- **Choice:** Postgres (production) or SQLite (local and tests), switched by `DATABASE_CLIENT`
  (`server/config/database.ts`). The file also has an unused `mysql` branch.
- **Pool:** 2–10 connections. SSL is set by env vars (`config/database.ts`).
- **Migrations:** none. `database/migrations/` holds only `.gitkeep`. Schema extras are raw SQL `CREATE … IF NOT
  EXISTS` in `bootstrap()` (`server/src/index.ts`).

## Backend hosting
- **Choice:** Strapi Cloud. ⚠️ not in code: the region, plan and auto-deploy branch.

## Frontend framework
- **Choice:** Expo SDK ^57 with expo-router ~57.0.24, React 19.2.3, React Native 0.86.3 and react-native-web ~0.21.0
  (`mobile/package.json`).
- **Considered:** the plan chose Expo plus React Native Web, so the app can be tested in a browser without an App Store
  release (`docs/plan/01-product.md`).
- **Routes live in:** `mobile/app/` (file-based, one Stack, `mobile/app/_layout.tsx`).
- **Public env prefix:** `EXPO_PUBLIC_` (`mobile/.env.example`, `mobile/hooks/useDirectory.ts`).
- **Device location:** expo-location, foreground permission only (`mobile/hooks/useUserLocation.ts`).

## Frontend hosting
- **Web:** Vercel, configured in `mobile/vercel.ts`:
  - build `npx expo export -p web`, output `dist`;
  - `/api/(.*)` is rewritten to `STRAPI_ORIGIN` so the auth cookie is first-party;
  - an SPA fallback to `/index.html`.
  - The build fails if `STRAPI_ORIGIN` is unset.
- **Native:** no store builds. ⚠️ not in code: whether any EAS build or TestFlight exists (there's no `eas.json`).

## Auth
- **Choice:** Better Auth ^1.7.7, configured in `server/src/lib/auth.ts`:
  - email and password, minimum length 8, no email verification;
  - sessions expire after 30 days, refreshed once a day (`updateAge` 1 day);
  - plugins `expo()`, `jwt()` and `dash()` (from `@better-auth/infra` ^0.2.14), plus the admin dashboard plugin
    `@strapi-community/plugin-better-auth-dashboard` ^1.0.0-beta.1;
  - `generateId: 'serial'`;
  - `trustedOrigins` = `WEB_ORIGINS`, `matfinder://`, and `exp://` outside production.
- **Content-API permissions:** `@strapi-community/plugin-api-permissions` ^1.0.0-alpha.5. The grants are seeded in
  `server/src/lib/permissions.ts`.
- **Client:** `better-auth` and `@better-auth/expo` ^1.7.7.
  - Native keeps the session in SecureStore and sends it as a `Cookie` header (`mobile/lib/auth-client.native.ts`).
  - Web uses browser cookies (`mobile/lib/auth-client.web.ts`).
- **Why:** the user chose it in planning (`docs/plan/02-users.md` › *Parked for stage 4*).
- **Maturity:** the Better Auth plugin's README says "BETA… should not be used in production". Production runs
  `plugin-better-auth` 1.0.0-beta.7, `plugin-better-auth-dashboard` 1.0.0-beta.1 and `plugin-api-permissions`
  1.0.0-alpha.5, on caret ranges pinned by `server/package-lock.json`. better-auth `^1.7.7` is the floor that fixes
  the September 2026 advisories.

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
  notifications (`mobile/package.json`).

## Payments
- **Choice:** n/a.

## Analytics & monitoring
- **Choice:** none in either app (`mobile/package.json`, `server/package.json`).
- **Logs:** `strapi::logger`, with `[matfinder]` lines from the plugin (`server/config/middlewares.ts`,
  `src/plugins/matfinder/server/src/services/gym-chat.ts`).

## MCP server (AI agent access)
- **Enabled:** yes. `mcp.enabled` comes from `MCP_ENABLED`, default true (`server/config/server.ts`).
- **Tools:**
  - 11 custom tools and one prompt, registered by the `matfinder` plugin in `register()`
    (`src/plugins/matfinder/server/src/mcp/index.ts`, `register.ts`);
  - plus Strapi's built-in content-manager tools.
  - Each custom tool needs the admin-token action `plugin::matfinder.mcp.<tool>` with underscores turned into hyphens
    (`upsert_school` → `mcp.upsert-school`, `src/plugins/matfinder/server/src/mcp/index.ts:34–38`).
  - The comment in `config/server.ts` says "8 MatFinder tools"; the code registers 11.
- **Agent writes publish by default:** `autoPublish` (`MATFINDER_AUTO_PUBLISH`, default true,
  `src/plugins/matfinder/server/src/config.ts`). It publishes the whole current draft (05 › MCP server › Publishing).
- **Why:** curation through Claude (`docs/plan/03-requirements.md` › *AI / agent access*). Auto-publish was decided in
  M13 (`CLAUDE.md` › *Status*).

## AI (gym chat)
- **Choice:** TanStack AI 0.71.0 with `@tanstack/ai-anthropic` 0.23.0, both pinned exactly (`server/package.json`).
  The app uses `@tanstack/ai-react` 0.31.1 and `@tanstack/ai-client` 0.40.1.
- **Model:** from `AI_GYM_CHAT_MODEL` (`config/plugins.ts`, default `claude-opus-5-5`).
- **On or off:** the chat is on only with `AI_API_KEY`, or with `MATFINDER_AI_SCRIPTED` for tests
  (`src/plugins/matfinder/server/src/services/gym-chat.ts`).
- **Why:** plan 09 (`docs/plan/09-ai-chat.md`).

## Maps
- **Choice:** Mapbox.
  - Native uses `@rnmapbox/maps` ^10.3.5 (`mobile/components/LocationMap.tsx`).
  - Web uses `react-map-gl` ^8.1.3 with `mapbox-gl` ^3.32.0 (`mobile/components/LocationMap.web.tsx`).
  - The admin uses `strapi-plugin-map-box`.
  - Server geocoding is in `server/src/lib/geocode.ts`.
- **Why:** reused from the seed repo (`docs/plan/03-requirements.md` › *Integrations*).

## Data fetching
- **Choice:** TanStack Query ^5.104.0 (`mobile/package.json`). On native it is wired to `expo-network` and AppState
  (`mobile/app/_layout.tsx`).

## Styling
- **Choice:** NativeWind with Tailwind, and design tokens in `mobile/theme/tokens.ts`. The UI primitives in
  `mobile/components/ui/` are React Native Reusables style (`docs/plan/04-tech-decisions.md`).
- **Component library:** the local `components/ui/*`, of which most aren't used (see 05 › *Pages & components*).
