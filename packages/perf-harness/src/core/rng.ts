/**
 * Seedable RNG + shape samplers — verbatim ports from
 * `scripts/scale-validate/_lib.mjs`. Reproducible tenant/shape selection so a
 * soak or ramp can be replayed byte-for-byte from a seed.
 */

export type Rng = () => number;

// mulberry32 — small, fast, fully deterministic for a given 32-bit seed.
export function makeRng(seed: number): Rng {
  let a = (seed >>> 0) || 0x9e3779b9;
  return function rng(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// zipf: weight_i = 1 / (i + 1) over fleet order; returns an index sampler that
// favours low indices (the "hot" tenants).
export function makeZipfSampler(n: number, rng: Rng): () => number {
  const weights: number[] = [];
  let total = 0;
  for (let i = 0; i < n; i++) {
    const w = 1 / (i + 1);
    weights.push(w);
    total += w;
  }
  const cum: number[] = [];
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc += weights[i] / total;
    cum.push(acc);
  }
  return () => {
    const r = rng();
    for (let i = 0; i < n; i++) if (r <= cum[i]) return i;
    return n - 1;
  };
}

// "read:0.7,write:0.25,meta:0.05" -> weighted key sampler.
export function makeMixSampler(mixStr: string, rng: Rng): () => string {
  const entries: [string, number][] = [];
  let total = 0;
  for (const part of String(mixStr).split(',')) {
    const [k, v] = part.split(':');
    const w = Number.parseFloat(v);
    if (k && Number.isFinite(w) && w > 0) {
      entries.push([k.trim(), w]);
      total += w;
    }
  }
  if (entries.length === 0) {
    entries.push(['read', 1]);
    total = 1;
  }
  const cum: [string, number][] = [];
  let acc = 0;
  for (const [k, w] of entries) {
    acc += w / total;
    cum.push([k, acc]);
  }
  return () => {
    const r = rng();
    for (const [k, c] of cum) if (r <= c) return k;
    return cum[cum.length - 1][0];
  };
}
