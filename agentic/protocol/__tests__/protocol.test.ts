import {
  type AssistantMessage,
  calculateUsageCost,
  clone,
  completePartialJson,
  createAssistantMessageEventStream,
  createEmptyUsage,
  type ModelDescriptor,
  normalizeBaseUrl,
  parsePartialJson,
} from '../src';

const model: ModelDescriptor = {
  id: 'test-model',
  name: 'Test',
  api: 'test-api',
  provider: 'test',
  baseUrl: 'https://example.com/v1',
  input: ['text'],
  reasoning: false,
  cost: { input: 3, output: 15 },
};

describe('protocol kernel', () => {
  it('createEmptyUsage produces a fully zeroed usage', () => {
    expect(createEmptyUsage()).toEqual({
      input: 0,
      output: 0,
      reasoning: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    });
  });

  it('calculateUsageCost applies the per-million schedule', () => {
    const usage = createEmptyUsage();
    usage.input = 1_000_000;
    usage.output = 2_000_000;
    calculateUsageCost(model, usage);
    expect(usage.cost.input).toBeCloseTo(3);
    expect(usage.cost.output).toBeCloseTo(30);
    expect(usage.cost.total).toBeCloseTo(33);
  });

  it('parsePartialJson recovers truncated tool arguments', () => {
    expect(parsePartialJson('{"city": "Paris')).toEqual({ city: 'Paris' });
    expect(parsePartialJson('{"items": [1, 2')).toEqual({ items: [1, 2] });
    expect(parsePartialJson('')).toEqual({});
  });

  it('completePartialJson closes open brackets and strings', () => {
    expect(completePartialJson('{"a": [1, {"b": "x')).toBe('{"a": [1, {"b": "x"}]}');
  });

  it('normalizeBaseUrl appends /v1 only when no version segment is present', () => {
    expect(normalizeBaseUrl('https://example.com')).toBe('https://example.com/v1');
    expect(normalizeBaseUrl('https://example.com/v1')).toBe('https://example.com/v1');
    expect(normalizeBaseUrl('https://example.com/v2/')).toBe('https://example.com/v2');
  });

  it('clone deep-copies without sharing references', () => {
    const source = { a: { b: 1 }, list: [1, 2, 3] };
    const copy = clone(source);
    expect(copy).toEqual(source);
    expect(copy.a).not.toBe(source.a);
  });

  it('EventStream yields events in order and resolves the terminal result', async () => {
    const stream = createAssistantMessageEventStream();
    const message: AssistantMessage = {
      role: 'assistant',
      content: [{ type: 'text', text: 'hi' }],
      api: model.api,
      provider: model.provider,
      model: model.id,
      usage: createEmptyUsage(),
      stopReason: 'stop',
      timestamp: Date.now(),
    };

    stream.push({ type: 'start', partial: message });
    stream.push({ type: 'done', reason: 'stop', message });
    stream.end(message);

    const seen: string[] = [];
    for await (const event of stream) {
      seen.push(event.type);
    }
    expect(seen).toEqual(['start', 'done']);
    await expect(stream.result()).resolves.toBe(message);
  });
});
