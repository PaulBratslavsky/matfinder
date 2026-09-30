# MatFinder: notes for coding agents

MatFinder is a map-first directory of Brazilian Jiu-Jitsu schools (Las Vegas first): a Strapi 5 backend in `server/` and an Expo app (iOS, Android and web) in `mobile/`. The code in both folders was seeded from `PaulBratslavsky/metravel-explore` at `ae220cc`.

## Where things are
- **The plan:** `docs/plan/01–06`. `docs/plan/06-build-spec.md` is the source of truth for the build.
- **The work:** GitHub issues. Epic **#2**; milestones **#3 (M0) → #12 (M9)**. `docs/plan/issues/plan.json` maps each milestone to its issue, and `docs/plan/issues/*.md` are the drafts behind them.
- **Stack reference for sibling apps:** "MatFinder Stack Blueprint" artifact, https://claude.ai/artifact/D4a5m63g2sSuLEocvg3Xjp

## Status (2026-09-30)
M0 (#3), M1 (#4, Strapi 5.56.0), M2 (#5, content model), M3 (#6, Better Auth), M4 (#7, school API), M5 (#8, MCP tools) and M8 (#11, sample seed) are open as stacked draft PRs. They wait on `strapi-plugin-map-box@0.0.5` on npm, an admin login to check the map field and the new types, the user's OK on M3's `jwt()` + `dash()` addition, and Strapi Cloud. Next: the app track, **#9 · M6 Expo app** then **#10 · M7 auth UI** (stack them on M8 so the app has sample data), then **#12 · M9 tests + deploy**. `SEED_SAMPLE_DATA=true` in `server/.env` loads the fictional Las Vegas data.

## How to work
1. Find the next issue: one that's open and whose "Blocked by" issues are all closed. If the `spec-to-github-issues` skill is installed:
   `python3 ~/.claude/skills/spec-to-github-issues/scripts/create_issues.py status docs/plan/issues/plan.json`
   Otherwise: `gh issue list -l type:build-step --state open`, then read each issue's "Blocked by" line.
2. Read the **whole** issue before writing code. Each one is self-contained: commands, schemas, traps, "Verify during this step", and "Done when".
3. Branch `m<n>-<slug>` (e.g. `m0-housekeeping`), commit, open a PR into `main` whose body says `Closes #<issue>`. Merge only when every Done-when box passes.
4. After M4 the build splits into two tracks that can run in parallel on separate branches: backend (M5 → M8) and app (M6 → M7). M9 comes last.

## Rules from the user (requirements, not preferences)
- **Never commit to `main`.** A repo hook blocks it: branch → PR → merge.
- **No Docker**, ever: no docker-compose, no Dockerfiles.
- **No local Postgres.** Local dev uses Strapi's default SQLite (`DATABASE_CLIENT=sqlite`, `DATABASE_FILENAME=.tmp/data.db`). Postgres exists only in production on Strapi Cloud.
- **npm only** in `server/` and `mobile/`.
- **Deviation protocol:** commands, structures, versions and conventions in the spec and issues are user decisions. If you want to substitute any of them, **stop and ask the user**. Don't silently trade off.
- **Verify, don't recall:** check versions on npm and APIs in the docs (`strapi-docs` MCP first, then https://docs.strapi.io) before relying on them.
- **Secrets stay out of chat, issues and commits.** The user adds tokens (e.g. `MAPBOX_ACCESS_TOKEN`) to `server/.env` themselves.

## Local quirks
- **Ports:** MatFinder uses Strapi **1339** and Expo **8083** (the defaults in `.env.example`, `config/server.ts` and the `mobile` scripts). Other projects on this machine use these, so don't take them: 1337/1338 (other Strapi projects), 1340/8081 (MatBuddy), 1341/8082 (MatBuddy tests), 3000. GitHub issues written before 2026-09-30 still say 1337/8081; read those as 1339/8083.
- **Open the admin at `http://matfinder.localhost:1339/admin`.** Browsers share cookies across ports on one hostname, and every Strapi admin uses the same cookie names (`jwtToken`, `strapi_admin_refresh`). On `localhost` a login to another project's admin overwrites MatFinder's, which causes a login loop. `*.localhost` resolves to this machine with no setup.
- Better Auth boots fine on SQLite here (checked in M3). New users get the Authenticated role from a Document Service middleware (the plugin assigns none, and api-permissions treats a user without roles as Public).
- **MCP:** the school-reading tool is `get_school_draft`, not the spec's `get_school` (Strapi's content manager registers a generic `get_school` and refuses to start on a name clash). Admin action uids use hyphens (`api::matfinder-mcp.upsert-school`). Under `strapi develop` `tools/list` also shows Strapi's dev-only `log` tool; `strapi start` shows exactly the 8. Tool schemas use `z` from `@strapi/utils` (zod 4.4 in Strapi 5.56).
- `npx @better-auth/cli generate` is deprecated on npm but still works; it says "already up to date" even when it writes files, so check `git status`.
