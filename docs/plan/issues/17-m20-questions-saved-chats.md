> **M20** (step 4 of 4 of [plan 09](../09-ai-chat.md)) · Blocked by: {{#m18}}, {{#m19}}

## Goal
What the gym chat couldn't answer reaches admins and grows the knowledge base, and admins' assistant chats are saved.

## Why
- The gym chat answers only from what MatFinder knows (plan 09 → D5, D7). The questions it can't answer show what's
  missing; answering them once fills the gap for everyone.
- Maison saves each admin's chats; plan 09 → D11 moves that here to keep {{#m19}} focused.

## Implementation spec
- [ ] **Content type** `plugin::matfinder.question` (hidden): `school`, `text`, `user`, `status`, `answer`,
      `knowledge`, `answeredBy` (plan 09 → *Data model*).
- [ ] **Gym chat tool** `send_question`: offered when the knowledge didn't cover a question. The app shows a
      **Send this question** button (client-side confirm); only a confirmed question is recorded. One open question
      per user per gym per day.
- [ ] **Questions tab** on the MatFinder page (`?tab=questions`, badge = open count): answer, which can create a
      knowledge entry for that gym (`source: question`, published), or dismiss. A homepage widget count if useful.
- [ ] **Assistant:** `list_questions` (read) and `answer_question` (write, approval).
- [ ] **Saved admin chats** `plugin::matfinder.conversation` (hidden), routes and History, as in maison
      (README "Saved chats").
- [ ] **Tests:** unit and integration for both.

## Done when
- [ ] A question the chat can't answer can be sent, shows on the Questions tab, and once answered and turned into
      knowledge, the chat answers it.
- [ ] An admin's chat survives a reload; another admin can't open it (404).
- [ ] All server and app suites pass.

## Out of scope
Notifying the person who asked (no push or email in MatFinder yet).

## For the implementing agent
- **Deviation protocol:** the plan's names, limits and shapes are the user's decisions. If you want to change one,
  stop and ask.
- **Workflow:** branch `m20-questions-saved-chats`, one PR into `main` with `Closes {{#self}}`, merged by the user once
  every Done-when box passes.
