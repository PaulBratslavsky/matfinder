/**
 * Server integration suite (spec M9): runs against a Strapi with the sample seed. `npm run test:integration:isolated`
 * starts a throwaway one on :1342; `API_URL=… npm run test:integration` targets another server (the MCP checks need
 * ALLOW_ADMIN_BOOTSTRAP on a fresh database and are skipped otherwise).
 */
import { randomBytes } from 'node:crypto';
import { beforeAll, describe, expect, inject, it } from 'vitest';
import { DIRECTORY_FIELDS } from '../src/lib/directory';
import { haversineMiles, type Coords } from '../src/lib/radius';

const API = (process.env.API_URL ?? 'http://localhost:1342').replace(/\/$/, '');
const WEB_ORIGIN = 'http://localhost:8083';
const TOOLS = [
  'list_reference_data',
  'find_schools',
  'get_school_draft',
  'upsert_school',
  'set_school_schedule',
  'upsert_instructor',
  'upsert_affiliation',
  'list_pending_drafts',
  'find_possible_duplicates',
  'add_gym_from_web',
  'upsert_knowledge',
];

const get = (path: string, cookie?: string) => fetch(`${API}${path}`, { headers: cookie ? { cookie } : {} });

async function signUp(): Promise<string> {
  const res = await fetch(`${API}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: WEB_ORIGIN },
    body: JSON.stringify({ name: 'Integration Test', email: `it-${randomBytes(5).toString('hex')}@example.test`, password: randomBytes(12).toString('hex') }),
  });
  expect(res.status).toBe(200);
  return res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
}

let rpcId = 0;
async function mcp(token: string | null, method: string, params: Record<string, unknown> = {}) {
  const res = await fetch(`${API}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params }),
  });
  const text = await res.text();
  const line = text.split('\n').find((l) => l.startsWith('data: '));
  return { status: res.status, body: line ? JSON.parse(line.slice(6)) : text ? JSON.parse(text) : null };
}
async function callTool(token: string, name: string, args: Record<string, unknown>) {
  const { body } = await mcp(token, 'tools/call', { name, arguments: args });
  const result = body.result;
  return { isError: !!result.isError, data: result.structuredContent, error: result.isError ? JSON.parse(result.content[0].text) : null };
}

describe('public directory', () => {
  it('lists the published sample schools with exactly the public field set', async () => {
    const res = await get('/api/schools/directory?city=las-vegas');
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('public, max-age=60');
    const { data } = await res.json();
    expect(Object.keys(data)).toEqual(['city', 'localDate', 'weekday', 'generatedAt', 'schools']);
    expect(Object.keys(data.city)).toEqual(['slug', 'name', 'timezone', 'center', 'defaultZoom']);
    expect(data.schools.length).toBeGreaterThanOrEqual(8);
    for (const s of data.schools) expect(Object.keys(s)).toEqual([...DIRECTORY_FIELDS]);
    for (const s of data.schools) for (const t of s.todaySessions) expect(Object.keys(t)).toEqual(['start', 'end', 'classType', 'style']);
  });

  it('needs a city and 404s an unknown one', async () => {
    expect((await get('/api/schools/directory')).status).toBe(400);
    expect((await get('/api/schools/directory?city=reno')).status).toBe(404);
  });

  it('serves cities publicly (core find)', async () => {
    expect((await get('/api/cities')).status).toBe(200);
  });
});

describe('the account gate', () => {
  it('bySlug is 401/403 signed out, then 200 after signing up', async () => {
    const slug = 'sample-summerlin-bjj-demo';
    expect([401, 403]).toContain((await get(`/api/schools/slug/${slug}`)).status);
    const cookie = await signUp();
    const res = await get(`/api/schools/slug/${slug}`, cookie);
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.slug).toBe(slug);
    expect(data.schedule.length).toBeGreaterThan(0);
    expect(data.headInstructors.length).toBeGreaterThan(0);
    expect(data.pricing).toBeTruthy();
    expect((await get('/api/schools/slug/no-such-school', cookie)).status).toBe(404);
  });

  it('core school, instructor and affiliation routes are closed to everyone', async () => {
    const cookie = await signUp();
    for (const path of ['/api/schools', '/api/instructors', '/api/affiliations']) {
      expect((await get(path)).status).toBe(403);
      expect((await get(path, cookie)).status).toBe(403);
    }
  });
});

