> Build tracker for **MatFinder**, generated from [06-build-spec.md @ 0a488c1](https://github.com/PaulBratslavsky/matfinder/blob/0a488c125ef61fa485f1c71c2d75565debe19de3/docs/plan/06-build-spec.md). Plan: [docs/plan/](https://github.com/PaulBratslavsky/matfinder/tree/0a488c125ef61fa485f1c71c2d75565debe19de3/docs/plan).

## What we're building
**MatFinder is a map-first directory of Brazilian Jiu-Jitsu schools that helps anyone, whether a local or a traveler, find the right place to train and know what to expect before they walk in.**

Anyone can open the map, search, and filter Las Vegas schools by *training today*, *visitors welcome*, and *Gi / No-Gi*. A preview card answers "can I train here tonight, and what does it cost?", and the full school page (schedule, pricing, instructors, amenities, contact) requires a free account. Listings are curated: the MatFinder curator adds and updates schools by talking to Claude through Strapi's MCP server, which writes **drafts only**; a human publishes in the Strapi admin.

## Build target & stack
**Build target:** Strapi v5 (Strapi Cloud) + Expo / React Native / React Native Web (Vercel for web). **This is a build in the `matfinder` repo, which was seeded with `metravel-explore`'s `server/` and `mobile/`** (copied at commit `ae220cc`, without its git history), not a new scaffold.

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

## Repo layout
Target layout, from the spec:
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

## Build steps
Work top to bottom. Each step is a sub-issue with its own self-contained spec.
- [ ] {{#m0}} M0 · Housekeeping
- [ ] {{#m1}} M1 · Strapi upgrade + Strapi Cloud linked
- [ ] {{#m2}} M2 · Content model, Document Service middlewares, unique indexes
- [ ] {{#m3}} M3 · Auth (Better Auth)
- [ ] {{#m4}} M4 · School API (the server-enforced gate)
- [ ] {{#m5}} M5 · MCP server + custom tools
- [ ] {{#m6}} M6 · Expo app (SDK 57, NativeWind, React Native Reusables, maps, data)
- [ ] {{#m7}} M7 · Auth UI + gated school page
- [ ] {{#m8}} M8 · Sample seed + media
- [ ] {{#m9}} M9 · Tests, deploy, and real listings

## Dependency order
`M0 → M1 → M2 → M3 → M4`, then two tracks that can run in parallel:
- **Backend:** `M4 → M5 → M8`
- **App:** `M4 → M6 → M7`

Both tracks join at **M9** (blocked by M7 and M8). The spec lists the milestones as one sequence, M0 → … → M9, which is still a valid path through this graph. The two tracks come from loosening two links: M6 only needs the directory API from M4, not the MCP work in M5, and M8 needs the draft-upsert services from M4/M5, not the app. *(added: not in spec)*

## POC acceptance criteria
Run against **Vercel + Strapi Cloud** (and dev builds for native). Each item names the step where it first becomes checkable; all of them are re-run on production in {{#m9}}.
- [ ] **AC1:** Signed out, the web app opens on a map centered on the device location (or the Las Vegas center if denied), with pins for every published school. *(M6)*
- [ ] **AC2:** Search "Henderson" narrows pins and list; *Training today*, *Visitors welcome*, and *Gi / No-Gi* each filter correctly and combine with AND; empty results show a helpful empty state. *(M6)*
- [ ] **AC3:** "Training today" and the card's next session are correct in **Las Vegas time** even with the device set to another time zone. *(M4 server, M6 app)*
- [ ] **AC4:** Tapping a pin shows the preview card with next session today (or "On now"), visitors badge, drop-in fee, styles, and distance. *(M6)*
- [ ] **AC5:** "View school" while signed out → sign up → returns to **that** school's page with the full schedule (today highlighted), pricing, instructors with belts, affiliation, amenities, contact, and a working **Directions** hand-off. *(M7)*
- [ ] **AC6:** Without a session, `GET /api/schools/slug/<slug>` returns 401/403 and `GET /api/schools` returns 403; the directory payload contains **no** gated fields. *(M4)*
- [ ] **AC7:** The session survives web reloads and native app restarts; sign out re-gates school pages. *(M7)*
- [ ] **AC8:** In Claude (Code or Desktop) connected to production MCP with the curator token, `tools/list` shows **only** the 8 MatFinder tools; "add <real Vegas school>…" creates a **draft** with a geocoded pin and a structured schedule; it is **not** visible in the app; `list_pending_drafts` lists it with its changed fields. *(M5 locally, M9 on production)*
- [ ] **AC9:** After the curator uploads a logo and **publishes** in the Strapi admin, the school appears in the app within ~60 s. *(M9)*
- [ ] **AC10:** The same core flows work in iOS Simulator and Android Emulator dev builds (native Mapbox map). *(M6 map, M7 auth)*
- [ ] **AC11:** Unit, server integration, and Playwright suites are green. *(M9)*

## Open questions / parked
- ⚠️ **Better Auth is beta / api-permissions is alpha.** Acceptable for the proof of concept; re-evaluate before any public launch (fallback: Strapi Users & Permissions).
- ⚠️ **Verify during build:** the `map-box` plugin key when installed from npm (M0); `createHandler` signature on the installed Strapi (M5); Hermes `Intl` `timeZone` support (M6); a relative web `baseURL` for the Better Auth client (M7); Strapi Cloud plan, region, and Node 24 availability (M1).
- **Before App Store submission:** in-app account deletion (Apple guideline 5.1.1(v)), privacy policy, Sign in with Apple if any social login is added.
- **v2 candidates:** school owners claiming listings; program-type filter (beginner / kids / women's / competition); saved favorites; password reset and email verification (needs an email provider, e.g., Resend); social sign-in; one-off schedule exceptions (holidays, seminars); more cities; Sentry monitoring; per-session "visitors welcome" overrides.

## How to work these issues
- **What's ready:** an issue is ready when every issue in its "Blocked by" line is closed. The sub-issue list above shows progress. After M4 the order branches into two tracks that can run in parallel: backend (M5 → M8) and app (M6 → M7). Both must be done before M9.
- **Workflow (the spec's rule):** one branch and one pull request per milestone issue, merged into `main` once the milestone's **Done when** check passes; the PR body says `Closes #<issue>`. Merging to `main` deploys Strapi Cloud (and Vercel, once connected). Branch `m<n>-<slug>` per issue. The backend and app tracks run on separate branches, so they don't collide.
- **Deviation protocol:** commands, structures, versions, and conventions in this spec are **user decisions**. If you (the build agent) want to substitute any of them (build friction, a newer API, a "simpler" alternative), **STOP and ask the user.** Do not silently trade off. This applies especially to: the auth stack, the two-endpoint gate, draft-only MCP tools, and the Vercel same-origin rewrite.
- **Agent prompt:** *"Implement GitHub issue #<n>. Read the whole issue first and follow its implementation spec, workflow, and deviation protocol. Work on branch `m<n>-<slug>` and open a PR into `main` that says `Closes #<n>` once every Done-when item passes."*
