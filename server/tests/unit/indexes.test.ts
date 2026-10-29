import { afterEach, describe, expect, it, vi } from 'vitest';
import { createIndexes } from '../../src/lib/indexes';

const env = process.env.NODE_ENV;
afterEach(() => {
  process.env.NODE_ENV = env;
});

/** A strapi with just what createIndexes touches. `failOn` makes raw() throw for SQL containing that text. */
function fakeStrapi(opts: { client?: string; schema?: string; failOn?: string } = {}) {
  const sql: string[] = [];
  const strapi: any = {
    db: {
      getInfo: () => ({ client: opts.client ?? 'postgres' }),
      getSchemaName: () => opts.schema,
      connection: {
        raw: vi.fn(async (q: string) => {
          sql.push(q);
          if (opts.failOn && q.includes(opts.failOn)) throw new Error('duplicate key');
        }),
      },
    },
    log: { error: vi.fn() },
  };
  return { strapi, sql };
}

describe('createIndexes (B-7)', () => {
  it('qualifies tables with the Postgres schema, and leaves SQLite names bare', async () => {
    const pg = fakeStrapi({ schema: 'public' });
    await createIndexes(pg.strapi);
    expect(pg.sql[0]).toContain('ON "public"."schools" (slug)');
    const lite = fakeStrapi({ client: 'sqlite' });
    await createIndexes(lite.strapi);
    expect(lite.sql[0]).toContain('ON schools (slug)');
  });

  it('refuses to start in production when a unique index fails', async () => {
    process.env.NODE_ENV = 'production';
    const { strapi } = fakeStrapi({ schema: 'public', failOn: 'schools_slug_draft_uq' });
    await expect(createIndexes(strapi)).rejects.toThrow(/Refusing to start/);
  });

  it('only logs a failed unique index outside production', async () => {
    process.env.NODE_ENV = 'development';
    const { strapi } = fakeStrapi({ client: 'sqlite', failOn: 'schools_slug_draft_uq' });
    await expect(createIndexes(strapi)).resolves.toBeUndefined();
    expect(strapi.log.error).toHaveBeenCalled();
  });

  it('never stops the boot for a plain index', async () => {
    process.env.NODE_ENV = 'production';
    const { strapi } = fakeStrapi({ schema: 'public', failOn: 'schools_lat_lng_idx' });
    await expect(createIndexes(strapi)).resolves.toBeUndefined();
  });

  it('rejects MySQL and odd schema names', async () => {
    await expect(createIndexes(fakeStrapi({ client: 'mysql' }).strapi)).rejects.toThrow(/isn't supported/);
    await expect(createIndexes(fakeStrapi({ schema: 'a"; drop' }).strapi)).rejects.toThrow(/plain identifier/);
  });
});
