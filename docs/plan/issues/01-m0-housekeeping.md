> **Part of {{#epic}}** · **M0** (step 1 of 10) · Blocked by: nothing, start here · Spec: [06-build-spec.md @ 68803f6](https://github.com/PaulBratslavsky/matfinder/blob/68803f6bf44a5d0415cdefc498706b9e2ade58b9/docs/plan/06-build-spec.md#m0-housekeeping)

## Goal
The seeded `server/` and `mobile/` run on npm, and Strapi boots locally on SQLite, with the Mapbox location field working from the npm package.

## Why
This repo was seeded with `metravel-explore`'s `server/` and `mobile/` (copied at commit `ae220cc`, without its git history, its Next.js `client/`, or its plugin submodule). The stack uses **npm** in `server/` and `mobile/`, **SQLite** locally (no local Postgres, no Docker), and **PostgreSQL** managed by Strapi Cloud in production. The copied yarn artifacts and stale npm lockfiles are cleaned up here.

The Mapbox plugin switch belongs here too: the seeded `config/plugins.ts` points at `../plugins/strapi-plugin-map-box`, the old submodule path, which doesn't exist in this repo, so Strapi can't boot until the plugin comes from npm.

## Implementation spec
- [ ] `git rm server/yarn.lock mobile/yarn.lock`; `git rm -r --cached mobile/.yarn` and add `.yarn/` to `mobile/.gitignore`.
- [ ] `cd server && rm -rf node_modules && npm install`; `cd mobile && rm -rf node_modules && npm install`. This regenerates `package-lock.json` (the committed npm lockfiles are stale). Remove the `packageManager` field from `server/package.json`.
- [ ] `cp server/.env.example server/.env` and replace the `tobemodified` placeholders with random values (e.g. `openssl rand -base64 16` each; `APP_KEYS` takes several, comma-separated). The seed didn't copy any `.env`. *(added: not in spec)*
- [ ] Local database: **SQLite** (Strapi's default; no local Postgres install and no Docker, per the user's rules for Strapi apps). Set `DATABASE_CLIENT=sqlite` and `DATABASE_FILENAME=.tmp/data.db` in `server/.env` (the existing `config/database.ts` reads these). An empty `DATABASE_FILENAME` resolves to a directory and fails with `SQLITE_CANTOPEN`.
- [ ] `cd server && npm install pg`: production runs on Strapi Cloud's managed Postgres, so the driver must be a dependency even though local dev uses SQLite.
- [ ] Mapbox plugin from npm: `npm install strapi-plugin-map-box@0.0.4`. In `config/plugins.ts`, **replace** the `resolve: '../plugins/strapi-plugin-map-box'` entry with the README form:
  ```ts
  'map-box': { enabled: true, config: { public: {
    accessToken: env('MAPBOX_ACCESS_TOKEN'), debugMode: env.bool('MAPBOX_DEBUG_MODE', false) } } },
  ```
  The seeded `config/plugins.ts` exports `() => ({...})` and reads `process.env` directly; to use `env(...)` as above, the export must take `({ env })`. *(added: not in spec)*
- [ ] Keep the plugin README's CSP directives in `config/middlewares.ts` (`api.mapbox.com`, `events.mapbox.com`, `*.mapbox.com`, `blob:`).

## Reference (copied from the spec)
**Env vars this step introduces** (`server/.env`):

| Variable | Example | Notes |
|---|---|---|
| `HOST`, `PORT` | `0.0.0.0`, `1339` | Local ports are listed in CLAUDE.md |
| `DATABASE_CLIENT` | `sqlite` (local) · `postgres` (Strapi Cloud) | |
| `DATABASE_FILENAME` | `.tmp/data.db` | local SQLite only; must not be empty |
| `DATABASE_URL` | (production only) | Strapi Cloud injects |
| `MAPBOX_ACCESS_TOKEN` | `pk.…` | admin map field |

`MAPBOX_DEBUG_MODE` (read by the snippet above) isn't in the spec's env table; it defaults to `false`. *(added: not in spec)* `server/.env` is gitignored; add new variables to the tracked `server/.env.example` as well. *(added: not in spec)*

**Target layout, top level (from the spec's *Repo layout*):**
```
matfinder/
├── docs/plan/                    # this plan (01–06)
├── server/                       # Strapi v5 (Strapi Cloud root)
└── mobile/                       # Expo app (Vercel root for web)
```

## Watch out for
- **Remove only this step's part of the spec's *Removed* list:** all `yarn.lock` files and `mobile/.yarn/`. `server/src/api/{location,category}` are deleted in {{#m2}}, and the Expo template screens in {{#m6}}.
- `mobile/.yarn/` came over from the source repo as tracked files (e.g. `install-state.gz`), which is why the step uses `git rm -r --cached` plus a `.gitignore` entry rather than a plain delete. *(added: not in spec)*
- The committed npm lockfiles are stale; the `rm -rf node_modules && npm install` sequence regenerates `package-lock.json`.
- **Don't reintroduce a `../plugins/…` path.** Strapi Cloud builds from the `server/` root, so a plugin in a sibling folder would never deploy; the app uses the npm package.
- **No local Postgres** and **no Docker**: local dev is SQLite. Production uses Strapi Cloud's managed Postgres, which injects its own connection settings.

## Verify during this step
- ⚠️ **The plugin key.** The plugin's code calls `strapi.plugin('map-box')`, and its README uses the `'map-box'` key, but the npm package's `strapi.name` is `strapi-plugin-map-box`. Boot and confirm the location field renders in the admin **and** `/map-box/get-settings` responds. If the plugin registers under the other name, **stop and ask the user** (options: fix and publish the plugin, or `resolve: './node_modules/strapi-plugin-map-box'`).

## Done when
- [ ] `npm run develop` in `server/` boots on SQLite (`server/.tmp/data.db` is created)
- [ ] The Mapbox location field works in the admin (renders, and `/map-box/get-settings` responds)
- [ ] `git status` shows no lockfile noise (no `yarn.lock`, nothing under `mobile/.yarn/`) *(added: not in spec: the parenthetical)*

## Acceptance criteria this step unlocks
None directly. This is groundwork for every later step.

## Out of scope
- Strapi upgrade and linking Strapi Cloud → {{#m1}}
- Deleting `server/src/api/{location,category}` and creating the content model → {{#m2}}
- Expo SDK upgrade and removing the template screens → {{#m6}}

## For the implementing agent
- **Deviation protocol:** commands, structures, versions, and conventions in this spec are **user decisions**. If you (the build agent) want to substitute any of them (build friction, a newer API, a "simpler" alternative), **STOP and ask the user.** Do not silently trade off. This applies especially to: the auth stack, the two-endpoint gate, draft-only MCP tools, and the Vercel same-origin rewrite.
- **Docs:** Strapi: query the `strapi-docs` MCP first; otherwise https://docs.strapi.io (v5). Plugin: https://github.com/PaulBratslavsky/strapi-plugin-map-box (README → *Configuration*).
- **Workflow (the spec's rule):** one branch and one pull request per milestone issue, merged into `main` once the milestone's **Done when** check passes; the PR body says `Closes #<issue>`. Merging to `main` deploys Strapi Cloud (and Vercel, once connected). Branch: `m0-housekeeping`; PR body: `Closes {{#self}}`.
