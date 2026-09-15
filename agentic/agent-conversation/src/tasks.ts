// `agent_task` rows from the agent's todo list.
//
// The tasks table's parent is whichever the tenant provisioned — the module
// generator attaches tasks to `plan_id` when the surface has plans and to
// `thread_id` when it does not — so the parent is a property of the
// `ConversationClient` the writer is given, not something a run chooses.

import type { ConversationClient } from './conversation-client';

/** One item of the agent's todo list. */
export interface TodoItem {
  /** Stable identity across writes; the description is the natural key. */
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error?: string;
}

export interface AgentTaskRow {
  id: string;
  description: string;
  status: string | null;
  orderIndex: number | null;
}

/** The column tying a task to its parent, and its value. */
export interface TaskParent {
  /** `planId` or `threadId`, as the tenant's agent module provisioned it. */
  column: 'planId' | 'threadId';
  id: string;
}

export interface TaskWriterOptions {
  client: ConversationClient;
}

/**
 * Mirrors the agent's todo list into `agent_task`, keyed by description: an item
 * seen for the first time is inserted, one seen again is patched when its status
 * moved. The writer holds the ids it created, so a run's repeated todo writes
 * cost one mutation per genuine change.
 */
export class TaskWriter {
  private readonly known = new Map<string, AgentTaskRow>();

  constructor(private readonly options: TaskWriterOptions) {}

  async sync(todos: TodoItem[]): Promise<AgentTaskRow[]> {
    const rows: AgentTaskRow[] = [];
    for (const [index, todo] of todos.entries()) {
      const existing = this.known.get(todo.description);
      if (!existing) {
        rows.push(await this.create(todo, index));
        continue;
      }
      if (existing.status === todo.status && existing.orderIndex === index) {
        rows.push(existing);
        continue;
      }
      rows.push(await this.update(existing.id, todo, index));
    }
    return rows;
  }

  private async create(todo: TodoItem, index: number): Promise<AgentTaskRow> {
    const task = await this.options.client.createTask({
      description: todo.description,
      status: todo.status,
      orderIndex: index,
      ...(todo.error ? { error: todo.error } : {}),
    });
    this.known.set(todo.description, task);
    return task;
  }

  private async update(id: string, todo: TodoItem, index: number): Promise<AgentTaskRow> {
    const task = await this.options.client.updateTask({
      taskId: id,
      status: todo.status,
      orderIndex: index,
      ...(todo.error ? { error: todo.error } : {}),
    });
    this.known.set(todo.description, task);
    return task;
  }
}
