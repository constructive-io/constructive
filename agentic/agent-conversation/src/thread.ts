// Thread load/create.

import type { GraphQLClient } from './client';

export interface AgentThreadRow {
  id: string;
  title: string | null;
  status: string | null;
  mode: string | null;
  model: string | null;
  systemPrompt: string | null;
  agentId: string | null;
  createdAt: string | null;
}

const THREAD_FIELDS = 'id title status mode model systemPrompt agentId createdAt';

const THREAD_BY_ID = `query CodeTaskThread($id: UUID!) {
  agentThread(id: $id) { ${THREAD_FIELDS} }
}`;

const CREATE_THREAD = `mutation CodeTaskCreateThread($input: CreateAgentThreadInput!) {
  createAgentThread(input: $input) { agentThread { ${THREAD_FIELDS} } }
}`;

export interface LoadOrCreateThreadInput {
  client: GraphQLClient;
  databaseId: string;
  /** An existing thread to continue; when absent a thread is created. */
  threadId?: string | null;
  agentId?: string | null;
  ownerId?: string | null;
  title?: string;
  mode?: string;
}

/** Raised when the run was pointed at a thread that does not exist. */
export class ThreadNotFoundError extends Error {
  constructor(readonly threadId: string) {
    super(`agent thread ${threadId} not found`);
    this.name = 'ThreadNotFoundError';
  }
}

export async function loadOrCreateThread(
  input: LoadOrCreateThreadInput
): Promise<AgentThreadRow> {
  if (input.threadId) {
    const data = await input.client.request<{ agentThread: AgentThreadRow | null }>(THREAD_BY_ID, {
      id: input.threadId,
    });
    if (!data.agentThread) throw new ThreadNotFoundError(input.threadId);
    return data.agentThread;
  }

  const data = await input.client.request<{
    createAgentThread: { agentThread: AgentThreadRow | null };
  }>(CREATE_THREAD, {
    input: {
      agentThread: {
        databaseId: input.databaseId,
        ...(input.agentId ? { agentId: input.agentId } : {}),
        ...(input.ownerId ? { ownerId: input.ownerId } : {}),
        ...(input.title ? { title: input.title } : {}),
        ...(input.mode ? { mode: input.mode } : {}),
      },
    },
  });
  const thread = data.createAgentThread?.agentThread;
  if (!thread) throw new Error('createAgentThread returned no thread');
  return thread;
}
