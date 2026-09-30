/** The structured errors the MCP tools report (spec: *No silent failures*). Services throw them; tools map them. */
export type ToolErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'GEOCODE_FAILED' | 'RESULT_TOO_LARGE';

export class ToolError extends Error {
  constructor(
    public code: ToolErrorCode,
    message: string,
    public details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ToolError';
  }
}

/** True for a unique-index violation on SQLite or Postgres (used by create, catch, refetch). */
export function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  return e?.code === '23505' || e?.code === 'SQLITE_CONSTRAINT_UNIQUE' || /unique constraint/i.test(e?.message ?? '');
}
