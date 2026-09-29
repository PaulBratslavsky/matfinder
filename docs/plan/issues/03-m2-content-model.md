> **Part of {{#epic}}** · **M2** (step 3 of 10) · Blocked by: {{#m1}} · Spec: [06-build-spec.md @ 0a488c1](https://github.com/PaulBratslavsky/matfinder/blob/0a488c125ef61fa485f1c71c2d75565debe19de3/docs/plan/06-build-spec.md#m2-content-model-document-service-middlewares-unique-indexes)

## Goal
The four MatFinder content types (city, affiliation, instructor, school) and four components exist exactly as specified; every write gets a slug and validated data through Document Service middlewares; and Postgres enforces slug uniqueness with real indexes.

## Why
- Every later backend step builds on this model: the directory API ({{#m4}}), the MCP tools ({{#m5}}), and the seed ({{#m8}}).
- `uid` fields are **not** auto-filled on API, Document Service, or seed writes (only the admin fills them), so **every** slug-filtered type needs a slug middleware.
- `unique: true` in a schema is validation-layer only, and Document Service writes bypass it, so uniqueness needs **real unique indexes**.

## Implementation spec
- [ ] Delete `src/api/location` and `src/api/category`. Create the four content types and four components **exactly** as in *Reference* below (files under `src/api/<name>/content-types/<name>/schema.json` and `src/components/<category>/<name>.json`, plus the standard `controllers/`, `services/`, `routes/` files using `factories.createCore*`).
  - Write schema files directly. **Do not use `strapi generate` in automation** (it's interactive).
- [ ] Document Service middlewares in `src/document-middlewares/`, registered in `src/index.ts` **`register()`** with `strapi.documents.use(...)`. **Always `return next()`**; reject with `throw new errors.ValidationError(msg, { path })` (`import { errors } from '@strapi/utils'`):
  1. **slug** (`create`, for school / instructor / affiliation / city): `ctx.params.data.slug ??= slugify(ctx.params.data.name)`. `uid` fields are **not** auto-filled on API, Document Service, or seed writes (only the admin fills them), so **every** slug-filtered type needs this. `slugify` = lowercase, strip accents, non-alphanumerics → `-`, trim `-`; **if the result is empty, use `<type>-<6 random chars>`**. Don't regenerate on rename.
  2. **schedule-validate** (school `create` / `update` with `data.schedule`): each row has `endTime > startTime` (compare `HH:mm`), valid enums, and ≤ 100 rows.
  3. **normalize-contact**: `contact.instagram` → handle without `@` or URL; `contact.website` and `affiliation.website` get a `https://` prefix if missing.
  4. **pricing-validate**: fees ≥ 0; `monthlyMax ≥ monthlyMin` when both are set.
  5. **city-validate**: `new Intl.DateTimeFormat('en-US', { timeZone: data.timezone })` must not throw.
- [ ] **Real unique indexes** in `bootstrap()`. `unique: true` in a schema is validation-layer only, and Document Service writes bypass it. Run each statement in its own try/catch and `strapi.log.error` on failure:
  ```ts
  const ddl = [
    `CREATE UNIQUE INDEX IF NOT EXISTS schools_slug_draft_uq ON schools (slug) WHERE published_at IS NULL`,
    `CREATE UNIQUE INDEX IF NOT EXISTS instructors_slug_draft_uq ON instructors (slug) WHERE published_at IS NULL`,
    `CREATE UNIQUE INDEX IF NOT EXISTS affiliations_slug_draft_uq ON affiliations (slug) WHERE published_at IS NULL`,
    `CREATE UNIQUE INDEX IF NOT EXISTS cities_slug_uq ON cities (slug)`,
  ]
  for (const sql of ddl) { try { await strapi.db.connection.raw(sql) } catch (e) { strapi.log.error(`[matfinder] index failed: ${sql}`, e) } }
  ```
  (Draft-and-publish stores a draft row and a published row per document with the same slug, so only the **draft** rows are indexed; there is exactly one per document. Confirm table and column names in Postgres after the first boot.)

## Reference (copied from the spec)

### Target layout (the spec's *Repo layout*, `server/` lines)
```
├── server/                       # Strapi v5 (Strapi Cloud root)
│   ├── config/{server,plugins,middlewares,database,admin,api}.ts
│   ├── src/
│   │   ├── index.ts              # register(): DS middlewares + MCP actions/tools; bootstrap(): indexes, role perms, sample seed
│   │   ├── lib/{slugify,time,geocode,blocks}.ts
│   │   ├── document-middlewares/ # slug, schedule-validate, normalize-contact, pricing-validate, city-validate
│   │   ├── components/{school,schedule}/*.json
│   │   └── api/{city,affiliation,instructor,school}/…
```
This step adds the DS middlewares (`register()`) and the indexes (`bootstrap()`) to `index.ts`, plus `lib/slugify.ts`, `document-middlewares/`, `components/`, and `api/`. The rest arrives in later steps.

### `server/src/api/city/content-types/city/schema.json`
```json
{
  "kind": "collectionType",
  "collectionName": "cities",
  "info": { "singularName": "city", "pluralName": "cities", "displayName": "City" },
  "options": { "draftAndPublish": false },
  "attributes": {
    "name": { "type": "string", "required": true, "unique": true, "maxLength": 80 },
    "slug": { "type": "uid", "targetField": "name", "required": true },
    "state": { "type": "string" },
    "country": { "type": "string", "default": "US" },
    "timezone": { "type": "string", "required": true },
    "center": { "type": "customField", "customField": "global::map-box", "required": true },
    "defaultZoom": { "type": "decimal", "default": 10.5 },
    "schools": { "type": "relation", "relation": "oneToMany", "target": "api::school.school", "mappedBy": "city" }
  }
}
```

### `server/src/api/affiliation/content-types/affiliation/schema.json`
```json
{
  "kind": "collectionType",
  "collectionName": "affiliations",
  "info": { "singularName": "affiliation", "pluralName": "affiliations", "displayName": "Affiliation" },
  "options": { "draftAndPublish": true },
  "attributes": {
    "name": { "type": "string", "required": true, "maxLength": 80 },
    "slug": { "type": "uid", "targetField": "name", "required": true },
    "website": { "type": "string" },
    "logo": { "type": "media", "multiple": false, "allowedTypes": ["images"] },
    "schools": { "type": "relation", "relation": "oneToMany", "target": "api::school.school", "mappedBy": "affiliation" }
  }
}
```

### `server/src/api/instructor/content-types/instructor/schema.json`
```json
{
  "kind": "collectionType",
  "collectionName": "instructors",
  "info": { "singularName": "instructor", "pluralName": "instructors", "displayName": "Instructor" },
  "options": { "draftAndPublish": true },
  "attributes": {
    "name": { "type": "string", "required": true, "maxLength": 120 },
    "slug": { "type": "uid", "targetField": "name", "required": true },
    "beltRank": { "type": "enumeration", "required": true,
      "enum": ["white", "blue", "purple", "brown", "black", "red_black", "red_white", "red"] },
    "degree": { "type": "integer", "min": 0, "max": 10 },
    "photo": { "type": "media", "multiple": false, "allowedTypes": ["images"] },
    "bio": { "type": "text", "maxLength": 1000 },
    "schools": { "type": "relation", "relation": "manyToMany", "target": "api::school.school", "mappedBy": "headInstructors" }
  }
}
```

### `server/src/api/school/content-types/school/schema.json`
```json
{
  "kind": "collectionType",
  "collectionName": "schools",
  "info": { "singularName": "school", "pluralName": "schools", "displayName": "School" },
  "options": { "draftAndPublish": true },
  "attributes": {
    "name": { "type": "string", "required": true, "maxLength": 120 },
    "slug": { "type": "uid", "targetField": "name", "required": true },
    "shortDescription": { "type": "text", "maxLength": 280 },
    "description": { "type": "blocks" },
    "city": { "type": "relation", "relation": "manyToOne", "target": "api::city.city", "inversedBy": "schools" },
    "location": { "type": "customField", "customField": "global::map-box", "required": true },
    "neighborhood": { "type": "string" },
    "postalCode": { "type": "string" },
    "logo": { "type": "media", "multiple": false, "allowedTypes": ["images"] },
    "gallery": { "type": "media", "multiple": true, "allowedTypes": ["images"] },
    "affiliation": { "type": "relation", "relation": "manyToOne", "target": "api::affiliation.affiliation", "inversedBy": "schools" },
    "headInstructors": { "type": "relation", "relation": "manyToMany", "target": "api::instructor.instructor", "inversedBy": "schools" },
    "pricing": { "type": "component", "repeatable": false, "component": "school.pricing" },
    "contact": { "type": "component", "repeatable": false, "component": "school.contact" },
    "amenities": { "type": "component", "repeatable": false, "component": "school.amenities" },
    "schedule": { "type": "component", "repeatable": true, "component": "schedule.session" },
    "lastVerifiedAt": { "type": "date" }
  }
}
```
> `city` is required at the service and tool level (relations can't be marked `required` reliably in the schema). The directory only returns schools whose city matches.

### `server/src/components/school/pricing.json`
```json
{
  "collectionName": "components_school_pricings",
  "info": { "displayName": "Pricing", "icon": "priceTag" },
  "options": {},
  "attributes": {
    "visitorsWelcome": { "type": "boolean", "default": false },
    "dropInFee": { "type": "decimal", "min": 0 },
    "dropInNotes": { "type": "string" },
    "freeTrial": { "type": "boolean", "default": false },
    "freeTrialNotes": { "type": "string" },
    "monthlyMin": { "type": "decimal", "min": 0 },
    "monthlyMax": { "type": "decimal", "min": 0 },
    "currency": { "type": "enumeration", "enum": ["USD"], "default": "USD" }
  }
}
```

### `server/src/components/school/contact.json`
```json
{
  "collectionName": "components_school_contacts",
  "info": { "displayName": "Contact", "icon": "phone" },
  "options": {},
  "attributes": {
    "phone": { "type": "string" },
    "email": { "type": "email" },
    "website": { "type": "string" },
    "instagram": { "type": "string" }
  }
}
```

### `server/src/components/school/amenities.json`
```json
{
  "collectionName": "components_school_amenities",
  "info": { "displayName": "Amenities", "icon": "check" },
  "options": {},
  "attributes": {
    "showers": { "type": "boolean", "default": false },
    "changingRooms": { "type": "boolean", "default": false },
    "parking": { "type": "boolean", "default": false },
    "giRental": { "type": "boolean", "default": false },
    "proShop": { "type": "boolean", "default": false },
    "kidsArea": { "type": "boolean", "default": false },
    "airConditioning": { "type": "boolean", "default": false }
  }
}
```

### `server/src/components/schedule/session.json`
```json
{
  "collectionName": "components_schedule_sessions",
  "info": { "displayName": "Session", "icon": "clock" },
  "options": {},
  "attributes": {
    "day": { "type": "enumeration", "required": true, "enum": ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] },
    "startTime": { "type": "time", "required": true },
    "endTime": { "type": "time", "required": true },
    "classType": { "type": "enumeration", "required": true,
      "enum": ["fundamentals", "all_levels", "advanced", "open_mat", "competition", "kids", "womens"] },
    "style": { "type": "enumeration", "required": true, "enum": ["gi", "nogi", "both"] },
    "notes": { "type": "string" }
  }
}
```
> Icon names must exist in the Strapi design system; if the admin warns, pick another. The `map-box` value is JSON: `{ longitude, latitude, address, zoom, pitch, bearing }`.

**Time storage** (from the spec's *Time rules*): Strapi stores `HH:mm:ss.SSS`; APIs emit `HH:mm`; compare as minutes since midnight. The schedule-validate check `endTime > startTime` should compare on that basis, so the stored `HH:mm:ss.SSS` form and the `HH:mm` form give the same answer. *(added: not in spec: the last sentence)*

## Watch out for
- **No `strapi generate`** in automation (it's interactive). Write the schema, controller, service, and route files directly with `factories.createCore*`.
- **Register middlewares in `register()`** with `strapi.documents.use(...)`, and **always `return next()`**. A middleware that doesn't call `next()` stops the write from happening. *(added: not in spec: the reason)*
- **Reject with `errors.ValidationError`** from `@strapi/utils`, passing a `path`. The MCP tools in {{#m5}} report `VALIDATION_ERROR` with field paths, and these paths are what they can pass on. *(added: not in spec: the link to M5)*
- **Slug on every slug-filtered type** (school, instructor, affiliation, city): `??=`, the empty-result fallback `<type>-<6 random chars>`, and **don't regenerate on rename**.
- **Only draft rows are indexed** for the draft-and-publish types, because the published row repeats the draft's slug. `cities` gets a plain unique index because City has `draftAndPublish: false`. *(added: not in spec: the explanation for cities)*
- **Each DDL statement gets its own try/catch** with `strapi.log.error`, so one failing index doesn't stop the others. *(added: not in spec: the reason)*
- **`city` on school is deliberately not `required` in the schema** (relations can't be marked required reliably). Enforce it at the service and tool level ({{#m4}}, {{#m5}}).
- `center` and `location` use the `global::map-box` custom field from {{#m0}}. If the admin doesn't recognize it, go back to {{#m0}}'s plugin-key check rather than changing the schema. *(added: not in spec)*

## Verify during this step
- Confirm the table and column names in Postgres after the first boot (`schools`, `instructors`, `affiliations`, `cities`, `slug`, `published_at`) before trusting the index DDL.
- The icon names (`priceTag`, `phone`, `check`, `clock`) exist in the Strapi design system; if the admin warns, pick another.

If a check fails, the deviation protocol applies: stop and ask.

## Done when
- [ ] The admin shows all types (City, Affiliation, Instructor, School) and components (Pricing, Contact, Amenities, Session)
- [ ] Creating a school through the Document Service without a slug gets one. For example, from `npx strapi console`: `await strapi.documents('api::school.school').create({ data: { name: 'Test School', location: { … } } })` *(added: not in spec: the console example)*
- [ ] A bad schedule row (`endTime <= startTime`, an invalid enum, or more than 100 rows) is rejected with a `ValidationError`
- [ ] `\d schools` in psql shows the partial unique index, e.g. `psql -U strapi -d matfinder -c '\d schools'` *(added: not in spec: the command)*

## Acceptance criteria this step unlocks
None directly; M4–M8 build on this model.

## Out of scope
- Custom school service methods, controllers, and routes → {{#m4}}
- Role permissions and auth → {{#m3}}
- MCP tools and geocoding → {{#m5}}
- Sample data → {{#m8}}

## For the implementing agent
- **Deviation protocol:** commands, structures, versions, and conventions in this spec are **user decisions**. If you (the build agent) want to substitute any of them (build friction, a newer API, a "simpler" alternative), **STOP and ask the user.** Do not silently trade off. This applies especially to: the auth stack, the two-endpoint gate, draft-only MCP tools, and the Vercel same-origin rewrite.
- **Docs:** Strapi: query the `strapi-docs` MCP first; otherwise https://docs.strapi.io (v5). Document Service https://docs.strapi.io/cms/api/document-service · DS middlewares https://docs.strapi.io/cms/api/document-service/middlewares · routes https://docs.strapi.io/cms/backend-customization/routes · controllers https://docs.strapi.io/cms/backend-customization/controllers
- **Workflow (the spec's rule):** one branch and one pull request per milestone issue, merged into `main` once the milestone's **Done when** check passes; the PR body says `Closes #<issue>`. Merging to `main` deploys Strapi Cloud (and Vercel, once connected). Branch: `m2-content-model`; PR body: `Closes {{#self}}`.
