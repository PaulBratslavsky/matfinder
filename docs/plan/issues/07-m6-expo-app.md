> **Part of {{#epic}}** · **M6** (step 7 of 10) · Blocked by: {{#m4}} · Spec: [06-build-spec.md @ 945a14a](https://github.com/PaulBratslavsky/matfinder/blob/945a14abb38166ed4b4a21dc000126d26701537b/docs/plan/06-build-spec.md#m6-expo-app-sdk-57-nativewind-react-native-reusables-maps-data)

## Goal
One Expo codebase (iOS, Android, web) opens on a Mapbox map of Las Vegas schools from the public directory. It has search, the *Training today* / *Visitors welcome* / *Gi* / *No-Gi* filters, and a preview card that shows the next session in **Las Vegas time**, all while signed out.

## Why
- Anyone can open the map, search, and filter; the preview card answers "can I train here tonight, and what does it cost?" without an account.
- Stack decisions: **Expo SDK 57 + Expo Router + React Native Web** (one codebase for iOS, Android, and web), **NativeWind v4** (Tailwind 3) + **React Native Reusables** (components in `mobile/components/ui/`), **Mapbox everywhere** (`@rnmapbox/maps` native, `react-map-gl` + `mapbox-gl` web), **TanStack Query**, and filters in URL search params.
- This step is blocked only by {{#m4}}: it consumes the public directory and doesn't touch the MCP work in {{#m5}}, so the two can run in parallel. *(added: not in spec: the spec runs M5 before M6)*

## Implementation spec
- [ ] Upgrade Expo **one SDK at a time** (per Expo's guide): `npx expo install expo@^55.0.0 --fix` → `npx expo-doctor` → repeat for `^56` and `^57`. Commit after each.
- [ ] `app.json`: `"name": "MatFinder"`, `"slug": "matfinder"`, `"scheme": "matfinder"`, `ios.bundleIdentifier` / `android.package` = `com.matfinder.app`, `web.output: "single"`. Keep the `@rnmapbox/maps` and `expo-location` plugins.
- [ ] Remove the template screens (see *Repo layout*): `mobile/app/modal.tsx`, `mobile/app/(tabs)/explore.tsx`, `mobile/app/(tabs)/map.tsx`, `mobile/scripts/reset-project.js`.
- [ ] NativeWind v4: `npx expo install nativewind react-native-reanimated react-native-safe-area-context` + `npm install -D tailwindcss@^3.4`, then the NativeWind Expo setup (`tailwind.config.js` with the `nativewind/preset`, `global.css`, `babel.config.js` `jsxImportSource: 'nativewind'` + `nativewind/babel`, `metro.config.js` `withNativeWind`, `nativewind-env.d.ts`). Follow the current NativeWind v4 Expo guide exactly. **Do not** use NativeWind v5 (release candidate).
- [ ] React Native Reusables: `npx @react-native-reusables/cli@latest doctor` (fixes and verifies config in an existing project), then `npx @react-native-reusables/cli@latest add button card input label text badge toggle-group separator skeleton alert avatar`. Components land in `components/ui/`. Add `<PortalHost />` to the root layout.
- [ ] Other deps: `npx expo install @tanstack/react-query expo-secure-store expo-network expo-location expo-linking expo-image @rnmapbox/maps` and `npm install better-auth @better-auth/expo react-map-gl mapbox-gl qs`.
- [ ] Implement `lib/api/client.ts`, `lib/api/schools.ts`, `lib/time.ts`, `lib/filters.ts`, `lib/geo.ts`, the hooks, and the routes/components exactly per *App route tree* below. See the forward-reference note under the table for which rows belong to {{#m7}}.
- [ ] Maps: `components/map/SchoolMap.tsx` (native, `@rnmapbox/maps`: `Mapbox.setAccessToken(EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN)`, `MapView` + `Camera` + `ShapeSource cluster` + `CircleLayer` / `SymbolLayer`, `onPress` → `onSelect(slug)`) and `SchoolMap.web.tsx` (`import Map, { Source, Layer } from 'react-map-gl/mapbox'`, `import 'mapbox-gl/dist/mapbox-gl.css'`). Both implement `SchoolMap.types.ts`. Without a token → `MapUnavailable` + list view.
- [ ] Native runs need a **development build** (`@rnmapbox/maps` is not in Expo Go): `npx expo run:ios` / `npx expo run:android` with `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` set.

## Reference (copied from the spec)

### App route tree (`mobile/app/`)
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

**Forward reference, split with {{#m7}}:** the spec's M6 says to build the routes "per the route tree", but that tree also contains the auth pieces the spec's M7 builds. So the work is split, and {{#m7}} states the same split:
- **This step:** `_layout.tsx` (without `AuthProvider`), `(tabs)/_layout.tsx`, `(tabs)/index.tsx`, `+not-found.tsx`; `lib/api/client.ts` (without the auth headers), `lib/api/schools.ts`, `lib/time.ts`, `lib/filters.ts`, `lib/geo.ts`; the hooks `useDirectory` and `useUserLocation`.
- **{{#m7}}:** `(tabs)/account.tsx` (a placeholder screen is fine here so the tab exists), `schools/[slug].tsx`, `sign-in.tsx` / `sign-up.tsx`, `AuthProvider` in `_layout.tsx`, `lib/auth-client.*`, the auth part of `lib/api/client.ts`, and the hooks `useSchool` and `useSession`.
- The preview card's **View school** can link to `/schools/<slug>` already; that screen arrives in {{#m7}}.

*(added: not in spec: the split)*

### Target layout (the spec's *Repo layout*, `mobile/` lines)
```
└── mobile/                       # Expo app (Vercel root for web)
    ├── app/                      # Expo Router routes
    ├── components/{ui,map,explore,school}/
    ├── lib/{api,auth-client.native.ts,auth-client.web.ts,time.ts,filters.ts,geo.ts}
    ├── hooks/
    ├── e2e/                      # Playwright
    └── vercel.ts
```
`e2e/` and `vercel.ts` belong to {{#m9}}.

### Directory API (built in {{#m4}})
| Method & path | Role | Returns |
|---|---|---|
| `GET /api/schools/directory?city=<slug>` | Public, Authenticated | `{ data: { city: { slug, name, timezone, center: { latitude, longitude }, defaultZoom }, localDate, weekday, generatedAt, schools: [{ documentId, slug, name, logo: { url } \| null, latitude, longitude, neighborhood, postalCode, affiliation: string \| null, styles, programs, visitorsWelcome, dropInFee, currency, todaySessions: [{ start, end, classType, style }] }] } }`, `Cache-Control: public, max-age=60` |

### Time rules (one definition, used everywhere)
- **City-local now** = `Intl.DateTimeFormat('en-US', { timeZone: city.timezone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now)` → `{ localDate: 'YYYY-MM-DD', weekday: 'mon'…'sun', minutes }`. **Never** use the device time zone. Verify Hermes (iOS and Android) returns correct `timeZone` results.
- Session times: Strapi stores `HH:mm:ss.SSS`; APIs emit `HH:mm`; compare as minutes since midnight.
- **`todaySessions`** = sessions with `day === weekday`, sorted by start.
- **Training today (R6)** = any today session with `end > nowMinutes`.
- **`nextSessionToday`** = the first today session with `end > nowMinutes`; label **"On now"** if `start ≤ now < end`; otherwise "<Class type> · <h:mm am/pm>".
- **Styles** = distinct from the schedule (`both` → gi + nogi). **Programs** = distinct `classType`.
- **Distance** = haversine miles from the device (hidden without permission).
- The app refetches the directory when the city-local date changes or the app regains focus.

### Env vars (`mobile/.env`, Vercel, EAS)
| Variable | Example | Notes |
|---|---|---|
| `EXPO_PUBLIC_STRAPI_URL` | `http://localhost:1337` (iOS sim) · `http://10.0.2.2:1337` (Android emu) · `http://<LAN-IP>:1337` (device) · `https://<project>.strapiapp.com` | native API + auth |
| `EXPO_PUBLIC_WEB_API_BASE` | `http://localhost:1337` (dev) · *(empty)* (prod, relative via rewrite) | web API + auth |
| `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` | `pk.…` | URL-restricted to the Vercel domains |
| `EXPO_PUBLIC_DEFAULT_CITY` | `las-vegas` | |
| `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` | `sk.…` (`DOWNLOADS:READ`) | **build-time secret**, never `EXPO_PUBLIC_` |

> `EXPO_PUBLIC_*` values are compiled into the bundle. **No secrets** (admin token, `sk.` tokens, `BETTER_AUTH_SECRET`) may use that prefix.

## Watch out for
- **Upgrade one SDK at a time** (55 → 56 → 57) with `npx expo-doctor` after each, and commit after each.
- **Expo and Expo Router rename things across SDKs.** Check the SDK 57 docs for file conventions (`+not-found`, `Redirect`, `Stack.Protected`, `web.output`) before writing them.
- **NativeWind v4 only.** Follow the current v4 Expo guide exactly; **do not** use NativeWind v5 (release candidate). Tailwind stays on 3 (`tailwindcss@^3.4`).
- **Keep the `@rnmapbox/maps` and `expo-location` plugins** in `app.json`.
- **`@rnmapbox/maps` is not in Expo Go.** Native runs need a development build (`npx expo run:ios|android`) with `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` set.
- **`RNMAPBOX_MAPS_DOWNLOAD_TOKEN` is a build-time secret**; never give it the `EXPO_PUBLIC_` prefix.
- **Never use the device time zone**; use the city's `timezone`.
- **Without a Mapbox token → `MapUnavailable` + list view.**
- **Android emulator uses `http://10.0.2.2:1337`**, not `localhost`. If 1337 is taken locally, change `PORT` and the app's URLs together.
- **Filters live in URL search params** (`q`, `today`, `visitors`, `style`, `school`, per the route table). Per AC2 they combine with AND; per the {{#m9}} unit tests, search is accent- and case-insensitive.

## Verify during this step
- **Hermes `Intl` `timeZone` support:** Hermes on iOS and Android returns correct `timeZone` results for the city-local-now formula.
- **SDK 57 file conventions** for `+not-found`, `Redirect`, `Stack.Protected`, and `web.output`.

If a check fails, the deviation protocol applies: stop and ask.

## Done when
**Forward reference, interim data:** the checks need published Las Vegas schools ("sample pins"), but the sample seed arrives in {{#m8}}, which may land after this step. Until then, create and publish a few schools by hand in the admin, or with the MCP tools if {{#m5}} is done. *(added: not in spec)*
- [ ] `npx expo start --web` shows the map with sample pins
- [ ] Search and all filters work
- [ ] The preview card shows the next session in Vegas time
- [ ] The same works in the iOS Simulator dev build
- [ ] The same works in the Android Emulator dev build

## Acceptance criteria this step unlocks
- **AC1:** Signed out, the web app opens on a map centered on the device location (or the Las Vegas center if denied), with pins for every published school.
- **AC2:** Search "Henderson" narrows pins and list; *Training today*, *Visitors welcome*, and *Gi / No-Gi* each filter correctly and combine with AND; empty results show a helpful empty state.
- **AC3:** "Training today" and the card's next session are correct in **Las Vegas time** even with the device set to another time zone.
- **AC4:** Tapping a pin shows the preview card with next session today (or "On now"), visitors badge, drop-in fee, styles, and distance.
- **AC10 (map part):** The same core flows work in iOS Simulator and Android Emulator dev builds (native Mapbox map). The auth flows are added in {{#m7}}.

## Out of scope
- Auth client, sign-in / sign-up, the gated school page, and the Account screen → {{#m7}} (see the split above)
- Vercel config (`vercel.ts`) and deploy → {{#m9}}
- Unit and Playwright tests → {{#m9}}
- App Store / Play Store submission (not in the proof of concept)

## For the implementing agent
- **Deviation protocol:** commands, structures, versions, and conventions in this spec are **user decisions**. If you (the build agent) want to substitute any of them (build friction, a newer API, a "simpler" alternative), **STOP and ask the user.** Do not silently trade off. This applies especially to: the auth stack, the two-endpoint gate, draft-only MCP tools, and the Vercel same-origin rewrite.
- **Docs:** Expo https://docs.expo.dev (SDK upgrade guide, Expo Router, env vars `EXPO_PUBLIC_`, web export) · NativeWind v4 https://www.nativewind.dev · React Native Reusables https://reactnativereusables.com · `@rnmapbox/maps` https://rnmapbox.github.io · `react-map-gl` https://visgl.github.io/react-map-gl
- **Workflow (the spec's rule):** one branch and one pull request per milestone issue, merged into `main` once the milestone's **Done when** check passes; the PR body says `Closes #<issue>`. Merging to `main` deploys Strapi Cloud (and Vercel, once connected). Branch: `m6-expo-app`; PR body: `Closes {{#self}}`. Commit after each SDK upgrade, as the first task says.
