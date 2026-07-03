# Scale Validation Program — Final Report (feat/scale-phase0)

**Question under validation:** can the cnc PostGraphile-v5 server host hundreds of
tenant databases on a small fixed heap, using blueprint pooling (one shared instance
per schema-shape) — and what actually bounds it?

**Verdict:** pooling works and is production-ready **within a quantified envelope**.
Tenant count is effectively free *within a blueprint*; the real limits are
**catalog size per PG database** and **resident blueprint count per node** — both
now measured, modeled (`SIZING.md`), and enforced by shipped guardrails. The
original "1000 tenants on one 2GB node" framing resolves to a shard-per-PG-database
architecture: ~40–200 tenants per shard (PG-node-RAM-dependent), each shard served
at p99 ≤34ms by a 2–6GB-heap node. Full V2 data: `V2-RESULTS.md`.

## What was validated, in order

**V1 — instrumentation + fleet.** Metrics sampler (10s JSON lines: heap/RSS/cache/
build/eviction/guard counters), workload harness (open-loop token bucket,
authenticated read/write/meta mix, zipf/uniform/burst, per-tenant **cross-tenant
bleed sentinel** that hard-fails on foreign canary rows), SQL tenant factory
(~0.8 tenants/min, fingerprint-validated identical to seeder output), drift/subset
tooling, teardown tooling. Fleet: 47 tenants (40 factory + reference + 6 divergent),
5 deliberate blueprint groups + 2 column-drift probes.

**V2 — limits discovery.** See `V2-RESULTS.md` for the full matrix. Constants:
instance heap ≈ 50MB + **21KB/pg_class row** (class-independent — it is the
introspection graph); PG introspection spike ≈ **37KB/row per build**; min viable
heap 1536MB at the 61k-row catalog; **zero marginal heap per tenant** within a
blueprint; **188rps p99 21ms zero errors** on one 2GB node (no knee ≤200rps);
capacity law validated at R=1 (2048MB) and R=2 (3584MB); thrash-not-crash beyond
capacity; cold-burst needs R ≥ concurrent cold blueprints.

**V3 — 24h soak** (in flight at time of writing; final numbers appended on
completion). Configuration: hardened build, heap 3584 (capacity 2), 32 same-blueprint
tenants, 30rps zipf authenticated + hourly NOTIFY churn + 2-hourly tenant
provision/teardown cycles + RSS/heap collector. Hour-1: 108k requests, 0 errors,
p99 34ms, **zero LRU evictions through the batch-relogin cliff** that (by design)
destroyed the capacity-1 control attempt.

**V4 — hardening + model.** `SIZING.md` (capacity law, shard guidance, container
sizing, knob reference) + the fixes below.

## Findings → fixes (all discovered live by the program)

