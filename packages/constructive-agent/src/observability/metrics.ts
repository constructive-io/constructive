export type MetricTags = Record<string, string | number | boolean>;

export interface MetricsRecorder {
  increment(metric: string, value?: number, tags?: MetricTags): void;
  timing(metric: string, milliseconds: number, tags?: MetricTags): void;
  gauge?(metric: string, value: number, tags?: MetricTags): void;
}

export interface MetricRecord {
  type: 'increment' | 'timing' | 'gauge';
  metric: string;
  value: number;
  tags?: MetricTags;
  timestamp: number;
}

export class NoopMetricsRecorder implements MetricsRecorder {
  increment(
    _metric: string,
    _value: number = 1,
    _tags?: MetricTags,
  ): void {
    // no-op
  }

  timing(
    _metric: string,
    _milliseconds: number,
    _tags?: MetricTags,
  ): void {
    // no-op
  }

  gauge(
    _metric: string,
    _value: number,
    _tags?: MetricTags,
  ): void {
    // no-op
  }
}

export class InMemoryMetricsRecorder implements MetricsRecorder {
  private readonly records: MetricRecord[] = [];

  increment(
    metric: string,
    value: number = 1,
    tags?: MetricTags,
  ): void {
    this.records.push({
      type: 'increment',
      metric,
      value,
      tags,
      timestamp: Date.now(),
    });
  }

  timing(
    metric: string,
    milliseconds: number,
    tags?: MetricTags,
  ): void {
    this.records.push({
      type: 'timing',
      metric,
      value: milliseconds,
      tags,
      timestamp: Date.now(),
    });
  }

  gauge(
    metric: string,
    value: number,
    tags?: MetricTags,
  ): void {
    this.records.push({
      type: 'gauge',
      metric,
      value,
      tags,
      timestamp: Date.now(),
    });
  }

  list(): MetricRecord[] {
    return this.records.slice();
  }

  clear(): void {
    this.records.length = 0;
  }
}

export class CompositeMetricsRecorder implements MetricsRecorder {
  constructor(private readonly recorders: MetricsRecorder[]) {}

  increment(
    metric: string,
    value: number = 1,
    tags?: MetricTags,
  ): void {
    for (const recorder of this.recorders) {
      recorder.increment(metric, value, tags);
    }
  }

  timing(
    metric: string,
    milliseconds: number,
    tags?: MetricTags,
  ): void {
    for (const recorder of this.recorders) {
      recorder.timing(metric, milliseconds, tags);
    }
  }

  gauge(
    metric: string,
    value: number,
    tags?: MetricTags,
  ): void {
    for (const recorder of this.recorders) {
      recorder.gauge?.(metric, value, tags);
    }
  }
}

export const ensureMetricsRecorder = (
  recorder?: MetricsRecorder,
): MetricsRecorder => {
  return recorder || new NoopMetricsRecorder();
};
