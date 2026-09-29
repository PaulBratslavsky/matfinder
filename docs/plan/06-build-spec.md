# MatFinder: Build Spec

> **Hand this file to any coding agent (Claude Code, Cursor, etc.). It is self-contained.** Background lives in `01`–`05` in this folder, but everything needed to build is here.
>
> **Deviation protocol:** commands, structures, versions, and conventions in this spec are **user decisions**. If you (the build agent) want to substitute any of them (build friction, a newer API, a "simpler" alternative), **STOP and ask the user.** Do not silently trade off. This applies especially to: the auth stack, the two-endpoint gate, draft-only MCP tools, and the Vercel same-origin rewrite.
>
> **Build target:** Strapi v5 (Strapi Cloud) + Expo / React Native / React Native Web (Vercel for web). **This is a build in the `matfinder` repo, which was seeded with `metravel-explore`'s `server/` and `mobile/`** (copied at commit `ae220cc`, without its git history), not a new scaffold.
>
> **Docs lookup (verify before writing version-sensitive code):**
> - **Strapi:** query the `strapi-docs` MCP first; otherwise https://docs.strapi.io (v5). Document Service https://docs.strapi.io/cms/api/document-service · DS middlewares https://docs.strapi.io/cms/api/document-service/middlewares · routes https://docs.strapi.io/cms/backend-customization/routes · controllers https://docs.strapi.io/cms/backend-customization/controllers · MCP server https://docs.strapi.io/cms/features/strapi-mcp-server · upgrade tool https://docs.strapi.io/cms/upgrade-tool
> - **Strapi MCP custom tools:** https://strapi.io/blog/how-to-extend-strapi-s-mcp-server-with-a-custom-tools-via-a-plugin · https://strapi.io/blog/strapi-mcp-tanstack-ai-local-chat
> - **Better Auth plugin:** https://github.com/strapi-community/plugin-better-auth · https://strapi-community.github.io/plugin-better-auth/ · official tutorial https://strapi.io/blog/strapi-better-auth-tutorial-setup-guide-for-strapi-v5-and-next-js-16 · Better Auth Expo https://www.better-auth.com/docs/integrations/expo
> - **Expo:** https://docs.expo.dev (SDK upgrade guide, Expo Router, env vars `EXPO_PUBLIC_`, web export) · **NativeWind v4** https://www.nativewind.dev · **React Native Reusables** https://reactnativereusables.com · **@rnmapbox/maps** https://rnmapbox.github.io · **react-map-gl** https://visgl.github.io/react-map-gl
> - **Vercel:** `vercel.ts` https://vercel.com/docs/project-configuration/vercel-ts · rewrites https://vercel.com/docs/rewrites
> - Expo and Expo Router rename things across SDKs. Check the SDK 57 docs for file conventions (`+not-found`, `Redirect`, `Stack.Protected`, `web.output`) before writing them.

---

## Project overview
**MatFinder is a map-first directory of Brazilian Jiu-Jitsu schools that helps anyone, whether a local or a traveler, find the right place to train and know what to expect before they walk in.**

Anyone can open the map, search, and filter Las Vegas schools by *training today*, *visitors welcome*, and *Gi / No-Gi*. A preview card answers "can I train here tonight, and what does it cost?", and the full school page (schedule, pricing, instructors, amenities, contact) requires a free account. Listings are curated: the MatFinder curator adds and updates schools by talking to Claude through Strapi's MCP server, which writes **drafts only**; a human publishes in the Strapi admin.

## Stack
| Area | Choice |
|---|---|
| Backend / CMS | **Strapi v5, upgraded from 5.33.3 to the latest 5.x** (5.55.1 on 2026-09-27; **floor 5.49**). Node **24 LTS** |
| Database | **PostgreSQL**: native Homebrew install locally (**no Docker**), Strapi Cloud managed in production |
| Backend hosting | **Strapi Cloud** (root directory `server`) |
| App | **Expo SDK 57 + Expo Router + React Native Web**, one codebase for iOS, Android, and web (`mobile/`) |
| UI | **NativeWind v4** (Tailwind 3) + **React Native Reusables** (shadcn-style, components in `mobile/components/ui/`) |
| Maps | Mapbox everywhere: `@rnmapbox/maps` (native), `react-map-gl` + `mapbox-gl` (web), `strapi-plugin-map-box` custom field (admin) |
| Auth | **Better Auth** via `@strapi-community/plugin-better-auth` ⚠️ beta (user-accepted for the proof of concept) + `plugin-api-permissions` (alpha) + `plugin-better-auth-dashboard`; `@better-auth/expo`. Email + password only |
| Client data | TanStack Query; filters in URL search params |
| AI access | Strapi **built-in MCP server** with **8 custom draft-only tools** |
| Web hosting | **Vercel** (Expo web export, same-origin `/api` rewrite to Strapi Cloud) |
| Package manager | **npm** in `server/` and `mobile/` |
| Tests | Vitest (unit + server integration), Playwright (web end-to-end) |

