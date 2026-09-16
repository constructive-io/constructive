// The node-gateway implementation of `ConversationClient`.
//
// A resource workload holds one platform credential: the per-execution callback
// token the worker minted for it, whose hash lives on its own node_states row.
// The gateway's conversation lane answers only for the execution that token
// authenticates, so the identity of every write — database, thread, actor, agent
// — is resolved server-side from the node's state. Nothing here sends a thread
// id: there is no thread this client could ask for but its own.

import type { FetchLike } from './client';
import type {
  AppendMessageInput,
  ConversationContext,
  ConversationContextClient,
  CreateTaskInput,
  UpdateMessageInput,
  UpdateTaskInput,
} from './conversation-client';
import type { AgentTaskRow } from './tasks';
import type { AgentMessageRow } from './transcript';

export interface GatewayConversationClientOptions {
  /** The gateway's base URL (`CONSTRUCTIVE_CALLBACK_URL`). */
  url: string;
  /** The per-execution callback token (`CONSTRUCTIVE_CALLBACK_TOKEN`). */
  token: string;
  executionId: string;
  nodeName: string;
  databaseId: string;
  /** The execution's scope, or null when it carries none. Never defaulted. */
  scope: string | null;
  fetch?: FetchLike;
}

/** Raised when the gateway answers a conversation call with anything but 2xx. */
export class ConversationGatewayError extends Error {
  constructor(
    readonly method: string,
    readonly route: string,
    readonly status: number,
    readonly detail: string
  ) {
    super(`${method} ${route} → ${status}: ${detail || '(empty body)'}`);
    this.name = 'ConversationGatewayError';
  }
}

export function createGatewayConversationClient(
  options: GatewayConversationClientOptions
): ConversationContextClient {
  if (!options.url) throw new Error('gateway conversation client needs the gateway URL');
  if (!options.token) throw new Error('gateway conversation client needs the callback token');
  const fetchImpl = options.fetch ?? (globalThis.fetch as unknown as FetchLike | undefined);
  if (!fetchImpl) throw new Error('gateway conversation client needs a fetch implementation');

  const base = options.url.replace(/\/$/, '');
  const headers = {
    'content-type': 'application/json',
    authorization: `Bearer ${options.token}`,
    'x-constructive-execution-id': options.executionId,
    'x-constructive-node-name': options.nodeName,
    'x-constructive-database-id': options.databaseId,
    // Absent rather than empty: an empty scope header claims a scope the run
    // has not got, and the gateway reads it as no header at all.
    ...(options.scope ? { 'x-constructive-scope': options.scope } : {}),
  };

  const call = async <T>(method: string, route: string, body?: unknown): Promise<T> => {
    const response = await fetchImpl(`${base}${route}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    if (!response.ok) throw new ConversationGatewayError(method, route, response.status, text);
    try {
      return JSON.parse(text) as T;
    } catch (err) {
      throw new ConversationGatewayError(
        method,
        route,
        response.status,
        `body is not JSON: ${text} (${(err as Error).message})`
      );
    }
  };

  return {
    async context(): Promise<ConversationContext> {
      const body = await call<{ context?: ConversationContext }>('GET', '/conversation/context');
      if (!body.context) {
        throw new Error('GET /conversation/context answered without a context');
      }
      return body.context;
    },

    async appendMessage(input: AppendMessageInput): Promise<AgentMessageRow> {
      const body = await call<{ message?: AgentMessageRow }>('POST', '/conversation/message', {
        op: 'append',
        author_role: input.authorRole,
        parts: input.parts,
        ...(input.model ? { model: input.model } : {}),
      });
      if (!body.message) throw new Error('POST /conversation/message answered without a message');
      return body.message;
    },

    async updateMessage(input: UpdateMessageInput): Promise<AgentMessageRow> {
      const body = await call<{ message?: AgentMessageRow }>('POST', '/conversation/message', {
        op: 'update',
        message_id: input.messageId,
        parts: input.parts,
      });
      if (!body.message) throw new Error('POST /conversation/message answered without a message');
      return body.message;
    },

    async newMessages(after: string): Promise<AgentMessageRow[]> {
      const body = await call<{ messages?: AgentMessageRow[] }>(
        'GET',
        `/conversation/inbox?after=${encodeURIComponent(after)}`
      );
      if (!body.messages) throw new Error('GET /conversation/inbox answered without messages');
      return body.messages;
    },

    async createTask(input: CreateTaskInput): Promise<AgentTaskRow> {
      const body = await call<{ task?: AgentTaskRow }>('POST', '/conversation/task', {
        op: 'create',
        description: input.description,
        status: input.status,
        order_index: input.orderIndex,
        ...(input.error ? { error: input.error } : {}),
      });
      if (!body.task) throw new Error('POST /conversation/task answered without a task');
      return body.task;
    },

    async updateTask(input: UpdateTaskInput): Promise<AgentTaskRow> {
      const body = await call<{ task?: AgentTaskRow }>('POST', '/conversation/task', {
        op: 'update',
        task_id: input.taskId,
        status: input.status,
        order_index: input.orderIndex,
        ...(input.error ? { error: input.error } : {}),
      });
      if (!body.task) throw new Error('POST /conversation/task answered without a task');
      return body.task;
    },
  };
}
