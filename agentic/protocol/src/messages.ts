import type {
  AssistantMessage,
  Context,
  ImageContent,
  Message,
  ModelDescriptor,
  TextContent,
  ToolCallContent,
  ToolResultMessage,
  Usage,
  UserMessage,
} from './types.js';

export function createEmptyUsage(): Usage {
  return {
    input: 0,
    output: 0,
    reasoning: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 0,
    cost: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      total: 0,
    },
  };
}

export function calculateUsageCost(model: ModelDescriptor, usage: Usage): void {
  const schedule = model.cost;
  usage.cost.input = ((schedule?.input ?? 0) / 1_000_000) * usage.input;
  usage.cost.output = ((schedule?.output ?? 0) / 1_000_000) * usage.output;
  usage.cost.cacheRead = ((schedule?.cacheRead ?? 0) / 1_000_000) * usage.cacheRead;
  usage.cost.cacheWrite = ((schedule?.cacheWrite ?? 0) / 1_000_000) * usage.cacheWrite;
  usage.cost.total =
    usage.cost.input + usage.cost.output + usage.cost.cacheRead + usage.cost.cacheWrite;
}

export function snapshotUsage(usage: Usage): Usage {
  return { ...usage, cost: { ...usage.cost } };
}

export function addUsage(target: Usage, delta: Usage): Usage {
  target.input += delta.input;
  target.output += delta.output;
  target.reasoning += delta.reasoning;
  target.cacheRead += delta.cacheRead;
  target.cacheWrite += delta.cacheWrite;
  target.totalTokens += delta.totalTokens;
  target.cost.input += delta.cost.input;
  target.cost.output += delta.cost.output;
  target.cost.cacheRead += delta.cost.cacheRead;
  target.cost.cacheWrite += delta.cost.cacheWrite;
  target.cost.total += delta.cost.total;
  return target;
}

export function createAssistantMessage(model: ModelDescriptor): AssistantMessage {
  return {
    role: 'assistant',
    api: model.api,
    provider: model.provider,
    model: model.id,
    content: [],
    usage: createEmptyUsage(),
    stopReason: 'stop',
    timestamp: Date.now(),
  };
}

export function createTextContent(text = ''): TextContent {
  return { type: 'text', text };
}

export function createImageContent(data: string, mimeType: string): ImageContent {
  return { type: 'image', data, mimeType };
}

export function createToolCall(id: string, name: string): ToolCallContent {
  return { type: 'toolCall', id, name, arguments: {}, rawArguments: '' };
}

export function createUserMessage(content: UserMessage['content']): UserMessage {
  return {
    role: 'user',
    content,
    timestamp: Date.now(),
  };
}

export function createToolResultMessage(
  toolCallId: string,
  toolName: string,
  content: ToolResultMessage['content'],
  isError = false
): ToolResultMessage {
  return {
    role: 'toolResult',
    toolCallId,
    toolName,
    content,
    isError,
    timestamp: Date.now(),
  };
}

export function getMessageText(message: AssistantMessage): string {
  return message.content
    .filter((block): block is TextContent => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

const DEFAULT_DEFERRAL_TEXT = 'User did not respond. Continue.';

export interface InjectDeferralResultsOptions {
  /** Text body for synthesized results. Defaults to a generic continue prompt. */
  deferralText?: string;
  /** Stamped onto each synthesized result's `details` field — typically `{ deferred: true }` so renderers can hide a "Done" badge. */
  details?: unknown;
}

/**
 * Synthesize toolResult messages for every toolCall that lacks both a decision
 * and a paired toolResult. Returns input unchanged (referentially equal) when
 * nothing needs synthesizing.
 *
 * Use case: user types a message instead of clicking approve/deny on a paused
 * tool. The agent can't resume on text alone — every dangling toolCall needs
 * a result before the next request. Compose with sendMessages to forward the
 * conversation cleanly:
 *
 *   await sendMessages([...injectDeferralResults(messages), createUserMessage(text)]);
 */
export function injectDeferralResults(
  messages: Message[],
  optionsOrText: InjectDeferralResultsOptions | string = {}
): Message[] {
  const opts: InjectDeferralResultsOptions =
    typeof optionsOrText === 'string' ? { deferralText: optionsOrText } : optionsOrText;
  const deferralText = opts.deferralText ?? DEFAULT_DEFERRAL_TEXT;
  const completed = new Set<string>();
  for (const m of messages) {
    if (m.role === 'toolResult') completed.add(m.toolCallId);
  }
  const synthetic: ToolResultMessage[] = [];
  for (const m of messages) {
    if (m.role !== 'assistant') continue;
    for (const block of m.content) {
      if (block.type !== 'toolCall') continue;
      if (completed.has(block.id)) continue;
      if ('decision' in block && block.decision !== undefined) continue;
      const result = createToolResultMessage(block.id, block.name, [
        { type: 'text', text: deferralText },
      ]);
      if (opts.details !== undefined) result.details = opts.details;
      synthetic.push(result);
    }
  }
  if (synthetic.length === 0) return messages;
  return [...messages, ...synthetic];
}

export function cloneMessage<TMessage extends Message>(message: TMessage): TMessage {
  return JSON.parse(JSON.stringify(message)) as TMessage;
}

export function normalizeContext(context: Context): Context {
  return {
    systemPrompt: context.systemPrompt,
    tools: context.tools ?? [],
    messages: context.messages.map((message) => ensureTimestamp(cloneMessage(message))),
  };
}

function ensureTimestamp<TMessage extends Message>(message: TMessage): TMessage {
  if (typeof message.timestamp !== 'number') {
    (message as Message).timestamp = Date.now();
  }
  return message;
}
