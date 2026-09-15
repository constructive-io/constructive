// `AgentEvent` → the thread.
//
// `@agentic-kit/agent` already emits everything a transcript needs, so this is a
// translation and nothing else: prose to a message, a tool call to a ToolPart
// rewritten in place as it runs, the agent's todo list to `agent_task` rows.
// Writes are serialized through one promise chain so the thread's order matches
// the run's order; `drain()` is how a composition root waits for the tail.

import type { AgentEvent } from '@agentic-kit/agent';
import type {
  TaskWriter,
  TodoItem,
  ToolPart,
  Transcript
} from '@agentic-kit/agent-conversation';
import { completeToolPart, failToolPart, toolPart } from '@agentic-kit/agent-conversation';
import { asOneOf, asRecord, asString } from '@constructive-io/coerce';

/** The text of a content block, or '' when the block carries none. */
const blockText = (block: unknown): string => asString(asRecord(block)?.text) ?? '';

/** Tool names whose arguments carry the agent's todo list. */
export const TODO_TOOL_NAMES = ['todo_write', 'update_plan', 'write_todos'];

export interface TranscriptWriterOptions {
  transcript: Transcript;
  /** Absent when the tenant's agent module has no task surface for this run. */
  tasks?: TaskWriter;
  /** Tool names whose arguments carry a todo list. */
  todoToolNames?: string[];
}

interface PendingCall {
  messageId: string;
  part: ToolPart;
}

/**
 * Translate a run's events into thread writes.
 *
 * Nothing here is best-effort: a failed write is kept and rethrown from
 * `drain()`, because a transcript that silently lost the middle of a run is
 * worse than a run that fails.
 */
export class TranscriptWriter {
  private chain: Promise<void> = Promise.resolve();
  private readonly pending = new Map<string, PendingCall>();
  private readonly todoToolNames: Set<string>;
  private failure: unknown;

  constructor(private readonly options: TranscriptWriterOptions) {
    this.todoToolNames = new Set(options.todoToolNames ?? TODO_TOOL_NAMES);
  }

  /** Subscribe this writer to an agent: `agent.subscribe(writer.handler)`. */
  readonly handler = (event: AgentEvent): void => {
    this.enqueue(() => this.apply(event));
  };

  /** Wait for every write queued so far, and surface the first that failed. */
  async drain(): Promise<void> {
    await this.chain;
    if (this.failure !== undefined) {
      const failure = this.failure;
      this.failure = undefined;
      throw failure;
    }
  }

  private enqueue(work: () => Promise<void>): void {
    this.chain = this.chain.then(async () => {
      if (this.failure !== undefined) return;
      try {
        await work();
      } catch (error) {
        this.failure = error;
      }
    });
  }

  private async apply(event: AgentEvent): Promise<void> {
    switch (event.type) {
    case 'message_end': {
      if (event.message.role !== 'assistant') return;
      const text = assistantText(event.message);
      if (text) await this.options.transcript.appendText(text);
      return;
    }
    case 'tool_execution_start': {
      const part = toolPart({
        toolName: event.toolName,
        toolCallId: event.toolCallId,
        input: event.args
      });
      const message = await this.options.transcript.appendToolPart(part);
      this.pending.set(event.toolCallId, { messageId: message.id, part });
      await this.syncTodos(event.toolName, event.args);
      return;
    }
    case 'tool_execution_end': {
      const call = this.pending.get(event.toolCallId);
      if (!call) {
        throw new Error(
          `tool call ${event.toolCallId} (${event.toolName}) ended without having started`
        );
      }
      this.pending.delete(event.toolCallId);
      const output = resultText(event.result);
      const next = event.isError
        ? failToolPart(call.part, output || 'The tool failed without a message')
        : completeToolPart(call.part, output);
      await this.options.transcript.updateToolPart(call.messageId, next);
      return;
    }
    case 'tool_decision_pending': {
      // The lane's tools declare no `decision` schema — approval is the
      // harness gate, answered through the thread. An in-band decision would
      // stall the run forever, so it fails loudly instead.
      throw new Error(
        `tool ${event.toolName} (${event.toolCallId}) asked for an in-band decision, which this runner does not serve`
      );
    }
    default:
      return;
    }
  }

  private async syncTodos(toolName: string, args: Record<string, unknown>): Promise<void> {
    if (!this.options.tasks || !this.todoToolNames.has(toolName)) return;
    const todos = parseTodos(args);
    if (todos) await this.options.tasks.sync(todos);
  }
}

/** The prose of an assistant message; thinking and tool calls are not prose. */
export function assistantText(message: { content: unknown }): string {
  const content = message.content;
  const prose = asString(content);
  if (prose) return prose.trim();
  if (!Array.isArray(content)) return '';
  return content
    .map((block) => (asRecord(block)?.type === 'text' ? blockText(block) : ''))
    .join('')
    .trim();
}

/** The text of a tool result, as the transcript records it. */
export function resultText(result: { content: unknown }): string {
  const content = result.content;
  const text = asString(content);
  if (text) return text;
  if (!Array.isArray(content)) return '';
  return content.map(blockText).join('').trim();
}

const TODO_STATUSES = ['pending', 'in_progress', 'completed', 'failed'] as const;

/**
 * The todo list a todo tool was called with. Returns null when the arguments do
 * not carry one; throws when they carry a malformed one, because a todo list the
 * tasks table cannot represent is a bug rather than an absence.
 */
export function parseTodos(args: Record<string, unknown>): TodoItem[] | null {
  const raw = args.todos ?? args.items ?? args.plan;
  if (raw === undefined || raw === null) return null;
  if (!Array.isArray(raw)) throw new Error('todo tool called with a non-list todo argument');

  return raw.map((entry, index) => {
    const item = asRecord(entry);
    if (!item) throw new Error(`todo ${index} is not an object`);

    const description = asString(item.description ?? item.content ?? item.title ?? item.step);
    if (!description) throw new Error(`todo ${index} carries no description`);
    const status = asOneOf(item.status ?? 'pending', TODO_STATUSES);
    if (!status) {
      throw new Error(
        `todo ${index} has status "${String(item.status)}", which agent_task does not model`
      );
    }
    const error = asString(item.error);
    return {
      description: description.trim(),
      status,
      ...(error ? { error } : {})
    };
  });
}