## Repo layout (target)
```
matfinder/
├── docs/plan/                    # this plan (01–06)
├── server/                       # Strapi v5 (Strapi Cloud root)
│   ├── config/{server,plugins,middlewares,database,admin,api}.ts
│   ├── src/
│   │   ├── index.ts              # register(): DS middlewares + MCP actions/tools; bootstrap(): indexes, role perms, sample seed
│   │   ├── lib/auth.ts           # Better Auth instance
│   │   ├── lib/{slugify,time,geocode,blocks}.ts
│   │   ├── document-middlewares/ # slug, schedule-validate, normalize-contact, pricing-validate, city-validate
│   │   ├── mcp/{index,guard}.ts + mcp/tools/*.ts
│   │   ├── seed/sample.ts
│   │   ├── components/{school,schedule}/*.json
│   │   └── api/{city,affiliation,instructor,school}/…
│   └── tests/
└── mobile/                       # Expo app (Vercel root for web)
    ├── app/                      # Expo Router routes
    ├── components/{ui,map,explore,school}/
    ├── lib/{api,auth-client.native.ts,auth-client.web.ts,time.ts,filters.ts,geo.ts}
    ├── hooks/
    ├── e2e/                      # Playwright
    └── vercel.ts
```
**Removed:** `server/src/api/{location,category}`, all `yarn.lock` files, `mobile/.yarn/`, template screens (`mobile/app/modal.tsx`, `mobile/app/(tabs)/explore.tsx`, `mobile/app/(tabs)/map.tsx`, `mobile/scripts/reset-project.js`). (`metravel-explore`'s Next.js `client/` and plugin submodule were never copied into this repo.)

---

## Build order

**Workflow:** one branch and one pull request per milestone issue (branch `m<n>-<slug>`, e.g. `m3-auth`), merged into `main` once the milestone's **Done when** check passes. The PR body says `Closes #<issue>`. Merging to `main` is what deploys Strapi Cloud (and Vercel, once connected), so every merged milestone is live. Milestones whose blockers are all merged can run in parallel on separate branches.

### M0: Housekeeping
- [ ] `git rm server/yarn.lock mobile/yarn.lock`; `git rm -r --cached mobile/.yarn` and add `.yarn/` to `mobile/.gitignore`.
- [ ] `cd server && rm -rf node_modules && npm install`; `cd mobile && rm -rf node_modules && npm install`. This regenerates `package-lock.json` (the committed npm lockfiles are stale). Remove the `packageManager` field from `server/package.json`.
- [ ] Local PostgreSQL, installed natively (**no Docker**, per the user's rule for Strapi apps):
  ```bash
  brew install postgresql@17
  export PATH="$(brew --prefix postgresql@17)/bin:$PATH"   # postgresql@17 is keg-only; add this to your shell profile
  brew services start postgresql@17
  psql postgres -c "CREATE ROLE strapi LOGIN PASSWORD 'strapi' CREATEDB;"
  createdb -O strapi matfinder
  ```
- [ ] `cd server && npm install pg`, and set `DATABASE_CLIENT=postgres` + `DATABASE_URL` in `server/.env` (the existing `config/database.ts` already reads these). Delete `server/.tmp/`.
- [ ] Mapbox plugin from npm (needed before Strapi can boot: the seeded `config/plugins.ts` points at `../plugins/strapi-plugin-map-box`, which doesn't exist in this repo): `npm install strapi-plugin-map-box@0.0.4`. In `config/plugins.ts`, **replace** the `resolve: '../plugins/strapi-plugin-map-box'` entry with the README form:
  ```ts
  'map-box': { enabled: true, config: { public: {
    accessToken: env('MAPBOX_ACCESS_TOKEN'), debugMode: env.bool('MAPBOX_DEBUG_MODE', false) } } },
  ```
  ⚠️ **Verify the plugin key.** The plugin's code calls `strapi.plugin('map-box')`, and its README uses the `'map-box'` key, but the npm package's `strapi.name` is `strapi-plugin-map-box`. Boot and confirm the location field renders in the admin **and** `/map-box/get-settings` responds. If the plugin registers under the other name, **stop and ask the user** (options: fix and publish the plugin, or `resolve: './node_modules/strapi-plugin-map-box'`).
- [ ] Keep the plugin README's CSP directives in `config/middlewares.ts` (`api.mapbox.com`, `events.mapbox.com`, `*.mapbox.com`, `blob:`).
- **Done when:** `npm run develop` in `server/` boots on the local Postgres with the Mapbox location field working in the admin; `git status` shows no lockfile noise.

### M1: Strapi upgrade + Strapi Cloud linked
- [ ] Upgrade: `cd server && npx @strapi/upgrade minor` (repeat until `npm ls @strapi/strapi` shows the latest 5.x, ≥ **5.49**). Run the codemods it proposes, then `npm run build`.
- [ ] After the upgrade, confirm the Mapbox location field (set up in M0) still renders and `/map-box/get-settings` still responds.
- [ ] Strapi Cloud: create the project at https://cloud.strapi.io → connect the GitHub repo → **root directory `server`** → US region → Node 24 (or the newest offered; ⚠️ verify) → set the env vars (see *Environment variables*). Deploy.
- **Done when:** the local admin shows Strapi ≥ 5.49 with a working Mapbox field, and a push deploys successfully to Strapi Cloud.

### M2: Content model, Document Service middlewares, unique indexes
- [ ] Delete `src/api/location` and `src/api/category`. Create the four content types and four components **exactly** as in *Strapi schemas* below (files under `src/api/<name>/content-types/<name>/schema.json` and `src/components/<category>/<name>.json`, plus the standard `controllers/`, `services/`, `routes/` files using `factories.createCore*`).
  - Write schema files directly. **Do not use `strapi generate` in automation** (it's interactive).
- [ ] Document Service middlewares in `src/document-middlewares/`, registered in `src/index.ts` **`register()`** with `strapi.documents.use(...)`. **Always `return next()`**; reject with `throw new errors.ValidationError(msg, { path })` (`import { errors } from '@strapi/utils'`):
  1. **slug** (`create`, for school / instructor / affiliation / city): `ctx.params.data.slug ??= slugify(ctx.params.data.name)`. `uid` fields are **not** auto-filled on API, Document Service, or seed writes (only the admin fills them), so **every** slug-filtered type needs this. `slugify` = lowercase, strip accents, non-alphanumerics → `-`, trim `-`; **if the result is empty, use `<type>-<6 random chars>`**. Don't regenerate on rename.
  2. **schedule-validate** (school `create` / `update` with `data.schedule`): each row has `endTime > startTime` (compare `HH:mm`), valid enums, and ≤ 100 rows.
  3. **normalize-contact**: `contact.instagram` → handle without `@` or URL; `contact.website` and `affiliation.website` get a `https://` prefix if missing.
  4. **pricing-validate**: fees ≥ 0; `monthlyMax ≥ monthlyMin` when both are set.
  5. **city-validate**: `new Intl.DateTimeFormat('en-US', { timeZone: data.timezone })` must not throw.
- [ ] **Real unique indexes** in `bootstrap()`. `unique: true` in a schema is validation-layer only, and Document Service writes bypass it. Run each statement in its own try/catch and `strapi.log.error` on failure:
  ```ts
  const ddl = [
    `CREATE UNIQUE INDEX IF NOT EXISTS schools_slug_draft_uq ON schools (slug) WHERE published_at IS NULL`,
    `CREATE UNIQUE INDEX IF NOT EXISTS instructors_slug_draft_uq ON instructors (slug) WHERE published_at IS NULL`,
    `CREATE UNIQUE INDEX IF NOT EXISTS affiliations_slug_draft_uq ON affiliations (slug) WHERE published_at IS NULL`,
    `CREATE UNIQUE INDEX IF NOT EXISTS cities_slug_uq ON cities (slug)`,
  ]
  for (const sql of ddl) { try { await strapi.db.connection.raw(sql) } catch (e) { strapi.log.error(`[matfinder] index failed: ${sql}`, e) } }
  ```
  (Draft-and-publish stores a draft row and a published row per document with the same slug, so only the **draft** rows are indexed; there is exactly one per document. Confirm table and column names in Postgres after the first boot.)
- **Done when:** the admin shows all types and components; creating a school through the Document Service without a slug gets one; a bad schedule row is rejected with a `ValidationError`; `\d schools` in psql shows the partial unique index.

### M3: Auth (Better Auth; beta, confirmed by the user)
Follows the official Strapi tutorial (linked above). Budget time for debugging: this is a beta auth plugin on an alpha permissions plugin.
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
- **Done when:** `POST /api/auth/sign-up/email` then `GET /api/auth/get-session` (with the returned cookie) work via curl; Settings → API Permissions shows the grants above; the Better Auth dashboard tab loads.

### M4: School API (the server-enforced gate)
- [ ] `src/api/school/services/school.ts`: extend the core service with:
  - `getDirectory(citySlug)`
  - `getBySlug(slug)`
  - `upsertDraft(input)`, `setScheduleDraft(slug, sessions)`, `listPendingDrafts(opts)`: the MCP tools call these; see M5.
  - Helpers `toTodaySessions`, `deriveStyles`, `derivePrograms` using `src/lib/time.ts` (*Time rules* below).
  - Queries use `strapi.documents('api::school.school').findMany({ filters, fields, populate, status: 'published', limit, start })`. **Pagination is top-level `limit`/`start`** (not `pagination: {}`).
- [ ] `src/api/school/controllers/school.ts`: `factories.createCoreController('api::school.school', ({ strapi }) => ({ async directory(ctx) {...}, async bySlug(ctx) {...} }))`. Thin: read params, call the service, set `Cache-Control: public, max-age=60` on the directory, and return `ctx.notFound()` for an unknown slug.
- [ ] **`src/api/school/routes/01-custom-school.ts`.** The `01-` prefix makes it load before the core router; otherwise `/schools/directory` matches core `GET /schools/:id`:
  ```ts
  export default { routes: [
    { method: 'GET', path: '/schools/directory', handler: 'api::school.school.directory' },
    { method: 'GET', path: '/schools/slug/:slug', handler: 'api::school.school.bySlug' },
  ] }
  ```
  Leave the core router file in place (its actions stay ungranted).
- [ ] Payloads exactly as in *API surface*. The directory **must not** include the weekly schedule beyond today, instructors, contact, amenities, gallery, description, or pricing beyond `visitorsWelcome` / `dropInFee` / `currency`.
- **Done when:** `curl /api/schools/directory?city=las-vegas` → 200 with trimmed fields; `curl /api/schools/slug/<slug>` → 401/403 without a cookie and 200 with one; `curl /api/schools` → 403.

### M5: MCP server + custom tools
- [ ] `config/server.ts`: add `mcp: { enabled: env.bool('MCP_ENABLED', true) }`.
- [ ] `src/mcp/index.ts` exports `TOOLS` (one definition per tool) and `registerMcp(strapi)`, called from **`register()`** (not `bootstrap()`, which runs after the MCP server starts **and** would wipe token grants for actions registered there on every restart):
  ```ts
  import { z } from '@strapi/utils' // NEVER import from 'zod' directly (Strapi bundles zod 3)

  export async function registerMcp(strapi) {
    await strapi.service('admin::permission').actionProvider.registerMany(
      TOOLS.map((t) => ({ section: 'settings', category: 'MatFinder MCP tools',
        uid: `matfinder-mcp.${t.name}`, displayName: t.write ? `${t.title} (write)` : t.title })),
    ) // → action ids `api::matfinder-mcp.<name>`
    for (const t of TOOLS) {
      strapi.ai.mcp.registerTool({            // ONE object argument (positional form fails)
        name: t.name, title: t.title, description: t.description,
        auth: { policies: [{ action: `api::matfinder-mcp.${t.name}` }] },
        resolveInputSchema: () => t.input,     // z.object({...})
        resolveOutputSchema: () => t.output,   // MANDATORY
        createHandler: (strapi) => async ({ args }) => {
          const result = guard(await t.run(strapi, args), t.shrinkHint)
          return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result }
        },
      })
    }
  }
  ```
  - Don't gate tools on `plugin::content-manager.explorer.*`. Those grants are content-type-scoped and fail silently for subject-less tool policies; they would also expose Strapi's generic CRUD tools.
  - Verify the exact `createHandler` signature (`async ({ args })` vs `async (args)`) against the blog post and the installed Strapi version.
- [ ] `src/mcp/guard.ts`: `wire = Buffer.byteLength(JSON.stringify(data)) * 2 + 2048`; if `wire > 950_000`, return `{ error: 'RESULT_TOO_LARGE', bytes: wire, message: shrinkHint }` (the payload is sent twice: `content` and `structuredContent`).
- [ ] Implement the 8 tools (see *MCP tools* below). All writes go through the school / instructor / affiliation **services**, target the **draft**, and run multi-write operations inside `strapi.db.transaction(async () => {...})` (Document Service calls join the ambient transaction). **No tool publishes, unpublishes, deletes, or uploads media.**
  - **Create, catch, refetch:** on a unique-index violation during create, re-query by slug and apply the update instead.
  - Relations are returned as **names and slugs**, never bare ids.
  - String inputs longer than 255 characters must target `text` fields (a Strapi `string` has a 255-character app-layer max). Enforce `.max(255)` in zod for `string` fields.
- [ ] `src/lib/geocode.ts`: Mapbox Geocoding (`MAPBOX_GEOCODING_TOKEN ?? MAPBOX_ACCESS_TOKEN`), `proximity` = city center, `country=us`, `types=address,poi`, limit 1 → `{ longitude, latitude, address, zoom: 15, pitch: 0, bearing: 0 }` (the `map-box` field shape). No result → tool error `GEOCODE_FAILED` with the address tried.
- [ ] Create the admin token: Strapi admin → **Settings → Admin Tokens** (not API Tokens; `/mcp` rejects API tokens) → name `matfinder-curator`, unlimited duration → tick **only** the *MatFinder MCP tools* actions. Save it in a password manager; **never commit it**.
- [ ] Connect: `claude mcp add matfinder --transport http http://localhost:1337/mcp -H "Authorization: Bearer <token>"`.
- **Done when:** in Claude Code, `tools/list` shows **exactly** the 8 MatFinder tools (no `list_school`/`update_school`/`publish_*` generic tools); "add <fictional school> at <real Vegas address> with this schedule…" creates a **draft** with a geocoded pin; `list_pending_drafts` shows it; it does **not** appear in `/api/schools/directory` until published in the admin.

### M6: Expo app (SDK 57, NativeWind, React Native Reusables, maps, data)
- [ ] Upgrade Expo **one SDK at a time** (per Expo's guide): `npx expo install expo@^55.0.0 --fix` → `npx expo-doctor` → repeat for `^56` and `^57`. Commit after each.
- [ ] `app.json`: `"name": "MatFinder"`, `"slug": "matfinder"`, `"scheme": "matfinder"`, `ios.bundleIdentifier` / `android.package` = `com.matfinder.app`, `web.output: "single"`. Keep the `@rnmapbox/maps` and `expo-location` plugins.
- [ ] Remove the template screens (see *Repo layout*).
- [ ] NativeWind v4: `npx expo install nativewind react-native-reanimated react-native-safe-area-context` + `npm install -D tailwindcss@^3.4`, then the NativeWind Expo setup (`tailwind.config.js` with the `nativewind/preset`, `global.css`, `babel.config.js` `jsxImportSource: 'nativewind'` + `nativewind/babel`, `metro.config.js` `withNativeWind`, `nativewind-env.d.ts`). Follow the current NativeWind v4 Expo guide exactly. **Do not** use NativeWind v5 (release candidate).
- [ ] React Native Reusables: `npx @react-native-reusables/cli@latest doctor` (fixes and verifies config in an existing project), then `npx @react-native-reusables/cli@latest add button card input label text badge toggle-group separator skeleton alert avatar`. Components land in `components/ui/`. Add `<PortalHost />` to the root layout.
- [ ] Other deps: `npx expo install @tanstack/react-query expo-secure-store expo-network expo-location expo-linking expo-image @rnmapbox/maps` and `npm install better-auth @better-auth/expo react-map-gl mapbox-gl qs`.
- [ ] Implement `lib/api/client.ts`, `lib/api/schools.ts`, `lib/time.ts`, `lib/filters.ts`, `lib/geo.ts`, the hooks, and the routes/components exactly per *App route tree* below.
- [ ] Maps: `components/map/SchoolMap.tsx` (native, `@rnmapbox/maps`: `Mapbox.setAccessToken(EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN)`, `MapView` + `Camera` + `ShapeSource cluster` + `CircleLayer` / `SymbolLayer`, `onPress` → `onSelect(slug)`) and `SchoolMap.web.tsx` (`import Map, { Source, Layer } from 'react-map-gl/mapbox'`, `import 'mapbox-gl/dist/mapbox-gl.css'`). Both implement `SchoolMap.types.ts`. Without a token → `MapUnavailable` + list view.
- [ ] Native runs need a **development build** (`@rnmapbox/maps` is not in Expo Go): `npx expo run:ios` / `npx expo run:android` with `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` set.
- **Done when:** `npx expo start --web` shows the map with sample pins; search and all filters work; the preview card shows the next session in Vegas time; the same works in the iOS Simulator and Android Emulator dev builds.

### M7: Auth UI + gated school page
- [ ] `lib/auth-client.native.ts`:
  ```ts
  import { createAuthClient } from 'better-auth/react'
  import { expoClient } from '@better-auth/expo/client'
  import * as SecureStore from 'expo-secure-store'
  export const authClient = createAuthClient({
    baseURL: `${process.env.EXPO_PUBLIC_STRAPI_URL}/api/auth`,
    plugins: [expoClient({ scheme: 'matfinder', storagePrefix: 'matfinder', storage: SecureStore })],
  })
  ```
  `lib/auth-client.web.ts`: `createAuthClient({ baseURL: \`${process.env.EXPO_PUBLIC_WEB_API_BASE ?? ''}/api/auth\` })`. Under Metro, a relative `baseURL` may need `window.location.origin` prepended; verify.
- [ ] `lib/api/client.ts` adds auth per platform: **native** `headers.Cookie = await authClient.getCookie()`, `credentials: 'omit'`; **web** `credentials: 'include'`. Map 401/403 → `AuthRequiredError`.
- [ ] `app/sign-in.tsx` and `app/sign-up.tsx` from the React Native Reusables sign-in / sign-up blocks, wired to `authClient.signIn.email` / `authClient.signUp.email`. On success: `router.replace(redirect ?? '/')`. Show server errors inline.
- [ ] `app/schools/[slug].tsx`: if `!session` → `<Redirect href={{ pathname: '/sign-in', params: { redirect: `/schools/${slug}` } }} />`. Otherwise fetch `useSchool(slug)` and render the full page (see the route table).
- [ ] `app/(tabs)/account.tsx`: session details + **Sign out** (`authClient.signOut()` then `queryClient.removeQueries({ queryKey: ['school'] })`).
- **Done when:** signed out → "View school" → sign up → lands on that school page; reload (web) and app restart (native) keep the session; sign out → school page redirects to sign-in.

### M8: Sample seed + media
- [ ] `src/seed/sample.ts`, called from `bootstrap()` **only if** `SEED_SAMPLE_DATA === 'true'` and idempotent (upsert by slug through the services). Seed:
  - **City** Las Vegas (`las-vegas`, NV, US, `America/Los_Angeles`, center lng -115.1398 / lat 36.1699, zoom 10.5).
  - **3 affiliations:** "Sample Team Alpha (Demo)", "Sample Team Beta (Demo)", "Independent".
  - **6 instructors** (mixed belts).
  - **8 clearly fictional schools** named "Sample … (Demo)", in Summerlin, Henderson, near the Strip, North Las Vegas, Spring Valley, and Centennial Hills, with real-looking Vegas-area coordinates. **Coverage:** at least one open mat every evening of the week; visitors welcome yes/no; Gi-only, No-Gi-only, and both; kids and womens sessions; varied prices; one school with no instructors or amenities (tests empty sections); one with `lastVerifiedAt` over 90 days ago. **Publish all** (`strapi.documents(uid).publish({ documentId })`).
- [ ] Logos: skip, or use one placeholder image uploaded via the upload service. The UI falls back to initials.
- [ ] End-user accounts are **not** seeded. Tests sign up through the real `/api/auth/sign-up/email` endpoint.
- **Done when:** a fresh database with `SEED_SAMPLE_DATA=true` boots with 8 published sample schools; a second boot creates no duplicates.

### M9: Tests, deploy, and real listings
- [ ] **Unit (Vitest):**
  - `mobile/lib/time.test.ts`: training today, next session, On now, day rollover, a device TZ ≠ city TZ (mock `Date`).
  - `mobile/lib/filters.test.ts`: text search (accent- and case-insensitive), each filter, AND combination.
  - `server/tests/unit/*.test.ts`: `slugify` fallback, schedule validation, directory trimming.
- [ ] **Server integration** (`server/tests/api.test.ts`, run against a dev server with the sample seed):
  - directory field set is exactly the public set;
  - bySlug is 401/403 → sign up via `/api/auth/sign-up/email` → 200;
  - `GET /api/schools` → 403;
  - `POST /mcp` `tools/list` with the admin token → exactly 8 tools;
  - `upsert_school` creates a draft absent from the directory;
  - `set_school_schedule` rejects `end <= start`.
- [ ] **End-to-end (Playwright, `mobile/e2e/`)** against `npx expo start --web` (or the exported build served locally), `trace: 'retain-on-failure'`: map loads → "Training today" + "Visitors welcome" → pin/list item → preview card → "View school" → sign up (unique email) → school page shows the full schedule with today highlighted → sign out → redirected to sign-in.
- [ ] **Deploy backend:** push → Strapi Cloud. Set production env vars; `SEED_SAMPLE_DATA` **unset**. Create the production admin user and the production `matfinder-curator` admin token.
- [ ] **Deploy web:** Vercel project, root directory `mobile`, env vars per *Environment variables*. `mobile/vercel.ts` (install `@vercel/config`):
  ```ts
  import { routes, type VercelConfig } from '@vercel/config/v1'
  const STRAPI = process.env.STRAPI_ORIGIN! // e.g. https://<project>.strapiapp.com
  export const config: VercelConfig = {
    framework: null,
    buildCommand: 'npx expo export -p web',
    outputDirectory: 'dist',
    rewrites: [
      routes.rewrite('/api/(.*)', `${STRAPI}/api/$1`), // same-origin API → first-party auth cookies
      routes.rewrite('/(.*)', '/index.html'),           // SPA fallback (static files are served first)
    ],
  }
  ```
  Then add the Vercel production URL to Strapi's `WEB_ORIGINS` and redeploy Strapi. Restrict the Mapbox public token to the Vercel domains.
- [ ] **Smoke test** the acceptance criteria below on the deployed URLs.
- [ ] **Real listings:** the curator adds 3–5 real Las Vegas schools via Claude + MCP against **production**, reviews, uploads logos, and publishes.
- **Done when:** all suites are green locally, and every acceptance criterion passes on Vercel + Strapi Cloud.

---

## Strapi schemas

### `server/src/api/city/content-types/city/schema.json`
```json
{
  "kind": "collectionType",
  "collectionName": "cities",
  "info": { "singularName": "city", "pluralName": "cities", "displayName": "City" },
  "options": { "draftAndPublish": false },
  "attributes": {
    "name": { "type": "string", "required": true, "unique": true, "maxLength": 80 },
    "slug": { "type": "uid", "targetField": "name", "required": true },
    "state": { "type": "string" },
    "country": { "type": "string", "default": "US" },
    "timezone": { "type": "string", "required": true },
    "center": { "type": "customField", "customField": "global::map-box", "required": true },
    "defaultZoom": { "type": "decimal", "default": 10.5 },
    "schools": { "type": "relation", "relation": "oneToMany", "target": "api::school.school", "mappedBy": "city" }
  }
}
```

### `server/src/api/affiliation/content-types/affiliation/schema.json`
```json
{
  "kind": "collectionType",
  "collectionName": "affiliations",
  "info": { "singularName": "affiliation", "pluralName": "affiliations", "displayName": "Affiliation" },
  "options": { "draftAndPublish": true },
  "attributes": {
    "name": { "type": "string", "required": true, "maxLength": 80 },
    "slug": { "type": "uid", "targetField": "name", "required": true },
    "website": { "type": "string" },
    "logo": { "type": "media", "multiple": false, "allowedTypes": ["images"] },
    "schools": { "type": "relation", "relation": "oneToMany", "target": "api::school.school", "mappedBy": "affiliation" }
  }
}
```

### `server/src/api/instructor/content-types/instructor/schema.json`
```json
{
  "kind": "collectionType",
  "collectionName": "instructors",
  "info": { "singularName": "instructor", "pluralName": "instructors", "displayName": "Instructor" },
  "options": { "draftAndPublish": true },
  "attributes": {
    "name": { "type": "string", "required": true, "maxLength": 120 },
    "slug": { "type": "uid", "targetField": "name", "required": true },
    "beltRank": { "type": "enumeration", "required": true,
      "enum": ["white", "blue", "purple", "brown", "black", "red_black", "red_white", "red"] },
    "degree": { "type": "integer", "min": 0, "max": 10 },
    "photo": { "type": "media", "multiple": false, "allowedTypes": ["images"] },
    "bio": { "type": "text", "maxLength": 1000 },
    "schools": { "type": "relation", "relation": "manyToMany", "target": "api::school.school", "mappedBy": "headInstructors" }
  }
}
```

### `server/src/api/school/content-types/school/schema.json`
```json
{
  "kind": "collectionType",
  "collectionName": "schools",
  "info": { "singularName": "school", "pluralName": "schools", "displayName": "School" },
  "options": { "draftAndPublish": true },
  "attributes": {
    "name": { "type": "string", "required": true, "maxLength": 120 },
    "slug": { "type": "uid", "targetField": "name", "required": true },
    "shortDescription": { "type": "text", "maxLength": 280 },
    "description": { "type": "blocks" },
    "city": { "type": "relation", "relation": "manyToOne", "target": "api::city.city", "inversedBy": "schools" },
    "location": { "type": "customField", "customField": "global::map-box", "required": true },
    "neighborhood": { "type": "string" },
    "postalCode": { "type": "string" },
    "logo": { "type": "media", "multiple": false, "allowedTypes": ["images"] },
    "gallery": { "type": "media", "multiple": true, "allowedTypes": ["images"] },
    "affiliation": { "type": "relation", "relation": "manyToOne", "target": "api::affiliation.affiliation", "inversedBy": "schools" },
    "headInstructors": { "type": "relation", "relation": "manyToMany", "target": "api::instructor.instructor", "inversedBy": "schools" },
    "pricing": { "type": "component", "repeatable": false, "component": "school.pricing" },
    "contact": { "type": "component", "repeatable": false, "component": "school.contact" },
    "amenities": { "type": "component", "repeatable": false, "component": "school.amenities" },
    "schedule": { "type": "component", "repeatable": true, "component": "schedule.session" },
    "lastVerifiedAt": { "type": "date" }
  }
}
```
> `city` is required at the service and tool level (relations can't be marked `required` reliably in the schema). The directory only returns schools whose city matches.

### `server/src/components/school/pricing.json`
```json
{
  "collectionName": "components_school_pricings",
  "info": { "displayName": "Pricing", "icon": "priceTag" },
  "options": {},
  "attributes": {
    "visitorsWelcome": { "type": "boolean", "default": false },
    "dropInFee": { "type": "decimal", "min": 0 },
    "dropInNotes": { "type": "string" },
    "freeTrial": { "type": "boolean", "default": false },
    "freeTrialNotes": { "type": "string" },
    "monthlyMin": { "type": "decimal", "min": 0 },
    "monthlyMax": { "type": "decimal", "min": 0 },
    "currency": { "type": "enumeration", "enum": ["USD"], "default": "USD" }
  }
}
```

### `server/src/components/school/contact.json`
```json
{
  "collectionName": "components_school_contacts",
  "info": { "displayName": "Contact", "icon": "phone" },
  "options": {},
  "attributes": {
    "phone": { "type": "string" },
    "email": { "type": "email" },
    "website": { "type": "string" },
    "instagram": { "type": "string" }
  }
}
```

### `server/src/components/school/amenities.json`
```json
{
  "collectionName": "components_school_amenities",
  "info": { "displayName": "Amenities", "icon": "check" },
  "options": {},
  "attributes": {
    "showers": { "type": "boolean", "default": false },
    "changingRooms": { "type": "boolean", "default": false },
    "parking": { "type": "boolean", "default": false },
    "giRental": { "type": "boolean", "default": false },
    "proShop": { "type": "boolean", "default": false },
    "kidsArea": { "type": "boolean", "default": false },
    "airConditioning": { "type": "boolean", "default": false }
  }
}
```

### `server/src/components/schedule/session.json`
```json
{
  "collectionName": "components_schedule_sessions",
  "info": { "displayName": "Session", "icon": "clock" },
  "options": {},
  "attributes": {
    "day": { "type": "enumeration", "required": true, "enum": ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] },
    "startTime": { "type": "time", "required": true },
    "endTime": { "type": "time", "required": true },
    "classType": { "type": "enumeration", "required": true,
      "enum": ["fundamentals", "all_levels", "advanced", "open_mat", "competition", "kids", "womens"] },
    "style": { "type": "enumeration", "required": true, "enum": ["gi", "nogi", "both"] },
    "notes": { "type": "string" }
  }
}
```
> Icon names must exist in the Strapi design system; if the admin warns, pick another. The `map-box` value is JSON: `{ longitude, latitude, address, zoom, pitch, bearing }`.

---

## Time rules (one definition, used everywhere)
- **City-local now** = `Intl.DateTimeFormat('en-US', { timeZone: city.timezone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now)` → `{ localDate: 'YYYY-MM-DD', weekday: 'mon'…'sun', minutes }`. **Never** use the device time zone. Verify Hermes (iOS and Android) returns correct `timeZone` results.
- Session times: Strapi stores `HH:mm:ss.SSS`; APIs emit `HH:mm`; compare as minutes since midnight.
- **`todaySessions`** = sessions with `day === weekday`, sorted by start.
- **Training today (R6)** = any today session with `end > nowMinutes`.
- **`nextSessionToday`** = the first today session with `end > nowMinutes`; label **"On now"** if `start ≤ now < end`; otherwise "<Class type> · <h:mm am/pm>".
- **Styles** = distinct from the schedule (`both` → gi + nogi). **Programs** = distinct `classType`.
- **Distance** = haversine miles from the device (hidden without permission).
- The app refetches the directory when the city-local date changes or the app regains focus.

## API surface
| Method & path | Role | Returns |
|---|---|---|
| `GET /api/schools/directory?city=<slug>` | Public, Authenticated | `{ data: { city: { slug, name, timezone, center: { latitude, longitude }, defaultZoom }, localDate, weekday, generatedAt, schools: [{ documentId, slug, name, logo: { url } \| null, latitude, longitude, neighborhood, postalCode, affiliation: string \| null, styles, programs, visitorsWelcome, dropInFee, currency, todaySessions: [{ start, end, classType, style }] }] } }`, `Cache-Control: public, max-age=60` |
| `GET /api/schools/slug/:slug` | **Authenticated only** | `{ data: { documentId, slug, name, shortDescription, description (blocks), city: { slug, name, timezone }, location, neighborhood, postalCode, logo, gallery, affiliation: { name, slug, website, logo } \| null, headInstructors: [{ name, slug, beltRank, degree, photo, bio }], pricing, contact, amenities, schedule: [{ day, start, end, classType, style, notes }], styles, programs, todaySessions, nextSessionToday, lastVerifiedAt } }`, or 404 |
| `GET /api/cities` | Public | core `find` |
| `/api/auth/*` | Public | Better Auth (sign-up/email, sign-in/email, sign-out, get-session) |
| `POST /mcp` | Admin token | Strapi MCP (8 custom tools only) |
| core `/api/schools`, `/api/instructors`, `/api/affiliations` | **nobody** | 403 |

## MCP tools
All tools are **draft-only**, return **names and slugs** for relations, and return structured errors (`VALIDATION_ERROR` with field paths, `NOT_FOUND`, `GEOCODE_FAILED`, `RESULT_TOO_LARGE`). Each has a hand-written description stating when to use it.

| Tool | Write? | Input | Behavior / output |
|---|---|---|---|
| `list_reference_data` | no | `{}` | `{ cities: [{slug,name}], affiliations: [{slug,name}], instructors: [{slug,name,beltRank}] }`. *"Call this first to reuse existing records."* |
| `find_schools` | no | `{ search?, city?, status?: 'any'\|'published'\|'unpublished-changes'\|'never-published', staleDays?, page = 1, limit = 20 (≤ 50) }` | `{ items: [{ documentId, slug, name, neighborhood, city, affiliation, status, updatedAt, lastVerifiedAt }], page, limit, total, hasMore }` |
| `get_school` | no | `{ slug, excerptChars = 600 }` | Draft version, schedule in `HH:mm`, description as plain text truncated to `excerptChars`, `status` |
| `upsert_school` | yes | `{ slug?, name?, citySlug?, shortDescription?, descriptionText?, address?, latitude?, longitude?, neighborhood?, postalCode?, affiliationSlug?, headInstructorSlugs?, pricing?, contact?, amenities?, lastVerifiedAt? }` (component inputs are **partial**) | **Only provided fields are written; components are merged per field.** Unknown or missing slug → create (requires `name`, `citySlug`, `address`). `address` without coordinates → **server geocodes**. `descriptionText` → blocks. `headInstructorSlugs` replaces the ordered list. → `{ documentId, slug, created, changedFields, status }` |
| `set_school_schedule` | yes | `{ slug, sessions: [{ day, start: 'HH:mm', end: 'HH:mm', classType, style, notes? }] }` (≤ 100) | **Replaces the entire weekly schedule** on the draft (description: "send the complete week"). → `{ slug, sessionCount, byDay }` |
| `upsert_instructor` | yes | `{ slug?, name?, beltRank?, degree?, bio? }` | Partial create/update (draft) |
| `upsert_affiliation` | yes | `{ slug?, name?, website? }` | Partial create/update (draft) |
| `list_pending_drafts` | no | `{ type?: 'school'\|'instructor'\|'affiliation', limit = 25 }` | Never-published docs and docs with unpublished changes: `{ type, slug, name, status, updatedAt, changedFields }` |

## Auth
- Better Auth via `@strapi-community/plugin-better-auth` (⚠️ beta; re-evaluate before production), `plugin-api-permissions` (roles: Public, Authenticated), `plugin-better-auth-dashboard`. Users & Permissions **removed**. Strapi ≥ 5.45 (satisfied by ≥ 5.49).
- Config: `server/src/lib/auth.ts` (M3). Email + password; no verification or reset in the proof of concept; 30-day sliding session; `expo()` plugin; `generateId: 'serial'`.
- **Web:** browser cookies; production requests are **same-origin** via the Vercel `/api` rewrite (avoids third-party-cookie blocking between `*.vercel.app` and `*.strapiapp.com`). **Fallback (ask the user before switching):** Better Auth `bearer()` plugin + `Authorization` header.
- **Native:** `expoClient` + SecureStore; send `Cookie: await authClient.getCookie()`.

## App route tree (`mobile/app/`)
| File | URL | Access | Data | UI |
|---|---|---|---|---|
| `_layout.tsx` | n/a | n/a | n/a | `QueryClientProvider`, `AuthProvider` (`authClient.useSession()`), NativeWind, `PortalHost`, `Stack` |
| `(tabs)/_layout.tsx` | n/a | n/a | n/a | Tabs: Explore, Account |
| `(tabs)/index.tsx` | `/?q=&today=1&visitors=1&style=gi\|nogi&school=<slug>` | public | `useDirectory(EXPO_PUBLIC_DEFAULT_CITY)` | `SchoolMap` (.tsx / .web.tsx), `SearchBar`, `FilterChips` (Training today · Visitors welcome · Gi · No-Gi), `PreviewCard` (bottom sheet on native, floating on web: name, logo, distance, next session / "On now", visitors badge, drop-in fee, style chips, **View school**), `SchoolList` toggle, `EmptyState`, `RecenterButton`, `MapUnavailable` |
| `(tabs)/account.tsx` | `/account` | public | session | name, email, Sign out, or Sign in / Create account |
| `schools/[slug].tsx` | `/schools/<slug>` | **session** | `useSchool(slug)` | No session → `Redirect` to `/sign-in?redirect=…`. Else: `SchoolHeader` (logo, name, affiliation, "Schedule verified <date>"), `Gallery`, `ProgramChips`, `ScheduleTable` (by day, today highlighted, "On now"), `PricingCard`, `InstructorList` (belt color chip + degree), `AmenityList`, mini `LocationMap`, `DirectionsButton` (Apple Maps on iOS, Google Maps elsewhere), `ContactLinks` (tel:, mailto:, website, instagram.com/<handle>), description (blocks renderer) |
| `sign-in.tsx` / `sign-up.tsx` | `/sign-in`, `/sign-up` (`?redirect=`) | public | Better Auth | React Native Reusables blocks; `router.replace(redirect ?? '/')` |
| `+not-found.tsx` | n/a | public | n/a | link to Explore |

Modules: `lib/api/client.ts` (qs fetch wrapper; base URL native `EXPO_PUBLIC_STRAPI_URL`, web `EXPO_PUBLIC_WEB_API_BASE` or relative; 401/403 → `AuthRequiredError`), `lib/api/schools.ts`, `lib/auth-client.native.ts` / `.web.ts`, `lib/time.ts`, `lib/filters.ts` (pure `applyFilters`), `lib/geo.ts` (haversine, `directionsUrl`). Hooks: `useDirectory` (staleTime 60 s, refetch on focus and on local-date change), `useSchool` (enabled with a session), `useSession`, `useUserLocation` (`expo-location`, falls back to the city center).

## Environment variables

### Strapi (`server/.env`, Strapi Cloud)
| Variable | Example | Notes |
|---|---|---|
| `HOST`, `PORT` | `0.0.0.0`, `1337` | If 1337 is taken locally, change `PORT` and the app's URLs together |
| `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY` | random | Strapi Cloud injects |
| `DATABASE_CLIENT` | `postgres` | |
| `DATABASE_URL` | `postgres://strapi:strapi@localhost:5432/matfinder` | Strapi Cloud injects |
| `BETTER_AUTH_SECRET` | `openssl rand -hex 32` | |
| `BETTER_AUTH_URL` | `http://localhost:1337` · `https://<project>.strapiapp.com` | bare origin |
| `WEB_ORIGINS` | `http://localhost:8081,https://matfinder.vercel.app` | CORS + `trustedOrigins` |
| `MAPBOX_ACCESS_TOKEN` | `pk.…` | admin map field |
| `MAPBOX_GEOCODING_TOKEN` | `pk.…`/`sk.…` | server-only geocoding (no URL restriction); falls back to the above |
| `MCP_ENABLED` | `true` | |
| `SEED_SAMPLE_DATA` | `true` | **development only** |

### Expo (`mobile/.env`, Vercel, EAS)
| Variable | Example | Notes |
|---|---|---|
| `EXPO_PUBLIC_STRAPI_URL` | `http://localhost:1337` (iOS sim) · `http://10.0.2.2:1337` (Android emu) · `http://<LAN-IP>:1337` (device) · `https://<project>.strapiapp.com` | native API + auth |
| `EXPO_PUBLIC_WEB_API_BASE` | `http://localhost:1337` (dev) · *(empty)* (prod, relative via rewrite) | web API + auth |
| `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` | `pk.…` | URL-restricted to the Vercel domains |
| `EXPO_PUBLIC_DEFAULT_CITY` | `las-vegas` | |
| `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` | `sk.…` (`DOWNLOADS:READ`) | **build-time secret**, never `EXPO_PUBLIC_` |
| `STRAPI_ORIGIN` (Vercel only) | `https://<project>.strapiapp.com` | used by `vercel.ts` |

> `EXPO_PUBLIC_*` values are compiled into the bundle. **No secrets** (admin token, `sk.` tokens, `BETTER_AUTH_SECRET`) may use that prefix.

## Deployment
- **Backend → Strapi Cloud:** https://cloud.strapi.io → import the GitHub repo → **root directory `server`** → US region → Node 24 (or newest offered) → set the env vars → deploy on push to `main`. Docs: https://docs.strapi.io/cloud/getting-started/intro. After the first deploy: create the admin user, the `matfinder-curator` admin token, and confirm the API Permissions grants were seeded.
- **Web → Vercel:** import the repo → **root directory `mobile`** → `vercel.ts` above (build `npx expo export -p web`, output `dist`, `/api/*` rewrite to Strapi Cloud, SPA fallback) → env vars → deploy. Add the production and preview domains to Strapi `WEB_ORIGINS`.
- **Why the rewrite matters:** Better Auth's session cookie must be **first-party**. Cross-site cookies between `*.vercel.app` and `*.strapiapp.com` are blocked by Safari and by third-party-cookie restrictions elsewhere. This is the #1 "works locally, breaks in production" auth failure.
- **Native:** dev builds (`npx expo run:ios|android`); optional EAS Build internal distribution for testers. **No App Store / Play Store submission** in the proof of concept (physical iPhones need an Apple Developer account for TestFlight or ad-hoc builds).

## Proof-of-concept acceptance criteria
Run against **Vercel + Strapi Cloud** (and dev builds for native):
- [ ] **AC1:** Signed out, the web app opens on a map centered on the device location (or the Las Vegas center if denied), with pins for every published school.
- [ ] **AC2:** Search "Henderson" narrows pins and list; *Training today*, *Visitors welcome*, and *Gi / No-Gi* each filter correctly and combine with AND; empty results show a helpful empty state.
- [ ] **AC3:** "Training today" and the card's next session are correct in **Las Vegas time** even with the device set to another time zone.
- [ ] **AC4:** Tapping a pin shows the preview card with next session today (or "On now"), visitors badge, drop-in fee, styles, and distance.
- [ ] **AC5:** "View school" while signed out → sign up → returns to **that** school's page with the full schedule (today highlighted), pricing, instructors with belts, affiliation, amenities, contact, and a working **Directions** hand-off.
- [ ] **AC6:** Without a session, `GET /api/schools/slug/<slug>` returns 401/403 and `GET /api/schools` returns 403; the directory payload contains **no** gated fields.
- [ ] **AC7:** The session survives web reloads and native app restarts; sign out re-gates school pages.
- [ ] **AC8:** In Claude (Code or Desktop) connected to production MCP with the curator token, `tools/list` shows **only** the 8 MatFinder tools; "add <real Vegas school>…" creates a **draft** with a geocoded pin and a structured schedule; it is **not** visible in the app; `list_pending_drafts` lists it with its changed fields.
- [ ] **AC9:** After the curator uploads a logo and **publishes** in the Strapi admin, the school appears in the app within ~60 s.
- [ ] **AC10:** The same core flows work in iOS Simulator and Android Emulator dev builds (native Mapbox map).
- [ ] **AC11:** Unit, server integration, and Playwright suites are green.

## Open questions / parked items
- ⚠️ **Better Auth is beta / api-permissions is alpha.** Acceptable for the proof of concept; re-evaluate before any public launch (fallback: Strapi Users & Permissions).
- ⚠️ **Verify during build:** the `map-box` plugin key when installed from npm (M0); `createHandler` signature on the installed Strapi (M5); Hermes `Intl` `timeZone` support (M6); a relative web `baseURL` for the Better Auth client (M7); Strapi Cloud plan, region, and Node 24 availability (M1).
- **Before App Store submission:** in-app account deletion (Apple guideline 5.1.1(v)), privacy policy, Sign in with Apple if any social login is added.
- **v2 candidates:** school owners claiming listings; program-type filter (beginner / kids / women's / competition); saved favorites; password reset and email verification (needs an email provider, e.g., Resend); social sign-in; one-off schedule exceptions (holidays, seminars); more cities; Sentry monitoring; per-session "visitors welcome" overrides.