describe('MCP (curator tools)', () => {
  let token: string | null = null;

  beforeAll(async () => {
    const jwt = inject('adminJwt');
    if (!jwt) return;
    const res = await fetch(`${API}/admin/admin-tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({
        name: `it-curator-${randomBytes(3).toString('hex')}`,
        lifespan: null,
        adminPermissions: TOOLS.map((t) => ({ action: `plugin::matfinder.mcp.${t.replace(/_/g, '-')}` })),
      }),
    });
    expect(res.status).toBe(201);
    token = (await res.json()).data.accessKey;
  });

  it('tools/list with the curator token shows exactly the 11 MatFinder tools', async (ctx) => {
    if (!token) return ctx.skip();
    const { body } = await mcp(token, 'tools/list');
    expect(body.result.tools.map((t: { name: string }) => t.name).sort()).toEqual([...TOOLS].sort());
  });

  it('rejects a call without a token', async () => {
    const { status, body } = await mcp(null, 'tools/list');
    expect(status === 401 || !!body?.error).toBe(true);
  });

  it('upsert_school publishes the gym straight to the directory, and its updates too', async (ctx) => {
    if (!token) return ctx.skip();
    const r = await callTool(token, 'upsert_school', {
      name: `Integration Agent Gym ${randomBytes(3).toString('hex')} (Demo)`,
      citySlug: 'las-vegas',
      address: '1 Test Way, Las Vegas, NV',
      latitude: 36.17,
      longitude: -115.14,
    });
    expect(r.isError).toBe(false);
    expect(r.data).toMatchObject({ created: true, status: 'published' });
    expect(r.data).not.toHaveProperty('notPublishedBecause');
    const directory = async () => (await (await get('/api/schools/directory?city=las-vegas')).json()).data.schools;
    // No visitor policy given: unknown (null), not "members only".
    expect((await directory()).find((s: { slug: string }) => s.slug === r.data.slug)).toMatchObject({ visitorsWelcome: null });

    const u = await callTool(token, 'upsert_school', { slug: r.data.slug, pricing: { visitorsWelcome: true, dropInFee: 20 } });
    expect(u.data).toMatchObject({ created: false, changedFields: ['pricing'], status: 'published' });
    expect((await directory()).find((s: { slug: string }) => s.slug === r.data.slug)).toMatchObject({ visitorsWelcome: true, dropInFee: 20 });
    const pending = await callTool(token, 'list_pending_drafts', { type: 'school' });
    expect(pending.data.items.map((i: { slug: string }) => i.slug)).not.toContain(r.data.slug);
  });

  it('set_school_schedule rejects end <= start with the field path', async (ctx) => {
    if (!token) return ctx.skip();
    const r = await callTool(token, 'set_school_schedule', {
      slug: 'sample-summerlin-bjj-demo',
      sessions: [{ day: 'mon', start: '19:00', end: '19:00', classType: 'open_mat', style: 'gi' }],
    });
    expect(r.isError).toBe(true);
    expect(r.error).toMatchObject({ error: 'VALIDATION_ERROR', path: ['sessions', 0, 'end'] });
  });

  it('stores a website longer than 255 characters, and refuses one over 500', async (ctx) => {
    if (!token) return ctx.skip();
    const long = `example.com/${'a'.repeat(380)}`; // 392 characters; 400 once https:// is added
    const r = await callTool(token, 'upsert_school', {
      name: `Integration Long URL ${randomBytes(3).toString('hex')} (Demo)`,
      citySlug: 'las-vegas',
      address: '2 Test Way, Las Vegas, NV',
      latitude: 36.18,
      longitude: -115.15,
      contact: { website: long },
    });
    expect(r.isError).toBe(false);
    const draft = await callTool(token, 'get_school_draft', { slug: r.data.slug });
    expect(draft.data.contact.website).toBe(`https://${long}`);

    const tooLong = await mcp(token, 'tools/call', { name: 'upsert_school', arguments: { slug: r.data.slug, contact: { website: `example.com/${'a'.repeat(500)}` } } });
    expect(!!tooLong.body.error || !!tooLong.body.result?.isError).toBe(true);
    expect((await callTool(token, 'get_school_draft', { slug: r.data.slug })).data.contact.website).toBe(`https://${long}`);
  });

  it("doesn't publish over a person's unpublished edits", async (ctx) => {
    if (!token) return ctx.skip();
    const jwt = inject('adminJwt');
    const r = await callTool(token, 'upsert_school', {
      name: `Integration Person Edit ${randomBytes(3).toString('hex')} (Demo)`,
      citySlug: 'las-vegas', address: '5 Test Way, Las Vegas, NV', latitude: 36.19, longitude: -115.16,
    });
    expect(r.data.status).toBe('published');
    // A person saves a draft change in the admin without publishing.
    const save = await fetch(`${API}/content-manager/collection-types/api::school.school/${r.data.documentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ neighborhood: 'Edited by a person' }),
    });
    expect(save.status).toBe(200);
    const u = await callTool(token, 'upsert_school', { slug: r.data.slug, pricing: { visitorsWelcome: true } });
    expect(u.data).toMatchObject({ status: 'unpublished-changes' });
    expect(u.data.notPublishedBecause).toMatch(/unpublished changes before this write/);
    const dir = (await (await get('/api/schools/directory?city=las-vegas')).json()).data.schools;
    expect(dir.find((s: { slug: string }) => s.slug === r.data.slug)).toMatchObject({ visitorsWelcome: null });
  });
});

describe('gyms from the web (MCP)', () => {
  let token: string | null = null;
  const jwt = () => inject('adminJwt');
  const asAdmin = () => ({ headers: { Authorization: `Bearer ${jwt()}` } });

  beforeAll(async () => {
    if (!jwt()) return;
    const res = await fetch(`${API}/admin/admin-tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt()}` },
      body: JSON.stringify({
        name: `it-web-agent-${randomBytes(3).toString('hex')}`,
        lifespan: null,
        adminPermissions: TOOLS.map((t) => ({ action: `plugin::matfinder.mcp.${t.replace(/_/g, '-')}` })),
      }),
    });
    expect(res.status).toBe(201);
    token = (await res.json()).data.accessKey;
  });

  it('flags a gym that is already listed', async (ctx) => {
    if (!token) return ctx.skip();
    const r = await callTool(token, 'add_gym_from_web', {
      citySlug: 'las-vegas',
      name: 'Summerlin Gracie Jiu-Jitsu',
      address: '1 Sample Way, Las Vegas, NV',
      phone: '(702) 555-0101',
      latitude: 36.17,
      longitude: -115.14,
      sourceUrls: ['https://example.com/summerlin'],
    });
    expect(r.isError).toBe(true);
    expect(r.error.error).toBe('DUPLICATE_SUSPECTED');
    expect(r.error.candidates.map((c: { slug: string }) => c.slug)).toContain('sample-summerlin-bjj-demo');

    const check = await callTool(token, 'find_possible_duplicates', { citySlug: 'las-vegas', name: 'Nothing Alike Grappling', latitude: 36.4, longitude: -115.6 });
    expect(check.isError).toBe(false);
    expect(check.data.candidates).toEqual([]);
  });

  it('adds a new gym with its sources and publishes it, keeping the private fields out of public responses', async (ctx) => {
    if (!token) return ctx.skip();
    const name = `Integration Web Gym ${randomBytes(3).toString('hex')} (Demo)`;
    const r = await callTool(token, 'add_gym_from_web', {
      citySlug: 'las-vegas',
      name,
      address: '99 Web Way, Las Vegas, NV',
      latitude: 36.29,
      longitude: -115.29,
      website: 'https://example.com/integration-web-gym',
      sourceUrls: ['https://example.com/integration-web-gym', 'https://maps.example.com/place/123'],
    });
    expect(r.isError).toBe(false);
    expect(r.data).toMatchObject({ status: 'published', sourceUrls: ['https://example.com/integration-web-gym', 'https://maps.example.com/place/123'] });

    const sched = await callTool(token, 'set_school_schedule', {
      slug: r.data.slug,
      sessions: [{ day: 'tue', start: '18:00', end: '19:30', classType: 'fundamentals', style: 'gi' }],
    });
    expect(sched.data).toMatchObject({ slug: r.data.slug, sessionCount: 1, status: 'published' });

    const fromWeb = await (await fetch(`${API}/matfinder/from-web`, asAdmin())).json();
    const item = fromWeb.items.find((g: { slug: string }) => g.slug === r.data.slug);
    expect(item).toMatchObject({ name, sourceUrls: r.data.sourceUrls, city: { slug: 'las-vegas' }, status: 'published' });
    expect(item.discoveredAt).toEqual(expect.any(String));

    const summary = await (await fetch(`${API}/matfinder/summary`, asAdmin())).json();
    expect(summary.gyms.fromWeb).toMatchObject({ total: fromWeb.total, notLive: fromWeb.notLive, thisWeek: fromWeb.thisWeek });
    expect(summary.gyms.fromWeb.thisWeek).toBeGreaterThanOrEqual(1);
    const gyms = await (await fetch(`${API}/matfinder/gyms?search=${encodeURIComponent(name)}`, asAdmin())).json();
    expect(gyms.items[0]).toMatchObject({ slug: r.data.slug, origin: 'web-agent' });

    // Live in the public directory and on its page, without the private fields.
    const dir = await (await get('/api/schools/directory?city=las-vegas')).json();
    const listed = dir.data.schools.find((s: { slug: string }) => s.slug === r.data.slug);
    expect(listed).toBeTruthy();
    const page = await (await get(`/api/schools/slug/${r.data.slug}`, await signUp())).json();
    expect(page.data).toMatchObject({ slug: r.data.slug, name });
    expect(page.data.schedule).toHaveLength(1);
    for (const field of ['origin', 'sourceUrls', 'discoveredAt']) {
      expect(listed).not.toHaveProperty(field);
      expect(page.data).not.toHaveProperty(field);
    }
  });

  it('offers the find_new_gyms prompt', async (ctx) => {
    if (!token) return ctx.skip();
    const list = await mcp(token, 'prompts/list');
    expect(list.body.result.prompts.map((p: { name: string }) => p.name)).toContain('find_new_gyms');
    const got = await mcp(token, 'prompts/get', { name: 'find_new_gyms', arguments: { city: 'las-vegas', area: 'Summerlin' } });
    expect(got.body.result.messages[0].content.text).toMatch(/Summerlin in las-vegas/);
  });

  it('never overwrites: a confirmed same-name gym gets a new slug and the listed one is unchanged', async (ctx) => {
    if (!token) return ctx.skip();
    const before = await callTool(token, 'get_school_draft', { slug: 'sample-summerlin-bjj-demo' });
    const r = await callTool(token, 'add_gym_from_web', {
      citySlug: 'las-vegas',
      name: before.data.name,
      address: '3 Other Way, Las Vegas, NV',
      latitude: 36.25,
      longitude: -115.25,
      sourceUrls: ['https://example.com/other-summerlin'],
      confirmNotDuplicate: true,
    });
    expect(r.isError).toBe(false);
    expect(r.data.slug).toBe('sample-summerlin-bjj-demo-las-vegas');
    const after = await callTool(token, 'get_school_draft', { slug: 'sample-summerlin-bjj-demo' });
    expect(after.data).toMatchObject({ documentId: before.data.documentId, city: before.data.city, location: before.data.location, updatedAt: before.data.updatedAt });
  });

  it('a same-named gym in another city is created there; a shared phone across cities is flagged', async (ctx) => {
    if (!token) return ctx.skip();
    const hex = randomBytes(3).toString('hex');
    const citySlug = `it-city-${hex}`;
    const cityRes = await fetch(`${API}/content-manager/collection-types/api::city.city`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt()}` },
      body: JSON.stringify({
        // Far from every other city (Honolulu), so it never becomes the nearby test's "nearest city with gyms".
        name: `Integration City ${hex}`, slug: citySlug, timezone: 'Pacific/Honolulu',
        center: { longitude: -157.86, latitude: 21.31, address: 'Integration City', zoom: 10.5, pitch: 0, bearing: 0 },
      }),
    });
    expect([200, 201]).toContain(cityRes.status);
    const lv = await callTool(token, 'get_school_draft', { slug: 'sample-summerlin-bjj-demo' });

    const flagged = await callTool(token, 'add_gym_from_web', {
      citySlug, name: 'Totally Different Grappling', address: '1 Pearl St', latitude: 21.32, longitude: -157.87,
      phone: lv.data.contact.phone, sourceUrls: ['https://example.com/tdg'],
    });
    expect(flagged.isError).toBe(true);
    expect(flagged.error.error).toBe('DUPLICATE_SUSPECTED');
    const c = flagged.error.candidates.find((x: { slug: string }) => x.slug === 'sample-summerlin-bjj-demo');
    expect(c.reasons).toEqual(expect.arrayContaining(['same phone', 'in another city (las-vegas)']));

    const created = await callTool(token, 'add_gym_from_web', {
      citySlug, name: lv.data.name, address: '2 Pearl St', latitude: 21.33, longitude: -157.88, sourceUrls: ['https://example.com/it-summerlin'],
    });
    expect(created.isError).toBe(false);
    expect(created.data.slug).toBe(`sample-summerlin-bjj-demo-${citySlug}`);
    const lvAfter = await callTool(token, 'get_school_draft', { slug: 'sample-summerlin-bjj-demo' });
    expect(lvAfter.data).toMatchObject({ city: { slug: 'las-vegas' }, location: lv.data.location, updatedAt: lv.data.updatedAt });
  });

  it('upsert_school without a slug creates, never updates a same-named gym', async (ctx) => {
    if (!token) return ctx.skip();
    const lv = await callTool(token, 'get_school_draft', { slug: 'sample-summerlin-bjj-demo' });
    const r = await callTool(token, 'upsert_school', { name: lv.data.name, citySlug: 'las-vegas', address: '4 Test Way', latitude: 36.2, longitude: -115.2 });
    expect(r.data).toMatchObject({ created: true });
    expect(r.data.slug).not.toBe('sample-summerlin-bjj-demo');
    expect((await callTool(token, 'get_school_draft', { slug: 'sample-summerlin-bjj-demo' })).data.updatedAt).toBe(lv.data.updatedAt);
  });
});

