# Checkout sanitation cost

Run after building `pg-cache`, `pg-query-context`, and the `pgsql-test` dependencies, against an isolated PostgreSQL instance with the pgpm test users bootstrapped:

```sh
node postgres/pg-query-context/benchmarks/checkout-sanitation.cjs /tmp/checkout-sanitation.json 1000
```

Connection options come through the existing `pgsql-test` environment provider. The harness creates and drops its own database. The baseline uses a harness-owned unsanitized pool; the comparison uses the actual default `pg-cache` factory. Both use the application login, one client, and concurrency one. Each arm warms up for 50 operations; three rounds alternate arm order, with 1,000 measured operations per arm/workload/round. Results contain latency percentiles and throughput.

## Local result, 2026-09-09

PostgreSQL 18.6, Node 24.20.0, localhost TCP. Values below are the median of each metric across the three rounds; the raw result is `checkout-sanitation.pg18-local.json`.

| Workload | p50 ms, baseline → sanitized | p95 ms, baseline → sanitized | Operations/s, baseline → sanitized |
| --- | --- | --- | --- |
| Checkout and release | 0.013 → 0.322 | 0.017 → 1.947 | 33,818 → 1,519 |
| Named prepared SELECT | 0.383 → 0.825 | 1.981 → 3.378 | 1,749 → 632 |
| Request-context transaction + named SELECT | 1.884 → 2.143 | 5.845 → 5.293 | 401 → 371 |

This shared host had unrelated CPU load. These measurements establish local cost, not production percentiles or a performance gate. In particular, the lower transaction p95 in the sanitized arm is noise, not evidence that sanitation improves tail latency. Repeat on representative deployment hardware, network latency, pool sizes, and query mixes before adopting a throughput budget.

`DISCARD ALL` adds a server round trip to every checkout and removes prepared statements: the final baseline checkout retained one named prepared statement, while the sanitized checkout retained none. The prepared-query arm lost about 64% throughput locally; the complete transaction arm lost about 7%. A cheap query-heavy workload therefore needs particular scrutiny.

The PR retains the fail-closed default while making this cost reviewable. A future cheaper reset must prove equivalent removal of roles/GUCs, temporary state, LISTEN state, advisory locks, and prepared-statement bookkeeping before replacing it. Merely using `RESET ALL`, or skipping cleanup based on assumptions about callers, does not provide that equivalence. This benchmark does not justify such a replacement or an opt-out.
