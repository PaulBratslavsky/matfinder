# MatFinder plugin

A local Strapi plugin (`server/src/plugins/matfinder`) for curating the directory. The plans are
[`docs/plan/07-matfinder-plugin.md`](../../../../docs/plan/07-matfinder-plugin.md) and, for the AI chats,
[`docs/plan/09-ai-chat.md`](../../../../docs/plan/09-ai-chat.md).

What it adds:
- **MCP tools.** 11 curation tools, each behind its own admin action `plugin::matfinder.mcp.<tool>`. Grant them to an
  admin token under Settings → Admin Tokens → Plugins → MatFinder. Two are for gyms found on the web:
  `find_possible_duplicates` and `add_gym_from_web` (with its `sourceUrls`; always creates, never updates an existing gym; refuses likely duplicates). One,
  `upsert_knowledge`, adds or updates a gym knowledge entry (same gym and question → the same entry).
- **The curator token holds only MatFinder actions.** Grant only `plugin::matfinder.mcp.*` (Settings → Admin Tokens →
  Plugins → MatFinder) and no Content Manager or Media Library permission. With any of those, Strapi's own MCP tools
  appear for that token too, including delete, unpublish, discard-draft and media-delete tools, and Strapi deletions
  are permanent. `tests/api.test.ts` checks both: the MatFinder-only token lists exactly the 11 tools, and a token
  with one Content Manager permission lists more. **Rotating it:** create a new admin token with the same MatFinder
  actions, put it in the Claude client's MCP config, check `tools/list`, then delete the old token.
- **Agent writes go live.** After each write tool, `services/publishing.ts` publishes what it changed and the result
  says `status: published`, or `notPublishedBecause` when validation stops it, except when the draft already had
  unpublished changes before the write (a person's edits in the admin): then nothing is published, and
  `notPublishedBecause` says so. Set `MATFINDER_AUTO_PUBLISH=false` (plugin config `autoPublish`) to keep agent writes
  as drafts for review instead. No MatFinder tool unpublishes or deletes (Strapi's built-in tools can, for a token with
  content permissions; see above).
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
- **Content API** (signed-in app users): `POST /api/matfinder/claims`, `GET /api/matfinder/claims/mine?school=`,
  `GET /api/matfinder/chat/status` and `POST /api/matfinder/schools/:slug/chat` (the gym chat, below).
- **Gym knowledge** (`plugin::matfinder.knowledge`, Content Manager → *Gym knowledge*, Draft & Publish): a question,
  its answer, a category and an optional gym; no gym means it applies to every gym. Written in the Content Manager or
  by agents through `upsert_knowledge`. The sample seed adds a few.
- **The gym chat** ("Ask about this gym", plan 09 M17). A signed-in user asks about one gym; the answer streams back
  as server-sent events (AG-UI, what TanStack AI's `useChat` reads). The model reads the gym's published page (the
  school service's `getBySlug`, never sources, origin or claimants) and its published knowledge plus the general
  entries, as the cached start of the system prompt, then the gym's local time. No tools, no embeddings. Limits: 500
  characters a question, 12 questions a chat, 40 a user a day (in memory), 30 seconds, 4,000 output tokens. Every
  failure is a `RUN_ERROR` in plain words inside a 200 stream (`@tanstack/ai-client` doesn't read HTTP error bodies);
  only a body that isn't a run input is a 400. The log has one line a question (user id, gym, entries, finish, time,
  tokens), never the text, and never the key.
- **AI settings:** `AI_API_KEY` (an Anthropic key; empty turns the chat off and `chat/status` says `ready: false`),
  `AI_GYM_CHAT_MODEL` and `AI_ADMIN_CHAT_MODEL` (default `claude-opus-5-5`). On the test server
  `MATFINDER_AI_SCRIPTED=true` answers from a script that repeats what the model would read, so tests check the
  context with no model and no key; never set it in production.
- **TanStack AI** (`@tanstack/ai`, `@tanstack/ai-anthropic`, pinned exactly; upgrade them together). They're ES modules
  only and the plugin's server is CommonJS, so `server/src/ai/sdk.ts` is the one file that loads them, with
  `await import()`, and `scripts/check-esm-import.mjs` (run by `npm run build:plugin`) fails if a bundle loads them
  statically. The streaming route sends the SDK's response body to Koa with `Readable.fromWeb` and
  `X-Accel-Buffering: no`. Ported from the maison plugin's assistant.

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
