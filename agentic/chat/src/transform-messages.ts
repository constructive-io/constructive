import type {
  Message,
  ModelDescriptor,
  TextContent,
  ThinkingContent,
  ToolCallContent,
  ToolResultMessage,
} from '@agentic-kit/protocol';

export function transformMessages(messages: Message[], model: ModelDescriptor): Message[] {
  const toolCallIdMap = new Map<string, string>();

  const transformed: Message[] = messages.flatMap((message): Message[] => {
    if (message.role !== 'assistant') {
      if (message.role === 'toolResult') {
        const normalizedId = toolCallIdMap.get(message.toolCallId);
        if (normalizedId && normalizedId !== message.toolCallId) {
          return [{ ...message, toolCallId: normalizedId }];
        }
      }

      return [message];
    }

    if (message.stopReason === 'error' || message.stopReason === 'aborted') {
      return [];
    }

    const sameModel =
      message.provider === model.provider &&
      message.api === model.api &&
      message.model === model.id;

    const content: Array<TextContent | ThinkingContent | ToolCallContent> = message.content.flatMap(
      (block): Array<TextContent | ThinkingContent | ToolCallContent> => {
        if (block.type === 'thinking') {
          if (sameModel) {
            return [block];
          }

          if (!block.thinking.trim()) {
            return [];
          }

          const thinkingAsText: TextContent = {
            type: 'text',
            text: `<thinking>${block.thinking}</thinking>`,
          };
          return [thinkingAsText];
        }

        if (block.type === 'toolCall') {
          const normalizedId = normalizeToolCallId(block.id, model);
          if (normalizedId !== block.id) {
            toolCallIdMap.set(block.id, normalizedId);
          }

          const toolCall: ToolCallContent =
            normalizedId === block.id ? block : { ...block, id: normalizedId };
          return [toolCall];
        }

        return [block];
      }
    );

    return [{ ...message, content }];
  });

  return insertSyntheticToolResults(transformed);
}

function insertSyntheticToolResults(messages: Message[]): Message[] {
  const result: Message[] = [];
  let pendingToolCalls: ToolCallContent[] = [];
  let seenToolResults = new Set<string>();

  for (const message of messages) {
    if (message.role === 'assistant') {
      flushPendingToolCalls(result, pendingToolCalls, seenToolResults);

      pendingToolCalls = message.content.filter(
        (block): block is ToolCallContent => block.type === 'toolCall'
      );
      seenToolResults = new Set<string>();
      result.push(message);
      continue;
    }

    if (message.role === 'toolResult') {
      seenToolResults.add(message.toolCallId);
      result.push(message);
      continue;
    }

    flushPendingToolCalls(result, pendingToolCalls, seenToolResults);
    pendingToolCalls = [];
    seenToolResults = new Set<string>();
    result.push(message);
  }

  flushPendingToolCalls(result, pendingToolCalls, seenToolResults);
  return result;
}

function flushPendingToolCalls(
  result: Message[],
  pendingToolCalls: ToolCallContent[],
  seenToolResults: Set<string>
): void {
  if (pendingToolCalls.length === 0) {
    return;
  }

  for (const toolCall of pendingToolCalls) {
    if (seenToolResults.has(toolCall.id)) {
      continue;
    }

    const synthetic: ToolResultMessage = {
      role: 'toolResult',
      toolCallId: toolCall.id,
      toolName: toolCall.name,
      content: [{ type: 'text', text: 'No result provided.' }],
      isError: true,
      timestamp: Date.now(),
    };
    result.push(synthetic);
  }
}

function normalizeToolCallId(id: string, model: ModelDescriptor): string {
  const format = model.compat?.toolCallIdFormat ?? defaultToolCallIdFormat(model);
  if (format === 'passthrough') {
    return id;
  }

  if (format === 'mistral9') {
    const alphanumeric = id.replace(/[^a-zA-Z0-9]/g, '');
    if (alphanumeric.length >= 9) {
      return alphanumeric.slice(0, 9);
    }

    return stableAlphanumericId(id, 9);
  }

  const safe = id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  if (safe.length > 0) {
    return safe;
  }

  return stableId(id, 24, /^[a-zA-Z0-9_-]+$/);
}

function defaultToolCallIdFormat(model: ModelDescriptor): 'passthrough' | 'safe64' | 'mistral9' {
  if (model.provider === 'anthropic' || model.api === 'anthropic-messages') {
    return 'safe64';
  }

  return 'passthrough';
}

function stableId(input: string, length: number, pattern: RegExp): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }

  let value = `tc_${hash.toString(36)}`;
  while (!pattern.test(value)) {
    value = value.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  if (value.length >= length) {
    return value.slice(0, length);
  }

  return value.padEnd(length, '0');
}

function stableAlphanumericId(input: string, length: number): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }

  const value = `tc${hash.toString(36)}`.replace(/[^a-zA-Z0-9]/g, '');
  if (value.length >= length) {
    return value.slice(0, length);
  }

  return value.padEnd(length, '0');
}