describe('MatFinder plugin admin API', () => {
  const asAdmin = (jwt: string) => ({ headers: { Authorization: `Bearer ${jwt}` } });

  it('lists every gym with its publish status, and totals that match', async (ctx) => {
    const jwt = inject('adminJwt');
    if (!jwt) return ctx.skip();
    const list = await fetch(`${API}/matfinder/gyms?limit=50`, asAdmin(jwt));
    expect(list.status).toBe(200);
    const gyms = await list.json();
    expect(gyms.total).toBeGreaterThanOrEqual(8);
    expect(gyms.items[0]).toMatchObject({ documentId: expect.any(String), slug: expect.any(String), name: expect.any(String) });
    expect(['published', 'unpublished-changes', 'never-published']).toContain(gyms.items[0].status);

    const summary = await (await fetch(`${API}/matfinder/summary`, asAdmin(jwt))).json();
    expect(summary.gyms.total).toBe(gyms.total);
    expect(summary.gyms.published + summary.gyms.unpublishedChanges + summary.gyms.neverPublished).toBe(gyms.total);
    expect(summary.gyms.published).toBeGreaterThanOrEqual(8);
  });

  it('filters by status and search', async (ctx) => {
    const jwt = inject('adminJwt');
    if (!jwt) return ctx.skip();
    const published = await (await fetch(`${API}/matfinder/gyms?status=published&search=summerlin`, asAdmin(jwt))).json();
    expect(published.items.map((g: { slug: string }) => g.slug)).toContain('sample-summerlin-bjj-demo');
    expect(published.items.every((g: { status: string }) => g.status === 'published')).toBe(true);
    expect((await fetch(`${API}/matfinder/gyms?status=nope`, asAdmin(jwt))).status).toBe(400);
  });

  it('refuses requests without an admin session', async () => {
    expect((await fetch(`${API}/matfinder/gyms`)).status).toBe(401);
    expect((await fetch(`${API}/matfinder/summary`)).status).toBe(401);
  });
});

