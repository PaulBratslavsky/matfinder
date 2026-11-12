# Product Brief Standard

**Applies to:** `01-product.md`, `02-users.md`, `03-requirements.md` (stages 1–3).
**Based on:** EGM's Heilmeier catechism standard, adapted for product planning, plus `strapi-product-builder`'s stage 1–3 rules.

## Core principle

The brief passes if someone who never spoke to the founder can read the three files and, without guessing:

1. explain what the product is, who it's for, and why they would switch to it;
2. list what the MVP must do and what it won't do;
3. see every requirement trace back to a user need.

## 1. The catechism

Each of these must be answered explicitly, in plain words, somewhere in 01–03. Most live in `01-product.md`; its **Hypothesis** section, written at the end of stage 3, ties the persona, the MVP, and the riskiest assumption together.

| Question | Usually in | Fails when |
|---|---|---|
| **What is it?** One sentence, no jargon. | 01 › One-liner | Jargon, or more than one product described |
| **How is it done today**, and why does that fall short? | 01 › Today's workaround | Missing, or "nothing exists" with no evidence |
| **What's new** — why this approach works where today's doesn't | 01 › Hypothesis | Only features listed, no reason they'd work better |
| **Who cares** — a named persona who feels the pain | 02 › Personas, named in 01 › Hypothesis | "Everyone", "businesses", or no persona |
| **Riskiest assumption**, and how the MVP tests it | 01 › Riskiest assumption and Hypothesis | Missing, or not testable by the MVP in 03 |
| **Early signal** — what you'd see in the first month if it's working | 01 › Early signal | Missing, or only a long-term metric |
| **Success picture** a year in | 01 › What success looks like | Missing |

Severity: a missing answer is a Major; "who cares" or "riskiest assumption" missing is a Blocker. Answers that contradict each other across 01–03 are a Blocker. Judge whether a question is answered, not which heading it sits under.

## 2. Users (`02-users.md`)

- 1–3 personas, each with a context and a **current workaround**. No workaround means no evidence of the pain (Major).
- Each job-to-be-done reads "When…, <persona> wants to…, so they can…".
- The journey reaches a clear **aha moment**.
- The **core loop** is an action users repeat, with a stated reason to come back. A one-off action is not a loop (Blocker).

## 3. Traceability (02 ↔ 03)

- Every step of the core loop and the primary journey has at least one requirement in 03 that makes it possible. A missing one is a **Blocker**.
- Every MVP requirement traces to a journey step, a job-to-be-done, or a non-functional need. An untraced requirement is a YAGNI candidate (**Major**).
- The out-of-scope list exists and names specific things.
- Requirements are capabilities ("users can invite teammates by email"), not technologies ("use SendGrid"). Technology in 01–03 is a Nit, unless the user stated it as a hard constraint.

## 4. Scope consistency

- **Single-user vs. multi-team / multi-tenant** is stated once and is the same in all three files. Drift is a **Blocker** — tenancy touches every entity in stage 5.
- **Who authors each kind of content** — the team (Strapi admin panel) or end users (content API) — is stated, or flagged as an open question.
- **Accounts**: end-user accounts, editor accounts, or both.
- **i18n** and **draft & publish**: yes or no, not "maybe".
- **AI / agent access** to content: yes or no.

## 5. Strapi fit

Flag as a **Blocker** if a stated hard requirement rules Strapi v5 out and the brief doesn't acknowledge it:

- A document database (MongoDB and similar) — Strapi v5 is SQL-only.
- Offline-first sync, or an edge-only / serverless-only backend.

Flag as a **Major** if the brief doesn't acknowledge it (these are decided in stage 4, not here):

- Long-running background workers — Strapi Cloud doesn't run them, so they need self-hosting or a separate worker.
- Heavy realtime (live collaboration, chat) — Strapi has no built-in realtime layer, so it needs another service.
- Data residency or compliance needs (GDPR, HIPAA, finance) with no word on how hosting will meet them.

## 6. Honesty

- Anything the user didn't confirm is marked `⚠️ assumption — unconfirmed`, never written as fact.
- Promotional words ("seamless", "revolutionary", "effortless") don't stand in for evidence. Nit, or Major if they replace a required answer.
