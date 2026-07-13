/**
 * Bucketed latency histogram (bounded memory — safe for multi-hour soaks).
 * Verbatim port from `scripts/scale-validate/_lib.mjs`.
 */

export const DEFAULT_BUCKETS: number[] = [
  1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610,
  1000, 1600, 2600, 4200, 6800, 11000, 18000, 30000, 60000
];

const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface HistogramSummary {
  count: number;
  min: number;
  mean: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
}

export class Histogram {
  buckets: number[];
  counts: number[];
  count: number;
  sum: number;
  min: number;
  max: number;

  constructor(buckets: number[] = DEFAULT_BUCKETS) {
    this.buckets = buckets;
    this.counts = new Array(buckets.length + 1).fill(0);
    this.count = 0;
    this.sum = 0;
    this.min = Infinity;
    this.max = 0;
  }

  record(ms: number): void {
    this.count++;
    this.sum += ms;
    if (ms < this.min) this.min = ms;
    if (ms > this.max) this.max = ms;
    let i = 0;
    while (i < this.buckets.length && ms > this.buckets[i]) i++;
    this.counts[i]++;
  }

  percentile(p: number): number {
    if (this.count === 0) return 0;
    const target = Math.ceil((p / 100) * this.count);
    let cum = 0;
    for (let i = 0; i < this.counts.length; i++) {
      cum += this.counts[i];
      if (cum >= target) {
        return i < this.buckets.length ? this.buckets[i] : Math.round(this.max);
      }
    }
    return Math.round(this.max);
  }

  summary(): HistogramSummary {
    return {
      count: this.count,
      min: this.count ? round2(this.min) : 0,
      mean: this.count ? round2(this.sum / this.count) : 0,
      p50: this.percentile(50),
      p95: this.percentile(95),
      p99: this.percentile(99),
      max: round2(this.max)
    };
  }
}
