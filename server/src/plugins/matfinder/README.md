# MatFinder plugin

A local Strapi plugin (`server/src/plugins/matfinder`) for curating the directory. The plans are
[`docs/plan/07-matfinder-plugin.md`](../../../../docs/plan/07-matfinder-plugin.md) and, for the AI chats,
[`docs/plan/09-ai-chat.md`](../../../../docs/plan/09-ai-chat.md).

What it adds:
- **MCP tools.** 11 curation tools, each behind its own admin action `plugin::matfinder.mcp.<tool>`. Grant them to an
  admin token under Settings → Admin Tokens → Plugins → MatFinder. Two are for gyms found on the web:
  `find_possible_duplicates` and `add_gym_from_web` (with its `sourceUrls`; refuses likely duplicates). One,
  `upsert_knowledge`, adds or updates a gym knowledge entry (same gym and question → the same entry).
- **Agent writes go live.** After each write tool, `services/publishing.ts` publishes what it changed and the result
  says `status: published`, or `notPublishedBecause` when validation stops it. Set `MATFINDER_AUTO_PUBLISH=false`
  (plugin config `autoPublish`) to keep agent writes as drafts for review instead. No tool unpublishes or deletes.
- **MCP prompt.** `find_new_gyms { city, area? }`: the search, dedupe and add loop for an agent with web search.
- **Admin page.** *MatFinder* in the menu, with tabs: *Gyms* (every gym, publish status, origin, search and a status
  filter), *Claims* (below), *From the web* (every gym the agent added, newest first: live or not, sources, likely
  duplicates; the tab's badge counts the ones that aren't live) and *Assistant* (below; shown only to roles with
  `plugin::matfinder.assistant.use`). Each list tab follows the Content Manager's list view: a toolbar, a table where a
  gym's name opens it in the Content Manager, and (Gyms) Strapi's pagination. The open tab is in `?tab=`; the Gyms search,
  status filter and page (`_q`, `status`, `page`, `pageSize`) and the Claims filter (`status`) are in the URL too.
- **Claims.** Owners claim a gym in the app (`POST /api/matfinder/claims`, account only). The *Claims* tab lists them
  with phone and note; with `plugin::matfinder.claims.review` you mark them contacted, accept or reject (a note is
  required to reject or to remove an owner). An accepted claim makes the gym `claimed: true` in the public API.
- **Homepage widgets.** *Gym directory* (all gyms, published, modified, drafts, new from the web this week, claimed) and
  *Claims to review* (new and contacted, the newest five), drawn like Strapi's *Project statistics*; each number links to
  the matching tab and filter.
- **Admin API** (admin session with `plugin::matfinder.read`): `GET /matfinder/summary`, `/gyms`, `/from-web`,
  `/claims`; with `claims.review`: `POST /matfinder/claims/:documentId/contacted|accept|reject|remove-owner`; with
  `assistant.use`: `GET /matfinder/assistant/status` and `POST /matfinder/assistant/chat` (the assistant, below).
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
- **The MatFinder assistant** (the *Assistant* tab, plan 09 M19). A chat for admins whose role holds
  `plugin::matfinder.assistant.use` ("Use the MatFinder assistant"; Super Admin has it). It offers 15 tools, each only
  when the role also holds that tool's own action: lookups (`directory_summary`, `list_claims`, `list_knowledge` with
  `plugin::matfinder.read`; `find_schools`, `get_school_draft`, `list_pending_drafts`, `list_reference_data`,
  `find_possible_duplicates` with their MCP actions) and changes (`upsert_school`, `set_school_schedule`,
  `add_gym_from_web`, `upsert_affiliation`, `upsert_instructor`, `upsert_knowledge` with their MCP actions;
  `review_claim` with `claims.review`). The MCP tools run the same schema, service and publishing as on MCP.
  - **Lookups run at once; every change waits for the admin.** A write tool is defined with `needsApproval`, so the
    run pauses and the tab shows a card: the model's one-sentence `summary` of the change, its arguments, *Approve*
    and *Deny*. The browser sends the decision back (`resume` with `parentRunId`); `chat()` rebuilds the paused call
    from the history and runs it only when approved. Nothing is stored between the two requests; an approval that was
    already used in that chat is refused (`already_decided`), so a double click or a replay can't run a change twice
    (in memory, an hour).
  - **What the model reads:** claims without phone or email; a claimant's note inside `<claimant_note>` (and every
    tool description says results are data, never instructions); lists capped at 50 rows with `capped: true`; a
    result over 60,000 characters is replaced by an error asking for less.
  - **Limits:** 20 admin messages a chat, 4,000 characters a message, 6 model turns an answer, 90 seconds, 16,000
    output tokens a turn, medium effort; the whole chat is checked each turn. Errors are a `RUN_ERROR` in a 200 stream
    in words an admin can act on ("Anthropic refused the key. Check AI_API_KEY."), never the provider's text.
  - **The tab:** messages in Markdown (tables scroll inside their bubble; no images, only http(s) links), each tool
    call as a closed box ("Tool: list_claims · 3 results"), approval cards, suggested questions on an empty chat, the
    composer (Enter sends, Shift+Enter adds a line, Send and Stop) and *New chat*. The chat lasts while the page is
    open (switching tabs keeps it). The stream is a plain fetch, so the tab first calls Strapi's own fetch client (which
    refreshes an expired admin token) and then sends the token as `Bearer`.
  - **Log:** one line a turn (admin id, tools called, approved or denied, waiting for approval, time, tokens), never
    the messages and never the key.
- **AI settings:** `AI_API_KEY` (an Anthropic key; empty turns both chats off: `chat/status` and
  `assistant/status` say `ready: false`), `AI_GYM_CHAT_MODEL` and `AI_ADMIN_CHAT_MODEL` (default `claude-opus-5-5`).
  On the test server `MATFINDER_AI_SCRIPTED=true` answers from a script with no model and no key: the gym chat
  repeats what the model would read, and the assistant follows a few fixed flows with real tool calls ("Which claims
  are waiting?"; "Mark the claim from … as contacted" or "Accept the claim from …", which pause for approval). Never
  set it in production.
- **TanStack AI** (`@tanstack/ai`, `@tanstack/ai-anthropic` on the server, `@tanstack/ai-client` and
  `@tanstack/ai-react` in the admin tab, all pinned exactly; upgrade them together). The tab draws Markdown with
  `react-markdown` and `remark-gfm`. They're ES modules
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
