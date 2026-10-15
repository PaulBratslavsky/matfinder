# MatFinder plugin

A local Strapi plugin (`server/src/plugins/matfinder`) for curating the directory. The plan is
[`docs/plan/07-matfinder-plugin.md`](../../../../docs/plan/07-matfinder-plugin.md).

What it adds:
- **MCP tools.** The 8 curation tools (drafts only), each behind its own admin action `plugin::matfinder.mcp.<tool>`.
  Grant them to an admin token under Settings → Admin Tokens → Plugins → MatFinder.
- **Admin page.** *MatFinder* in the menu: every gym with its publish status, search and a status filter.
- **Homepage widget.** *Gym directory*: published, changes waiting, drafts and the total.
- **Admin API.** `GET /matfinder/summary` and `GET /matfinder/gyms` (admin session with `plugin::matfinder.read`).

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
