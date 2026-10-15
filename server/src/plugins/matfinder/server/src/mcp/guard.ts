
/** MCP clients reject results over ~1 MB, and the payload is sent twice (`content` text + `structuredContent`). */
export const WIRE_LIMIT_BYTES = 950_000;

export type ToolResult = {
  content: { type: 'text'; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

export function errorResult(body: Record<string, unknown>): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(body) }], isError: true };
}

/** A successful result, or RESULT_TOO_LARGE with the tool's hint on how to ask for less. */
export function guard(data: Record<string, unknown>, shrinkHint: string): ToolResult {
  const text = JSON.stringify(data);
  const wire = Buffer.byteLength(text) * 2 + 2048;
  if (wire > WIRE_LIMIT_BYTES) return errorResult({ error: 'RESULT_TOO_LARGE', bytes: wire, message: shrinkHint });
  return { content: [{ type: 'text', text }], structuredContent: data };
}

type Path = (string | number)[];

/**
 * Service errors → the spec's structured tool errors: ToolError keeps its code; a Document Service ValidationError
 * (the M2 middlewares, schema validation) becomes VALIDATION_ERROR with its field path. Anything else is rethrown so
 * Strapi logs it and reports a generic failure.
 */
/**
 * The app's services throw `ToolError` (server/src/lib/errors.ts). This plugin is bundled separately, so it can't
 * share that class for `instanceof`: match on its name and code instead.
 */
type ToolErrorLike = { name: 'ToolError'; code: string; message: string; details?: Record<string, unknown> };
const isToolError = (e: unknown): e is ToolErrorLike =>
  (e as { name?: unknown })?.name === 'ToolError' && typeof (e as { code?: unknown }).code === 'string';

export function toErrorResult(e: unknown, mapPath: (path: Path) => Path = (p) => p): ToolResult {
  if (isToolError(e)) return errorResult({ error: e.code, message: e.message, ...e.details });
  const err = e as { name?: string; message?: string; details?: { path?: Path; errors?: { path?: Path; message?: string }[] } };
  if (err?.name === 'ValidationError') {
    const path = err.details?.path ?? err.details?.errors?.[0]?.path;
    return errorResult({ error: 'VALIDATION_ERROR', message: err.message, ...(path ? { path: mapPath(path) } : {}) });
  }
  throw e;
}
