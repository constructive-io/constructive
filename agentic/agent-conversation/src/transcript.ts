// The transcript: appending messages and revising the parts of one already
// written.
//
// A tool call is a single message whose one ToolPart is rewritten as the call
// moves through its states, so the thread reads as a conversation rather than as
// a state log — hence `updateParts` alongside `append`.
//
// The thread, the database and the attribution live in the `ConversationClient`
// this is given: a transcript writes to the conversation its client is bound to
// and has no way to name another.

import type { ConversationClient } from './conversation-client';
import type { MessagePart, ToolPart } from './parts';
import { isToolPart } from './parts';

export interface AgentMessageRow {
  id: string;
  threadId: string;
  authorRole: string;
  agentId: string | null;
  actorId: string | null;
  model: string | null;
  parts: MessagePart[] | null;
  createdAt: string | null;
}

export interface TranscriptOptions {
  /** Model name recorded on assistant messages. */
  model?: string | null;
}

export class Transcript {
  constructor(
    private readonly client: ConversationClient,
    private readonly options: TranscriptOptions = {}
  ) {}

  /** Append a message with the given parts. */
  append(authorRole: 'assistant' | 'user' | 'system', parts: MessagePart[]): Promise<AgentMessageRow> {
    return this.client.appendMessage({
      authorRole,
      parts,
      ...(this.options.model ? { model: this.options.model } : {}),
    });
  }

  /** Append prose the agent wrote. */
  appendText(text: string): Promise<AgentMessageRow> {
    return this.append('assistant', [{ type: 'text', text }]);
  }

  /** Append a message carrying exactly one tool part — the tool-call message. */
  appendToolPart(part: ToolPart): Promise<AgentMessageRow> {
    return this.append('assistant', [part]);
  }

  /** Rewrite the parts of a message already in the thread. */
  updateParts(messageId: string, parts: MessagePart[]): Promise<AgentMessageRow> {
    return this.client.updateMessage({ messageId, parts });
  }

  /** Replace the single tool part of a tool-call message. */
  updateToolPart(messageId: string, part: ToolPart): Promise<AgentMessageRow> {
    return this.updateParts(messageId, [part]);
  }
}

/** The tool part of a message, or null when it carries none. */
export function toolPartOf(message: AgentMessageRow): ToolPart | null {
  return (message.parts ?? []).find(isToolPart) ?? null;
}