describe('gym claims', () => {
  const SLUG = 'sample-summerlin-bjj-demo';
  const json = (method: string, body: unknown, cookie?: string, jwt?: string) => ({
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}), ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
    body: JSON.stringify(body),
  });
  const claim = (cookie: string | undefined, body: Record<string, unknown>) => fetch(`${API}/api/matfinder/claims`, json('POST', body, cookie));
  const act = (jwt: string, id: string, action: string, note?: string) =>
    fetch(`${API}/matfinder/claims/${id}/${action}`, json('POST', note ? { note } : {}, undefined, jwt));
  const claimed = async () => {
    const dir = await (await get('/api/schools/directory?city=las-vegas')).json();
    return dir.data.schools.find((s: { slug: string }) => s.slug === SLUG).claimed;
  };

  /** An admin with only plugin::matfinder.read (no claims.review), through the admin registration flow. */
  async function readOnlyAdmin(superJwt: string): Promise<string> {
    const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${superJwt}` };
    const role = (await (await fetch(`${API}/admin/roles`, { method: 'POST', headers: auth, body: JSON.stringify({ name: `it-readonly-${randomBytes(3).toString('hex')}`, description: 'read only' }) })).json()).data;
    await fetch(`${API}/admin/roles/${role.id}/permissions`, {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({ permissions: [{ action: 'plugin::matfinder.read', subject: null, properties: {}, conditions: [] }] }),
    });
    const user = (
      await (await fetch(`${API}/admin/users`, { method: 'POST', headers: auth, body: JSON.stringify({ firstname: 'Read', lastname: 'Only', email: `it-ro-${randomBytes(4).toString('hex')}@example.test`, roles: [role.id] }) })).json()
    ).data;
    const reg = await fetch(`${API}/admin/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationToken: user.registrationToken, userInfo: { firstname: 'Read', lastname: 'Only', password: `Aa1${randomBytes(8).toString('hex')}` } }),
    });
    return (await reg.json()).data.token;
  }

  it('a signed-in owner claims a gym; bad and repeated claims are refused', async () => {
    expect((await claim(undefined, { schoolSlug: SLUG, role: 'owner', phone: '702-555-0199' })).status).toBeGreaterThanOrEqual(401);
    const owner = await signUp();
    expect((await claim(owner, { schoolSlug: 'no-such-gym', role: 'owner', phone: '702-555-0199' })).status).toBe(404);
    expect((await claim(owner, { schoolSlug: SLUG, role: 'owner', phone: 'call me' })).status).toBe(422);

    const res = await claim(owner, { schoolSlug: SLUG, role: 'owner', phone: '702-555-0199', message: 'I run the morning classes.' });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ status: 'pending' });
    const again = await claim(owner, { schoolSlug: SLUG, role: 'owner', phone: '702-555-0199' });
    expect(again.status).toBe(409);
    expect((await again.json()).error.name).toBe('CLAIM_OPEN');
    const mine = await (await get(`/api/matfinder/claims/mine?school=${SLUG}`, owner)).json();
    expect(mine.status).toBe('pending');
    // Unknown gym: no claim, not an error.
    expect(await (await get('/api/matfinder/claims/mine?school=no-such-gym', owner)).json()).toEqual({ status: null, createdAt: null });
    expect(await claimed()).toBe(false);
  });

  it('an admin contacts the owner and accepts; the gym shows as claimed, and no one else can claim it', async (ctx) => {
    const jwt = inject('adminJwt');
    if (!jwt) return ctx.skip();
    const board = await (await fetch(`${API}/matfinder/claims?status=pending`, { headers: { Authorization: `Bearer ${jwt}` } })).json();
    const c = board.items.find((x: { schoolSlug: string }) => x.schoolSlug === SLUG);
    expect(c).toMatchObject({ role: 'owner', phone: '702-555-0199', message: 'I run the morning classes.', status: 'pending' });
    expect(c).not.toHaveProperty('userId');

    // An admin who can see the board but not review gets 403.
    expect((await act(await readOnlyAdmin(jwt), c.documentId, 'accept')).status).toBe(403);

    expect((await act(jwt, c.documentId, 'contacted', 'Called, confirmed by the front desk.')).status).toBe(200);
    expect((await act(jwt, c.documentId, 'reject')).status).toBe(422); // a rejection needs a note
    const accepted = await act(jwt, c.documentId, 'accept');
    expect(accepted.status).toBe(200);
    expect(await accepted.json()).toEqual({ status: 'accepted' });
    expect((await act(jwt, c.documentId, 'accept')).status).toBe(409);

    expect(await claimed()).toBe(true);
    const page = await (await get(`/api/schools/slug/${SLUG}`, await signUp())).json();
    expect(page.data.claimed).toBe(true);
    const other = await claim(await signUp(), { schoolSlug: SLUG, role: 'manager', phone: '702-555-0198' });
    expect(other.status).toBe(409);
    expect((await other.json()).error.name).toBe('ALREADY_CLAIMED');

    const summary = await (await fetch(`${API}/matfinder/summary`, { headers: { Authorization: `Bearer ${jwt}` } })).json();
    expect(summary.gyms.claimed).toBeGreaterThanOrEqual(1);
    const gyms = await (await fetch(`${API}/matfinder/gyms?search=summerlin`, { headers: { Authorization: `Bearer ${jwt}` } })).json();
    expect(gyms.items.find((g: { slug: string }) => g.slug === SLUG).claim.owner).toBe('Integration Test');

    // Removing the owner frees the gym again (a reason is required).
    expect((await act(jwt, c.documentId, 'remove-owner')).status).toBe(422);
    expect((await act(jwt, c.documentId, 'remove-owner', 'Owner sold the gym.')).status).toBe(200);
    expect(await claimed()).toBe(false);
  });

  it('a double tap makes one claim, and two admins accepting rivals makes one owner (B-5)', async (ctx) => {
    const RACE = 'sample-henderson-grappling-demo';
    const body = { schoolSlug: RACE, role: 'owner', phone: '702-555-0177' };
    const tapper = await signUp();
    const taps = await Promise.all([claim(tapper, body), claim(tapper, body)]);
    expect(taps.map((r) => r.status).sort()).toEqual([201, 409]);
    expect((await taps.find((r) => r.status === 409)!.json()).error.name).toBe('CLAIM_OPEN');

    const jwt = inject('adminJwt');
    if (!jwt) return ctx.skip();
    expect((await claim(await signUp(), { ...body, role: 'manager' })).status).toBe(201);
    const board = await (await fetch(`${API}/matfinder/claims?status=pending`, { headers: { Authorization: `Bearer ${jwt}` } })).json();
    const rivals = board.items.filter((x: { schoolSlug: string }) => x.schoolSlug === RACE);
    expect(rivals).toHaveLength(2);
    const accepts = await Promise.all(rivals.map((c: { documentId: string }) => act(jwt, c.documentId, 'accept')));
    expect(accepts.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(['ALREADY_CLAIMED', 'INVALID_STATE']).toContain((await accepts.find((r) => r.status === 409)!.json()).error.name);
    const accepted = await (await fetch(`${API}/matfinder/claims?status=accepted`, { headers: { Authorization: `Bearer ${jwt}` } })).json();
    const owners = accepted.items.filter((x: { schoolSlug: string }) => x.schoolSlug === RACE);
    expect(owners).toHaveLength(1);
    // Leave the gym unclaimed for later tests.
    expect((await act(jwt, owners[0].documentId, 'remove-owner', 'Integration test cleanup.')).status).toBe(200);
  });
});

