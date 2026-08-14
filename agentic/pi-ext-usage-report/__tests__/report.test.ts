import { type AssistantUsageMessage, isAssistantMessage, toUsageReport } from '../src';

const usage = {
  input: 100,
  output: 40,
  cacheRead: 900,
  cacheWrite: 10,
  totalTokens: 1050,
  cost: { input: 0.1, output: 0.2, cacheRead: 0.01, cacheWrite: 0.02, total: 0.33 }
};

const message: AssistantUsageMessage = {
  role: 'assistant',
  provider: 'anthropic',
  model: 'claude-sonnet-4',
  responseId: 'resp-1',
  stopReason: 'stop',
  usage
};

describe('isAssistantMessage', () => {
  it('accepts only assistant messages', () => {
    expect(isAssistantMessage(message)).toBe(true);
    expect(isAssistantMessage({ role: 'user', content: 'hi' })).toBe(false);
    expect(isAssistantMessage(null)).toBe(false);
    expect(isAssistantMessage('assistant')).toBe(false);
  });
});

describe('toUsageReport', () => {
  it('counts cached prompt tokens as input so a long session is not under-reported', () => {
    expect(toUsageReport(message)).toEqual({
      model: 'claude-sonnet-4',
      provider: 'anthropic',
      service: 'chat',
      operation: 'pi/chat',
      input_tokens: 1010,
      output_tokens: 40,
      total_tokens: 1050,
      latency_ms: 0,
      status: 'ok',
      raw_usage: usage
    });
  });

  it('keeps the full pi usage — cache splits and cost — as raw_usage', () => {
    expect(toUsageReport(message)?.raw_usage).toBe(usage);
  });

  it('prefers the model the provider actually answered with', () => {
    expect(toUsageReport({ ...message, responseModel: 'claude-sonnet-4-20250514' })?.model).toBe(
      'claude-sonnet-4-20250514'
    );
  });

  it('derives a total when pi reports none', () => {
    const report = toUsageReport({ ...message, usage: { input: 5, output: 7, cacheRead: 3 } });
    expect(report).toMatchObject({ input_tokens: 8, output_tokens: 7, total_tokens: 15 });
  });

  it('marks failed turns and carries the provider error', () => {
    const report = toUsageReport({ ...message, stopReason: 'error', errorMessage: 'overloaded' });
    expect(report).toMatchObject({ status: 'error', error_type: 'overloaded' });
  });

  it('falls back to a generic error type when pi gives no message', () => {
    expect(toUsageReport({ ...message, stopReason: 'error' })?.error_type).toBe('error');
  });

  it('reports nothing when the turn never reached the provider', () => {
    expect(toUsageReport({ role: 'assistant', stopReason: 'aborted' })).toBeUndefined();
  });

  it('tolerates missing provider/model and non-finite counters', () => {
    const report = toUsageReport({ role: 'assistant', usage: { input: Number.NaN, output: 3 } });
    expect(report).toMatchObject({ model: 'unknown', provider: 'unknown', input_tokens: 0, output_tokens: 3 });
  });

  it('rounds and clamps host-measured latency, and honours a custom operation', () => {
    expect(toUsageReport(message, { latencyMs: 1234.6, operation: 'pi/code-task' })).toMatchObject({
      latency_ms: 1235,
      operation: 'pi/code-task'
    });
    expect(toUsageReport(message, { latencyMs: -5 })?.latency_ms).toBe(0);
  });
});
