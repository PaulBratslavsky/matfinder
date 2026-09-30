> **Part of {{#epic}}** · **M5** (step 6 of 10) · Blocked by: {{#m4}} · Spec: [06-build-spec.md @ 68803f6](https://github.com/PaulBratslavsky/matfinder/blob/68803f6bf44a5d0415cdefc498706b9e2ade58b9/docs/plan/06-build-spec.md#m5-mcp-server--custom-tools)

## Goal
The curator manages listings by talking to Claude through Strapi's **built-in MCP server**, which exposes **exactly 8** MatFinder tools. The tools only ever write **drafts**; a human publishes in the Strapi admin.

## Why
- Listings are curated, and **draft-only MCP tools** are a user decision named in the deviation protocol. **No tool publishes, unpublishes, deletes, or uploads media.**
- The tools are gated on their own admin-token actions, not on `plugin::content-manager.explorer.*`. The spec says those content-manager grants fail silently for tool policies and would also expose Strapi's generic CRUD tools; the Done-when requires exactly 8 tools.

## Implementation spec
- [ ] `config/server.ts`: add `mcp: { enabled: env.bool('MCP_ENABLED', true) }`.
- [ ] `src/mcp/index.ts` exports `TOOLS` (one definition per tool) and `registerMcp(strapi)`, called from **`register()`** (not `bootstrap()`, which runs after the MCP server starts **and** would wipe token grants for actions registered there on every restart):
  ```ts
  import { z } from '@strapi/utils' // NEVER import from 'zod' directly (Strapi bundles zod 3)

  export async function registerMcp(strapi) {
    await strapi.service('admin::permission').actionProvider.registerMany(
      TOOLS.map((t) => ({ section: 'settings', category: 'MatFinder MCP tools',
        uid: `matfinder-mcp.${t.name}`, displayName: t.write ? `${t.title} (write)` : t.title })),
    ) // → action ids `api::matfinder-mcp.<name>`
    for (const t of TOOLS) {
      strapi.ai.mcp.registerTool({            // ONE object argument (positional form fails)
        name: t.name, title: t.title, description: t.description,
        auth: { policies: [{ action: `api::matfinder-mcp.${t.name}` }] },
        resolveInputSchema: () => t.input,     // z.object({...})
        resolveOutputSchema: () => t.output,   // MANDATORY
        createHandler: (strapi) => async ({ args }) => {
          const result = guard(await t.run(strapi, args), t.shrinkHint)
          return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result }
        },
      })
    }
  }
  ```
  - Don't gate tools on `plugin::content-manager.explorer.*`. Those grants are content-type-scoped and fail silently for subject-less tool policies; they would also expose Strapi's generic CRUD tools.
  - Verify the exact `createHandler` signature (`async ({ args })` vs `async (args)`) against the blog post and the installed Strapi version.
- [ ] `src/mcp/guard.ts`: `wire = Buffer.byteLength(JSON.stringify(data)) * 2 + 2048`; if `wire > 950_000`, return `{ error: 'RESULT_TOO_LARGE', bytes: wire, message: shrinkHint }` (the payload is sent twice: `content` and `structuredContent`).
- [ ] Implement the 8 tools (see *MCP tools* below) under `mcp/tools/*.ts`. All writes go through the school / instructor / affiliation **services**, target the **draft**, and run multi-write operations inside `strapi.db.transaction(async () => {...})` (Document Service calls join the ambient transaction). **No tool publishes, unpublishes, deletes, or uploads media.**
  - **Create, catch, refetch:** on a unique-index violation during create, re-query by slug and apply the update instead.
  - Relations are returned as **names and slugs**, never bare ids.
  - String inputs longer than 255 characters must target `text` fields (a Strapi `string` has a 255-character app-layer max). Enforce `.max(255)` in zod for `string` fields.

  **Forward reference from {{#m4}}:** the school tools call the service methods {{#m4}} declared (`upsertDraft`, `setScheduleDraft`, `listPendingDrafts`). {{#m4}} only needed them to exist; **this issue's Done-when is their first real check**, so finish or fix them here. Once `src/lib/geocode.ts` exists, wire it into `upsertDraft` for an address without coordinates. `upsert_instructor` and `upsert_affiliation` need the same kind of draft-upsert methods on the instructor and affiliation services. *(added: not in spec)*
- [ ] `src/lib/geocode.ts`: Mapbox Geocoding (`MAPBOX_GEOCODING_TOKEN ?? MAPBOX_ACCESS_TOKEN`), `proximity` = city center, `country=us`, `types=address,poi`, limit 1 → `{ longitude, latitude, address, zoom: 15, pitch: 0, bearing: 0 }` (the `map-box` field shape). No result → tool error `GEOCODE_FAILED` with the address tried.
- [ ] Create the admin token: Strapi admin → **Settings → Admin Tokens** (not API Tokens; `/mcp` rejects API tokens) → name `matfinder-curator`, unlimited duration → tick **only** the *MatFinder MCP tools* actions. Save it in a password manager; **never commit it**.
- [ ] Connect: `claude mcp add matfinder --transport http http://localhost:1339/mcp -H "Authorization: Bearer <token>"`.

## Reference (copied from the spec)

### MCP tools
All tools are **draft-only**, return **names and slugs** for relations, and return structured errors (`VALIDATION_ERROR` with field paths, `NOT_FOUND`, `GEOCODE_FAILED`, `RESULT_TOO_LARGE`). Each has a hand-written description stating when to use it.

| Tool | Write? | Input | Behavior / output |
|---|---|---|---|
| `list_reference_data` | no | `{}` | `{ cities: [{slug,name}], affiliations: [{slug,name}], instructors: [{slug,name,beltRank}] }`. *"Call this first to reuse existing records."* |
| `find_schools` | no | `{ search?, city?, status?: 'any'\|'published'\|'unpublished-changes'\|'never-published', staleDays?, page = 1, limit = 20 (≤ 50) }` | `{ items: [{ documentId, slug, name, neighborhood, city, affiliation, status, updatedAt, lastVerifiedAt }], page, limit, total, hasMore }` |
| `get_school` | no | `{ slug, excerptChars = 600 }` | Draft version, schedule in `HH:mm`, description as plain text truncated to `excerptChars`, `status` |
| `upsert_school` | yes | `{ slug?, name?, citySlug?, shortDescription?, descriptionText?, address?, latitude?, longitude?, neighborhood?, postalCode?, affiliationSlug?, headInstructorSlugs?, pricing?, contact?, amenities?, lastVerifiedAt? }` (component inputs are **partial**) | **Only provided fields are written; components are merged per field.** Unknown or missing slug → create (requires `name`, `citySlug`, `address`). `address` without coordinates → **server geocodes**. `descriptionText` → blocks. `headInstructorSlugs` replaces the ordered list. → `{ documentId, slug, created, changedFields, status }` |
| `set_school_schedule` | yes | `{ slug, sessions: [{ day, start: 'HH:mm', end: 'HH:mm', classType, style, notes? }] }` (≤ 100) | **Replaces the entire weekly schedule** on the draft (description: "send the complete week"). → `{ slug, sessionCount, byDay }` |
| `upsert_instructor` | yes | `{ slug?, name?, beltRank?, degree?, bio? }` | Partial create/update (draft) |
| `upsert_affiliation` | yes | `{ slug?, name?, website? }` | Partial create/update (draft) |
| `list_pending_drafts` | no | `{ type?: 'school'\|'instructor'\|'affiliation', limit = 25 }` | Never-published docs and docs with unpublished changes: `{ type, slug, name, status, updatedAt, changedFields }` |

### Field constraints the tool schemas should mirror *(added: not in spec: summarized from the {{#m2}} schemas in the repo)*
Enums: `day` (`mon`…`sun`), `classType` (`fundamentals`, `all_levels`, `advanced`, `open_mat`, `competition`, `kids`, `womens`), `style` (`gi`, `nogi`, `both`), `beltRank` (`white`, `blue`, `purple`, `brown`, `black`, `red_black`, `red_white`, `red`); `degree` 0–10. Text limits: `shortDescription` ≤ 280 (`text`), instructor `bio` ≤ 1000 (`text`), `name` ≤ 120 (school, instructor) / ≤ 80 (affiliation). `description` is `blocks`, and the tool takes plain `descriptionText` (`src/lib/blocks.ts` is in the spec's layout). The {{#m2}} Document Service middlewares (slug, schedule-validate, normalize-contact, pricing-validate) also run on tool writes, since the services write through the Document Service.

### Env vars this step introduces or reads
| Variable | Example | Notes |
|---|---|---|
| `MAPBOX_ACCESS_TOKEN` | `pk.…` | admin map field |
| `MAPBOX_GEOCODING_TOKEN` | `pk.…`/`sk.…` | server-only geocoding (no URL restriction); falls back to the above |
| `MCP_ENABLED` | `true` | |

### API surface row
| Method & path | Role | Returns |
|---|---|---|
| `POST /mcp` | Admin token | Strapi MCP (8 custom tools only) |

## Watch out for
- **Register in `register()`, not `bootstrap()`.** `bootstrap()` runs after the MCP server starts **and** would wipe token grants for actions registered there on every restart.
- **`import { z } from '@strapi/utils'`, NEVER from `'zod'`** (Strapi bundles zod 3). Since {{#m3}} installed `zod@^4` at the top level for the Better Auth dashboard, a bare `'zod'` import now resolves to zod 4. *(added: not in spec: the second sentence)*
- **`registerTool` takes ONE object argument**; the positional form fails.
- **`resolveOutputSchema` is MANDATORY.**
- **Don't gate on `plugin::content-manager.explorer.*`.** It fails silently for subject-less tool policies and would expose the generic CRUD tools.
- **Admin Tokens, not API Tokens:** `/mcp` rejects API tokens. Tick **only** the *MatFinder MCP tools* actions.
- **Never commit the admin token**; keep it in a password manager. Don't paste it into issues, PRs, or `.env.example` either. *(added: not in spec: the last sentence)*
- **Draft-only:** no tool publishes, unpublishes, deletes, or uploads media.
- **Multi-write tools run in `strapi.db.transaction(...)`**; Document Service calls join it.
- **Create, catch, refetch** on unique-index violations (the partial indexes from {{#m2}}).
- **The result-size guard** accounts for the payload being sent twice (`content` + `structuredContent`).
- **Strings over 255 characters** must target `text` fields; enforce `.max(255)` on `string` fields in zod.
- **No geocode result → `GEOCODE_FAILED`** with the address tried.

## Verify during this step
- The exact `createHandler` signature (`async ({ args })` vs `async (args)`) against the blog post and the installed Strapi version.

If a check fails, the deviation protocol applies: stop and ask.

## Done when
These checks also cover the {{#m4}} service methods (`upsertDraft`, `setScheduleDraft`, `listPendingDrafts`); see the forward-reference note above.
- [ ] In Claude Code, `tools/list` shows **exactly** the 8 MatFinder tools (no `list_school` / `update_school` / `publish_*` generic tools)
- [ ] "add <fictional school> at <real Vegas address> with this schedule…" creates a **draft** with a geocoded pin
- [ ] `list_pending_drafts` shows it
- [ ] It does **not** appear in `/api/schools/directory` until published in the admin

## Acceptance criteria this step unlocks
- **AC8 (locally):** `tools/list` shows **only** the 8 MatFinder tools; "add <school>…" creates a **draft** with a geocoded pin and a structured schedule; it is **not** visible in the app; `list_pending_drafts` lists it with its changed fields. Re-run against production MCP in {{#m9}}.

## Out of scope
- Production admin user and production `matfinder-curator` token → {{#m9}}
- Real listings → {{#m9}}
- Sample seed → {{#m8}}
- Automated `tools/list` / `upsert_school` / `set_school_schedule` tests → {{#m9}}

## For the implementing agent
- **Deviation protocol:** commands, structures, versions, and conventions in this spec are **user decisions**. If you (the build agent) want to substitute any of them (build friction, a newer API, a "simpler" alternative), **STOP and ask the user.** Do not silently trade off. This applies especially to: the auth stack, the two-endpoint gate, draft-only MCP tools, and the Vercel same-origin rewrite.
- **Docs:** Strapi: query the `strapi-docs` MCP first; otherwise https://docs.strapi.io (v5). MCP server https://docs.strapi.io/cms/features/strapi-mcp-server · Document Service https://docs.strapi.io/cms/api/document-service · custom MCP tools https://strapi.io/blog/how-to-extend-strapi-s-mcp-server-with-a-custom-tools-via-a-plugin · https://strapi.io/blog/strapi-mcp-tanstack-ai-local-chat
- **Workflow (the spec's rule):** one branch and one pull request per milestone issue, merged into `main` once the milestone's **Done when** check passes; the PR body says `Closes #<issue>`. Merging to `main` deploys Strapi Cloud (and Vercel, once connected). Branch: `m5-mcp`; PR body: `Closes {{#self}}`.
