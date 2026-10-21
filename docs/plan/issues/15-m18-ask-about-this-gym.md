> **M18** (step 2 of 4 of [plan 09](../09-ai-chat.md)) · Blocked by: {{#m17}} · Next: {{#m20}}

## Goal
On a gym's page, a signed-in person taps **Ask about this gym** and chats with an answer that streams in, on the web,
iOS and Android, using `useChat` from TanStack AI against {{#m17}}'s endpoint.

## Why
- The user asked (2026-10-21) for a TanStack AI chat on the gym page where people ask questions about the gym.

## Implementation spec
- [ ] **Hook** `mobile/hooks/useGymChat.ts`: `useChat` (`@tanstack/ai-react`) to
      `${apiBase()}/api/matfinder/schools/<slug>/chat`. Web: `fetchServerSentEvents` with `credentials: 'include'`.
      iOS and Android: `xhrServerSentEvents` (TanStack AI's React Native transport) with the `Cookie` header from the
      auth client, read on every send (the options' function form). Maps the stream's errors to plain text.
- [ ] **Status** `useChatStatus()`: `GET /api/matfinder/chat/status` through `apiGet`, cached with React Query.
- [ ] **Button** on `app/schools/[slug]/index.tsx`, under the header: "Ask about this gym" (the kit's secondary
      button), only when status is ready.
- [ ] **Screen** `app/schools/[slug]/ask.tsx`: modal presentation on native, a page on the web, account-only (same
      redirect as the gym page). Suggested questions (from what the gym's data has), the message list (yours right,
      answers left, streaming), plain-text rendering with simple lists, the composer (Send, Stop), the note under it,
      errors in words (plan 09 → *The app*). Mat room tokens only (`theme/tokens.ts`), light and dark.
- [ ] **Dependencies:** `@tanstack/ai-react` and `@tanstack/ai-client` in `mobile/`, the exact versions the server
      uses.
- [ ] **Tests:** unit (`lib/gym-chat.test.ts`: suggested questions, error text); Playwright (`e2e/`) against the test
      server with its scripted adapter (`MATFINDER_AI_SCRIPTED=1`).

## Reference
Plan 09 → *The app: "Ask about this gym"*. {{#m17}}'s endpoint and status route. Maison's admin `useChat` wiring
(`admin/src/components/assistant/AssistantProvider.tsx`) for the connection options.

## Watch out for
- **Streaming must really stream on native.** Check that text arrives while the answer is being written, not all at
  the end, and that Stop works (open Expo issues #39428 and #50212 affect aborting `expo/fetch`; the XHR transport
  avoids it, but check). If neither transport streams, stop and ask before switching to a non-streamed answer.
- **Vercel and Strapi Cloud must not buffer.** On a preview deploy, check that the web answer streams through the
  `/api` rewrite. If it doesn't, stop and ask (options: a Vercel setting, or calling Strapi directly for this route).
- **Don't replace existing screens or components** (CLAUDE.md); this adds a button and a screen. Ask if you want a
  design mock first.

## Done when
- [ ] Playwright (web): tap a suggested question, the answer streams in; with status not ready, no button; signed out,
      `/schools/<slug>/ask` sends you to sign in and back.
- [ ] iOS Simulator: a question streams in progressively; Stop stops it; light and dark.
- [ ] A preview deploy: the web answer streams through the Vercel rewrite.
- [ ] `npm run typecheck`, `npm run test:unit` and `npm run test:e2e` pass in `mobile/`.

## Out of scope
Sending an unanswered question ({{#m20}}); saving chats; Markdown rendering on native.

## For the implementing agent
- **Deviation protocol:** the plan's names, limits and shapes are the user's decisions. If you want to change one,
  stop and ask.
- **Verify, don't recall:** check TanStack AI's React Native guide and `xhrServerSentEvents` options, and the Expo
  SDK 57 networking notes, before relying on them.
- **Workflow:** branch `m18-ask-about-gym`, one PR into `main` with `Closes {{#self}}`, merged by the user once every
  Done-when box passes.
