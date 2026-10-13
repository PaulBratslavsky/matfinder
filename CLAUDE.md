# MatFinder: notes for coding agents

MatFinder is a map-first directory of Brazilian Jiu-Jitsu schools (Las Vegas first): a Strapi 5 backend in `server/` and an Expo app (iOS, Android and web) in `mobile/`. The code in both folders was seeded from `PaulBratslavsky/metravel-explore` at `ae220cc`.

## Where things are
- **The plan:** `docs/plan/01–06`. `docs/plan/06-build-spec.md` is the source of truth for the build.
- **The work:** GitHub issues. Epic **#2**; milestones **#3 (M0) → #12 (M9)**. `docs/plan/issues/plan.json` maps each milestone to its issue, and `docs/plan/issues/*.md` are the drafts behind them.
- **Stack reference for sibling apps:** "MatFinder Stack Blueprint" artifact, https://claude.ai/artifact/D4a5m63g2sSuLEocvg3Xjp

## Status (2026-10-13)
Every milestone, M0–M9 (#3–#12), is built and merged to `main` through PRs #17–#30. The last three are the Explore rebuild on metravel-explore (#27), the "Mat room" UI on design tokens (#28), the architecture doc (#29) and fixes from the pre-merge review (#30). Issue #12 (M9) and the epic #2 stay open for what's left on the user: the Strapi Cloud and Vercel deploys, the production smoke test, and the real listings (M9's PR #26 lists the steps). The native apps haven't been run on a device or simulator yet (see "iPhone Simulator" in `docs/architecture.md`). `SEED_SAMPLE_DATA=true` in `server/.env` loads the fictional Las Vegas data.

## How to work
1. Find the next issue: one that's open and whose "Blocked by" issues are all closed. If the `spec-to-github-issues` skill is installed:
   `python3 ~/.claude/skills/spec-to-github-issues/scripts/create_issues.py status docs/plan/issues/plan.json`
   Otherwise: `gh issue list -l type:build-step --state open`, then read each issue's "Blocked by" line.
2. Read the **whole** issue before writing code. Each one is self-contained: commands, schemas, traps, "Verify during this step", and "Done when".
3. Branch `m<n>-<slug>` (e.g. `m0-housekeeping`), commit, open a PR into `main` whose body says `Closes #<issue>`. Merge only when every Done-when box passes.
4. After M4 the build splits into two tracks that can run in parallel on separate branches: backend (M5 → M8) and app (M6 → M7). M9 comes last.

## Tests
- `server/`: `npm run test:unit` (Vitest) and `npm run test:integration:isolated` (a throwaway seeded Strapi on :1342 via `scripts/test-server.sh`, `strapi start` so MCP lists exactly 8 tools). Stop `npm run develop` first: the test server builds into the same `dist/`.
- `mobile/`: `npm run test:unit` (Vitest, `lib/*.test.ts`), `npm run test:e2e` (Playwright; starts the same test Strapi and serves the exported build on :8084 with `/api` proxied, like Vercel), `npm run typecheck` (app + e2e/vercel.ts). Playwright needs its browser: `npx playwright install chromium` once, or point `PLAYWRIGHT_CHROMIUM_PATH` at an installed Chromium.

## Rules from the user (requirements, not preferences)
- **Never commit to `main`.** A repo hook blocks it: branch → PR → merge.
- **No Docker**, ever: no docker-compose, no Dockerfiles.
- **No local Postgres.** Local dev uses Strapi's default SQLite (`DATABASE_CLIENT=sqlite`, `DATABASE_FILENAME=.tmp/data.db`). Postgres exists only in production on Strapi Cloud.
- **npm only** in `server/` and `mobile/`.
- **Deviation protocol:** commands, structures, versions and conventions in the spec and issues are user decisions. If you want to substitute any of them, **stop and ask the user**. Don't silently trade off.
- **Verify, don't recall:** check versions on npm and APIs in the docs (`strapi-docs` MCP first, then https://docs.strapi.io) before relying on them.
- **Secrets stay out of chat, issues and commits.** The user adds tokens (e.g. `MAPBOX_ACCESS_TOKEN`) to `server/.env` themselves.

## Local quirks
- **Ports:** MatFinder uses Strapi **1339** and Expo **8083** (the defaults in `.env.example`, `config/server.ts` and the `mobile` scripts); its test suites use **1342** (throwaway Strapi) and **8084** (e2e web build). Other projects on this machine use these, so don't take them: 1337/1338 (other Strapi projects), 1340/8081 (MatBuddy), 1341/8082 (MatBuddy tests), 3000. GitHub issues written before 2026-09-30 still say 1337/8081; read those as 1339/8083.
- **Open the admin at `http://matfinder.localhost:1339/admin`.** Browsers share cookies across ports on one hostname, and every Strapi admin uses the same cookie names (`jwtToken`, `strapi_admin_refresh`). On `localhost` a login to another project's admin overwrites MatFinder's, which causes a login loop. `*.localhost` resolves to this machine with no setup.
- Better Auth boots fine on SQLite here (checked in M3). New users get the Authenticated role from a Document Service middleware (the plugin assigns none, and api-permissions treats a user without roles as Public).
- **Confirmed by the user (2026-10-01):** M3 keeps Better Auth's `jwt()` + `dash()` plugins (the admin auth dashboard needs them); M5's tool rename below; M6's map centers on the device only within 60 miles of the city (otherwise the city center), instead of AC1's "always the device".
- **MCP:** the school-reading tool is `get_school_draft`, not the spec's `get_school` (Strapi's content manager registers a generic `get_school` and refuses to start on a name clash). Admin action uids use hyphens (`api::matfinder-mcp.upsert-school`). Under `strapi develop` `tools/list` also shows Strapi's dev-only `log` tool; `strapi start` shows exactly the 8. Tool schemas use `z` from `@strapi/utils` (zod 4.4 in Strapi 5.56).
- **App UI:** metravel-explore's layout (the app this repo was seeded from: `mobile/components/LocationMap.tsx` is its map component, `LocationMap.web.tsx` mirrors it on the web; Explore is its full-screen map + bottom sheet) in the **"Mat room" look** (Direction B from the Claude Design mocks, chosen by the user on 2026-10-11, light and dark). B puts Account on a map button, so there's no tab bar. Don't replace screens or components with new designs without the user's OK.
- **Theming: edit `mobile/theme/tokens.ts`, not components.** It holds every color (light "paper" and dark "ink" palettes), font family, radius, layout constant, belt color and the Mapbox style per mode. StyleSheet code reads it through `makeStyles((t) => …)` / `useTheme()` (`theme/ThemeProvider.tsx`); the React Native Reusables components (`components/ui`, sign-in/up) read it through CSS variables (`theme/css-vars.ts` maps tokens onto `--background`, `--primary`…; `vars()` on native, `<html>` on the web). Font files live in `theme/fonts.ts`. `global.css` and `tailwind.config.js` keep copies (light defaults, font names); `theme/tokens.test.ts` fails if they drift, and checks WCAG AA contrast for every text token. Light/dark follows the system (`app.json` `userInterfaceStyle: automatic`) unless the user picks Light/Dark on Account (saved per device). Don't hard-code colors or use `dark:` classes.
- **App (Expo SDK 57):** expo-router no longer works with `@react-navigation/*` imports (SDK 56+); take `ThemeProvider`, `DefaultTheme` etc. from `expo-router`. `mobile/package.json` overrides `@rnmapbox/maps`'s optional `mapbox-gl ^2` peer so the web map gets mapbox-gl 3 (what `react-map-gl/mapbox` needs). Run the web app with `npm run web` in `mobile/` (port 8083) against Strapi on 1339; without `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` it shows the list. Auth: `lib/auth-client.native.ts` / `.web.ts` (Metro picks one; `lib/auth-client.ts` only re-exports the web one for `tsc`). Better Auth rejects a relative `baseURL`, so the web client prepends `window.location.origin` when `EXPO_PUBLIC_WEB_API_BASE` is empty (production).
- `npx @better-auth/cli generate` is deprecated on npm but still works; it says "already up to date" even when it writes files, so check `git status`.
