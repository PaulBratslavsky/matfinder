# MatFinder plugin

A local Strapi plugin (`server/src/plugins/matfinder`) for curating the directory. The plan is
[`docs/plan/07-matfinder-plugin.md`](../../../../docs/plan/07-matfinder-plugin.md).

What it adds:
- **MCP tools.** 10 curation tools (drafts only), each behind its own admin action `plugin::matfinder.mcp.<tool>`.
  Grant them to an admin token under Settings → Admin Tokens → Plugins → MatFinder. Two are for gyms found on the
  web: `find_possible_duplicates` and `add_gym_from_web` (a draft with its `sourceUrls`; refuses likely duplicates).
- **MCP prompt.** `find_new_gyms { city, area? }`: the search, dedupe and add loop for an agent with web search.
- **Admin page.** *MatFinder* in the menu, with tabs: *Gyms* (every gym, publish status, origin, search and a status
  filter) and *From the web* (the agent's drafts that aren't published yet, with their sources and likely duplicates).
  The open tab is in `?tab=`.
- **Homepage widget.** *Gym directory*: published, new from the web, changes waiting, drafts and the total.
- **Admin API.** `GET /matfinder/summary`, `GET /matfinder/gyms` and `GET /matfinder/from-web` (admin session with
  `plugin::matfinder.read`).

The content model (school, city, instructor, affiliation) stays in the app; the plugin reads and writes it through the
app's school service and the Document Service, so the app's write rules still apply.

## Build

It builds to `dist/` with `@strapi/sdk-plugin`, using the server's `node_modules` (no install of its own):

```bash
cd server
npm run build:plugin   # also run by develop, build and postinstall
npm run watch:plugin   # rebuild on change while you work on it
```

Server and admin code typecheck with `npx tsc -p admin/tsconfig.json --noEmit` and `npx tsc -p server/tsconfig.json
--noEmit` from this folder.
