import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    adminJwt: string | null;
  }
}

/**
 * Registers the FIRST admin of a fresh test database (random credentials, never printed) and provides its JWT, used to
 * create the MCP admin token. Only with ALLOW_ADMIN_BOOTSTRAP=1 (set by test:integration:isolated), so a run against
 * the dev server never creates an admin in the dev database.
 */
export default async function setup(project: TestProject) {
  let jwt: string | null = null;
  if (process.env.ALLOW_ADMIN_BOOTSTRAP === '1') {
    const api = (process.env.API_URL ?? 'http://localhost:1342').replace(/\/$/, '');
    const rand = () => Math.random().toString(36).slice(2, 10);
    const res = await fetch(`${api}/admin/register-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `it-admin-${rand()}@example.test`, password: `Aa1${rand()}${rand()}`, firstname: 'IT', lastname: 'Admin' }),
    }).catch(() => null);
    if (res?.ok) jwt = (await res.json()).data.token;
  }
  project.provide('adminJwt', jwt);
}
