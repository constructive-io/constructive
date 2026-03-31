# Graphile Cache Load Test Report: `isPublic=true` vs `isPublic=false`

Date: 2026-03-31  
Author: Codex

## 1. Scope and Data Sources

This report compares two traffic modes under business workload:

- `isPublic=true` (public routing, host-scoped cache key)  
  Explanation: cache keys are grouped by `Host` (domain/subdomain). Requests under the same Host reuse the same Graphile schema cache. Think of it as “bucket by site”: key count is usually close to active domain count, with higher reuse and more stable hit rate.
- `isPublic=false` (private routing, schemata/keyspace-scoped cache key)  
  Explanation: cache keys are grouped by “tenant context + schema set” (for example, X-Schemata). Any schema-set change can create a new key. Think of it as “bucket by data-visibility scope”: finer isolation, but faster keyspace growth and higher rebuild/memory cost.

Primary run directory:

- `/Users/zeta/Projects/interweb/src/agents/tmp/business-public-k15k24-20260327-111301`

Primary artifacts:

- `data/load-business-public-t{3,7,15,24}-15m-sweep.json`
- `data/load-business-k3-2m-sweep.json`
- `data/load-business-k7-15m-sweep.json`
- `reports/analyze-debug-logs-*.json`
- `reports/k-sweep-summary-public-k3-15m-final.json`
- `reports/k-sweep-summary-public-k7-15m-final.json`
- `reports/k-sweep-summary-private-k7-15m-recheck.json`

## 2. Executive Summary

- `isPublic=true` is stable in this test set: near-100% success rate, low latency, and high throughput.
- `isPublic=false` is still unstable in this test set: many requests hit the 20s timeout, and effective RPS is very low.
- The private-path issue is not simply route-probe or prewarm failure: probe is healthy and prewarm can pass, but sustained load still degrades badly.

## 3. Results for `isPublic=true`

| Tier | Duration | Profiles | Total | OK | Failed | Success | RPS | P50 | P95 | P99 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `business-public-t3-15m-sweep` | 900s + 120s idle | 3 | 1,619,447 | 1,619,447 | 0 | 100.0000% | 1799.38 | 2ms | 4ms | 6ms |
| `business-public-t7-15m-sweep` | 900s + 120s idle | 7 | 1,125,881 | 1,125,881 | 0 | 100.0000% | 1250.98 | 3ms | 7ms | 12ms |
| `business-public-t15-15m-sweep` | 900s + 120s idle | 15 | 859,332 | 859,328 | 4 | 99.9995% | 954.81 | 3ms | 9ms | 15ms |
| `business-public-t24-15m-sweep` | 900s + 120s idle | 24 | 635,888 | 635,880 | 8 | 99.9987% | 706.39 | 2ms | 10ms | 15ms |

Notes:

- As key count increases (t3 -> t24), throughput decreases as expected, while success rate and latency remain in a healthy range.

## 4. Results for `isPublic=false`

| Tier | Duration | Profiles | Total | OK | Failed | Success | RPS | P50 | P95 | P99 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `business-k3-2m-sweep` | 120s + 30s idle | 72 | 36 | 18 | 18 | 50.0000% | 0.26 | 19,588ms | 20,011ms | 20,012ms |
| `business-k7-15m-sweep` | 900s + 120s idle | 168 | 190 | 15 | 175 | 7.8947% | 0.21 | 20,007ms | 20,040ms | 20,060ms |

Notes:

- Failures are timeout-dominated (`status=0`, around 20s timeout).
- In the `k7` recheck, route probe is healthy (`200`) and prewarm also succeeded (`6/6`), but full load still degraded.

## 5. Memory and Build Signals

### `isPublic=true` (highlights)

- `t3`: heap delta `-192.3MB`, cache end size `3`, build `3/3`, max build `9,184ms`.
- `t7`: heap delta `-27.5MB`, cache end size `7`, build `7/7`, max build `8,076ms`.
- `t24`: heap delta `+6,784.7MB`, cache end size `24`, build `25/25`, max build `490ms`.

### `isPublic=false` (highlights)

- `k3-2m`: heap delta `+6,137.5MB`, cache end size `21`, build `21/21`, max build `53,835ms`, inflight max `6`.
- `k7-15m`: heap delta `+10,920.7MB`, cache end size `36`, build `50/70` succeeded, max build `334,523ms`, avg build `116,814.6ms`, inflight max/end `20/20`.

Interpretation:

- Public path is stable in this run.
- Private path shows clear build/inflight pressure, aligned with timeout-heavy degradation.
- Public `t24` still shows notable heap growth; even with good request metrics, this should be monitored.

## 6. Final Assessment

1. For this workload, `isPublic=true` is close to production-ready (stable throughput/latency/success).  
2. `isPublic=false` still does not meet the bar under current settings; the issue remains unresolved in recheck.  
3. Next step: prioritize private-path controls for build concurrency/inflight pressure, then rerun k7/k15 for comparison.

