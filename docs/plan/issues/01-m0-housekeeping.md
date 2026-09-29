> **Part of {{#epic}}** · **M0** (step 1 of 10) · Blocked by: nothing, start here · Spec: [06-build-spec.md @ 945a14a](https://github.com/PaulBratslavsky/matfinder/blob/945a14abb38166ed4b4a21dc000126d26701537b/docs/plan/06-build-spec.md#m0-housekeeping)

## Goal
The seeded `server/` and `mobile/` run on npm, and Strapi boots against a local PostgreSQL in Docker, with the Mapbox location field working from the npm package.

## Why
This repo was seeded with `metravel-explore`'s `server/` and `mobile/` (copied at commit `ae220cc`, without its git history, its Next.js `client/`, or its plugin submodule). The stack uses **npm** in `server/` and `mobile/`, and **PostgreSQL** (Docker locally, Strapi Cloud managed in production). The copied yarn artifacts and stale npm lockfiles are cleaned up here.

The Mapbox plugin switch belongs here too: the seeded `config/plugins.ts` points at `../plugins/strapi-plugin-map-box`, the old submodule path, which doesn't exist in this repo, so Strapi can't boot until the plugin comes from npm.

## Implementation spec
- [ ] `git rm server/yarn.lock mobile/yarn.lock`; `git rm -r --cached mobile/.yarn` and add `.yarn/` to `mobile/.gitignore`.
- [ ] `cd server && rm -rf node_modules && npm install`; `cd mobile && rm -rf node_modules && npm install`. This regenerates `package-lock.json` (the committed npm lockfiles are stale). Remove the `packageManager` field from `server/package.json`.
- [ ] Add `docker-compose.yml` at the repo root:
  ```yaml
  services:
    db:
      image: postgres:17
      environment: { POSTGRES_USER: strapi, POSTGRES_PASSWORD: strapi, POSTGRES_DB: matfinder }
      ports: ["5432:5432"]
      volumes: [pgdata:/var/lib/postgresql/data]
  volumes: { pgdata: {} }
  ```
- [ ] `cp server/.env.example server/.env` and replace the `tobemodified` placeholders with random values (e.g. `openssl rand -base64 16` each; `APP_KEYS` takes several, comma-separated). The seed didn't copy any `.env`. *(added: not in spec)*
- [ ] `cd server && npm install pg`, and set `DATABASE_CLIENT=postgres` + `DATABASE_URL` in `server/.env` (the existing `config/database.ts` already reads these). Delete `server/.tmp/`.
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
| `HOST`, `PORT` | `0.0.0.0`, `1337` | If 1337 is taken locally, change `PORT` and the app's URLs together |
| `DATABASE_CLIENT` | `postgres` | |
| `DATABASE_URL` | `postgres://strapi:strapi@localhost:5432/matfinder` | Strapi Cloud injects |
| `MAPBOX_ACCESS_TOKEN` | `pk.…` | admin map field |

`MAPBOX_DEBUG_MODE` (read by the snippet above) isn't in the spec's env table; it defaults to `false`. *(added: not in spec)* `server/.env` is gitignored; add new variables to the tracked `server/.env.example` as well. *(added: not in spec)*

**Target layout, top level (from the spec's *Repo layout*):**
```
matfinder/
├── docker-compose.yml            # NEW: local Postgres
├── docs/plan/                    # this plan (01–06)
├── server/                       # Strapi v5 (Strapi Cloud root)
└── mobile/                       # Expo app (Vercel root for web)
```

## Watch out for
- **Remove only this step's part of the spec's *Removed* list:** all `yarn.lock` files and `mobile/.yarn/`. `server/src/api/{location,category}` are deleted in {{#m2}}, and the Expo template screens in {{#m6}}.
- `mobile/.yarn/` came over from the source repo as tracked files (e.g. `install-state.gz`), which is why the step uses `git rm -r --cached` plus a `.gitignore` entry rather than a plain delete. *(added: not in spec)*
- The committed npm lockfiles are stale; the `rm -rf node_modules && npm install` sequence regenerates `package-lock.json`.
- **Don't reintroduce a `../plugins/…` path.** Strapi Cloud builds from the `server/` root, so a plugin in a sibling folder would never deploy; the app uses the npm package.
- `POSTGRES_PASSWORD: strapi` is only for the local Docker database. Production uses Strapi Cloud's managed Postgres, which injects `DATABASE_URL`. *(added: not in spec)*

## Verify during this step
- ⚠️ **The plugin key.** The plugin's code calls `strapi.plugin('map-box')`, and its README uses the `'map-box'` key, but the npm package's `strapi.name` is `strapi-plugin-map-box`. Boot and confirm the location field renders in the admin **and** `/map-box/get-settings` responds. If the plugin registers under the other name, **stop and ask the user** (options: fix and publish the plugin, or `resolve: './node_modules/strapi-plugin-map-box'`).

## Done when
- [ ] `docker compose up -d` and `npm run develop` in `server/` boot on Postgres
- [ ] The Mapbox location field works in the admin (renders, and `/map-box/get-settings` responds)
- [ ] Strapi is not falling back to SQLite: `server/.tmp/` stays gone after boot *(added: not in spec)*
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
