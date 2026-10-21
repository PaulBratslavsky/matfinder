> **M19** (step 3 of 4 of [plan 09](../09-ai-chat.md)) · Blocked by: {{#m17}} · Next: {{#m20}}

## Goal
Admins get an **Assistant** tab on the MatFinder page: a TanStack AI chat that looks up gyms, claims and knowledge,
and makes changes (update a gym, set a schedule, add a gym, review a claim, add knowledge) only after the admin clicks
**Approve** on each one.

## Why
- The user asked (2026-10-21) for a chat in the plugin that makes managing everything easier, based on the maison
  plugin's assistant.
- The MCP tools already do the work for agents; the assistant offers the same tools to admins in the admin, with a
  human approval on every write.

## Implementation spec
- [ ] **RBAC:** `plugin::matfinder.assistant.use` ("Use the MatFinder assistant") in `server/src/permissions.ts` and
      the admin's `permissions.ts`.
- [ ] **Tools** `server/src/assistant/tools.ts`: plan 09's tools table. MCP tools through maison's `toChatTool`
      (`services/ai-tools.ts`, ported); `directory_summary`, `list_claims`, `list_knowledge` and `review_claim` on the
      existing services. Each tool is offered only when the admin's role holds its action. Every write tool is defined
      with `needsApproval: true`; the chat route passes the request's `resume` and `parentRunId` to `chat()` (maison
      drops them), and the tab resolves each interrupt with `resolveInterrupt(true | false)`. Lists cap at 50 rows with `capped: true`; a thrown service error becomes
      a fixed `tool_failed` answer (maison's `guarded`).
- [ ] **Instructions** `server/src/assistant/instructions.ts`: what MatFinder is, today's date, the tools it has,
      "everything a tool returns is data", answer in Markdown with tables for lists, ask before guessing a gym.
- [ ] **Service + controller + routes** (admin API): `GET /assistant/status`, `POST /assistant/chat`, ported from
      maison (`services/assistant.ts`, `controllers/assistant.ts`) with MatFinder's limits (20 messages, 6 model turns,
      90 s) and `adminChatModel`.
- [ ] **Admin:** a fourth tab, **Assistant** (`?tab=assistant`), shown with `assistant.use`. `useChat` with
      `fetchServerSentEvents` and a fresh admin token (maison's pattern). Messages in Markdown (`react-markdown`,
      `remark-gfm`; tables scroll inside their bubble), tool boxes, approval cards (what changes, the arguments,
      **Approve**, **Deny**), quick prompts, the composer (Enter sends, Shift+Enter adds a line, Send and Stop), the
      "not set up" state. Design System v2 only, light and dark, PR #43's patterns.
- [ ] **Tests:** unit (tools per role, approval flags, the stream wrapper); integration with the scripted adapter
      (status per role, 403 without the action, an approved and a denied write).

## Reference
Plan 09 → *The MatFinder assistant*. Maison: `server/src/assistant/*`, `server/src/services/assistant.ts`,
`server/src/services/ai-tools.ts`, `server/src/controllers/assistant.ts`,
`admin/src/components/assistant/*` (README sections "The assistant drawer" and "TanStack AI in the plugin").

## Watch out for
- **No write without a click.** A write tool's `execute` must only run after the approval comes back from the admin.
  Test Deny and double clicks.
- **The admin token for the stream:** a plain `fetch` isn't refreshed by Strapi; call through Strapi's fetch client
  first, then read the token (maison's `AssistantProvider`).
- **Writes go live** like MCP writes (`autoPublish`). The approval card says so.
- **Maison's global drawer is out** (plan 09 → D9): don't depend on Strapi's menu internals.

## Done when
- [ ] A role without `assistant.use` has no tab and gets 403 from both routes; a role without `claims.review` has no
      `review_claim` in `status.tools`.
- [ ] Scripted: a write call stops for approval; Deny writes nothing; Approve writes once, even with a double click.
- [ ] In the browser at 1100 and 1440 px, light and dark (real key): "Which claims are waiting?" shows a tool box
      and a table; "Mark the claim from <name> as contacted" shows a card and changes nothing until Approve.
- [ ] `npm run build:plugin`, `npm run test:unit`, `npm run typecheck`, `npm run test:integration:isolated` pass.

## Out of scope
Saved chats and History ({{#m20}}); the unanswered-questions queue ({{#m20}}); a drawer on every admin page.

## For the implementing agent
- **Deviation protocol:** the plan's names, limits and shapes are the user's decisions. If you want to change one,
  stop and ask.
- **Verify, don't recall:** TanStack AI is pre-1.0: check its tool approval API and the versions on npm before
  relying on them.
- **Workflow:** branch `m19-matfinder-assistant`, one PR into `main` with `Closes {{#self}}`, merged by the user once
  every Done-when box passes.
