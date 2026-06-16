import type { AgentEvent } from '@agentic-kit/agent';
import type { AssistantMessage, Usage } from 'agentic-kit';

export const ZERO_USAGE: Usage = {
  input: 0,
  output: 0,
  reasoning: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
};

export function makeFakeAssistantMessage(
  overrides: Partial<AssistantMessage> = {}
): AssistantMessage {
  return {
    role: 'assistant',
    api: 'fake-api',
    provider: 'fake',
    model: 'demo',
    usage: { ...ZERO_USAGE, cost: { ...ZERO_USAGE.cost } },
    stopReason: 'stop',
    timestamp: Date.now(),
    content: [{ type: 'text', text: '' }],
    ...overrides,
  };
}

export function createScriptedSSEResponse(events: AgentEvent[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }
      controller.close();
    },
  });

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
