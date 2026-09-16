// A fake GraphQL API for the three agent tables: enough of the tenant's schema
// that the library's real queries run against it, and nothing more.

import type { GraphQLClient } from '../src/client';
import type { MessagePart } from '../src/parts';

interface ThreadRecord {
  id: string;
  title: string | null;
  status: string | null;
  mode: string | null;
  model: string | null;
  systemPrompt: string | null;
  agentId: string | null;
  createdAt: string;
}

interface MessageRecord {
  id: string;
  threadId: string;
  authorRole: string;
  agentId: string | null;
  actorId: string | null;
  model: string | null;
  parts: MessagePart[] | null;
  createdAt: string;
}

interface TaskRecord {
  id: string;
  description: string;
  status: string | null;
  orderIndex: number | null;
  error?: string | null;
  parentColumn: string;
  parentId: string;
}

export class FakeAgentApi implements GraphQLClient {
  readonly threads = new Map<string, ThreadRecord>();
  readonly messages: MessageRecord[] = [];
  readonly tasks: TaskRecord[] = [];
  readonly operations: string[] = [];
  private seq = 0;
  private clock = 0;

  private nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}-${this.seq}`;
  }

  /** Timestamps advance one second per write so ordering is total and readable. */
  private nextTimestamp(): string {
    this.clock += 1000;
    return new Date(this.clock).toISOString();
  }

  /** Seed a message as though a human wrote it. */
  addUserMessage(threadId: string, parts: MessagePart[]): MessageRecord {
    const record: MessageRecord = {
      id: this.nextId('msg'),
      threadId,
      authorRole: 'user',
      agentId: null,
      actorId: 'actor-1',
      model: null,
      parts,
      createdAt: this.nextTimestamp(),
    };
    this.messages.push(record);
    return record;
  }

  async request<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const name = /(?:query|mutation)\s+(\w+)/.exec(query)?.[1] ?? 'anonymous';
    this.operations.push(name);
    const input = (variables.input ?? {}) as Record<string, any>;

    switch (name) {
    case 'CodeTaskThread': {
      const thread = this.threads.get(variables.id as string) ?? null;
      return { agentThread: thread } as T;
    }
    case 'CodeTaskCreateThread': {
      const thread: ThreadRecord = {
        id: this.nextId('thread'),
        title: input.agentThread.title ?? null,
        status: null,
        mode: input.agentThread.mode ?? null,
        model: null,
        systemPrompt: null,
        agentId: input.agentThread.agentId ?? null,
        createdAt: this.nextTimestamp(),
      };
      this.threads.set(thread.id, thread);
      return { createAgentThread: { agentThread: thread } } as T;
    }
    case 'CodeTaskCreateMessage': {
      const m = input.agentMessage;
      const record: MessageRecord = {
        id: this.nextId('msg'),
        threadId: m.threadId,
        authorRole: m.authorRole,
        agentId: m.agentId ?? null,
        actorId: m.actorId ?? null,
        model: m.model ?? null,
        parts: m.parts ?? null,
        createdAt: this.nextTimestamp(),
      };
      this.messages.push(record);
      return { createAgentMessage: { agentMessage: record } } as T;
    }
    case 'CodeTaskUpdateMessage': {
      const record = this.messages.find((m) => m.id === input.id);
      if (!record) throw new Error(`no such message ${input.id}`);
      record.parts = input.agentMessagePatch.parts;
      return { updateAgentMessage: { agentMessage: record } } as T;
    }
    case 'CodeTaskInbox': {
      const after = variables.after as string;
      const nodes = this.messages.filter(
        (m) => m.threadId === variables.threadId && m.createdAt > after
      );
      return { agentMessages: { nodes } } as T;
    }
    case 'CodeTaskCreateTask': {
      const t = input.agentTask;
      const parentColumn = 'planId' in t ? 'planId' : 'threadId';
      const record: TaskRecord = {
        id: this.nextId('task'),
        description: t.description,
        status: t.status ?? null,
        orderIndex: t.orderIndex ?? null,
        error: t.error ?? null,
        parentColumn,
        parentId: t[parentColumn],
      };
      this.tasks.push(record);
      return { createAgentTask: { agentTask: record } } as T;
    }
    case 'CodeTaskUpdateTask': {
      const record = this.tasks.find((t) => t.id === input.id);
      if (!record) throw new Error(`no such task ${input.id}`);
      Object.assign(record, input.agentTaskPatch);
      return { updateAgentTask: { agentTask: record } } as T;
    }
    default:
      throw new Error(`FakeAgentApi does not implement operation "${name}"`);
    }
  }
}
