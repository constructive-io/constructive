// The conversation, as the thing writing it sees it.
//
// The library used to speak GraphQL directly, which meant every consumer needed
// a tenant API credential broad enough to write any row it could name. A
// resource workload gets its authority from the execution it *is* instead, so
// the operations it performs are named here and the identity they are performed
// under — database, thread, actor, agent — belongs to the implementation rather
// than to the caller. A caller that cannot name a thread cannot reach another
// one.

import type { MessagePart } from './parts';
import type { AgentTaskRow } from './tasks';
import type { AgentThreadRow } from './thread';
import type { AgentMessageRow } from './transcript';

export interface AppendMessageInput {
  authorRole: 'assistant' | 'user' | 'system';
  parts: MessagePart[];
  /** Recorded on assistant messages; not an identity the caller may claim. */
  model?: string | null;
}

export interface UpdateMessageInput {
  messageId: string;
  parts: MessagePart[];
}

export interface CreateTaskInput {
  description: string;
  status: string;
  orderIndex: number;
  error?: string;
}

export interface UpdateTaskInput {
  taskId: string;
  status: string;
  orderIndex: number;
  error?: string;
}

/**
 * Everything a run does to its conversation. The thread is fixed by the
 * implementation, so none of these operations takes one.
 */
export interface ConversationClient {
  appendMessage(input: AppendMessageInput): Promise<AgentMessageRow>;
  updateMessage(input: UpdateMessageInput): Promise<AgentMessageRow>;
  /** Messages created strictly after `after`, oldest first. */
  newMessages(after: string): Promise<AgentMessageRow[]>;
  createTask(input: CreateTaskInput): Promise<AgentTaskRow>;
  updateTask(input: UpdateTaskInput): Promise<AgentTaskRow>;
}

/**
 * `agent_persona` as a run reads it. Mirrors `PersonaRow` in
 * `@agentic-kit/pi-host`, which owns persona *behavior*; this package owns
 * only the wire shape, and the two are structurally identical on purpose.
 */
export interface ConversationPersona {
  id: string;
  slug: string;
  name: string;
  systemPrompt: string | null;
  resources: (string | null)[] | null;
  config: ConversationPersonaConfig | null;
}

export interface ConversationPersonaConfig {
  model?: string;
  temperature?: number;
  tools?: string[];
  excludeTools?: string[];
  maxSteps?: number;
}

/** An `agent_resource` row a persona names. */
export interface ConversationSkill {
  slug: string;
  title: string;
  kind: string | null;
  body: string;
}

/** What a run is told about the conversation it was launched into. */
export interface ConversationContext {
  thread: AgentThreadRow;
  persona: ConversationPersona | null;
  skills: ConversationSkill[];
  agentId: string | null;
  actorId: string | null;
}

/**
 * A client that also resolves the conversation a run belongs to — the thread it
 * writes to is derived from the run, never chosen by it.
 */
export interface ConversationContextClient extends ConversationClient {
  context(): Promise<ConversationContext>;
}
