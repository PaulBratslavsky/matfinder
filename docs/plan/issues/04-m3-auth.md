> **Part of {{#epic}}** · **M3** (step 4 of 10) · Blocked by: {{#m2}} · Spec: [06-build-spec.md @ 68803f6](https://github.com/PaulBratslavsky/matfinder/blob/68803f6bf44a5d0415cdefc498706b9e2ade58b9/docs/plan/06-build-spec.md#m3-auth-better-auth-beta-confirmed-by-the-user)

## Goal
Strapi authenticates end users with **Better Auth** (email + password, 30-day sliding session) instead of Users & Permissions, and the role permissions that make the directory public and the school page account-only are seeded on boot.

## Why
- The spec's heading for this milestone flags Better Auth as **beta, confirmed by the user**. `@strapi-community/plugin-better-auth` is ⚠️ beta (user-accepted for the proof of concept) and sits on `plugin-api-permissions`, which is alpha. **Budget time for debugging.**
- The auth stack is a **user decision** and is named explicitly in the deviation protocol.
- Anyone can browse the map, but the full school page requires a free account. The server enforces that gate with `api-permissions` roles (Public vs Authenticated), which this step seeds. The endpoints themselves arrive in {{#m4}}.
- This step follows the official Strapi tutorial (linked under *Docs*).

## Implementation spec
- [ ] `cd server && npm install better-auth@^1.7 @better-auth/expo@^1.7 @strapi-community/plugin-better-auth @strapi-community/plugin-api-permissions @strapi-community/plugin-better-auth-dashboard @better-auth/infra zod@^4.1.12` (**the zod 4 pin is required** by the dashboard).
- [ ] **`npm uninstall @strapi/plugin-users-permissions`.** This is mandatory: the plugin throws at boot if the package is present, and disabling it in config isn't enough.
- [ ] `config/plugins.ts`: add `'better-auth': { enabled: true }`, `'api-permissions': { enabled: true }`, `'better-auth-dashboard': { enabled: true }` (alongside `'map-box'`).
- [ ] Create **`src/lib/auth.ts`**. The runtime auto-discovers this path; `config/better-auth.ts` is **only** a CLI arg path. **Export the instance**, not a `() => betterAuth()` factory (the factory form fails at runtime):
  ```ts
  import { betterAuth } from 'better-auth'
  import { expo } from '@better-auth/expo'
  import { strapiAdapter } from '@strapi-community/plugin-better-auth'

  const webOrigins = (process.env.WEB_ORIGINS ?? 'http://localhost:8081').split(',').map((s) => s.trim())

  export const auth = betterAuth({
    database: strapiAdapter(),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:1337',
    trustedOrigins: [...webOrigins, 'matfinder://', ...(process.env.NODE_ENV === 'production' ? [] : ['exp://'])],
    emailAndPassword: { enabled: true, requireEmailVerification: false, minPasswordLength: 8 },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 }, // 30-day sliding session
    plugins: [expo()],
    advanced: { database: { generateId: 'serial' } }, // REQUIRED: without it, foreign keys break on first sign-up
  })
  export default auth
  ```
- [ ] `npx @better-auth/cli generate --config src/lib/auth.ts --yes` to create the `user` / `session` / `account` / `verification` content types. Re-run it whenever Better Auth plugins change.
- [ ] CORS in `config/middlewares.ts`: replace `'strapi::cors'` with `{ name: 'strapi::cors', config: { origin: env.array('WEB_ORIGINS', ['http://localhost:8081']), credentials: true } }`.
- [ ] **Seed role permissions** in `bootstrap()`, idempotently. Roles are `plugin::api-permissions.role` (seeded Public / Authenticated); rows are `plugin::api-permissions.permission { action, role }`:
  ```ts
  const GRANTS = {
    public:        ['api::school.school.directory', 'api::city.city.find'],
    authenticated: ['api::school.school.directory', 'api::city.city.find', 'api::school.school.bySlug'],
  }
  // for each role (match by the role's `type` or `name`; verify field values after first boot):
  //   for each action: create { action, role: role.id } unless a row with that action+role exists
  ```
  **Never grant** core `find` / `findOne` / `create` / `update` / `delete` on school, instructor, or affiliation, or **anything** on the Better Auth `user` type (prevents listing accounts; the current user comes only from `/api/auth/get-session`).

  **Forward reference:** `api::school.school.directory` and `api::school.school.bySlug` are custom actions that only exist once {{#m4}} adds the routes and controller. Seed the full `GRANTS` list here as written. If Settings → API Permissions can't show the two school grants yet, check only the `city.find` grants in this step and **move the school-grant check to {{#m4}}**, where it is listed in *Done when*. *(added: not in spec)*

## Reference (copied from the spec)
**Env vars this step introduces** (`server/.env`, and Strapi Cloud):

| Variable | Example | Notes |
|---|---|---|
| `BETTER_AUTH_SECRET` | `openssl rand -hex 32` | |
| `BETTER_AUTH_URL` | `http://localhost:1337` · `https://<project>.strapiapp.com` | bare origin |
| `WEB_ORIGINS` | `http://localhost:8081,https://matfinder.vercel.app` | CORS + `trustedOrigins` |

**Auth design (spec § Auth):**
- Better Auth via `@strapi-community/plugin-better-auth` (⚠️ beta; re-evaluate before production), `plugin-api-permissions` (roles: Public, Authenticated), `plugin-better-auth-dashboard`. Users & Permissions **removed**. Strapi ≥ 5.45 (satisfied by ≥ 5.49 from {{#m1}}).
- Config: `server/src/lib/auth.ts`. Email + password; no verification or reset in the proof of concept; 30-day sliding session; `expo()` plugin; `generateId: 'serial'`.
- **Web:** browser cookies; production requests are **same-origin** via the Vercel `/api` rewrite ({{#m9}}). **Fallback (ask the user before switching):** Better Auth `bearer()` plugin + `Authorization` header.
- **Native:** `expoClient` + SecureStore; send `Cookie: await authClient.getCookie()` ({{#m7}}).

**Access model these grants implement.** This is the spec's *API surface* table with only the Method and Role columns; payloads are in {{#m4}}. *(added: not in spec: the reshaped table)*

| Method & path | Role |
|---|---|
| `GET /api/schools/directory?city=<slug>` | Public, Authenticated |
| `GET /api/schools/slug/:slug` | **Authenticated only** |
| `GET /api/cities` | Public |
| `/api/auth/*` | Public |
| core `/api/schools`, `/api/instructors`, `/api/affiliations` | **nobody** (403) |

## Watch out for
- **The zod 4 pin (`zod@^4.1.12`) is required** by the dashboard. Strapi bundles zod 3, which is why the MCP code in {{#m5}} must import `z` from `@strapi/utils`, never from `'zod'`. *(added: not in spec: the link to M5)*
- **Uninstall `@strapi/plugin-users-permissions`**; disabling it isn't enough, because the plugin throws at boot if the package is present.
- **`src/lib/auth.ts` is the runtime path.** `config/better-auth.ts` is only a CLI argument path.
- **Export the instance, not a factory.** The `() => betterAuth()` form fails at runtime.
- **`advanced.database.generateId: 'serial'` is REQUIRED.** Without it, foreign keys break on the first sign-up.
- **Re-run `npx @better-auth/cli generate --config src/lib/auth.ts --yes`** whenever Better Auth plugins change.
- **Never grant** core `find` / `findOne` / `create` / `update` / `delete` on school, instructor, or affiliation, or **anything** on the Better Auth `user` type. The current user comes only from `/api/auth/get-session`.
- **Seed idempotently**: create a row only if that `action` + `role` pair doesn't exist yet.
- `trustedOrigins` includes `exp://` only outside production. `matfinder://` is the app scheme set in `app.json` in {{#m6}}.
- `BETTER_AUTH_URL` is a **bare origin**.
- **Don't switch** to the `bearer()` fallback without asking the user; the auth stack is a user decision.

## Verify during this step
- ⚠️ **Better Auth on SQLite.** Local dev uses SQLite (user rule). This plugin stack has a reported early-DB-open `SqliteError` at boot on SQLite. If Strapi won't start after enabling Better Auth, **stop and ask the user**; don't switch databases on your own.
- The api-permissions role records' `type` / `name` values after first boot, so the seeding matches Public and Authenticated.
- Whether Settings → API Permissions lists the `school.directory` / `school.bySlug` grants before {{#m4}} exists. See the forward-reference note above. *(added: not in spec)*

If a check fails, the deviation protocol applies: stop and ask.

## Done when
- [ ] `POST /api/auth/sign-up/email` works via curl
- [ ] `GET /api/auth/get-session` (with the returned cookie) works via curl
- [ ] Settings → API Permissions shows the grants above (Public: `school.directory`, `city.find`; Authenticated: those plus `school.bySlug`). The two school grants may move to {{#m4}}; see the forward-reference note.
- [ ] The Better Auth dashboard tab loads

Example calls. The request body is a guess at Better Auth's sign-up fields, so adjust it if they differ. *(added: not in spec)*
```bash
curl -i -c /tmp/mf-cookies.txt -X POST http://localhost:1337/api/auth/sign-up/email \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:8081' \
  -d '{"name":"Test User","email":"test+m3@example.com","password":"password123"}'
curl -i -b /tmp/mf-cookies.txt http://localhost:1337/api/auth/get-session
```

## Acceptance criteria this step unlocks
None directly. It's the server half of AC5 and AC7 (finished in {{#m7}}) and a prerequisite for AC6 ({{#m4}}).

## Out of scope
- The `directory` / `bySlug` endpoints and their payloads → {{#m4}}
- The app's auth client, sign-in / sign-up screens, and gated school page → {{#m7}}
- Production `WEB_ORIGINS` (the Vercel URL) and the same-origin rewrite → {{#m9}}
- Password reset, email verification, social sign-in (v2)

## For the implementing agent
- **Deviation protocol:** commands, structures, versions, and conventions in this spec are **user decisions**. If you (the build agent) want to substitute any of them (build friction, a newer API, a "simpler" alternative), **STOP and ask the user.** Do not silently trade off. This applies especially to: the auth stack, the two-endpoint gate, draft-only MCP tools, and the Vercel same-origin rewrite.
- **Docs:** Better Auth plugin https://github.com/strapi-community/plugin-better-auth · https://strapi-community.github.io/plugin-better-auth/ · official tutorial https://strapi.io/blog/strapi-better-auth-tutorial-setup-guide-for-strapi-v5-and-next-js-16 · Better Auth Expo https://www.better-auth.com/docs/integrations/expo · Strapi: query the `strapi-docs` MCP first; otherwise https://docs.strapi.io (v5)
- **Workflow (the spec's rule):** one branch and one pull request per milestone issue, merged into `main` once the milestone's **Done when** check passes; the PR body says `Closes #<issue>`. Merging to `main` deploys Strapi Cloud (and Vercel, once connected). Branch: `m3-auth`; PR body: `Closes {{#self}}`.
