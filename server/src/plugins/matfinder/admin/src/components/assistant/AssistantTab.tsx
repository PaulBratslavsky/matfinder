import { Badge, Box, Button, EmptyStateLayout, Flex, Loader, MenuItem, SimpleMenu, Textarea, Typography } from '@strapi/design-system';
import { ArrowUp, Plus, Sparkle } from '@strapi/icons';
import { EmptyDocuments } from '@strapi/icons/symbols';
import { Layouts, useFetchClient } from '@strapi/strapi/admin';
import { fetchServerSentEvents } from '@tanstack/ai-client';
import { useChat } from '@tanstack/ai-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { styled } from 'styled-components';
import {
  ASSISTANT_PATHS,
  MESSAGE_MAX,
  NOTES,
  QUICK_PROMPTS,
  adminToken,
  argsOf,
  awaitsApproval,
  errorText,
  interruptFor,
  resolveApproval,
  sendsOnKey,
  toolBoxOf,
  toolResultOf,
  type AssistantStatus,
  type InterruptLike,
  type PartLike,
} from '../../assistant';
import { ApprovalCard } from './ApprovalCard';
import { MarkdownBody } from './MarkdownBody';
import { ToolBox } from './ToolBox';

const Panel = styled(Box)`
  display: flex;
  flex-direction: column;
  height: max(48rem, calc(100vh - 34rem));
  overflow: hidden;
`;
const Scroller = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  padding: 2.4rem;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
`;
const Row = styled.div<{ $mine: boolean }>`
  align-self: ${({ $mine }) => ($mine ? 'flex-end' : 'flex-start')};
  max-width: ${({ $mine }) => ($mine ? '80%' : '100%')};
  min-width: 0;
  display: flex;
  gap: 0.8rem;
  align-items: flex-end;
`;
/** Keeps a message in line with the others when the avatar is drawn on a later one. */
const NoAvatar = styled.div`
  width: 2.8rem;
  flex-shrink: 0;
`;
const Avatar = styled.div`
  width: 2.8rem;
  height: 2.8rem;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.primary600};
  svg { width: 1.6rem; height: 1.6rem; fill: ${({ theme }) => theme.colors.neutral0}; }
