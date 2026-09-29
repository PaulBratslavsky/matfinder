# MatFinder

A map-first directory of Brazilian Jiu-Jitsu schools, starting in Las Vegas. Browse the map and filter by *training today*, *visitors welcome*, and *Gi / No-Gi*; sign in for full school pages. Listings are curated through Claude + Strapi's MCP server (drafts only, a human publishes).

**Status:** proof of concept, in planning → build. Start with the plan:

- [docs/plan/](docs/plan/): product, users, requirements, tech decisions, and the self-contained [build spec](docs/plan/06-build-spec.md)
- Build progress is tracked as GitHub issues (an epic plus one issue per milestone)

| Folder | What |
|---|---|
| `server/` | Strapi 5 backend (Strapi Cloud) |
| `mobile/` | Expo app: iOS, Android, and web (React Native Web, deployed to Vercel) |

The `server/` and `mobile/` code was seeded from [metravel-explore](https://github.com/PaulBratslavsky/metravel-explore) at commit `ae220cc`.
