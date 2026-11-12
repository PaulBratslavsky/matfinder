import { describe, expect, it, vi } from 'vitest';
import { GRANTS, revokePermissions } from '../../src/lib/permissions';

describe('permissions (B-2)', () => {
  it('grants no city action', () => {
    expect([...GRANTS.public, ...GRANTS.authenticated].some((a) => a.startsWith('api::city.'))).toBe(false);
  });

  it('deletes an existing city.find grant on both roles and nothing else', async () => {
    const roles = [{ id: 1, documentId: 'r-pub', type: 'public' }, { id: 2, documentId: 'r-auth', type: 'authenticated' }];
    const rows = [
      { documentId: 'p1', action: 'api::city.city.find', roleId: 1 },
      { documentId: 'p2', action: 'api::city.city.find', roleId: 2 },
      { documentId: 'p3', action: 'api::school.school.directory', roleId: 1 },
    ];
    const deleted: string[] = [];
    const strapi: any = {
      log: { info: vi.fn(), error: vi.fn() },
      documents: (uid: string) =>
        uid === 'plugin::api-permissions.role'
          ? { findFirst: async ({ filters }: any) => roles.find((r) => r.type === filters.type) ?? null }
          : {
              findMany: async ({ filters }: any) => rows.filter((p) => p.action === filters.action && p.roleId === filters.role.id),
              delete: async ({ documentId }: any) => void deleted.push(documentId),
            },
    };
    await revokePermissions(strapi);
    expect(deleted.sort()).toEqual(['p1', 'p2']);
  });
});
