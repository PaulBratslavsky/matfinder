import { describe, expect, it, vi } from 'vitest';
import {
  approvalDetails,
  awaitsApproval,
  errorText,
  interruptFor,
  resolveApproval,
  safeLink,
  sendsOnKey,
  toolBoxOf,
} from '../../src/plugins/matfinder/admin/src/assistant';

const call = (over: Record<string, unknown> = {}) => ({ type: 'tool-call', id: 'call1', name: 'review_claim', arguments: '{"claimId":"c1","action":"contacted","summary":"Mark it"}', ...over });
const result = (content: unknown, over: Record<string, unknown> = {}) => ({ type: 'tool-result', toolCallId: 'call1', content: JSON.stringify(content), ...over });

describe('the Assistant tab’s approvals', () => {
  it('finds the pause for a tool call by TanStack AI’s approval_<toolCallId> name, by the call’s approval id, or by its binding', () => {
    const generic = { id: 'approval_call1', kind: 'generic', canResolve: true };
    expect(interruptFor([{ id: 'approval_other' }, generic], call())).toBe(generic);
    expect(interruptFor([{ id: 'custom' }], call({ approval: { id: 'custom', needsApproval: true } }))).toEqual({ id: 'custom' });
    const bound = { id: 'x', metadata: { 'tanstack:interruptBinding': { toolCallId: 'call1' } } };
    expect(interruptFor([bound], call())).toBe(bound);
    expect(interruptFor([{ id: 'approval_other' }], call())).toBeUndefined();
  });

  it('answers a generic pause with the server’s { approved } and a bound tool approval with the boolean', () => {
    const generic = { id: 'a', kind: 'generic', canResolve: true, resolveInterrupt: vi.fn() };
    expect(resolveApproval(generic, false)).toBe(true);
    expect(generic.resolveInterrupt).toHaveBeenCalledWith({ approved: false });
    const bound = { id: 'b', kind: 'tool-approval', canResolve: true, resolveInterrupt: vi.fn() };
    expect(resolveApproval(bound, true)).toBe(true);
    expect(bound.resolveInterrupt).toHaveBeenCalledWith(true);
  });

  it('says so when a decision cannot be sent', () => {
    expect(resolveApproval(undefined, true)).toBe(false);
    const expired = { id: 'a', canResolve: false, resolveInterrupt: vi.fn() };
    expect(resolveApproval(expired, true)).toBe(false);
    expect(expired.resolveInterrupt).not.toHaveBeenCalled();
  });

  it('shows a card only while a write waits, and lists its arguments without the summary', () => {
    const waiting = call({ approval: { id: 'approval_call1', needsApproval: true } });
    expect(awaitsApproval(waiting, undefined)).toBe(true);
    expect(awaitsApproval(call({ approval: { id: 'a', needsApproval: true, approved: true } }), undefined)).toBe(false);
    expect(awaitsApproval(waiting, result({ id: 'c1' }))).toBe(false);
    expect(awaitsApproval(call(), undefined)).toBe(false);
    expect(approvalDetails({ claimId: 'c1', action: 'contacted', note: '', summary: 'Mark it', days: ['mon'] })).toEqual([
      { key: 'claimId', value: 'c1' },
      { key: 'action', value: 'contacted' },
      { key: 'days', value: '["mon"]' },
    ]);
  });
});

describe('the Assistant tab’s tool boxes', () => {
  it('says what a call is doing: waiting, denied, running, failed or done with a count', () => {
    expect(toolBoxOf(call({ approval: { id: 'a', needsApproval: true } }), undefined)).toMatchObject({ state: 'waiting', status: 'waiting for approval' });
    expect(toolBoxOf(call({ approval: { id: 'a', needsApproval: true, approved: false } }), undefined)).toMatchObject({ state: 'denied', status: 'not approved' });
    expect(toolBoxOf(call({ name: 'list_claims' }), undefined)).toMatchObject({ state: 'running' });
    expect(toolBoxOf(call(), result({ error: { code: 'INVALID_STATE', message: "A contacted claim can't be marked contacted." } }))).toMatchObject({
      state: 'failed',
      body: "A contacted claim can't be marked contacted.",
    });
    expect(toolBoxOf(call({ name: 'list_claims' }), result({ claims: [{ id: 1 }, { id: 2 }], capped: false }))).toMatchObject({ state: 'done', status: '2 results' });
    expect(toolBoxOf(call(), result({ id: 'c1', status: 'contacted' }))).toMatchObject({ state: 'done', status: 'done' });
  });
});

describe('the Assistant tab’s words and keys', () => {
  it('shows the server’s message for its codes, and plain words for HTTP and network failures', () => {
    expect(errorText({ code: 'already_decided', message: 'That change was already approved or denied.' })).toEqual({ text: 'That change was already approved or denied.', newChat: false });
    expect(errorText({ code: 'chat_too_long', message: 'This chat is long. Start a new chat.' })).toEqual({ text: 'This chat is long. Start a new chat.', newChat: true });
    expect(errorText(new Error('HTTP error! status: 403 Forbidden'))?.text).toBe("Your role can't use the assistant.");
    expect(errorText(new Error('HTTP error! status: 401 Unauthorized'))?.text).toMatch(/session has ended/);
    expect(errorText(new TypeError('Failed to fetch'))?.text).toBe('The connection to Strapi was lost. Try again.');
    expect(errorText(Object.assign(new Error('stopped'), { name: 'AbortError' }))).toBeNull();
    expect(errorText({ code: 'internal_provider', message: 'sk-ant-secret' })?.text).toBe('Something went wrong. Try again.');
  });

  it('sends on Enter, not on Shift+Enter or while composing', () => {
    expect(sendsOnKey({ key: 'Enter', shiftKey: false })).toBe(true);
    expect(sendsOnKey({ key: 'Enter', shiftKey: true })).toBe(false);
    expect(sendsOnKey({ key: 'Enter', shiftKey: false, isComposing: true })).toBe(false);
    expect(sendsOnKey({ key: 'Enter', shiftKey: false, keyCode: 229 })).toBe(false);
  });

  it('keeps only http(s) links from an answer', () => {
    expect(safeLink('https://example.com/gym')).toBe('https://example.com/gym');
    expect(safeLink('javascript:alert(1)')).toBeNull();
    expect(safeLink('data:text/html,hi')).toBeNull();
    expect(safeLink(undefined)).toBeNull();
  });
});
