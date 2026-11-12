# Strapi Design Standard

**Applies to:** `04-tech-decisions.md` and `05-tech-requirements.md` (stages 4–5), checked against `03-requirements.md`.
**Based on:** EGM's feature-spec standard (alternatives, risks), plus the Strapi v5 rules in `strapi-product-builder` — its content-modeling primer, build cookbook, auth, and MCP references. Each check names the failure it prevents.

## Core principle

The design passes if an engineer new to the project can read 04 and 05 and know, for every requirement in 03, which content type, route, permission, and page delivers it — and if every Strapi v5 decision that build agents usually get wrong is already made.

Severity guide: a gap that would corrupt data, leak user data, or block the core loop is a **Blocker**. A gap that forces the build agent to guess is a **Major**. Wording and polish are **Nits**.

## 1. Decisions (`04-tech-decisions.md`)

- Every area records **Choice · Considered · Why**. A non-default choice with nothing under "Considered" fails EGM's alternatives rule (Major).
- Defaults (Strapi v5, PostgreSQL, Strapi Cloud, Users & Permissions) are stated as defaults; each override has a reason.
- The **frontend framework** is chosen explicitly. There is no silent default.
- **Auth:** Users & Permissions (default), or Better Auth with its status stated — beta and not for production per its maintainers, needs Strapi ≥ 5.45, requires removing Users & Permissions, and moves permissions to `plugin-api-permissions` (alpha).
- **MCP server:** off unless 03 asks for AI-agent access to content. If on: Strapi ≥ 5.49, admin-token scope, and whether agents do real work (then purpose-built tools with tokens scoped to them — the generic CRUD tools have overwritten content) or only browse.
- **Module layout:** `src/api/<name>` folders by default. Local plugins only with a stated reason: admin-panel UI, reuse across projects, or distribution.
- **External services:** each one is marked required or optional. Optional ones say how the feature degrades when the key is missing (disabled cleanly, core loop unaffected).
- **Reference repos**, if the user gave any: their conventions are recorded as binding, not "inspiration".

## 2. Coverage (03 → 05)

- Every core feature and every content item in 03 maps to a content type, component, custom route, or page in 05. An unmapped requirement is a **Blocker**.
- Everything in 05 traces to 03 or to a stated technical need. Anything else is a YAGNI candidate (Major).

## 3. Content model

For **every** content type: kind (collection or single), fields with Strapi field types, relations with target and cardinality, draft & publish yes/no, localized yes/no, and validations. Anything missing is a Major.

- **Who authors it** is stated per type: the team (admin panel) or end users (content API).
- Rich text uses `blocks`, unless the legacy Markdown `richtext` is wanted on purpose.
- Externally sourced strings (URLs, names from other systems) use `text`, not `string` — `string` has a 255-character validator that turns one long value into an ingest failure.
- Components hold embedded shapes with no life of their own; relations hold data that is edited or shared independently.
- Every `uid` / slug field that anything filters on has a generator in Document Service middleware. Slugs are only auto-filled by the admin panel, not by API, seed, or Document Service writes — a missing generator makes `?filters[slug]=` return nothing.
- Every field used as an identity key (`externalId`, slug, key) that is marked `unique: true` also has a real database unique index and a create-catch-refetch plan. `unique: true` is a validation rule only; Document Service, seed, ingest, and cron writes can create duplicates (Blocker if writes run concurrently).
- Users & Permissions path: an extension of the `user` type reproduces the full base schema plus the additions. An extension replaces the schema; it doesn't merge (Blocker — the base columns disappear).

## 4. Permissions and identity

Apply the checks for the auth path chosen in 04.

**Both paths:**

- A table of roles (Public, Authenticated, any custom) × actions (`find`, `findOne`, `create`, `update`, `delete`, uploads, each custom route) for every content type.
- Permissions for **both** Public and Authenticated are seeded in code, not clicked in the admin panel (clicks don't survive a fresh database).
- Server-set fields (`owner`, `author` = current user) are stamped in the **controller** through the Document Service — not taken from the request body (v5 rejects it with a 400) and not set in lifecycle hooks (no request context there).
- Per-record ownership uses an `is-owner` policy on `update` and `delete`. "Only my records" reads query the Document Service server-side, not with client filters on a private relation.
- Other users' identity in responses is trimmed to safe fields (`id`, `documentId`, a display name). No route lists all users.
- Authorization gates (plan limits, quotas, role checks) are route policies.

**Users & Permissions path (default):**

- The current user comes only from `/api/users/me`. `user.find` is never granted — it lets any signed-in user list every account's email.

**Better Auth path:**

- Permissions are described and seeded in `plugin-api-permissions` terms, because Users & Permissions is removed.
- The `user` content type's UID (from the Better Auth generate step) is stated, and so is how a controller reads the signed-in user.

## 5. Where logic lives

- Logic that needs the request or the signed-in user → **controller**.
- Document-level logic without a request (slugs, derived fields, notifications) → **Document Service middleware**, registered in `register()`.
- **Lifecycle hooks are not used for business logic** — they have no request context and fire twice on publish.
- An operation that writes two or more records (status + audit row + notification) runs in **one transaction on the service**, re-checks its guard inside the transaction, and keeps external side effects (email, Slack) outside it.
- Custom admin permission actions are registered in `register()`, not `bootstrap()` (otherwise every restart revokes them).

## 6. API and data fetching

- Default population uses **route middleware**, with separate list and detail profiles. Each middleware's UID matches its file location (`api::<api>.<name>` lives in `src/api/<api>/middlewares/`; `global::<name>` in `src/middlewares/`).
- Each custom route lists method, path, auth, request, and response.
- Webhooks: a route with `auth: false`, raw-body access for signature checks, and the user's identity carried in the provider's metadata.

## 7. Operations — the builder's robustness sweep

05 has an **Operations (robustness sweep)** section with one line per item: where it's specified in 05, or **N/A with a reason**. An item that is missing from that section is a Major (a Blocker if the product's value depends on it). An item marked N/A with a reason passes — the user decided it.

silent failures and a replay path · uniqueness under concurrency · cron overlap guard and retry cap · transactional workflow steps · session lifetime that matches the auth config (Users & Permissions refresh mode issues 10-minute access tokens) · user-data exposure · metric definitions · human correction loops · versioning of computed results · cost guards · aging and SLA visibility · audit trail · search · empty states.

## 8. Platform limits

- Background work uses Strapi cron (`config/cron-tasks.ts` with `cron.enabled` in `config/server`) or names an external worker. If the backend host is Strapi Cloud, there are no long-running workers.
- Environment variables are split into backend and frontend lists. Only browser-safe values use the framework's public prefix (`NEXT_PUBLIC_`, `VITE_`, `PUBLIC_`, `NUXT_PUBLIC_`); server tokens never do.
- Version floors agree everywhere (for example MCP ≥ 5.49, Better Auth ≥ 5.45).

## 9. Risks

Every high-impact risk the design creates — data loss, account enumeration, runaway cost, a security hole — has a stated mitigation (EGM's risks rule). A missing mitigation for one of these is a Major. A separate "Risks" section isn't required if section 7 covers them.
