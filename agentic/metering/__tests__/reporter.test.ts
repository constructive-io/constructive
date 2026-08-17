import { httpUsageSink, type UsageReport, UsageReporter } from '../src';

const report: UsageReport = {
  model: 'gpt-4o',
  provider: 'openai',
  service: 'chat',
  operation: 'agent/chat',
  input_tokens: 10,
  output_tokens: 5,
  total_tokens: 15,
  latency_ms: 0,
  status: 'ok'
};

describe('httpUsageSink', () => {
  const identity = { databaseId: 'db-1', entityId: 'ent-1', actorId: 'act-1', runToken: 'tok-1' };

  it('posts to /v1/usage on the gateway root with identity headers', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 202 });
    const sink = httpUsageSink({ gatewayUrl: 'https://gw.example.com/', identity, fetch: fetchMock as never });

    await sink(report);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://gw.example.com/v1/usage');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      'X-Database-Id': 'db-1',
      'X-Entity-Id': 'ent-1',
      'X-Actor-Id': 'act-1',
      Authorization: 'Bearer tok-1'
    });
    expect(JSON.parse(init.body)).toEqual(report);
  });

  it('rejects a gateway URL that already includes /v1', () => {
    expect(() =>
      httpUsageSink({ gatewayUrl: 'https://gw.example.com/v1', identity, fetch: jest.fn() as never })
    ).toThrow(/drop the \/v1/);
  });

  it('requires a databaseId', () => {
    expect(() =>
      httpUsageSink({ gatewayUrl: 'https://gw.example.com', identity: { databaseId: '' }, fetch: jest.fn() as never })
    ).toThrow(/databaseId is required/);
  });

  it('throws with the gateway status and body when the report is rejected', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('model is required')
    });
    const sink = httpUsageSink({ gatewayUrl: 'https://gw.example.com', identity, fetch: fetchMock as never });

    await expect(sink(report)).rejects.toThrow('usage report: gateway rejected the report (400) model is required');
  });
});

describe('UsageReporter', () => {
  it('delivers queued reports in order without blocking the caller', async () => {
    const seen: string[] = [];
    const reporter = new UsageReporter({
      sink: async (item) => {
        seen.push(item.model);
      }
    });

    reporter.enqueue({ ...report, model: 'a' });
    reporter.enqueue({ ...report, model: 'b' });
    expect(seen).toEqual([]);

    await reporter.flush();
    expect(seen).toEqual(['a', 'b']);
    expect(reporter.delivered).toBe(2);
  });

  it('keeps the first failure and rethrows it from flush', async () => {
    const reporter = new UsageReporter({
      sink: async (item) => {
        throw new Error(`down: ${item.model}`);
      }
    });

    reporter.enqueue({ ...report, model: 'a' });
    reporter.enqueue({ ...report, model: 'b' });

    await expect(reporter.flush()).rejects.toThrow('down: a');
    expect(reporter.delivered).toBe(0);
  });

  it('keeps delivering after a failure so one bad report does not drop the rest', async () => {
    const reporter = new UsageReporter({
      sink: async (item) => {
        if (item.model === 'a') throw new Error('down');
      }
    });

    reporter.enqueue({ ...report, model: 'a' });
    reporter.enqueue({ ...report, model: 'b' });

    await expect(reporter.flush()).rejects.toThrow('down');
    expect(reporter.delivered).toBe(1);
  });

  it('does not rethrow the same failure twice', async () => {
    const reporter = new UsageReporter({ sink: async () => Promise.reject(new Error('down')) });
    reporter.enqueue(report);

    await expect(reporter.flush()).rejects.toThrow('down');
    await expect(reporter.flush()).resolves.toBeUndefined();
  });

  it('routes failures to onError instead when the host wants them non-fatal', async () => {
    const onError = jest.fn();
    const reporter = new UsageReporter({ sink: async () => Promise.reject(new Error('down')), onError });

    reporter.enqueue(report);
    await expect(reporter.flush()).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledWith(expect.any(Error), report);
  });
});