describe('gym chat (scripted model)', () => {
  // The test server answers from a script (MATFINDER_AI_SCRIPTED): the answer repeats what the model would have read.
  const SLUG = 'sample-summerlin-bjj-demo';
  const jwt = () => inject('adminJwt');
  const runInput = (questions: string[]) => ({
    threadId: `t-${randomBytes(3).toString('hex')}`,
    runId: `r-${randomBytes(3).toString('hex')}`,
    state: {},
    tools: [],
    context: [],
    forwardedProps: {},
    messages: questions.map((content, i) => ({ id: `u${i}`, role: 'user', content })),
  });
  const ask = (cookie: string | undefined, questions: string[], slug = SLUG) =>
    fetch(`${API}/api/matfinder/schools/${slug}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(runInput(questions)),
    });
  /** The stream's events and the answer text. */
  const read = async (res: Response) => {
    const events = (await res.text())
      .split('\n\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line.replace(/^data: /, '')));
    return { events, answer: events.filter((e) => e.type === 'TEXT_MESSAGE_CONTENT').map((e) => e.delta).join('') };
  };
  let user: string;
  beforeAll(async () => {
    user = await signUp();
  });

  it('tells a signed-in user it is ready, and refuses someone signed out', async () => {
    expect(await (await get('/api/matfinder/chat/status', user)).json()).toEqual({ ready: true });
    expect([401, 403]).toContain((await get('/api/matfinder/chat/status')).status);
    expect([401, 403]).toContain((await ask(undefined, ['Hi'])).status);
  });

  it("streams an answer read from the gym's page, its published knowledge and the general entries only", async (ctx) => {
    if (!jwt()) return ctx.skip();
    // A draft entry for this gym: never published, so the chat must not read it.
    const draft = await fetch(`${API}/content-manager/collection-types/plugin::matfinder.knowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt()}` },
      body: JSON.stringify({ question: 'Secret draft question?', answer: 'Draft answer.', category: 'other', source: 'admin' }),
    });
    expect(draft.status).toBe(201);

    const res = await ask(user, ['Where do I park?']);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const { events, answer } = await read(res);
    expect(events.filter((e) => e.type === 'TEXT_MESSAGE_CONTENT').length).toBeGreaterThan(1); // streamed in pieces
    expect(events.at(-1).type).toBe('RUN_FINISHED');
    expect(answer).toContain('You asked: Where do I park?');
    expect(answer).toContain('Name: Sample Summerlin BJJ (Demo)');
    expect(answer).toMatch(/- (Monday|Wednesday|Saturday) \d{2}:\d{2}/); // the schedule, in words
    expect(answer).toContain('Free parking in the lot behind the building'); // this gym's entry
    expect(answer).toContain('What should I bring to a first BJJ class?'); // a general entry
    expect(answer).not.toContain('two-car garage'); // another gym's entry
    expect(answer).not.toContain('Secret draft question?');
    expect(answer).toContain('Now at the gym:');
  });

  it('answers a refusal as a RUN_ERROR in words: unknown gym, 13th question, long question', async () => {
    const error = async (res: Response) => (await read(res)).events[0];
    expect(await error(await ask(user, ['Hi'], 'no-such-gym-demo'))).toMatchObject({ type: 'RUN_ERROR', code: 'not_found' });
    expect(await error(await ask(user, Array.from({ length: 13 }, () => 'Hi')))).toMatchObject({ type: 'RUN_ERROR', code: 'chat_too_long' });
    expect(await error(await ask(user, ['x'.repeat(501)]))).toMatchObject({
      type: 'RUN_ERROR',
      code: 'question_too_long',
      message: 'That question is too long. Keep it under 500 characters.',
    });
  });

  it('refuses a body that is not a chat request with a 400', async () => {
    const res = await fetch(`${API}/api/matfinder/schools/${SLUG}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: user },
      body: JSON.stringify({ question: 'Where do I park?' }),
    });
    expect(res.status).toBe(400);
  });

  it('an agent adds knowledge with upsert_knowledge, live right away, and the chat reads it', async (ctx) => {
    if (!jwt()) return ctx.skip();
    const tokenRes = await fetch(`${API}/admin/admin-tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt()}` },
      body: JSON.stringify({ name: `it-knowledge-${randomBytes(3).toString('hex')}`, lifespan: null, adminPermissions: [{ action: 'plugin::matfinder.mcp.upsert-knowledge' }] }),
    });
    expect(tokenRes.status).toBe(201);
    const token = (await tokenRes.json()).data.accessKey;
    const args = {
      schoolSlug: SLUG,
      question: 'Is there a mat fee for visitors?',
      answer: 'Visitors pay the drop-in fee and sign a waiver at the desk.',
      category: 'visiting',
      sourceUrls: ['https://example.com/summerlin/visitors'],
    };
    const first = await callTool(token, 'upsert_knowledge', args);
    expect(first.isError).toBe(false);
    expect(first.data).toMatchObject({ created: true, schoolSlug: SLUG, status: 'published' });
    const again = await callTool(token, 'upsert_knowledge', { ...args, question: 'IS THERE A MAT FEE FOR VISITORS?', answer: 'Visitors pay the drop-in fee.' });
    expect(again.data).toMatchObject({ id: first.data.id, created: false, status: 'published' });
    const unknown = await callTool(token, 'upsert_knowledge', { ...args, schoolSlug: 'no-such-gym-demo' });
    expect(unknown).toMatchObject({ isError: true, error: { error: 'NOT_FOUND' } });

    const { answer } = await read(await ask(user, ['Do visitors pay a mat fee?']));
    expect(answer).toContain('Visitors pay the drop-in fee.');
    expect(answer).not.toContain('sign a waiver at the desk');
  });
});

