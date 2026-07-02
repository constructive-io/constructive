# Multi-Tenant Sizing Model — cnc PostGraphile server with blueprint pooling

All constants measured on `feat/scale-phase0` (blueprint pooling + hardening), isolated
PG 17 rig, 47-tenant fleet, catalog 61k `pg_class` rows. Method and raw data:
`V2-RESULTS.md` + `out/v2-*-results.jsonl`.

## The model in one paragraph

Memory cost is driven by **catalog size** (total relations in the PG database), not by
tenant count. Every *resident schema instance* on the node retains
`I ≈ 50MB + 21KB × pg_class_rows`, and every *schema build* spikes a PG backend by
`≈ 37KB × pg_class_rows`. Tenants sharing a blueprint are free (zero marginal heap,
zero marginal builds). So you size in two axes: **how many relations live in one PG
database** (shard size) and **how many distinct blueprint shapes a node must keep
resident** (node capacity R).

## Node capacity (implemented in `computeCapacityFromBudget`)

```
I  = per-instance heap        (measure once per catalog size; 1.30–1.35GB @ 61k rows)
B  = base reserve             (server + request working set; default 256MB)
T  = build transient reserve  (one in-flight build;          default 768MB @ 61k rows)
H  = --max-old-space-size

R = clamp( min( ⌊(H − B) / I⌋,  ⌊(H − B − T) / I⌋ + 1 ), 1, 50 )
```

Validated points @61k-row catalog (I=1.45GB estimate):

| Heap H | R | Evidence |
|---|---|---|
| 896MB / 1152MB | 0 → build aborts | V8 SIGABRT mid-build (floor probes) |
| 1536MB | 1 | healthy k1, p99 34ms |
| 2048MB | 1 | healthy single-bp at 188rps; thrash beyond 1 bp |
| 3584MB | 2 | api+auth both resident, 0 evictions (r2 probe + live soak) |
| ~5.9GB | 3 (computed) | unvalidated |

**Container sizing:** RSS ≈ heap × 1.4–1.5 (native/external on top of V8 heap).
A "2GB-heap" node needs a ~3GB container; for a hard-2GB container run heap ≤1400MB —
which at a 61k-row catalog is BELOW the 1536MB single-instance floor. Practical
minimum container at this catalog: ~2.5GB (heap 1792).

**Operating rule:** R must cover the node's *actively hit* blueprint set — api AND
auth shapes count separately. A tenant fleet on one node needs R ≥ 2 (validated: at
R=1, hourly batch relogins collide with api traffic and failed relogins retry every
30s → self-sustaining eviction oscillation; at R=2 the same workload runs clean).

## Per-blueprint throughput (one 2GB node, 32 tenants, mixed authenticated workload)

- ≥188 rps sustained, p50 13ms / p99 21ms, zero errors, PG pool at 5 connections —
  no knee found up to 200 rps (per-request DB time 1–5ms).
- Warm request latency is independent of tenant count within the blueprint
  (10 vs 32 tenants: identical).
- Cold build: ~8s (cold PG relcache) / ~1s rebuild (warm); builds serialize behind
  `BuildSemaphore(1)`, protecting both node heap and PG.

## PG-database shard sizing (the real tenant limit)

Per-database catalog cost, measured at ~1.19k `pg_class` rows per marketplace tenant:

| Cost | Scaling | Measured |
|---|---|---|
| Introspection backend spike | ~37KB/row, PER BUILD | 2.7GB @61k rows; OOM-killed >5.4GB @135k |
| Backend relcache retention | multi-GB per pooled conn that ever ran a build | accumulates across pool; recycle via `idle_session_timeout` (validated) or pgbouncer `server_lifetime` |
| Node instance heap | ~21KB/row per resident instance | 1.3GB @61k rows |
| Provisioning wall time | superlinear | 74s @17k rows → 138s @135k rows |

Shard guidance (marketplace-class tenants, ~1.2k rows each):

| PG node RAM | Safe catalog | ≈ Tenants/shard | Node heap for R=2 |
|---|---|---|---|
| 8GB | ~60k rows | ~40–45 | 3.5–4GB |
| 16GB | ~120k rows | ~85–95 | 5.5–6.5GB (I≈2.6GB) |
| 32GB | ~250k rows | ~180–200 | 11–13GB (I≈5.4GB) |
| 64GB | ~500k rows | ~380–400 | 22–26GB (I≈10.7GB) |

(Instance heap I grows with the shard's catalog, so bigger shards need
disproportionately bigger app nodes — favor MORE, SMALLER shards.)

**1000 tenants, concretely:** 10 shards × ~100 tenants (16GB PG nodes), each shard
served by one app node with R=2 (heap ~6GB, container ~9GB) — or split api/auth onto
two 2.5-3GB-heap nodes per shard at R=1 each, accepting the auth/api isolation.
The blueprint cache key already scopes by database (`d`), so shard-local pooling
needs no code changes.

## Hardening shipped with this branch (all validated live)

| Mechanism | What it prevents | Knob |
|---|---|---|
| Heap-aware cap, floor 1 (`24d49252f`) | over-admission SIGABRT | `GRAPHILE_CACHE_MAX`, `GRAPHILE_CACHE_INSTANCE_HEAP_BYTES` |
| Two-constraint budget (`0a8a95402`) | wasted capacity / unsafe admits | `GRAPHILE_CACHE_BASE_RESERVE_BYTES`, `GRAPHILE_CACHE_BUILD_RESERVE_BYTES` |
| Evict-before-build headroom | build spike on a full cache | (automatic) |
| Memory governor 85%/92% (`0a8a95402`) | pressure death-spiral; refuses builds at critical, keeps serving residents | `GRAPHILE_MEMORY_GOVERNOR[_ELEVATED/_CRITICAL]` |
| Build wait timeout (`0a8a95402`) | unbounded request queues behind builds | `GRAPHILE_BUILD_TIMEOUT_MS` (503 BUILD_TIMEOUT; build completes in background) |
| Connection-class error guard (`d42ca1769`) | PG restart killing the whole node | `GRAPHILE_CONNECTION_GUARD=0` to disable |
| `/metrics` endpoint (`0a8a95402`) | blind operation | `GRAPHILE_METRICS_ENDPOINT=1` |
| BuildSemaphore(1) | concurrent build spikes (node AND PG) | `GRAPHILE_BUILD_CONCURRENCY` |

PG-side ops: cap the PG container (cgroup OOM → 15–20s crash-recovery, absorbed by
the guard) and recycle idle backends (`idle_session_timeout` — beware it also reaps
long-idle clients: LISTEN connections and drivers must reconnect; the server's
listener does).

## Measuring I for YOUR catalog

```
node scripts/scale-validate/measure-instance-heap.mjs \
  --label my-api --host api-<tenant>.<domain> --port 3344 --heap-mb 4096
```
Then set `GRAPHILE_CACHE_INSTANCE_HEAP_BYTES` to the measured delta + ~10%.
Rule of thumb without measuring: `I ≈ 50MB + 21KB × pg_class_rows`.