`;
const Bubble = styled.div<{ $mine: boolean }>`
  min-width: 0;
  padding: 1.2rem 1.6rem;
  border-radius: ${({ $mine }) => ($mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px')};
  background: ${({ theme, $mine }) => ($mine ? theme.colors.primary600 : theme.colors.neutral100)};
  color: ${({ theme, $mine }) => ($mine ? theme.colors.neutral0 : theme.colors.neutral800)};
`;
const Mine = styled.div`
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 1.4rem;
  line-height: 1.6;
`;
const Footer = styled(Box)`
  border-top: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

/**
 * The Assistant tab (plan 09, M19): a TanStack AI chat with the MatFinder tools this admin's role allows. Lookups run
 * at once; every change shows an approval card and runs only after Approve. The chat lasts while the page is open.
 */
export function AssistantTab({ onAnswered }: { /** After each answer: a change may have moved the tab badges. */ onAnswered?: () => void }) {
  const { get } = useFetchClient();
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [statusFailed, setStatusFailed] = useState(false);
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  // The connection is made once; it reads the fetch client through a ref.
  const getRef = useRef(get);
  getRef.current = get;

  const loadStatus = useCallback(() => {
    setStatusFailed(false);
    get(ASSISTANT_PATHS.status)
      .then((res) => setStatus(res.data as AssistantStatus))
      .catch(() => setStatusFailed(true));
  }, [get]);
  useEffect(loadStatus, [loadStatus]);

  const connection = useMemo(
    () =>
      fetchServerSentEvents(`${(globalThis as { strapi?: { backendURL?: string } }).strapi?.backendURL ?? ''}${ASSISTANT_PATHS.chat}`, async () => {
        // A streamed request is a plain fetch, which Strapi doesn't refresh an expired token for. A call through its own
        // client does, so one goes first; the token read after it is the current one.
        try {
          await getRef.current(ASSISTANT_PATHS.status);
        } catch {
          // The chat request will say what's wrong.
        }
        const token = adminToken();
        return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      }),
    [],
  );

  const chat = useChat({ connection, queue: 'drop', onCustomEvent: (name: string) => setNote(NOTES[name] ?? null) } as never) as any;
  const busy: boolean = chat.isLoading;
  const messages: { id: string; role: string; parts: PartLike[] }[] = chat.messages;
  const error = errorText(chat.error);
  const ready = status?.ready === true;
  const labels = useMemo(() => new Map((status?.ready ? status.tools : []).map((t) => [t.name, t.label])), [status]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  const wasBusy = useRef(false);
  useEffect(() => {
    if (wasBusy.current && !busy) onAnswered?.();
    wasBusy.current = busy;
  }, [busy, onAnswered]);

  const send = (text: string) => {
    const message = text.trim();
    if (!message || busy || !ready) return;
    setNote(null);
    if (text === draft) setDraft('');
    void chat.sendMessage(message);
  };

  /** The admin's decision on a paused change: resolve its interrupt, and the chat sends it back to Strapi. */
  const decide = (call: PartLike, approved: boolean) => resolveApproval(interruptFor(chat.interrupts as InterruptLike[], call), approved);

  if (!status && !statusFailed) {
    return (
      <Layouts.Content>
        <Flex justifyContent="center" padding={11}>
          <Loader>Checking the assistant</Loader>
        </Flex>
      </Layouts.Content>
    );
  }
  if (!ready) {
    return (
      <Layouts.Content>
        <Box background="neutral0" shadow="tableShadow" hasRadius>
          <EmptyStateLayout
            icon={<EmptyDocuments width="16rem" />}
            content={statusFailed ? "Couldn't check the assistant." : status && !status.ready ? status.reason : ''}
            action={
              <Button variant="secondary" onClick={loadStatus}>
                Check again
              </Button>
            }
          />
        </Box>
      </Layouts.Content>
    );
  }

  const tools = status.tools;
  // Messages with something to draw: text, or a tool call (its result shows in the call's box).
  const shown = messages
    .map((m) => ({ ...m, drawn: m.parts.filter((p) => (p.type === 'text' && p.content?.trim()) || p.type === 'tool-call') }))
    .filter((m) => m.drawn.length > 0);
  const last = messages[messages.length - 1];
  const thinking = busy && (!last || last.role === 'user' || !last.parts.some((p) => (p.type === 'text' && p.content?.trim()) || p.type === 'tool-call'));

  return (
    <>
      <Layouts.Action
        startActions={
          <>
            <Badge>Model: {status.model}</Badge>
            <SimpleMenu label={`Tools (${tools.length})`} variant="tertiary" size="S">
              {tools.length === 0 ? (
                <MenuItem disabled>Your role has no tools, so the assistant can't look anything up.</MenuItem>
              ) : (
                tools.map((t) => (
                  <MenuItem key={t.name} disabled>
                    {t.label} · {t.name}
                    {t.write ? ' (asks first)' : ''}
                  </MenuItem>
                ))
              )}
            </SimpleMenu>
          </>
        }
        endActions={
          <Button
            variant="tertiary"
            size="S"
            startIcon={<Plus />}
            disabled={busy || messages.length === 0}
            onClick={() => {
              setNote(null);
              chat.clear();
            }}
          >
            New chat
          </Button>
        }
      />
      <Layouts.Content>
        <Panel background="neutral0" shadow="tableShadow" hasRadius>
          <Scroller ref={scroller} role="region" aria-label="Chat messages" tabIndex={0}>
            {messages.length === 0 && (
              <Box paddingTop={6} paddingBottom={6}>
                <Typography tag="h2" variant="beta">
                  Ask about gyms, claims and knowledge
                </Typography>
                <Box paddingTop={2}>
                  <Typography variant="omega" textColor="neutral600">
                    The assistant looks things up right away. Every change (a gym, a schedule, a claim, a knowledge entry) waits for
                    your Approve, and goes live once you approve it.
                  </Typography>
                </Box>
                <Flex gap={2} wrap="wrap" paddingTop={5} role="group" aria-label="Try asking">
                  {QUICK_PROMPTS.map((q) => (
                    <Button key={q} variant="tertiary" size="S" disabled={busy} onClick={() => send(q)}>
                      {q}
                    </Button>
                  ))}
                </Flex>
              </Box>
            )}
            {shown.map((m, index) => {
              const mine = m.role === 'user';
              // One avatar per run of answers: on the last of them, like a chat app.
              const lastOfRun = shown[index + 1]?.role !== m.role;
              return (
                <Row key={m.id} $mine={mine} data-message-role={m.role}>
                  {!mine &&
                    (lastOfRun ? (
                      <Avatar aria-hidden>
                        <Sparkle />
                      </Avatar>
                    ) : (
                      <NoAvatar />
                    ))}
                  <Bubble $mine={mine}>
                    {m.drawn.map((part, i) => {
                      if (part.type === 'text') return mine ? <Mine key={i}>{part.content}</Mine> : <MarkdownBody key={i} text={part.content} />;
                      const result = toolResultOf(m.parts, part.id);
                      const label = labels.get(part.name) ?? part.name;
                      return (
                        <div key={part.id}>
                          <ToolBox box={toolBoxOf(part, result)} label={label} />
                          {awaitsApproval(part, result) && <ApprovalCard label={label} args={argsOf(part)} onDecide={(approved) => decide(part, approved)} />}
                        </div>
                      );
                    })}
                  </Bubble>
                </Row>
              );
            })}
            {thinking && (
              <Flex gap={2} role="status">
                <Loader small>Thinking</Loader>
                <Typography variant="pi" textColor="neutral600">
                  Working on it…
                </Typography>
              </Flex>
            )}
            {!!note && !busy && (
              <Typography variant="pi" textColor="neutral600">
                {note}
              </Typography>
            )}
            {!!error && (
              <Box role="alert" padding={3} hasRadius background="danger100">
                <Flex gap={3} alignItems="center" justifyContent="space-between">
                  <Typography variant="omega" textColor="danger700">
                    {error.text}
                  </Typography>
                  {error.newChat && (
                    <Button size="S" variant="secondary" onClick={() => chat.clear()}>
                      New chat
                    </Button>
                  )}
                </Flex>
              </Box>
            )}
          </Scroller>

          <Footer padding={4}>
            <Flex direction="column" alignItems="stretch" gap={3}>
              <Flex gap={2} alignItems="flex-end">
                <Box flex={1}>
                  <Textarea
                    name="assistant-message"
                    aria-label="Message the assistant"
                    placeholder="Ask about gyms, claims or knowledge. Enter sends, Shift+Enter adds a line."
                    value={draft}
                    maxLength={MESSAGE_MAX}
                    rows={2}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                      if (sendsOnKey({ key: e.key, shiftKey: e.shiftKey, isComposing: e.nativeEvent.isComposing, keyCode: e.keyCode })) {
                        e.preventDefault();
                        send(draft);
                      }
                    }}
                  />
                </Box>
                {busy ? (
                  <Button variant="secondary" onClick={() => chat.stop()}>
                    Stop
                  </Button>
                ) : (
                  <Button startIcon={<ArrowUp />} disabled={!draft.trim()} onClick={() => send(draft)}>
                    Send
                  </Button>
                )}
              </Flex>
            </Flex>
          </Footer>
        </Panel>
      </Layouts.Content>
    </>
  );
}