describe('nearby gyms (plan 08, M14)', () => {
  const VEGAS = { latitude: 36.1699, longitude: -115.1398 };
  const nearby = async (q: string) => {
    const res = await get(`/api/schools/nearby?${q}`);
    return { status: res.status, headers: res.headers, data: res.status === 200 ? (await res.json()).data : null };
  };
  const slugsNear = async (lat: number, lng: number, radius = 1) =>
    ((await nearby(`lat=${lat}&lng=${lng}&radius=${radius}`)).data.schools as { slug: string }[]).map((s) => s.slug);

  it('returns every published gym within 25 mi of Las Vegas, nearest first, with its city and local time', async () => {
    const { status, headers, data } = await nearby(`lat=${VEGAS.latitude}&lng=${VEGAS.longitude}`);
    expect(status).toBe(200);
    expect(headers.get('cache-control')).toBe('public, max-age=60');
    expect(Object.keys(data)).toEqual(['center', 'radius', 'generatedAt', 'truncated', 'cities', 'schools', 'nearest']);
    expect(data).toMatchObject({ center: VEGAS, radius: 25, truncated: false, nearest: null });

    // The same gyms the city directory lists, keeping only those within 25 mi of the center.
    const directory = (await (await get('/api/schools/directory?city=las-vegas')).json()).data;
    const expected = directory.schools.filter((s: Coords) => haversineMiles(VEGAS, s) <= 25).map((s: { slug: string }) => s.slug);
    expect(data.schools.length).toBeGreaterThanOrEqual(8);
    expect(data.schools.map((s: { slug: string }) => s.slug).sort()).toEqual([...expected].sort());

    const miles = data.schools.map((s: { distanceMiles: number }) => s.distanceMiles);
    expect(miles).toEqual([...miles].sort((a, b) => a - b));
    for (const s of data.schools) {
      expect(Object.keys(s)).toEqual([...DIRECTORY_FIELDS, 'citySlug', 'distanceMiles']);
      expect(s.citySlug).toBe('las-vegas');
    }
    expect(data.cities['las-vegas']).toEqual({
      name: 'Las Vegas',
      state: expect.anything(),
      timezone: directory.city.timezone,
      localDate: directory.localDate,
      weekday: directory.weekday,
    });
  });

  it('finds nothing far from every gym, and names the nearest city that has gyms', async () => {
    // 40 mi north of Las Vegas, 10 mi radius.
    const north = await nearby('lat=36.75&lng=-115.14&radius=10');
    expect(north.data.schools).toEqual([]);
    expect(north.data.cities).toEqual({});
    expect(north.data.nearest).toMatchObject({ citySlug: 'las-vegas', name: 'Las Vegas', center: VEGAS });
    expect(north.data.nearest.distanceMiles).toBeGreaterThan(35);
    expect(north.data.nearest.distanceMiles).toBeLessThan(45);

    // West Hartford, CT: still Las Vegas, about 2,260 mi away.
    const ct = await nearby('lat=41.762&lng=-72.742');
    expect(ct.data.schools).toEqual([]);
    expect(ct.data.nearest).toMatchObject({ citySlug: 'las-vegas' });
    expect(ct.data.nearest.distanceMiles).toBeGreaterThan(2000);
  });

  it('checks its input: lat and lng are required, the radius is clamped to 1-100', async () => {
    expect((await nearby('lat=abc&lng=-115')).status).toBe(400);
    expect((await nearby('lat=36.17')).status).toBe(400);
    expect((await nearby('lat=95&lng=-115')).status).toBe(400);
    expect((await nearby('lat=36.17&lng=-115.14&radius=0')).status).toBe(400);
    expect((await nearby('lat=36.17&lng=-115.14&radius=-3')).status).toBe(400);
    expect((await nearby('lat=36.17&lng=-115.14&radius=500')).data.radius).toBe(100);
    expect((await nearby('lat=36.17&lng=-115.14&radius=0.2')).data.radius).toBe(1);
  });

  it('keeps a gym findable at its pin as MCP writes move it (the columns follow the map field)', async (ctx) => {
    const jwt = inject('adminJwt');
    if (!jwt) return ctx.skip();
    const tokenRes = await fetch(`${API}/admin/admin-tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({
        name: `it-nearby-${randomBytes(3).toString('hex')}`,
        lifespan: null,
        adminPermissions: TOOLS.map((t) => ({ action: `plugin::matfinder.mcp.${t.replace(/_/g, '-')}` })),
      }),
    });
    expect(tokenRes.status).toBe(201);
    const token = (await tokenRes.json()).data.accessKey;

    const created = await callTool(token, 'upsert_school', {
      name: `Integration Nearby Gym ${randomBytes(3).toString('hex')} (Demo)`,
      citySlug: 'las-vegas',
      address: '1 Pin Way, Las Vegas, NV',
      latitude: 36.45,
      longitude: -114.95,
    });
    expect(created.data).toMatchObject({ created: true, status: 'published' });
    const slug = created.data.slug;
    expect(await slugsNear(36.45, -114.95)).toEqual([slug]);

    const moved = await callTool(token, 'upsert_school', { slug, address: '2 Pin Way, Las Vegas, NV', latitude: 36.55, longitude: -115.45 });
    expect(moved.data).toMatchObject({ created: false, status: 'published' });
    expect(await slugsNear(36.45, -114.95)).toEqual([]);
    expect(await slugsNear(36.55, -115.45)).toEqual([slug]);

    // A write without a location (pricing here) leaves the columns where they were.
    await callTool(token, 'upsert_school', { slug, pricing: { visitorsWelcome: true } });
    expect(await slugsNear(36.55, -115.45)).toEqual([slug]);
  });

  it('hides latitude and longitude from the Content Manager (they are never set by hand)', async (ctx) => {
    const jwt = inject('adminJwt');
    if (!jwt) return ctx.skip();
    const res = await fetch(`${API}/content-manager/content-types/api::school.school/configuration`, { headers: { Authorization: `Bearer ${jwt}` } });
    expect(res.status).toBe(200);
    const { data } = await res.json();
    const layouts = JSON.stringify(data.contentType.layouts);
    expect(layouts).toContain('"location"');
    expect(layouts).not.toContain('"latitude"');
    expect(layouts).not.toContain('"longitude"');
  });
});
