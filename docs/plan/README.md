# MatFinder: product plan

A map-first directory of Brazilian Jiu-Jitsu schools, starting in Las Vegas, seeded from [`metravel-explore`](https://github.com/PaulBratslavsky/metravel-explore)'s Strapi + Expo codebase.

Planned in six stages. Each file builds on the one before it: value first, tech last.

| # | File | What it settles |
|---|---|---|
| 1 | [01-product.md](01-product.md) | What MatFinder is, the problem, the value, the launch market (Las Vegas) |
| 2 | [02-users.md](02-users.md) | Personas (visiting grappler, local beginner, curator), journey, core loop ("where can I train today?") |
| 3 | [03-requirements.md](03-requirements.md) | Functional requirements R1–R14, content, auth gate, MCP access, non-functional, out of scope |
| 4 | [04-tech-decisions.md](04-tech-decisions.md) | Stack: Strapi 5 (upgrade) + Postgres + Strapi Cloud, Expo + React Native Web + Vercel, NativeWind + React Native Reusables, Better Auth, MCP |
| 5 | [05-tech-requirements.md](05-tech-requirements.md) | Schemas, API gate, MCP tools, auth flows, permissions, routes, env vars, tests |
| 6 | [06-build-spec.md](06-build-spec.md) | **Self-contained build spec**: milestones M0–M9 and acceptance criteria. Hand this to a coding agent |
| 7 | [07-matfinder-plugin.md](07-matfinder-plugin.md) | The MatFinder plugin: gyms from the web, admin area, claims (M10–M13) |
| 8 | [08-nearby-and-place-search.md](08-nearby-and-place-search.md) | Explore by location and radius, place search that switches areas, no city picker (M14–M16) |

**To build:** open a session in this repo and ask it to follow `docs/plan/06-build-spec.md` milestone by milestone.