| # | Finding | Consequence | Fix / disposition |
|---|---|---|---|
| 1 | PostGraphile introspection scans the ENTIRE catalog (no schema filter); backend spikes ~37KB/pg_class row and pooled backends RETAIN multi-GB relcache | PG OOM at ~100 tenants/DB even idle; crash-recovery storms | Shard-per-database architecture (SIZING.md); PG container caps; `idle_session_timeout`/pgbouncer `server_lifetime` backend recycling; BuildSemaphore already serializes spikes |
| 2 | Node instance heap ∝ total catalog (~21KB/row), class-independent, live (not GC-able) | 2GB heap = ONE resident instance at 61k rows; "instance size" is not a constant | Measured model + `GRAPHILE_CACHE_INSTANCE_HEAP_BYTES`; measurement tool shipped |
| 3 | `MIN_CACHE_MAX=3` floor overrode the heap budget; count-based headroom never evicted | Second build → V8 SIGABRT (whole node dies) — reproduced on demand | **`24d49252f`** floor→1 + regression test |
| 4 | PG crash-recovery killed the whole server via unhandled 'error' on an orphaned pg Client | 15s PG hiccup = full multi-tenant outage | **`d42ca1769`** scoped connection-class guard (absorbs 57P01/08006/ECONNRESET/…, counts in metrics; everything else stays fatal). Validated: ~330 absorbed/step, 0 process deaths |
| 5 | Blunt `heap×0.5` budget wasted capacity (3.5GB node stuck at R=1) | Unnecessary thrash for fleets needing api+auth resident | **`0a8a95402`** two-constraint budget (residency + rebuild-with-evict); R=2@3584 proven live |
| 6 | At R=1, hourly batch relogins + failed-relogin retries create SELF-SUSTAINING api↔auth eviction oscillation | "Capacity ≥ active blueprints" is a hard operating rule, not advice | Soak redesigned to R=2 (clean); rule + math in SIZING.md |
| 7 | No backpressure: builds admitted at any heap level; requests wait unboundedly | Pressure death-spiral risk; queue pileups | **`0a8a95402`** memory governor (85% proactive evict / 92% refuse builds with 503+Retry-After) + `GRAPHILE_BUILD_TIMEOUT_MS` request wait bound (build continues in background, timed-out requests no longer break coalescing) |
| 8 | No runtime visibility | blind ops | **`0a8a95402`** `/metrics` endpoint (env-gated, loopback-guarded) + sampler counters incl. governor/guard/refusals |
| 9 | `pg_partman` registry rows are name-keyed, not FK-cascaded; schema hashes are deterministic per dbname | Re-provisioning a reused tenant name fails with unique_violation | **`d00100631`** teardown cleans part_config(+sub); 434 orphans purged |
| 10 | `idle_session_timeout` (finding-1 mitigation) reaps ANY long-idle client | killed the churn driver; would kill LISTEN clients lacking reconnect | Server listener already reconnects; driver fixed (**`073f8bd58`**); documented as an ops tradeoff |
| 11 | `flushService` cleared ALL `bp:` instances on ANY `schema:update`, and the immediate rebuild raced evicted-but-DRAINING instances whose heap was still live (invisible to count-based headroom) | Every tenant PROVISION cold-restarted the whole pooled fleet; rebuild transient stacked on ~GB of draining heap → SIGABRT at 3584MB (killed soak attempt 2 at hour 2) | **`65c3056f9`** surgical per-database flush (`PoolDecision.databaseId` stamped at memoization; only the changed DB's decisions + blueprint invalidated; provisions are no-ops for resident blueprints) + drain-aware build admission (`waitForDrainSettle` after headroom eviction). Validated live: soak attempt 3 survived three provision/drop cycles at the exact event that killed attempt 2 |

Also validated en route: bleed sentinel NEVER fired across the entire program
(hundreds of thousands of authenticated cross-tenant-adjacent requests, thrash
included) — pooling isolation held under every regime tested.

## Prior banked results (pre-V1, same branch)

Pooling correctness: SDL byte-identical pooled-vs-dedicated; engine-level zero-bleed;
HTTP-authenticated zero-bleed (interleaved sessions + cross-token control); 7
same-shape tenants → 1 build; RSS 1475MB (6 per-tenant instances) → 711MB (pooled,
8 tenants); collision linter + shape fingerprint + safety fallbacks (realtime,
empty-schema, name-collision, transient probe); W3 login fix (`public` appended to
pooled search_path); plugin audit with fixes (i18n RLS bypass, search adapters,
LLM/RAG, presigned-url, meta-schema caches).

## Reproduction quickstart

```
# fleet + validation rig (isolated PG :5433)
node scripts/scale-validate/tenant-factory.mjs --count N --prefix factory
node scripts/scale-validate/drift-tenants.mjs --groups 4 --per-group 2 --column-drift 2
node scripts/scale-validate/fleet.mjs --like '%' --out fleet-all.json   # filter nulls → fleet.json
node scripts/scale-validate/canary-seed.mjs --fleet fleet.json
node scripts/scale-validate/subset-fleet.mjs ...                        # k/tenant subsets
node scripts/scale-validate/v2-ramps.mjs --plan plans/v2-2048-tuned.json --out out/results.jsonl
node scripts/scale-validate/summarize-results.mjs out/results.jsonl
node scripts/scale-validate/measure-instance-heap.mjs --label x --host api-...localhost
```

## V3 soak — final verdict: **PASS** (5-hour scope)

Attempt 3, 2026-07-03 00:26→05:26 UTC, hardened build (findings 3/4/5/7/8/11 fixes
in), heap 3584MB / instance estimate 1450MB → capacity R=2, 32-tenant same-shape
fleet + auth at 30rps zipf, hourly relogin batches, provision+drop cycle every 2h,
PG-side sampler recording. Scope note: the user shortened the planned 24h to 5h;
all three prior attempts' failure modes fired inside 2h, so 5 clean hours is 2.5×
past every observed failure point — but the original 12h/<5MB/h leak criterion was
adapted to the 4h post-warmup window (below).

| Criterion | Result | Verdict |
|---|---|---|
| No node/PG OOM, no crash, no restart | server up the full 5h; PG container ≤3153MB of 4.4GiB cap; backends ≤16 | ✅ |
| Cross-tenant bleed | **0 violations** / 235 sentinel checks (469/470 own-canary seen; 1 inconclusive during the blip window) | ✅ |
| Availability / latency | 392,794 requests completed, cumulative errRate **0.094%** (370 errors, ALL inside one ~2min recovery blip at the hour-2 provision/drop; every other window 0); overall p50/p95/p99 = **13/21/55ms** (steady windows p99 21–34ms) | ✅ |
| Schema-churn survival (finding 11 validation) | **3 provision/drop cycles + 5 hourly relogin batches survived live** (128 relogins, 0 auth failures); attempt 2 died at cycle 1 on the same event | ✅ |
| Heap stability / leak | like-for-like (cache=2) heap plateaus at **~2.78GB ±45MB** with non-monotonic hour-over-hour floors → no detectable leak at 5h resolution; naive all-sample slope (481MB/h) is a state-mix artifact of cache 1↔2 transitions, not growth | ✅ (5h bound; 24h run would tighten below the original 5MB/h criterion) |
| Counters clean | governor evictions 0, buildRefusals 0, drainTimeouts 0, buildWaitTimeouts 0, connGuard 0/0; lru=6 evictions + 8 builds vs **481,610 pooling attaches** (~60k:1 instance reuse) | ✅ |

Ops observations (non-blocking): server SIGTERM→exit exceeded 30s under pooling
(SIGKILL after data-plane stop is safe; document in runbooks). macOS `ps` RSS is
not usable for leak detection under memory compression — use sampler `heapUsed`.
Raw artifacts: `out/soak-results.json`, `out/soak-collector.json`,
`out/metrics-soak.jsonl`, `out/pg-soak.jsonl`, `out/metrics-final.json`,
`out/soak-{harness,churn,ops,server}.log`.

## Tooling productionized

The entire validation toolkit was ported to a reusable package:
**`packages/perf-harness`** (`@constructive-io/perf-harness`, bins `perf-harness`/
`cperf`) — fleet provision/drift/canary/teardown, load harness/churn, measure
collector/pg/instance-heap, run ramp/soak (detached, ordered stop), report
summarize/merge/predict, and `cperf regression run` comparing fresh runs against
baselines banked from this program (21KB/row, capacity law, zero-marginal,
thrash-not-crash, bleed=0). Hub-port guardrail built in (5432/3000-3002/9000
refused without `--allow-hub`); credentials via `PERF_PASSWORD` only. 156 unit
tests; smoke-tested against this soak's live data. See the package README for the
"regression reappeared" quickstart. The `scripts/scale-validate/` originals remain
as-run for provenance.

## Status

- V1 instrumentation+fleet ✅ · V2 limits discovery ✅ (`V2-RESULTS.md`) · V3 soak
  **PASS** (above) · V4 sizing+hardening ✅ (`SIZING.md`, fixes in the findings
  table, perf-harness package).
- Deep-scenario regression suite (`cperf regression run --suite deep`) added to cover the
  four previously-untested scaling axes — **multi-API residency**, **settings-variant
  splits**, **realtime dedicated cost**, and **partition creep** (each mutates the rig
  under guaranteed teardown); code + baselines landed, **live results pending** (run by
  the lead in the live phase).
- All work is local to `feat/scale-phase0`; nothing pushed.
