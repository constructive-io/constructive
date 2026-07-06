import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { collectMetricsSample, startMetricsSampler } from '../metrics-sampler';

const originalEnv = { ...process.env };

const tmpFile = (): string =>
  path.join(os.tmpdir(), `metrics-sampler-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.jsonl`);

const waitForFileContent = async (file: string, timeoutMs = 2_000): Promise<string> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const content = await fs.promises.readFile(file, 'utf8');
      if (content.trim().length > 0) {
        return content;
      }
    } catch {
      // file not created yet
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`metrics file ${file} never received content`);
};

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('collectMetricsSample', () => {
  it('produces a well-formed, JSON-serializable sample', () => {
    const sample = collectMetricsSample();

    expect(typeof sample.ts).toBe('string');
    expect(Number.isNaN(Date.parse(sample.ts))).toBe(false);
    expect(typeof sample.rss).toBe('number');
    expect(typeof sample.heapUsed).toBe('number');
    expect(typeof sample.heapTotal).toBe('number');
    expect(typeof sample.external).toBe('number');
    expect(typeof sample.heap_size_limit).toBe('number');
    expect(typeof sample.cache.size).toBe('number');
    expect(typeof sample.cache.keys).toBe('number');
    // counters merge cache counters + graphile counters + build queue depth
    expect(typeof sample.counters.disposals).toBe('number');
    expect(typeof sample.counters.evictions.lru).toBe('number');
    expect(typeof sample.counters.builds).toBe('number');
    expect(typeof sample.counters.buildQueueDepth).toBe('number');
    expect(typeof sample.counters.rewritePool.rewrittenQueries).toBe('number');
    expect(typeof sample.counters.introspectionFilter.swaps).toBe('number');
    expect(typeof sample.counters.introspectionFilter.discoveries).toBe('number');
    expect(typeof sample.gc).toBe('object');

    // Round-trips through JSON without loss.
    expect(() => JSON.parse(JSON.stringify(sample))).not.toThrow();
  });
});

describe('startMetricsSampler (disabled)', () => {
  it('returns null and writes nothing when GRAPHILE_DEBUG_METRICS is unset', async () => {
    delete process.env.GRAPHILE_DEBUG_METRICS;
    const file = tmpFile();
    process.env.GRAPHILE_DEBUG_METRICS_FILE = file;

    const handle = startMetricsSampler();
    expect(handle).toBeNull();

    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(fs.existsSync(file)).toBe(false);
  });

  it('returns null when GRAPHILE_DEBUG_METRICS is a falsy string', () => {
    process.env.GRAPHILE_DEBUG_METRICS = '0';
    expect(startMetricsSampler()).toBeNull();
    process.env.GRAPHILE_DEBUG_METRICS = 'false';
    expect(startMetricsSampler()).toBeNull();
  });
});

describe('startMetricsSampler (enabled)', () => {
  it("writes a parseable JSON line to the configured file when enabled ('1')", async () => {
    const file = tmpFile();
    process.env.GRAPHILE_DEBUG_METRICS = '1';
    process.env.GRAPHILE_DEBUG_METRICS_FILE = file;
    process.env.GRAPHILE_DEBUG_METRICS_INTERVAL_MS = '50';

    const handle = startMetricsSampler();
    expect(handle).not.toBeNull();

    try {
      const content = await waitForFileContent(file);
      const firstLine = content.trim().split('\n')[0];
      const parsed = JSON.parse(firstLine);

      expect(typeof parsed.ts).toBe('string');
      expect(typeof parsed.rss).toBe('number');
      expect(typeof parsed.heap_size_limit).toBe('number');
      expect(parsed.cache).toBeDefined();
      expect(typeof parsed.counters.disposals).toBe('number');
      expect(typeof parsed.counters.buildQueueDepth).toBe('number');
      expect(parsed.gc).toBeDefined();
    } finally {
      handle?.stop();
      await fs.promises.rm(file, { force: true });
    }
  });

  it("also treats 'true' as enabled", async () => {
    const file = tmpFile();
    process.env.GRAPHILE_DEBUG_METRICS = 'true';
    process.env.GRAPHILE_DEBUG_METRICS_FILE = file;
    process.env.GRAPHILE_DEBUG_METRICS_INTERVAL_MS = '50';

    const handle = startMetricsSampler();
    expect(handle).not.toBeNull();

    try {
      const content = await waitForFileContent(file);
      expect(() => JSON.parse(content.trim().split('\n')[0])).not.toThrow();
    } finally {
      handle?.stop();
      await fs.promises.rm(file, { force: true });
    }
  });
});
