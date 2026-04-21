# Multi-Tenancy Cache Stress Test Report

This document captures the stress-test results for the current multi-tenancy caching strategy.

The optimization logic evaluated here is:

- introspection caching
- exact-match buildKey handler reuse
- perf stress testing of the old vs new request path

## Test Configuration

| Parameter | Value |
|---|---|
| **Server** | Constructive GraphQL server |
| **Database** | PostgreSQL on localhost:5432, `postgres_perf` |
| **Node.js** | `NODE_ENV=development` |
| **Mode comparison** | OLD = dedicated instances (`GRAPHILE_CACHE_MAX` tuned); NEW = `USE_MULTI_TENANCY_CACHE=true` |
| **Benchmark tool** | `e2e-benchmark.ts` through Express -> PostGraphile -> Grafast -> PostgreSQL |
| **Query mix** | ListApis (40%), ListApps (20%), ListDomains (20%), Introspection (10%), MetaQuery (10%) |

## Stress Matrix

| # | Test | K | Workers | Duration | Schema Variants | Extras |
|---|------|---|---------|----------|-----------------|--------|
| 1 | High-K scale | 100 | 10 | 5 min | `SCHEMA_VARIANTS=4` | `MULTI_ENDPOINT=true` |
| 2 | High concurrency | 30 | 10 | 5 min | `SCHEMA_VARIANTS=4` | `MULTI_ENDPOINT=true` |
| 3 | Flush under load | 30 | 10 | 5 min | `SCHEMA_VARIANTS=4` | `CHAOS_FLUSH=true FLUSH_INTERVAL=30` |
| 4 | Mixed buildKeys (max divergence) | 30 | 10 | 5 min | `SCHEMA_VARIANTS=8` | — |
| 5 | Soak | 30 | 10 | 2 hr | `SCHEMA_VARIANTS=4` | `CHAOS_FLUSH=true FLUSH_INTERVAL=60` |
| 6 | Startup burst | 30 | 10 | 1 min | `SCHEMA_VARIANTS=4` | `BURST_START=true` |

Each test was run in OLD mode and NEW mode.

## Results Summary

### Throughput and Memory

| # | Test | OLD QPS | NEW QPS | QPS Delta | OLD Heap Delta | NEW Heap Delta | Heap Saved | svc_keys | Errors |
|---|------|---------|---------|-----------|----------------|----------------|------------|----------|--------|
| 1 | High-K | 697 | 772 | +11% | 1,502 MB | 191 MB | -87% | 400 | 0 |
| 2 | High concurrency | 717 | 731 | +2% | 648 MB | 262 MB | -60% | 120 | 0 |
| 3 | Flush under load | 689 | 738 | +7% | 1,019 MB | 220 MB | -78% | 120 | 0 |
| 4 | Mixed buildKeys | 730 | 760 | +4% | 950 MB | 51 MB | -95% | 240 | 0 |
| 5 | Soak | 733 | 763 | +4% | 856 MB | 560 MB | -35% | 120 | 0 |
| 6 | Startup burst | 728 | 746 | +2% | 1,216 MB | 264 MB | -78% | 120 | 0 |

### Latency

| # | Test | OLD p50 | NEW p50 | OLD p95 | NEW p95 | OLD p99 | NEW p99 |
|---|------|---------|---------|---------|---------|---------|---------|
| 1 | High-K | 14 ms | 14 ms | 21 ms | 19 ms | 25 ms | 21 ms |
| 2 | High concurrency | 15 ms | 15 ms | 21 ms | 21 ms | 25 ms | 24 ms |
| 3 | Flush under load | 15 ms | 14 ms | 23 ms | 21 ms | 30 ms | 25 ms |
| 4 | Mixed buildKeys | 14 ms | 14 ms | 21 ms | 20 ms | 25 ms | 23 ms |
| 5 | Soak | 15 ms | 14 ms | 21 ms | 20 ms | 24 ms | 23 ms |
| 6 | Startup burst | 14 ms | 14 ms | 21 ms | 20 ms | 25 ms | 25 ms |

### Soak Detail

| Metric | OLD | NEW |
|--------|-----|-----|
| Total queries | 5,281,481 | 5,493,698 |
| QPS | 733 | 763 |
| Errors | 0 | 0 |
| Chaos flush events | 119 | 119 |
| Flush errors | 0 | 0 |
| Avg flush latency | 23 ms | 23 ms |

## Analysis

### Why the heap savings are so large

The dominant effect is exact-match buildKey deduplication combined with cached introspection state.

In OLD mode, every `svc_key` keeps its own PostGraphile instance, compiled schema, and runtime caches.
In NEW mode, `svc_key`s that resolve to the same build inputs share a single handler.

Those build inputs are:

- connection identity
- schema set
- `anonRole`
- `roleName`

This means the memory benefit depends on the ratio between:

- total `svc_key`s observed by the benchmark
- distinct buildKeys that actually need handlers

When many keys collapse onto a small set of buildKeys, heap savings become dramatic.

### Why throughput gains are smaller than heap gains

The benchmark exercises full HTTP traffic through Express, PostGraphile, Grafast, and PostgreSQL. That means request execution is still dominated by network and query work, not only handler reuse.

The new path still wins because:

- fewer handlers means less GC pressure
- repeated introspection/bootstrap work is reduced
- working-set size is smaller under load
- hot handlers stay reused across many route keys

At higher `K` and higher `svc_key` fanout, these effects become more visible.

### Why the soak run saves less heap than the short runs

The 2-hour soak includes repeated flushes. That means both modes spend time destroying and rebuilding runtime state instead of converging to a steady-state heap profile.

The new mode still uses less memory, but the gap narrows because:

- handlers are repeatedly evicted
- rebuilt handlers temporarily increase active memory
- steady-state reuse is interrupted by churn

### Stability under concurrency and churn

The stress runs validate the runtime fixes added around the buildKey path:

- deferred registration prevents failed in-flight creation from leaving orphaned mappings
- rebinding cleanup prevents stale buildKey entries from becoming unreachable leaks
- the `svc_key` epoch guard prevents stale completions from overwriting newer bindings

The 2-hour soak is the strongest signal here: millions of queries, repeated flushes, and no observed request errors.

## What Drives the Results

| Factor | Heap Impact | QPS Impact | Stability Impact |
|--------|-------------|------------|------------------|
| buildKey deduplication | dominant | moderate | — |
| introspection caching | secondary | secondary | — |
| reduced GC pressure | secondary | primary at higher fanout | — |
| deferred registration | leak prevention | — | critical |
| rebinding cleanup | leak prevention | — | critical |
| epoch guard | — | — | critical |

## Conclusion

The current strategy of introspection caching plus exact-match buildKey handler reuse delivers substantial memory savings while preserving stable throughput and correctness under load.

For this workload pattern, the results show:

- large heap savings when many `svc_key`s collapse onto few buildKeys
- modest but consistent QPS gains
- stable long-running behavior under repeated flush churn
- no need to reintroduce template sharing or SQL rewriting to get meaningful wins from handler reuse

## Notes

- This file is a results document for the current evaluation cycle.
- For current script entrypoints and workflow guidance, use `README.md` in the same directory.
