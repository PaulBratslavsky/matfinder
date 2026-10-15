import { describe, expect, it } from 'vitest';
import publishing from '../../src/plugins/matfinder/server/src/services/publishing';
import { draftStatus } from '../../src/plugins/matfinder/server/src/domain/status';

type Row = { documentId: string; slug: string; updatedAt: string };

/** A Document Service with one school: its draft and (optionally) its published row. */
function fakeStrapi(opts: { draft: Row; published?: Row; autoPublish?: boolean; publishError?: Error }) {
  const state = { published: opts.published, publishCalls: 0 };
  const documents = () => ({
    findFirst: async ({ filters }: { filters: { slug: string } }) => (filters.slug === opts.draft.slug ? opts.draft : null),
    findOne: async ({ status }: { status: 'draft' | 'published' }) => (status === 'draft' ? opts.draft : state.published ?? null),
    publish: async () => {
      state.publishCalls += 1;
      if (opts.publishError) throw opts.publishError;
      state.published = { ...opts.draft, updatedAt: '2026-10-15T12:00:01.000Z' };
    },
  });
  const config = (key: string, fallback: unknown) => (key === 'autoPublish' ? opts.autoPublish ?? fallback : fallback);
  const strapi = { documents, plugin: () => ({ config }) } as any;
  return { service: publishing({ strapi }), state };
}

const draft: Row = { documentId: 'doc1', slug: 'agent-gym', updatedAt: '2026-10-15T12:00:00.000Z' };
const UID = 'api::school.school';

describe('publishing agent writes', () => {
  it('publishes a new gym', async () => {
    const { service, state } = fakeStrapi({ draft });
    expect(await service.afterWrite(UID, 'agent-gym')).toEqual({ status: 'published' });
    expect(state.publishCalls).toBe(1);
  });

  it('publishes changes to a live gym, and leaves an unchanged one alone', async () => {
    const changed = fakeStrapi({ draft, published: { ...draft, updatedAt: '2026-10-14T00:00:00.000Z' } });
    expect(await changed.service.afterWrite(UID, 'agent-gym')).toEqual({ status: 'published' });
    expect(changed.state.publishCalls).toBe(1);

    const same = fakeStrapi({ draft, published: { ...draft } });
    expect(await same.service.afterWrite(UID, 'agent-gym')).toEqual({ status: 'published' });
    expect(same.state.publishCalls).toBe(0);
  });

  it('keeps drafts for review when autoPublish is off', async () => {
    const { service, state } = fakeStrapi({ draft, autoPublish: false });
    expect(service.autoPublish()).toBe(false);
    expect(await service.afterWrite(UID, 'agent-gym')).toEqual({ status: 'never-published' });
    expect(state.publishCalls).toBe(0);
  });

  it('says why a draft could not be published', async () => {
    const invalid = Object.assign(new Error('location must be defined'), { name: 'ValidationError' });
    const { service } = fakeStrapi({ draft, publishError: invalid });
    expect(await service.afterWrite(UID, 'agent-gym')).toEqual({ status: 'never-published', notPublishedBecause: 'location must be defined' });
  });

  it('rethrows anything that is not a validation error', async () => {
    const { service } = fakeStrapi({ draft, publishError: new Error('database is locked') });
    await expect(service.afterWrite(UID, 'agent-gym')).rejects.toThrow('database is locked');
  });
});

describe('draft status', () => {
  it('compares the draft with its published version', () => {
    expect(draftStatus(draft, null)).toBe('never-published');
    expect(draftStatus(draft, { updatedAt: draft.updatedAt })).toBe('published');
    expect(draftStatus(draft, { updatedAt: '2026-10-14T00:00:00.000Z' })).toBe('unpublished-changes');
  });
});
