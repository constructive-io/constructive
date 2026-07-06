# V2 — Limits Discovery Results (2GB validation program)

Rig: isolated PG 17 (`constructive-scale-pg`, :5433, container capped 4.5GiB + 1.5GiB swap,
`idle_session_timeout=120s`), cnc server from `feat/scale-phase0`, blueprint pooling ON,
fleet = 47 tenants (40 factory clones + reference + 6 divergent seeder tenants),
catalog = **61,238 pg_class rows / 1,876 namespaces / 48 databases**.
Workload: token-bucket open-loop harness, authenticated, mix read:0.7 write:0.25 meta:0.05,
per-tenant bleed sentinel every 60s. All numbers from `out/v2-*-results.jsonl` +
`out/harness-*.json` + 10s metrics samples (`out/metrics-*.jsonl`).

## Headline findings (chronological discovery order)

1. **PG-side catalog wall.** PostGraphile v5 introspection scans the whole catalog
   (no schema filter in `pg-introspection@1.0.1`). Backend memory ≈ **37KB per
   pg_class row** net: ~2.7GiB spike at 61k rows (15s wall); OOM-killed >5.4GiB at
   135k rows (101 tenants) *even running alone*. JIT/parallel-off does NOT help
   (inherent: catalog JSON materialization + relcache). Introspection backends
   RETAIN multi-GB relcache per pooled connection and accumulate across the pool.
2. **Node-side catalog wall.** EVERY resident instance retains **~1.3GB heap at
   this catalog** (tenant-api 1304MB ≡ tenant-auth 1307MB ≡ schema-builder 1316MB
   — class-independent ⇒ it's the introspection graph, ~**21KB per pg_class row**,
   consistent with the earlier 464MB floor at a ~17k-row catalog). A 700MB-heap
   build aborts mid-introspection-receive: live memory, not garbage.
3. **Cap floor over-admission (FIXED, `24d49252f`).** `MIN_CACHE_MAX = 3` overrode
   the heap-aware budget; count-based headroom never evicted; admitting a second
   1.3GB build SIGABRT'd the 2GB process (as-shipped div-k1 crash record). Floor
   is now 1.
4. **PG restart killed the whole server (FIXED, `d42ca1769`).** PG crash-recovery
   (its own introspection OOM) terminated every pooled connection; one orphaned pg
   Client raised an unhandled 'error' event → process exit. A ~15s PG hiccup was a
   full multi-tenant outage. `installConnectionErrorGuard()` absorbs
   connection-class errors only (counted in metrics `counters.connGuard`);
   validated live: **332/349/344 absorbed per thrash step, zero process deaths**.

## Measured constants (61k-row catalog)

| Constant | Value |
|---|---|
| Resident instance heap (any class) | ~1.30–1.32GB (~21KB/pg_class row) |
| Server base heap | ~46–66MB |
| Build transient | >700MB (1152MB heap aborts with 0 residents) |
| Min viable heap, 1 resident | **1536MB PASS / 1152MB ABORT** |
| RSS vs heap | heapMax 1.46GB → RSS 2.2–2.4GB (≈1.5×) |
| Cold build (cold PG) | ~8s |
| Rebuild (warm PG relcache) | ~1s; thrash sustains ~1 build/s |
| Warm request latency (healthy) | p50 21ms / p95 34ms / p99 34ms |
| Marginal heap per tenant (same blueprint) | **~0** (1460.1/1459.6/1464.1MB @ 10/20/32 tenants) |
| PG introspection spike | ~37KB/pg_class row; per BUILD; serialized by BuildSemaphore |
| Provisioning wall time | 74s @17k rows → 138s @135k rows (superlinear in catalog) |

## Regime results @2GB heap (tuned estimate 1.45GB → capacity R=1)

