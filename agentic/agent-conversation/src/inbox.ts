// The inbox: what a human has said to the thread since the run last looked.
//
// Why polling rather than the seed's realtime subscriptions: the subscription
// lane is a websocket carried by the GraphQL server's live-query plugin, and a
// resource Job holds neither a browser client nor a socket-capable session — it
// has one callback credential and `fetch`. Polling the conversation for messages
// created after a cursor, at a human's timescale, is the deliberate fallback, and
// the cursor is exclusive so a decision is delivered exactly once. The `waitFor`
// loop takes its clock as a value so a suite drives it without real time passing.

import type { ConversationClient } from './conversation-client';
import type { MessagePart, ToolPart } from './parts';
import { isTextPart, isToolPart } from './parts';
import type { AgentMessageRow } from './transcript';

/** A human turn: prose addressed to the agent. */
export interface UserTurnEvent {
  kind: 'user-turn';
  message: AgentMessageRow;
  text: string;
}

/** A decision on a tool call the run asked about. */
export interface ApprovalEvent {
  kind: 'approval';
  message: AgentMessageRow;
  toolCallId: string;
  approved: boolean;
  reason?: string;
}

/** A request to stop the run. */
export interface CancelEvent {
  kind: 'cancel';
  message: AgentMessageRow;
  reason?: string;
}

export type InboxEvent = UserTurnEvent | ApprovalEvent | CancelEvent;

/** The text a message's `TextPart`s carry, joined. */
export function messageText(parts: MessagePart[] | null): string {
  return (parts ?? [])
    .filter(isTextPart)
    .map((p) => p.text)
    .join('\n')
    .trim();
}

const CANCEL_DIRECTIVES = new Set(['/cancel', '/stop', '/abort']);

/**
 * Classify one human message.
 *
 * A decision is a ToolPart the human wrote at `approval-responded` — the same
 * part shape the run wrote at `approval-requested`, so the UI answers by
 * echoing the part back with `approval.approved` set, and nothing needs a
 * side table.
 */
export function classifyMessage(message: AgentMessageRow): InboxEvent | null {
  if (message.authorRole !== 'user') return null;

  const parts = message.parts ?? [];
  const decision = parts.find(
    (part): part is ToolPart => isToolPart(part) && part.state === 'approval-responded'
  );
  if (decision) {
    if (typeof decision.approval?.approved !== 'boolean') {
      throw new Error(
        `message ${message.id}: tool call ${decision.toolCallId} is "approval-responded" but carries no decision`
      );
    }
    return {
      kind: 'approval',
      message,
      toolCallId: decision.toolCallId,
      approved: decision.approval.approved,
      reason: decision.approval.reason,
    };
  }

  const text = messageText(parts);
  if (CANCEL_DIRECTIVES.has(text.toLowerCase())) {
    return { kind: 'cancel', message, reason: text };
  }
  if (!text) return null;
  return { kind: 'user-turn', message, text };
}

export interface InboxOptions {
  client: ConversationClient;
  /**
   * Only messages created after this timestamp are delivered. The run's own
   * start time, so it never replays the turn that launched it.
   */
  since: string;
  /** Sleep, as a value — a suite passes a fake clock. */
  sleep?: (ms: number) => Promise<void>;
  /** Milliseconds between polls while waiting. */
  pollIntervalMs?: number;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class Inbox {
  private cursor: string;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly pollIntervalMs: number;

  constructor(private readonly options: InboxOptions) {
    this.cursor = options.since;
    this.sleep = options.sleep ?? defaultSleep;
    this.pollIntervalMs = options.pollIntervalMs ?? 2000;
  }

  /** Every human event since the last poll, in order. Advances the cursor. */
  async poll(): Promise<InboxEvent[]> {
    const messages = await this.options.client.newMessages(this.cursor);

    const events: InboxEvent[] = [];
    for (const message of messages) {
      if (message.createdAt && message.createdAt > this.cursor) this.cursor = message.createdAt;
      const event = classifyMessage(message);
      if (event) events.push(event);
    }
    return events;
  }

  /**
   * Poll until `match` accepts an event, the deadline passes, or a cancel
   * arrives. Events that do not match are returned alongside so the caller
   * loses nothing it was not waiting for.
   */
  async waitFor<T extends InboxEvent>(
    match: (event: InboxEvent) => event is T,
    options: { timeoutMs: number; now?: () => number }
  ): Promise<{ event: T | null; cancelled: CancelEvent | null; others: InboxEvent[] }> {
    const now = options.now ?? Date.now;
    const deadline = now() + options.timeoutMs;
    const others: InboxEvent[] = [];

    for (;;) {
      for (const event of await this.poll()) {
        if (match(event)) return { event, cancelled: null, others };
        if (event.kind === 'cancel') return { event: null, cancelled: event, others };
        others.push(event);
      }
      if (now() >= deadline) return { event: null, cancelled: null, others };
      await this.sleep(this.pollIntervalMs);
    }
  }
}

export const isApprovalEvent = (event: InboxEvent): event is ApprovalEvent =>
  event.kind === 'approval';
