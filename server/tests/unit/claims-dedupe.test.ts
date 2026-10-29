import { describe, expect, it, vi } from 'vitest';
import claimsService from '../../src/plugins/matfinder/server/src/services/claims';

describe('closeDuplicateOpenClaims (B-5)', () => {
  it('keeps the newest open claim per person per gym and rejects the rest', async () => {
    const rows = [
      // Already sorted newest first, as the query asks.
      { id: 3, schoolDocumentId: 'g1', userId: 'u1', adminNote: null },
      { id: 2, schoolDocumentId: 'g1', userId: 'u1', adminNote: 'called once' },
      { id: 1, schoolDocumentId: 'g1', userId: 'u2', adminNote: null },
    ];
    const update = vi.fn(async () => ({}));
    const strapi: any = {
      db: { query: () => ({ findMany: async () => rows, update }) },
      log: { warn: vi.fn() },
      documents: () => ({}),
    };
    const closed = await claimsService({ strapi }).closeDuplicateOpenClaims();
    expect(closed).toBe(1);
    expect(update).toHaveBeenCalledTimes(1);
    const arg = (update.mock.calls[0] as any[])[0];
    expect(arg.where).toEqual({ id: 2 });
    expect(arg.data.status).toBe('rejected');
    expect(arg.data.adminNote).toMatch(/^called once\nClosed automatically/);
  });
});
