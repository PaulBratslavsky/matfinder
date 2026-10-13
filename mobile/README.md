# MatFinder app

The Expo app (iOS, Android and web) for MatFinder. How it fits with the Strapi backend, maps, auth and theming:
[`docs/architecture.md`](../docs/architecture.md).

## Run it

```bash
npm ci
cp .env.example .env   # then set EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN (a public pk. token)
npm run web            # web on http://localhost:8083, against Strapi on :1339
npm run ios            # iPhone Simulator (needs a Mac with Xcode); see docs/architecture.md
npm run android        # Android emulator
```

Start Strapi first (`cd ../server && npm run develop`).

## Checks

```bash
npm run typecheck
npm run lint
npm run test:unit      # lib/ and theme/
npm run test:e2e       # Playwright against a throwaway Strapi on :1342 (stop `npm run develop` first)
```

## Changing the look

Edit `theme/tokens.ts`; everything reads from it. `npm run test:unit` checks text contrast and that `global.css` and
`tailwind.config.js` still match the tokens.
