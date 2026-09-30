> **Part of {{#epic}}** · **M7** (step 8 of 10) · Blocked by: {{#m6}} · Spec: [06-build-spec.md @ 68803f6](https://github.com/PaulBratslavsky/matfinder/blob/68803f6bf44a5d0415cdefc498706b9e2ade58b9/docs/plan/06-build-spec.md#m7-auth-ui--gated-school-page)

## Goal
People can sign up and sign in from the app (web and native). The full school page is reachable only with a session: a signed-out "View school" leads through sign-up and back to **that** school. The session survives reloads and restarts, and signing out re-gates school pages.

## Why
- The full school page (schedule, pricing, instructors, amenities, contact) requires a free account. The server enforces that in {{#m4}}; this step is the client side.
- The auth stack is a user decision (named in the deviation protocol). **Web** uses browser cookies (same-origin in production via the Vercel `/api` rewrite, {{#m9}}). **Native** uses `expoClient` + SecureStore and sends `Cookie: await authClient.getCookie()`.

## Implementation spec
**Forward reference from {{#m6}}:** the spec's M6 route tree includes the auth pieces, but they're built here. {{#m6}} built the map, filters, and preview card (whose **View school** already links to `/schools/<slug>`), and left the auth pieces for this step: `AuthProvider` in `_layout.tsx`, the Account screen (possibly a placeholder), `schools/[slug].tsx`, sign-in / sign-up, `lib/auth-client.*`, the auth part of `lib/api/client.ts`, and the `useSession` / `useSchool` hooks. *(added: not in spec: the split)*

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
  `lib/auth-client.web.ts`: ``createAuthClient({ baseURL: `${process.env.EXPO_PUBLIC_WEB_API_BASE ?? ''}/api/auth` })``. Under Metro, a relative `baseURL` may need `window.location.origin` prepended; verify.
- [ ] `lib/api/client.ts` adds auth per platform: **native** `headers.Cookie = await authClient.getCookie()`, `credentials: 'omit'`; **web** `credentials: 'include'`. Map 401/403 → `AuthRequiredError`.
- [ ] `app/sign-in.tsx` and `app/sign-up.tsx` from the React Native Reusables sign-in / sign-up blocks, wired to `authClient.signIn.email` / `authClient.signUp.email`. On success: `router.replace(redirect ?? '/')`. Show server errors inline.
- [ ] `app/schools/[slug].tsx`: if `!session` → ``<Redirect href={{ pathname: '/sign-in', params: { redirect: `/schools/${slug}` } }} />``. Otherwise fetch `useSchool(slug)` and render the full page (see the route table).
- [ ] `app/(tabs)/account.tsx`: session details + **Sign out** (`authClient.signOut()` then `queryClient.removeQueries({ queryKey: ['school'] })`).
- [ ] From the route tree and module list: `AuthProvider` (`authClient.useSession()`) in `app/_layout.tsx`, and the `useSession` / `useSchool` hooks (`useSchool` enabled with a session). *(added: not in spec: the spec lists these in the route tree, not in M7's task list; see the forward reference above)*

## Reference (copied from the spec)

### Routes this step builds (rows from *App route tree*)
| File | URL | Access | Data | UI |
|---|---|---|---|---|
| `_layout.tsx` | n/a | n/a | n/a | `QueryClientProvider`, `AuthProvider` (`authClient.useSession()`), NativeWind, `PortalHost`, `Stack` |
| `(tabs)/account.tsx` | `/account` | public | session | name, email, Sign out, or Sign in / Create account |
| `schools/[slug].tsx` | `/schools/<slug>` | **session** | `useSchool(slug)` | No session → `Redirect` to `/sign-in?redirect=…`. Else: `SchoolHeader` (logo, name, affiliation, "Schedule verified <date>"), `Gallery`, `ProgramChips`, `ScheduleTable` (by day, today highlighted, "On now"), `PricingCard`, `InstructorList` (belt color chip + degree), `AmenityList`, mini `LocationMap`, `DirectionsButton` (Apple Maps on iOS, Google Maps elsewhere), `ContactLinks` (tel:, mailto:, website, instagram.com/<handle>), description (blocks renderer) |
| `sign-in.tsx` / `sign-up.tsx` | `/sign-in`, `/sign-up` (`?redirect=`) | public | Better Auth | React Native Reusables blocks; `router.replace(redirect ?? '/')` |

Modules and hooks involved (from the spec's module list): `lib/api/client.ts` (qs fetch wrapper; base URL native `EXPO_PUBLIC_STRAPI_URL`, web `EXPO_PUBLIC_WEB_API_BASE` or relative; 401/403 → `AuthRequiredError`), `lib/auth-client.native.ts` / `.web.ts`, `lib/geo.ts` (haversine, `directionsUrl`), `useSchool` (enabled with a session), `useSession`.

### School page API (built in {{#m4}})
| Method & path | Role | Returns |
|---|---|---|
| `GET /api/schools/slug/:slug` | **Authenticated only** | `{ data: { documentId, slug, name, shortDescription, description (blocks), city: { slug, name, timezone }, location, neighborhood, postalCode, logo, gallery, affiliation: { name, slug, website, logo } \| null, headInstructors: [{ name, slug, beltRank, degree, photo, bio }], pricing, contact, amenities, schedule: [{ day, start, end, classType, style, notes }], styles, programs, todaySessions, nextSessionToday, lastVerifiedAt } }`, or 404 |
| `/api/auth/*` | Public | Better Auth (sign-up/email, sign-in/email, sign-out, get-session) |

Per the *Time rules*, "today highlighted" and "On now" use the city's `timezone` (in the payload as `city.timezone`), **never** the device time zone.

### Auth design (spec § Auth)
- Email + password; no verification or reset in the proof of concept; 30-day sliding session (server config from {{#m3}}).
- **Web:** browser cookies; production requests are **same-origin** via the Vercel `/api` rewrite (avoids third-party-cookie blocking between `*.vercel.app` and `*.strapiapp.com`). **Fallback (ask the user before switching):** Better Auth `bearer()` plugin + `Authorization` header.
- **Native:** `expoClient` + SecureStore; send `Cookie: await authClient.getCookie()`.
- On the server ({{#m3}}), `trustedOrigins` = `WEB_ORIGINS` + `matfinder://` (+ `exp://` outside production), and CORS allows `WEB_ORIGINS` with `credentials: true`. The web dev origin (`http://localhost:8083` by default) must be in `WEB_ORIGINS` for web sign-in to work locally. *(added: not in spec: the last sentence)*

### Env vars this step reads (`mobile/.env`)
| Variable | Example | Notes |
|---|---|---|
| `EXPO_PUBLIC_STRAPI_URL` | `http://localhost:1339` (iOS sim) · `http://10.0.2.2:1339` (Android emu) · `http://<LAN-IP>:1339` (device) · `https://<project>.strapiapp.com` | native API + auth |
| `EXPO_PUBLIC_WEB_API_BASE` | `http://localhost:1339` (dev) · *(empty)* (prod, relative via rewrite) | web API + auth |

## Watch out for
- **Native sends the cookie explicitly:** `headers.Cookie = await authClient.getCookie()` with `credentials: 'omit'`. **Web** uses `credentials: 'include'`.
- **Relative web `baseURL`:** under Metro, a relative `baseURL` may need `window.location.origin` prepended. Verify it.
- **Sign-out order:** `authClient.signOut()`, then `queryClient.removeQueries({ queryKey: ['school'] })`. Otherwise gated school data stays in the query cache after sign-out. *(added: not in spec: the reason)*
- **Redirect round trip:** signed out → `/sign-in?redirect=/schools/<slug>`; on success, `router.replace(redirect ?? '/')`. Both sign-in and sign-up take `?redirect=`.
- **Map 401/403 to `AuthRequiredError`.** A session that expires mid-use then lands on sign-in instead of a generic error. *(added: not in spec: the reason)*
- **Show server errors inline** on sign-in / sign-up.
- **Check the SDK 57 docs for `Redirect` and `Stack.Protected`** before writing the gate; Expo Router renames things across SDKs.
- **Don't switch to the `bearer()` fallback** without asking the user.
- **No secrets in `EXPO_PUBLIC_*`**; they're compiled into the bundle.

## Verify during this step
- A relative web `baseURL` for the Better Auth client (under Metro, it may need `window.location.origin` prepended). Production also uses a relative base via the {{#m9}} rewrite, so check the exported web build as well as Metro. *(added: not in spec: checking the exported build)*

If a check fails, the deviation protocol applies: stop and ask.

## Done when
- [ ] Signed out → "View school" → sign up → lands on that school page
- [ ] Reload (web) keeps the session
- [ ] App restart (native) keeps the session
- [ ] Sign out → the school page redirects to sign-in

## Acceptance criteria this step unlocks
- **AC5:** "View school" while signed out → sign up → returns to **that** school's page with the full schedule (today highlighted), pricing, instructors with belts, affiliation, amenities, contact, and a working **Directions** hand-off.
- **AC7:** The session survives web reloads and native app restarts; sign out re-gates school pages.
- **AC10 (auth part):** The same core flows work in iOS Simulator and Android Emulator dev builds.

## Out of scope
- The Vercel same-origin rewrite and production `WEB_ORIGINS` → {{#m9}}
- The Playwright end-to-end test of this flow → {{#m9}}
- Password reset, email verification, social sign-in, in-app account deletion (v2 / before App Store submission)

## For the implementing agent
- **Deviation protocol:** commands, structures, versions, and conventions in this spec are **user decisions**. If you (the build agent) want to substitute any of them (build friction, a newer API, a "simpler" alternative), **STOP and ask the user.** Do not silently trade off. This applies especially to: the auth stack, the two-endpoint gate, draft-only MCP tools, and the Vercel same-origin rewrite.
- **Docs:** Better Auth Expo https://www.better-auth.com/docs/integrations/expo · Better Auth plugin https://strapi-community.github.io/plugin-better-auth/ · official tutorial https://strapi.io/blog/strapi-better-auth-tutorial-setup-guide-for-strapi-v5-and-next-js-16 · Expo https://docs.expo.dev (Expo Router) · React Native Reusables https://reactnativereusables.com
- **Workflow (the spec's rule):** one branch and one pull request per milestone issue, merged into `main` once the milestone's **Done when** check passes; the PR body says `Closes #<issue>`. Merging to `main` deploys Strapi Cloud (and Vercel, once connected). Branch: `m7-auth-ui`; PR body: `Closes {{#self}}`.
