> **M17** (step 1 of 4 of [plan 09](../09-ai-chat.md)) · Blocked by: none · Next: {{#m18}}, {{#m19}}

## Goal
Gyms get a knowledge base, and a signed-in person can ask a question about one gym and get a streamed answer built
only from that gym's public page data and its published knowledge: `POST /api/matfinder/schools/:slug/chat`, through
TanStack AI and Anthropic, on the server.

## Why
- The user asked (2026-10-21) for a chat on the gym page that answers questions about the gym, backed by a gym
  knowledge base in Strapi, built with TanStack AI.
- MatFinder has no app server (Vercel serves the static export and rewrites `/api` to Strapi), so the model call
  lives in the MatFinder plugin, next to the claims routes. {{#m18}} (the app) and {{#m19}} (the admin assistant)
  build on this milestone's TanStack AI loader and knowledge tools.

## Implementation spec
- [ ] **Content type** `plugin::matfinder.knowledge` (collection `matfinder_knowledge`, Draft & Publish, visible in
      the Content Manager): `question`, `answer`, `category`, `school` (optional relation), `source`, `sourceUrls`
      (plan 09 → *Data model*). Sample entries in the sample seed only (`SEED_SAMPLE_DATA`): two or three per sample
      gym (parking, gi or no-gi for visitors, kids classes) and three general ones.
- [ ] **MCP tool** `upsert_knowledge` (admin action `plugin::matfinder.mcp.upsert-knowledge`): create or update one
      entry by `id` or (`schoolSlug`, `question`); `source: agent` with `sourceUrls` required for agents; publishes
      like the other writes (`services/publishing.ts`). MCP now lists 11 tools: update the integration test and
      `CLAUDE.md`.
- [ ] **TanStack AI loader** `server/src/ai/sdk.ts`, ported from maison: the only file that names `@tanstack/*`,
      through a cached `await import()`; `scripts/check-esm-import.mjs` (or equivalent) runs after `build:plugin` and
      fails on a static import. `ai/provider.ts`: the Anthropic adapter from the plugin config (`aiApiKey`,
      `gymChatModel`), and a test-only scripted adapter switched on by `MATFINDER_AI_SCRIPTED=true`, which
      `scripts/test-server.sh` sets and production never does.
- [ ] **Config:** `aiApiKey` (`AI_API_KEY`), `gymChatModel` (`AI_GYM_CHAT_MODEL`), `adminChatModel`
      (`AI_ADMIN_CHAT_MODEL`) in `config/plugins.ts`; names (no values) in `.env.example`. Defaults per plan 09 → D2.
- [ ] **Gym context** `server/src/gym-chat/context.ts` (pure): from `getBySlug` (the public view) and the entries,
      compact text with the gym's "now" in its time zone, the gym's entries then the general ones, a ~30,000
      character cap with maison's keyword ranker (`domain/knowledge.ts`, ported) past it. Data goes inside tags and is
      described as data.
- [ ] **Instructions** `server/src/gym-chat/instructions.ts` (plan 09 → *The gym chat*).
- [ ] **Service** `services/gym-chat.ts`: `status()`, `turn(params, { user, slug, responseController })` with the
      limits (12 questions a chat, 500 characters, 40 a user a day in memory, 30 s, ~1,000 output tokens, low effort),
      `chat()` with no tools and the gym context as a cached system prompt (`systemPrompts` with the Anthropic
      `cache_control` metadata), the stream wrapper (maison's `wrapStream`: deadline, errors in words, provider text kept
      out), `toServerSentEventsResponse`.
- [ ] **Controller + routes** (content API): `POST /schools/:slug/chat` (the claims routes' signed-in check;
      `send()` via `Readable.fromWeb` with the SSE headers) and `GET /chat/status` → `{ ready }`. Grants:
      `plugin::matfinder.gym-chat.ask` and `plugin::matfinder.gym-chat.status` for Authenticated
      (`server/src/lib/permissions.ts`).
- [ ] **Tests:** unit for the context builder, ranker and limits; integration (`tests/api.test.ts`) with the scripted
      adapter.

## Reference
- Plan 09 → *The gym chat*, *Data model*, *Configuration*.
- Maison: `server/src/ai/sdk.ts`, `server/src/ai/provider.ts`, `server/src/services/assistant.ts` (`wrapStream`,
  `errorResponse`), `server/src/controllers/assistant.ts` (`send`), `server/src/domain/knowledge.ts`.
- TanStack AI research notes (versions, signatures): `side-session-notes/…/ai-chat/tanstack-ai-research.md` from the
  planning session; re-check every version and signature on npm and in the docs before using it.

## Watch out for
- **Only the public view reaches the model.** Use `getBySlug`; never `sourceUrls`, `origin`, claimants or drafts.
- **Errors as a 200 stream with one `RUN_ERROR`**, because `@tanstack/ai-client` doesn't read HTTP error bodies.
  Only a body that isn't a run input is a 400; no session is a 401.
- **Never log question text or the key.** One log line a turn: user id, slug, tokens, ms.
- **Never start Strapi without the plugin build** (CLAUDE.md). Run the suites with `npm run test:integration:isolated`.

## Done when
- [ ] Integration (scripted adapter): a signed-in question streams an answer; the context the adapter received holds
      the gym's schedule and its published entries, not its draft entries and not another gym's.
- [ ] Signed out → 401; a 13th question or a 501-character one → a `RUN_ERROR` with plain text.
- [ ] `GET /chat/status` is `{ ready: false }` without a key and `{ ready: true }` with the scripted adapter.
- [ ] MCP lists 11 tools; `upsert_knowledge` writes and publishes an entry an agent can find with the CM.
- [ ] A manual run with a real key: three questions about a sample gym, one it can't answer and says so.
- [ ] `npm run build:plugin`, `npm run test:unit`, `npm run typecheck`, `npm run test:integration:isolated` pass.

## Out of scope
The app screen ({{#m18}}); the admin assistant ({{#m19}}); sending unanswered questions and saved chats ({{#m20}}).

## For the implementing agent
- **Deviation protocol:** the plan's names, limits and shapes are the user's decisions. If you want to change one,
  stop and ask. The model IDs and new dependencies are D2 and D3 of plan 09: use what the user approved.
- **Verify, don't recall:** check TanStack AI's current signatures (it's pre-1.0) and Strapi 5.58's plugin content
  types and content-API routes in the docs before relying on them.
- **Workflow:** branch `m17-gym-chat-api`, one PR into `main` with `Closes {{#self}}`, merged by the user once every
  Done-when box passes.
