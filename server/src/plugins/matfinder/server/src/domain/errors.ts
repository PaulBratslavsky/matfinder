/**
 * The plugin's tool errors. Same shape and name as the app's `ToolError` (server/src/lib/errors.ts), so the MCP
 * guard reports both the same way.
 */
export class ToolError extends Error {
  constructor(
    public code: string,
    message: string,
    public details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ToolError';
  }
}

/** True for a unique-index violation on SQLite or Postgres. Same rule as the app's lib/errors.ts. */
export function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  return e?.code === '23505' || e?.code === 'SQLITE_CONSTRAINT_UNIQUE' || /unique constraint/i.test(e?.message ?? '');
}
