/**
 * The only file in the plugin's server that names @tanstack/*, and the only place TanStack AI is loaded (ported from the
 * maison plugin's ai/sdk.ts).
 *
 * The server is CommonJS and @tanstack/ai ships ES modules only (no `require` export), so it's loaded with a cached
 * `await import()`, which also keeps it out of Strapi's start-up. scripts/check-esm-import.mjs fails the build when a
 * bundle loads it statically. Every static import here is a type, which the build erases.
 */
import type { AnyTextAdapter } from '@tanstack/ai';

export type Sdk = typeof import('@tanstack/ai');
/** What `chat()` takes as its adapter. The factories return classes typed per model; each is cast once, here. */
export type ChatAdapter = AnyTextAdapter;
/** The AG-UI run input `chatParamsFromRequestBody` reads, with `messages` ready for `chat()`. */
export type ChatParams = Awaited<ReturnType<Sdk['chatParamsFromRequestBody']>>;
/** One request as an adapter receives it: the system prompts and the conversation. */
export type ScriptedRequest = {
  systemPrompts?: Array<string | { content: string }>;
  messages: Array<{ role: string; content: unknown; toolCalls?: { id: string; function: { name: string; arguments: string } }[]; toolCallId?: string }>;
};

type AnthropicModel = Parameters<typeof import('@tanstack/ai-anthropic').createAnthropicChat>[0];

/** Said when a package can't be loaded: it's a dependency of the plugin, so this points at the install. */
const notLoaded = (name: string, error: unknown) =>
  Object.assign(
    new Error(
      `[matfinder] The gym chat needs ${name}, and it could not be loaded. Run npm install in server/, then restart Strapi. ${
        error instanceof Error ? error.message : String(error)
      }`,
    ),
    { cause: error },
  );

let sdk: Sdk | null = null;

/** @tanstack/ai, loaded once. */
export async function loadSdk(): Promise<Sdk> {
  if (sdk) return sdk;
  try {
    sdk = await import('@tanstack/ai');
    return sdk;
  } catch (error) {
    throw notLoaded('@tanstack/ai', error);
  }
}

/**
 * The Anthropic adapter for a model and a key. `createAnthropicChat` takes the key directly (`anthropicText()` would read
 * ANTHROPIC_API_KEY from the environment; MatFinder's key is its own setting). An ID outside the adapter's list passes
 * through to Anthropic as it is.
 */
export async function anthropicAdapter(model: string, apiKey: string): Promise<ChatAdapter> {
  let anthropic: typeof import('@tanstack/ai-anthropic');
  try {
    anthropic = await import('@tanstack/ai-anthropic');
  } catch (error) {
    throw notLoaded('@tanstack/ai-anthropic', error);
  }
  return anthropic.createAnthropicChat(model as AnthropicModel, apiKey) as unknown as ChatAdapter;
}

/** One scripted model turn: text, or tool calls (the assistant's scripted flows). */
export type ScriptedTurn = { text?: string; toolCalls?: { name: string; input: unknown }[] };

/** How many model turns one scripted request can take: more than any agent loop here allows. */
const SCRIPTED_TURNS = 12;

/**
 * Tests only: TanStack AI's fake adapter (`@tanstack/ai/testing`), answering each model turn with `answer(request)`,
 * streamed in small pieces like a model. The specifier is a variable because the repo's TypeScript (Node module
 * resolution) can't see that subpath's types; the bundler leaves it as a runtime import.
 */
export async function scriptedAdapter(answer: (request: ScriptedRequest) => string | ScriptedTurn): Promise<ChatAdapter> {
  const specifier = '@tanstack/ai/testing';
  const { fakeText } = (await import(specifier)) as {
    fakeText: (options?: { model?: string; tokensPerSecond?: number }) => {
      setResponses(steps: Array<(call: { request: ScriptedRequest }) => ScriptedTurn>): void;
    };
  };
  const fake = fakeText({ model: 'scripted', tokensPerSecond: 2000 });
  const step = ({ request }: { request: ScriptedRequest }) => {
    const turn = answer(request);
    return typeof turn === 'string' ? { text: turn } : turn;
  };
  fake.setResponses(Array.from({ length: SCRIPTED_TURNS }, () => step));
  return fake as unknown as ChatAdapter;
}

/** A tool as `toTools` takes it: plain data and a function, with no SDK in it. */
export type ToolSpec = { name: string; description: string; input: unknown; write: boolean; execute: (args: any) => Promise<unknown> };

/**
 * Specs as tools for `chat()`: each runs on the server; a write is defined with `needsApproval`, so the run pauses
 * for the admin's decision and the tool runs only when it's approved.
 */
export async function toTools(specs: readonly ToolSpec[]): Promise<unknown[]> {
  const { toolDefinition } = await loadSdk();
  return specs.map((spec) =>
    toolDefinition({ name: spec.name, description: spec.description, inputSchema: spec.input as never, needsApproval: spec.write }).server((args: unknown) =>
      spec.execute(args),
    ),
  );
}