| Step | Result |
|---|---|
| div-k1 (1 blueprint ×2 tenants) | HEALTHY: 5584/5584 HTTP 200, p99 34ms, 2 builds, 1 evict |
| div-k2/k3/k5 (2–5 blueprints, uniform) | THRASH-NOT-CRASH: errRate 1.0, p50 ~1s, p99 6.8s, 429–525 builds/step, heap bounded ≤1.42GB, sentinel passing, 0 process deaths |
| ten-10/20/33 (1 blueprint, zipf) | HEALTHY at all sizes; zero marginal heap |
| rps-10/25/50 (full 47-tenant fleet, ~10 blueprints, zipf) | THRASH: zipf tail keeps touching non-resident blueprints; bimodal latency (p50 144ms→89ms resident hits vs 6.8s timeouts) |
| cold-burst (5 blueprints at once) | 0/5 cold successes at R=1 (mutual eviction + PG churn); warm wave ≤58ms |
| 3584MB k1/k3/k5 | Same as 2048: R still 1 (budget formula: 3584×0.5/1450 → 1) |
| Heap floor | 1536 PASS / 1152 ABORT / 896 ABORT |
| As-shipped control (512MB estimate, floor 3) | div-k1 SIGABRT ~40s in (banked in v2-2048-results.jsonl) |

**Capacity law (current formula):** R = max(1, floor(heap × 0.5 / instanceEstimate)).
With 1.3GB instances: R=1 for heap ∈ [1.5GB, ~5.8GB]. The safe-but-conservative 0.5
fraction leaves a 3.5GB node at R=1; a budget of (heap − base − buildTransient)/instance
would give R(3584)=2 — V4 hardening candidate (validated by the r2 probe below).

**Operating rule:** healthy service requires resident capacity R ≥ number of actively-hit
blueprints (api and auth blueprints both count; auth is touched at login/relogin only).
Within one blueprint, tenant count is free (zero marginal heap) up to the PG-side
catalog walls.

## Architecture consequence (the 1000-tenant answer)

Tenants-per-PG-database is the fundamental unit, bounded by catalog size on BOTH sides
(PG introspection memory ~37KB/row/backend; node instance heap ~21KB/row/instance;
provisioning slowdown). Shard tenants across PG databases (the blueprint cache key
already scopes by dbname `d`); serve each shard with nodes sized R ≥ active blueprint
shapes. Example: 1000 same-shape tenants = N shards × (1000/N) tenants; each shard
served by a 2GB node at R=1 (api) — auth co-residency wants R=2 (heap ~4GB with the
V4 budget formula, or a separate auth node at R=1).

## Rig/ops guidance validated live

- Cap the PG container (cgroup OOM → 15–20s crash-recovery, absorbed by the
  connection guard) rather than letting the VM OOM-killer roam.
- `idle_session_timeout` recycles relcache-bloated backends in healthy regimes;
  under sustained build churn backends never idle — churn regimes need pgbouncer
  `server_lifetime` or equivalent forced recycling.
- BuildSemaphore(1) serendipitously serializes PG introspection spikes as well as
  node build transients — keep it.

## Follow-up probes (both PASS)

- **Capacity-2 at 3584MB** (`r2-div-k1`, estimate lowered to 896MB → cap 2):
  builds=2, **evictions=0** (api + auth blueprints simultaneously resident),
  errRate 0, p99 34ms, heapMax **2750MB** (= 2×1.35GB + base, as modeled),
  rssMax 3.24GB, no crash. True capacity at 3584MB is 2; only the 0.5-fraction
  budget formula holds it at 1 → V4 hardening: budget = heap − base −
  buildTransient, divided by instance estimate.
- **Single-blueprint rps ceiling** (2048MB, 32 tenants, zipf, authenticated
  mixed workload): 50→100→200 target rps achieved 47/94.3/188.4, errRate 0
  at every level, p99 34/21/21ms, pgConnMax stayed 5 (PG_POOL_MAX=5/dbname is
  NOT a bottleneck ≤200rps; queries are 1-5ms). heapMax 1508→1588MB (request
  working set ≈ +150-250MB over the resident instance at 200rps).
  **Headline: a 2GB-heap node serves 32 pooled tenants at ≥188rps, p99 21ms,
  zero errors.**

## Remaining known limitations

- Shape fingerprint covers relation names only (columns excluded — documented
  limitation; column-drift tenants share a blueprint by design).
- rps ceiling beyond 200rps unmeasured (no knee found yet).
- 24h longevity (V3) + memory governor / smarter budget / build timeout (V4).
