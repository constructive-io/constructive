// The GraphQL implementation of `ConversationClient`.
//
// This is the lane for a consumer that already holds a tenant API credential —
// a service, a test, an interactive tool. A resource workload uses the node
// gateway instead (`gateway-conversation.ts`): it holds no tenant credential at
// all, and the whole point of that lane is that it cannot address a thread it
// was not launched into. The queries here are the ones the library has always
// sent; only their caller moved.

import type { GraphQLClient } from './client';
import type {
  AppendMessageInput,
  ConversationClient,
  CreateTaskInput,
  UpdateMessageInput,
  UpdateTaskInput,
} from './conversation-client';
import type { AgentTaskRow, TaskParent } from './tasks';
import type { AgentMessageRow } from './transcript';

const MESSAGE_FIELDS = 'id threadId authorRole agentId actorId model parts createdAt';
const TASK_FIELDS = 'id description status orderIndex';

const CREATE_MESSAGE = `mutation CodeTaskCreateMessage($input: CreateAgentMessageInput!) {
  createAgentMessage(input: $input) { agentMessage { ${MESSAGE_FIELDS} } }
}`;

const UPDATE_MESSAGE = `mutation CodeTaskUpdateMessage($input: UpdateAgentMessageInput!) {
  updateAgentMessage(input: $input) { agentMessage { ${MESSAGE_FIELDS} } }
}`;

const NEW_MESSAGES = `query CodeTaskInbox($threadId: UUID!, $after: Datetime) {
  agentMessages(
    where: { threadId: { equalTo: $threadId }, createdAt: { greaterThan: $after } }
    orderBy: [CREATED_AT_ASC]
    first: 200
  ) {
    nodes { ${MESSAGE_FIELDS} }
  }
}`;

const CREATE_TASK = `mutation CodeTaskCreateTask($input: CreateAgentTaskInput!) {
  createAgentTask(input: $input) { agentTask { ${TASK_FIELDS} } }
}`;

const UPDATE_TASK = `mutation CodeTaskUpdateTask($input: UpdateAgentTaskInput!) {
  updateAgentTask(input: $input) { agentTask { ${TASK_FIELDS} } }
}`;

export interface GraphQLConversationClientOptions {
  client: GraphQLClient;
  /**
   * The thread every write lands on. Scope (`database_id` / `entity_id`,
   * `visibility`) is inherited from it by the agent module's insert triggers,
   * so the client never names it.
   */
  threadId: string;
  /** The agent row the run speaks as, when the tenant has one. */
  agentId?: string | null;
  /** The actor writes are attributed to. */
  actorId?: string | null;
  /**
   * The column tying a task to its parent, as the tenant's agent module
   * provisioned it. Defaults to the thread the client is bound to.
   */
  taskParent?: TaskParent;
  /** Recorded on every task so its origin is legible. Defaults to `agent`. */
  taskSource?: string;
}

export function createGraphQLConversationClient(
  options: GraphQLConversationClientOptions
): ConversationClient {
  const { client, threadId } = options;
  const parent: TaskParent = options.taskParent ?? { column: 'threadId', id: threadId };
  const attribution = {
    ...(options.agentId ? { agentId: options.agentId } : {}),
    ...(options.actorId ? { actorId: options.actorId } : {}),
  };

  return {
    async appendMessage(input: AppendMessageInput): Promise<AgentMessageRow> {
      const data = await client.request<{
        createAgentMessage: { agentMessage: AgentMessageRow | null };
      }>(CREATE_MESSAGE, {
        input: {
          agentMessage: {
            threadId,
            authorRole: input.authorRole,
            ...attribution,
            ...(input.authorRole === 'assistant' && input.model ? { model: input.model } : {}),
            parts: input.parts,
          },
        },
      });
      const message = data.createAgentMessage?.agentMessage;
      if (!message) throw new Error('createAgentMessage returned no message');
      return message;
    },

    async updateMessage(input: UpdateMessageInput): Promise<AgentMessageRow> {
      const data = await client.request<{
        updateAgentMessage: { agentMessage: AgentMessageRow | null };
      }>(UPDATE_MESSAGE, {
        input: { id: input.messageId, agentMessagePatch: { parts: input.parts } },
      });
      const message = data.updateAgentMessage?.agentMessage;
      if (!message) {
        throw new Error(`updateAgentMessage returned no message for ${input.messageId}`);
      }
      return message;
    },

    async newMessages(after: string): Promise<AgentMessageRow[]> {
      const data = await client.request<{ agentMessages: { nodes: AgentMessageRow[] } }>(
        NEW_MESSAGES,
        { threadId, after }
      );
      return data.agentMessages?.nodes ?? [];
    },

    async createTask(input: CreateTaskInput): Promise<AgentTaskRow> {
      const data = await client.request<{ createAgentTask: { agentTask: AgentTaskRow | null } }>(
        CREATE_TASK,
        {
          input: {
            agentTask: {
              [parent.column]: parent.id,
              description: input.description,
              status: input.status,
              orderIndex: input.orderIndex,
              source: options.taskSource ?? 'agent',
              ...(options.actorId ? { actorId: options.actorId } : {}),
              ...(input.error ? { error: input.error } : {}),
            },
          },
        }
      );
      const task = data.createAgentTask?.agentTask;
      if (!task) throw new Error(`createAgentTask returned no task for "${input.description}"`);
      return task;
    },

    async updateTask(input: UpdateTaskInput): Promise<AgentTaskRow> {
      const data = await client.request<{ updateAgentTask: { agentTask: AgentTaskRow | null } }>(
        UPDATE_TASK,
        {
          input: {
            id: input.taskId,
            agentTaskPatch: {
              status: input.status,
              orderIndex: input.orderIndex,
              ...(input.error ? { error: input.error } : {}),
            },
          },
        }
      );
      const task = data.updateAgentTask?.agentTask;
      if (!task) throw new Error(`updateAgentTask returned no task for ${input.taskId}`);
      return task;
    },
  };
}
