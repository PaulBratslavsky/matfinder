# MatFinder plugin

A local Strapi plugin (`server/src/plugins/matfinder`) for curating the directory. The plan is
[`docs/plan/07-matfinder-plugin.md`](../../../../docs/plan/07-matfinder-plugin.md).

What it adds:
- **MCP tools.** 10 curation tools, each behind its own admin action `plugin::matfinder.mcp.<tool>`. Grant them to an
  admin token under Settings → Admin Tokens → Plugins → MatFinder. Two are for gyms found on the web:
  `find_possible_duplicates` and `add_gym_from_web` (with its `sourceUrls`; refuses likely duplicates).
- **Agent writes go live.** After each write tool, `services/publishing.ts` publishes what it changed and the result
  says `status: published`, or `notPublishedBecause` when validation stops it. Set `MATFINDER_AUTO_PUBLISH=false`
  (plugin config `autoPublish`) to keep agent writes as drafts for review instead. No tool unpublishes or deletes.
- **MCP prompt.** `find_new_gyms { city, area? }`: the search, dedupe and add loop for an agent with web search.
- **Admin page.** *MatFinder* in the menu, with tabs: *Gyms* (every gym, publish status, origin, search and a status
  filter) and *From the web* (every gym the agent added, newest first: live or not, sources, likely duplicates; the tab's
  badge counts the ones that aren't live). Each tab follows the Content Manager's list view: a toolbar, a table where a
  gym's name opens it in the Content Manager, and (Gyms) Strapi's pagination. The open tab is in `?tab=`; the Gyms search,
  status filter and page (`_q`, `status`, `page`, `pageSize`) and the Claims filter (`status`) are in the URL too.
- **Claims.** Owners claim a gym in the app (`POST /api/matfinder/claims`, account only). The *Claims* tab lists them
  with phone and note; with `plugin::matfinder.claims.review` you mark them contacted, accept or reject (a note is
  required to reject or to remove an owner). An accepted claim makes the gym `claimed: true` in the public API.
- **Homepage widgets.** *Gym directory* (all gyms, published, modified, drafts, new from the web this week, claimed) and
  *Claims to review* (new and contacted, the newest five), drawn like Strapi's *Project statistics*; each number links to
  the matching tab and filter.
- **Admin API** (admin session with `plugin::matfinder.read`): `GET /matfinder/summary`, `/gyms`, `/from-web`,
  `/claims`; with `claims.review`: `POST /matfinder/claims/:documentId/contacted|accept|reject|remove-owner`.
- **Content API** (signed-in app users): `POST /api/matfinder/claims`, `GET /api/matfinder/claims/mine?school=`.

**Build it before Strapi starts.** Strapi skips a plugin whose `dist/server` is missing, and a boot without MatFinder
deletes its claims table and every token grant for its tools. `config/plugins.ts` therefore refuses to start without
the build; if `strapi develop` stops with that error while you rebuild, run `npm run build:plugin` and start it again.

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
