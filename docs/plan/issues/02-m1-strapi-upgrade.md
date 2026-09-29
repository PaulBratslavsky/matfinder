> **Part of {{#epic}}** · **M1** (step 2 of 10) · Blocked by: {{#m0}} · Spec: [06-build-spec.md @ 68803f6](https://github.com/PaulBratslavsky/matfinder/blob/68803f6bf44a5d0415cdefc498706b9e2ade58b9/docs/plan/06-build-spec.md#m1-strapi-upgrade--strapi-cloud-linked)

## Goal
Strapi runs on the latest 5.x (at least **5.49**), the Mapbox location field (moved to npm in {{#m0}}) still works after the upgrade, and `server/` deploys to Strapi Cloud.

## Why
- The stack is **Strapi v5, upgraded from 5.33.3 to the latest 5.x** (5.55.1 on 2026-09-27; **floor 5.49**), on Node **24 LTS**. The Better Auth plugin in {{#m3}} needs Strapi ≥ 5.45, which the 5.49 floor covers.

## Implementation spec
- [ ] Upgrade: `cd server && npx @strapi/upgrade minor` (repeat until `npm ls @strapi/strapi` shows the latest 5.x, ≥ **5.49**). Run the codemods it proposes, then `npm run build`.
- [ ] After the upgrade, confirm the Mapbox location field (set up in {{#m0}}) still renders and `/map-box/get-settings` still responds.
- [ ] Strapi Cloud: create the project at https://cloud.strapi.io → connect the GitHub repo → **root directory `server`** → US region → Node 24 (or the newest offered; ⚠️ verify) → set the env vars (see *Reference* below). Deploy.

## Reference (copied from the spec)
**Strapi env vars** (`server/.env` locally, Strapi Cloud in production). The rows and their first three columns are the spec's full table. The "When" column is *(added: not in spec)*: the "now" rows already exist locally from {{#m0}}; set them on Strapi Cloud in this step, and each later row in the step it names.

| Variable | Example | Notes | When |
|---|---|---|---|
| `HOST`, `PORT` | `0.0.0.0`, `1337` | If 1337 is taken locally, change `PORT` and the app's URLs together | now |
| `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY` | random | Strapi Cloud injects | now |
| `DATABASE_CLIENT` | `sqlite` (local) · `postgres` (Strapi Cloud) | | now |
| `DATABASE_FILENAME` | `.tmp/data.db` | local SQLite only; must not be empty | now |
| `DATABASE_URL` | (production only) | Strapi Cloud injects | now |
| `MAPBOX_ACCESS_TOKEN` | `pk.…` | admin map field | now |
| `BETTER_AUTH_SECRET` | `openssl rand -hex 32` | | {{#m3}} |
| `BETTER_AUTH_URL` | `http://localhost:1337` · `https://<project>.strapiapp.com` | bare origin | {{#m3}} |
| `WEB_ORIGINS` | `http://localhost:8081,https://matfinder.vercel.app` | CORS + `trustedOrigins` | {{#m3}} |
| `MAPBOX_GEOCODING_TOKEN` | `pk.…`/`sk.…` | server-only geocoding (no URL restriction); falls back to the above | {{#m5}} |
| `MCP_ENABLED` | `true` | | {{#m5}} |
| `SEED_SAMPLE_DATA` | `true` | **development only** | {{#m8}} (left unset on Strapi Cloud per {{#m9}}) |

**Deployment (backend), from the spec:** https://cloud.strapi.io → import the GitHub repo → **root directory `server`** → US region → Node 24 (or newest offered) → set the env vars → deploy on push to `main`. Docs: https://docs.strapi.io/cloud/getting-started/intro. After the first deploy: create the admin user, the `matfinder-curator` admin token, and confirm the API Permissions grants were seeded.

**Forward reference:** of those post-deploy items, only the admin user can be created now. The `matfinder-curator` token needs the MCP actions from {{#m5}}, and the grants are seeded by {{#m3}}. Both are checked on production in {{#m9}}, where the spec lists them as tasks. *(added: not in spec)*

## Watch out for
- **Upgrade in steps:** repeat `npx @strapi/upgrade minor` until `npm ls @strapi/strapi` shows the latest 5.x, and run the codemods it proposes.
- **Deploy trigger:** Strapi Cloud deploys on push to `main`, so this step's deploy check passes once this issue's PR is merged.
- Don't overwrite the values Strapi Cloud injects (`APP_KEYS` … `ENCRYPTION_KEY`, `DATABASE_URL`) with local ones. *(added: not in spec)*

## Verify during this step
- The Mapbox field still works on the upgraded Strapi: it renders in the admin **and** `/map-box/get-settings` responds.
- Strapi Cloud plan, region (US), and Node 24 availability (or the newest offered).

If a check fails, the deviation protocol applies: stop and ask.

## Done when
- [ ] The local admin shows Strapi ≥ 5.49 (and `npm ls @strapi/strapi` shows the latest 5.x)
- [ ] The Mapbox field still works after the upgrade (renders in the local admin; `/map-box/get-settings` responds)
- [ ] A push deploys successfully to Strapi Cloud (see *Deploy trigger* above)

## Acceptance criteria this step unlocks
None directly.

## Out of scope
- Content types that use the `global::map-box` field → {{#m2}}
- Auth plugins and their env vars → {{#m3}}
- MCP config and the admin token → {{#m5}}
- Production env vars, the production admin token, and the Vercel origin → {{#m9}}

## For the implementing agent
- **Deviation protocol:** commands, structures, versions, and conventions in this spec are **user decisions**. If you (the build agent) want to substitute any of them (build friction, a newer API, a "simpler" alternative), **STOP and ask the user.** Do not silently trade off. This applies especially to: the auth stack, the two-endpoint gate, draft-only MCP tools, and the Vercel same-origin rewrite.
- **Docs:** Strapi: query the `strapi-docs` MCP first; otherwise https://docs.strapi.io (v5). Upgrade tool https://docs.strapi.io/cms/upgrade-tool · Strapi Cloud https://docs.strapi.io/cloud/getting-started/intro
- **Workflow (the spec's rule):** one branch and one pull request per milestone issue, merged into `main` once the milestone's **Done when** check passes; the PR body says `Closes #<issue>`. Merging to `main` deploys Strapi Cloud (and Vercel, once connected). Branch: `m1-strapi-upgrade`; PR body: `Closes {{#self}}`.
