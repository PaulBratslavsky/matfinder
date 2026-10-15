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
