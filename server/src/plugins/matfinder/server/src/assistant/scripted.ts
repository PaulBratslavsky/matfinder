import type { ScriptedRequest, ScriptedTurn } from '../ai/sdk';
import { messageText } from '../gym-chat/limits';

/**
 * The test server's assistant (MATFINDER_AI_SCRIPTED, never in production): a few fixed flows with real tool calls, so
 * the tab's tool boxes, approval cards and the server's approval round trip can be tested with no model.
 * - "…claims…" → list_claims, then a table of what it returned;
 * - "…contacted…" / "…accept…" → list_claims, then review_claim (a write, so it waits for Approve) on the newest open
 *   claim, then says what happened;
 * - "…how many…" / "…summary…" → directory_summary; "…knowledge…" → list_knowledge;
 * - anything else → a plain answer that says it's scripted.
 */
export function scriptedAssistant(request: ScriptedRequest): ScriptedTurn {
  const messages = request.messages;
  const users = messages.filter((m) => m.role === 'user');
  const question = (users.length ? messageText(users[users.length - 1] as never) : '').toLowerCase();
  const last = messages[messages.length - 1];

  if (last?.role === 'tool') {
    const name = toolNameOf(messages, last.toolCallId);
    const result = parse(last.content);
    const review = REVIEWS.find((r) => r.asked.test(question));
    if (name === 'list_claims' && review) {
      const claim = (result as { claims?: { id: string; claimant: string; gym: string }[] })?.claims?.[0];
      if (!claim) return { text: `Scripted answer (no model): there are no open claims to ${review.verb}.` };
      return {
        toolCalls: [
          { name: 'review_claim', input: { claimId: claim.id, action: review.action, note: review.note, summary: review.summary(claim.claimant, claim.gym) } },
        ],
      };
    }
    return { text: `Scripted answer (no model). \`${name ?? 'a tool'}\` returned:\n\n${asMarkdown(result)}` };
  }

  if (REVIEWS.some((r) => r.asked.test(question)) || /claims?/.test(question)) return { toolCalls: [{ name: 'list_claims', input: { status: 'open' } }] };
  if (/how many|summary/.test(question)) return { toolCalls: [{ name: 'directory_summary', input: {} }] };
  if (/knowledge/.test(question)) return { toolCalls: [{ name: 'list_knowledge', input: {} }] };
  return { text: `Scripted answer (no model). You asked: ${question}` };
}

/** The claim reviews the script can ask for. */
const REVIEWS = [
  {
    asked: /\baccept/,
    action: 'accept',
    verb: 'accept',
    note: 'Confirmed by phone (scripted test).',
    summary: (claimant: string, gym: string) => `Accept ${claimant}'s claim on ${gym}: they become its owner`,
  },
  {
    asked: /contacted/,
    action: 'contacted',
    verb: 'mark as contacted',
    note: 'Called them (scripted test).',
    summary: (claimant: string, gym: string) => `Mark ${claimant}'s claim on ${gym} as contacted`,
  },
] as const;

function toolNameOf(messages: ScriptedRequest['messages'], toolCallId?: string): string | null {
  for (const m of messages) for (const call of m.toolCalls ?? []) if (call.id === toolCallId) return call.function.name;
  return null;
}

function parse(content: unknown): unknown {
  if (typeof content !== 'string') return content;
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}

/** The first list in a result as a Markdown table (at most 5 rows and 5 columns), or the result as JSON. */
function asMarkdown(result: unknown): string {
  const list = result && typeof result === 'object' ? Object.values(result as Record<string, unknown>).find(Array.isArray) : null;
  if (Array.isArray(list) && list.length && typeof list[0] === 'object') {
    const columns = Object.keys(list[0] as object).slice(0, 5);
    const cell = (v: unknown) => String(v ?? '—').replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 60);
    const rows = list.slice(0, 5).map((row) => `| ${columns.map((c) => cell((row as Record<string, unknown>)[c])).join(' | ')} |`);
    return [`| ${columns.join(' | ')} |`, `| ${columns.map(() => '---').join(' | ')} |`, ...rows].join('\n');
  }
  return '```json\n' + JSON.stringify(result, null, 2).slice(0, 2000) + '\n```';
}
