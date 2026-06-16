import { makeFakeAssistantMessage } from './helpers';

import type { AssistantMessage, Message, ToolResultMessage } from '../src';
import { injectDeferralResults } from '../src';

function assistantWithToolCall(
  id: string,
  name = 'echo',
  extra: Partial<{ decision: unknown }> = {}
): AssistantMessage {
  return makeFakeAssistantMessage({
    stopReason: 'toolUse',
    content: [
      {
        type: 'toolCall',
        id,
        name,
        arguments: {},
        rawArguments: '{}',
        ...extra,
      },
    ],
  });
}

function toolResult(id: string, name = 'echo'): ToolResultMessage {
  return {
    role: 'toolResult',
    toolCallId: id,
    toolName: name,
    content: [{ type: 'text', text: 'ok' }],
    isError: false,
    timestamp: 1,
  };
}

describe('injectDeferralResults', () => {
  it('returns input unchanged when no unpaired toolCalls', () => {
    const messages: Message[] = [
      { role: 'user', content: 'hi', timestamp: 1 },
      assistantWithToolCall('call_1'),
      toolResult('call_1'),
    ];
    const result = injectDeferralResults(messages);
    expect(result).toBe(messages);
  });

  it('returns input unchanged when there are no assistant messages with tool calls', () => {
    const messages: Message[] = [{ role: 'user', content: 'hi', timestamp: 1 }];
    const result = injectDeferralResults(messages);
    expect(result).toBe(messages);
  });

  it('synthesizes a toolResult for each unpaired toolCall in order', () => {
    const messages: Message[] = [
      { role: 'user', content: 'hi', timestamp: 1 },
      makeFakeAssistantMessage({
        stopReason: 'toolUse',
        content: [
          { type: 'toolCall', id: 'call_1', name: 'first', arguments: {}, rawArguments: '{}' },
          { type: 'toolCall', id: 'call_2', name: 'second', arguments: {}, rawArguments: '{}' },
        ],
      }),
    ];
    const result = injectDeferralResults(messages);
    expect(result).toHaveLength(messages.length + 2);
    const synthetic = result.slice(messages.length) as ToolResultMessage[];
    expect(synthetic[0].role).toBe('toolResult');
    expect(synthetic[0].toolCallId).toBe('call_1');
    expect(synthetic[0].toolName).toBe('first');
    expect(synthetic[1].toolCallId).toBe('call_2');
    expect(synthetic[1].toolName).toBe('second');
  });

  it('uses default deferral text when none supplied', () => {
    const messages: Message[] = [assistantWithToolCall('call_1')];
    const result = injectDeferralResults(messages);
    const synthetic = result[result.length - 1] as ToolResultMessage;
    expect(synthetic.content).toEqual([
      { type: 'text', text: 'User did not respond. Continue.' },
    ]);
  });

  it('passes through custom deferral text', () => {
    const messages: Message[] = [assistantWithToolCall('call_1')];
    const result = injectDeferralResults(messages, 'custom message');
    const synthetic = result[result.length - 1] as ToolResultMessage;
    expect(synthetic.content).toEqual([{ type: 'text', text: 'custom message' }]);
  });

  it('accepts options form with text + details', () => {
    const messages: Message[] = [assistantWithToolCall('call_1')];
    const result = injectDeferralResults(messages, {
      deferralText: 'opts text',
      details: { deferred: true },
    });
    const synthetic = result[result.length - 1] as ToolResultMessage;
    expect(synthetic.content).toEqual([{ type: 'text', text: 'opts text' }]);
    expect(synthetic.details).toEqual({ deferred: true });
  });

  it('omits details when not provided', () => {
    const messages: Message[] = [assistantWithToolCall('call_1')];
    const result = injectDeferralResults(messages);
    const synthetic = result[result.length - 1] as ToolResultMessage;
    expect(synthetic.details).toBeUndefined();
  });

  it('skips toolCalls with a decision already attached', () => {
    const messages: Message[] = [
      assistantWithToolCall('call_1', 'echo', { decision: { action: 'approve' } }),
    ];
    const result = injectDeferralResults(messages);
    expect(result).toBe(messages);
  });

  it('skips toolCalls already paired with a toolResult', () => {
    const messages: Message[] = [
      assistantWithToolCall('call_1'),
      toolResult('call_1'),
      assistantWithToolCall('call_2'),
    ];
    const result = injectDeferralResults(messages);
    expect(result).toHaveLength(messages.length + 1);
    const synthetic = result[result.length - 1] as ToolResultMessage;
    expect(synthetic.toolCallId).toBe('call_2');
  });

  it('handles a mix: one paired, one decisioned, one unpaired', () => {
    const messages: Message[] = [
      assistantWithToolCall('call_1'),
      toolResult('call_1'),
      assistantWithToolCall('call_2', 'echo', { decision: { action: 'approve' } }),
      assistantWithToolCall('call_3'),
    ];
    const result = injectDeferralResults(messages);
    expect(result).toHaveLength(messages.length + 1);
    const synthetic = result[result.length - 1] as ToolResultMessage;
    expect(synthetic.toolCallId).toBe('call_3');
  });
});
