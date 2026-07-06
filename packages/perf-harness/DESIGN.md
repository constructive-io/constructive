# @constructive-io/perf-harness — Design

Reusable performance / regression harness for the Constructive GraphQL server.
Port of the ad-hoc `scripts/scale-validate/*.mjs` tooling (built during the
2026-07 blueprint-pooling validation program) into a proper monorepo package,
so the next time a memory/scale regression appears it is re-run with one
command instead of hand-driven scripts.

**The originals in `scripts/scale-validate/` are the behavioral source of
truth. Port faithfully: every CLI flag, default, output field, and exit code is
preserved unless this document says otherwise. Do not redesign algorithms.**

## Package identity

- Directory: `packages/perf-harness` (auto-included by `pnpm-workspace.yaml` glob `packages/*`; lerna derives from pnpm — no registration anywhere)
- Name: `@constructive-io/perf-harness`, version `0.1.0`, license MIT, author `Constructive <developers@constructive.io>`
- Bin: `{ "perf-harness": "index.js", "cperf": "index.js" }` (dist-relative like `packages/cli`; shebang `#!/usr/bin/env node` as FIRST line of `src/index.ts` — makage preserves it; no makage config file exists or is needed)
- `main: index.js`, `module: esm/index.js`, `types: index.d.ts`, `publishConfig: { access: public, directory: dist }`, NO `files` field (no sibling has one)
- Scripts (verbatim sibling standard):
  `clean: makage clean` / `prepack: npm run build` / `build: makage build` / `build:dev: makage build --dev` / `dev: ts-node ./src/index.ts` / `lint: eslint . --fix` / `test: jest --passWithNoTests` / `test:watch: jest --watch`
- dependencies: `pg ^8.21.0` (imported directly), `inquirerer ^4.9.1`, `@inquirerer/utils ^3.3.9`, `graphile-cache workspace:^` (lazy-required ONLY inside `report predict` — see below)
- devDependencies: `@types/pg ^8.20.0`, `@types/node ^22.19.11`, `makage ^0.3.0`, `ts-node ^10.9.2`, `@inquirerer/test ^1.4.3`
- Do NOT declare typescript / jest / ts-jest / eslint / graphql — root-hoisted or irrelevant.
- `tsconfig.json`, `tsconfig.esm.json`, `jest.config.js`: byte-identical to `packages/server-utils` versions (extends `../../tsconfig.json`; ESM variant outDir `dist/esm`, module es2022, declaration false; jest = ts-jest preset, testRegex `(/__tests__/.*|(\.|/)(test|spec))\.(jsx?|tsx?)$`, modulePathIgnorePatterns `['dist/*']`, NO trailing commas).
- NO eslint config file in the package (root `.eslintrc.json` governs). Code style: 2-space, single quotes, semicolons, no trailing commas, `_`-prefixed unused args.

## Hard rules (safety + fidelity)

1. **Hub guardrail**: `HUB_PORTS = [5432, 3000, 3001, 3002, 9000]`. EVERY command that dials Postgres or a server port calls `assertPortAllowed(port, allowHub)` and fails with a clear error naming the flag `--allow-hub` to override. PG port default is **5433, never 5432** (preserve the `_lib.mjs` comment's intent).
2. **Credentials**: never hardcoded. `--email` defaults to `seeder@gmail.com`; `--password` has NO default — resolution order: flag > `PERF_PASSWORD` env. Commands needing auth error out with guidance when it is missing. Never interpolate creds into shell strings (we spawn with arg arrays only).
3. **No absolute paths** in code. Repo root discovered by walking up from cwd to the first `pnpm-workspace.yaml` (`findRepoRoot()`); server command defaults to `['node', '<repoRoot>/packages/cli/dist/index.js']`, overridable via `--server-cmd`.
4. All outputs under `--out-dir` (default `./perf-out`), created with mkdir -p. File naming: `metrics-<label>.jsonl`, `harness-<label>.json`, `pg-<label>.jsonl`, `<label>-results.jsonl`, `<name>.log`, `<name>.pid`, `<name>.done`.
5. Exit codes preserved: harness `0` ok / `1` fatal / `2` bleed-sentinel violation. Regression: `0` pass / `1` fail / `2` bleed.
6. TypeScript per root config (`strict: true`, `strictNullChecks: false`). `any` is allowed. Plain `console` for CLI output — stdout is reserved for machine-readable JSON/JSONL protocol lines exactly like the originals; human logs go to stderr where the originals did.

## Module layout & interface contract

Domain modules code against these EXACT `core/` signatures (foundation implements them; behavior ports from `scripts/scale-validate/_lib.mjs` unless noted).

```
src/
  index.ts               CLI entry (shebang) — routes `perf-harness <domain> <sub> [flags]`
  commands/{fleet,load,measure,run,report,regression}.ts
  core/{args,config,rng,histogram,gql,pgc,proc,fleetfile}.ts
  fleet/{discover,provision,drift,canary,teardown}.ts
  load/{harness,churn}.ts
  measure/{collector,pgSampler,instanceHeap}.ts
  run/{server,ramp,soak,soakOps}.ts
  report/{summarize,merge,predict}.ts
  regression/{suite,baselines,compare}.ts
  __tests__/  (per-domain, colocated under src/<domain>/__tests__/)
```

### core/args.ts  (port of _lib parseArgs + coercions)
```ts
export type Argv = Record<string, any> & { _: string[] };
export function parseArgv(raw: string[]): Argv;          // --flag value | --flag=value | --flag → true; positionals into _
export function asBool(v: any, dflt?: boolean): boolean; // '1'|'true'|'yes'|'on'
export function asInt(v: any, dflt?: number): number;
export function asFloat(v: any, dflt?: number): number;
export function usageExit(usage: string, code?: number): number; // prints usage, returns code
```

### core/config.ts
```ts
export interface PgConfig { host: string; port: number; user: string; password: string; database: string }
export const HUB_PORTS: number[]; // [5432, 3000, 3001, 3002, 9000]
export function assertPortAllowed(port: number, allowHub: boolean, what?: string): void; // throws Error mentioning --allow-hub
export function pgConfigFromArgv(argv: Argv): PgConfig;  // --pg-host/--pg-port/--pg-user/--pg-password/--pg-database > PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE > localhost/5433/postgres/password/constructive; calls assertPortAllowed with asBool(argv['allow-hub'])
export function findRepoRoot(startDir?: string): string; // walk up to pnpm-workspace.yaml; throws if not found
export function resolveOutDir(argv: Argv): string;       // --out-dir default './perf-out', mkdir -p
export function resolveServerCmd(argv: Argv, repoRoot: string): string[]; // --server-cmd (space-split) or default
export function resolveCreds(argv: Argv): { email: string; password: string | null }; // --email/--password > PERF_PASSWORD
```

### core/rng.ts — `makeRng(seed)` (mulberry32), `makeZipfSampler(n, rng)`, `makeMixSampler(mixStr, rng)` — verbatim ports.

### core/histogram.ts — `export class Histogram` with `record(ms)`, `percentile(p)`, `summary()` and the DEFAULT_BUCKETS table, verbatim port.

### core/gql.ts — verbatim ports of `gqlFetch` (host-in-URL trick, AbortController timeout, Bearer token), `INTROSPECTION_QUERY`, `isRotating`, `gqlErrors`, `isUnauthenticated`, `unwrapType`, `isNonNull`, `buildTypeIndex`, `discoverOps`, `buildCreateRecord` (+ `export interface GqlResponse { status: number; ok: boolean; json?: any; text?: string; elapsedMs: number; error?: string }` and a `DiscoveredOps` interface matching discoverOps' return).

### core/pgc.ts
```ts
export function getPg(): { Client: any; Pool: any };     // = require('pg') — real dependency now, NOT the resolvePg chain
export function withFreshClient<T>(pg: PgConfig, fn: (client: any) => Promise<T>): Promise<T>; // connect/fn/end in finally
export function isConnLoss(err: any): boolean;           // 57P01/57P02/57P03/08006/08003/53300 + message sniff (port from tenant-factory)
export function isRetryableTxn(err: any): boolean;       // 40P01/40001
```

### core/proc.ts (new — replaces the nohup/python-setsid launcher pattern AND the inline child management)
```ts
export interface SpawnDetachedOpts { name: string; cmd: string; args: string[]; env?: Record<string, string>; cwd?: string; outDir: string }
export function spawnDetached(o: SpawnDetachedOpts): { pid: number; logPath: string; pidPath: string }; // spawn(detached:true, stdio ['ignore', logFd, logFd]), unref(), write <outDir>/<name>.pid
export function isAlive(pid: number): boolean;                       // kill(pid, 0)
export function stopPid(pid: number, termTimeoutMs?: number): Promise<'term' | 'kill' | 'gone'>; // SIGTERM → poll → SIGKILL (default 15000)
export function readPid(outDir: string, name: string): number | null;
export function waitForPort(port: number, timeoutMs: number): Promise<void>; // probe BOTH 127.0.0.1 and ::1 (macOS binds ::1)
export function readJsonl(file: string): any[];                      // parse-guarded per line
export function writeDone(outDir: string, name: string, content?: string): void;
```

### core/fleetfile.ts
```ts
export interface Tenant { dbname: string; databaseId?: string; apiHost?: string; authHost?: string; schemas?: string[]; appPublicSchema?: string }
export function loadFleet(file: string): { manifest: any; tenants: Tenant[] };  // array | {tenants}; throws if empty
export const CANARY_PREFIX: string;  // 'CANARY-'
export function canaryName(t: Tenant): string;
export interface SubsetOpts { blueprints?: number; perBlueprint?: number; tenants?: number; sameBpRegex?: string }
export function buildSubset(fleet: Tenant[], drifted: { groups?: Record<string, string[]>; columnDrift?: string[] }, o: SubsetOpts): { subset: any; tenants: Tenant[]; warnings: string[] }; // pure port of subset-fleet.mjs
```

### run/server.ts (shared by ramp / soak / instanceHeap)
```ts
export interface ServerSpawnOpts { name: string; port: number; heapMb: number; metricsFile: string; pg: PgConfig; repoRoot: string; outDir: string; serverCmd?: string[]; cacheMax?: number; instanceHeapBytes?: number; metricsEndpoint?: boolean; extraEnv?: Record<string, string>; detached?: boolean; allowHub?: boolean }
export function spawnServer(o: ServerSpawnOpts): Promise<{ pid: number; stop: () => Promise<void> }>;
```
Env it sets on the child (from the validated soak recipe): `NODE_ENV=production`, `NODE_OPTIONS=--max-old-space-size=<heapMb>`, `GRAPHILE_DEBUG_METRICS=1`, `GRAPHILE_DEBUG_METRICS_FILE=<metricsFile>`, `GRAPHILE_BLUEPRINT_POOLING=1`, `GRAPHILE_METRICS_ENDPOINT=1` when metricsEndpoint, `GRAPHILE_CACHE_MAX=<cacheMax>` when set, `GRAPHILE_CACHE_INSTANCE_HEAP_BYTES=<instanceHeapBytes>` when set, PG* from PgConfig, plus extraEnv. Args: `server --port <port> --origin * --simpleInflection --postgis --servicesApi`. Waits for the port (120s, dual-stack) before resolving.

### Command registration contract
Each `src/commands/<domain>.ts` exports:
```ts
export const domain: string;                       // e.g. 'fleet'
export const summary: string;                      // one-liner for top-level help
export interface Subcommand { usage: string; run(argv: Argv): Promise<number> }
export const subcommands: Record<string, Subcommand>;
```
`src/index.ts` (CLI agent) routes `argv._[0]` → domain, `argv._[1]` → subcommand, prints composed help for `--help`/unknown, `process.exitCode = await run(argv)`. Prefer the `inquirerer` CLI shell as `packages/cli` uses it, BUT: never define interactive Questions (automation must not prompt); if nested subcommand routing fights the framework, a hand-rolled router over `parseArgv` is acceptable — working non-interactive CLI beats framework conformance.

## Command tree (source .mjs in parentheses — preserve its flags)

- `fleet discover` (fleet.mjs) · `fleet provision` (tenant-factory.mjs) · `fleet drift` (drift-tenants.mjs — REPLACE its inline pg/defaults with core; ADD --pg-* flag support + --help) · `fleet canary` (canary-seed.mjs) · `fleet subset` (subset-fleet.mjs; pure logic in core/fleetfile buildSubset) · `fleet teardown` (drop-tenants.mjs — keep GUC `constructive.allow_super_constructive`, partman part_config(_sub) cleanup, VACUUM ANALYZE list, `--dry-run`)
- `load harness` (harness.mjs — THE critical port: token-bucket pacer, mix/shape samplers, auth signIn + token-field scoring, relogin scan, bleed sentinel w/ exit 2, rolling progress JSONL on stdout, SIGTERM-flushed final `--out` JSON, drain ≤15s) · `load churn` (churn-driver.mjs — fresh Client per NOTIFY, stop line on signal)
- `measure collector` (collector.mjs — `ps -o rss=` sampling, metrics tail, last-half linreg slope MB/h, schema-tolerant counter pick) · `measure pg` (pg-sampler.mjs — docker stats + pg_stat_activity/pg_class/db size) · `measure instance-heap` (measure-instance-heap.mjs — fresh cap=1 server per class via run/server.ts, baseline→cold→settle→delta)
- `run ramp` (v2-ramps.mjs — RampPlan `{ port?, defaults, steps[] }` typed interface, `cfg = {...defaults, ...step}`, fresh server per step, crash-tolerated-and-recorded, pg backend sampler w/ reconnect, cold-burst mode) · `run soak` — NEW orchestrator replacing run-soak-*.sh: `run soak start` spawns detached server + harness + churn + soak-ops + collector + pg-sampler (pid files), `run soak status` (pids alive, last harness progress line, /metrics snapshot), `run soak stop` (signal fan-out IN ORDER: harness → collector → churn → soak-ops → pg-sampler → server; then writes `<label>.done`) · `run soak-ops` (soak-ops.mjs — ADD the missing SIGTERM handler: finish current cycle child, then final-drop and exit)
- `report summarize` (summarize-results.mjs) · `report merge` — NEW: merge server metrics JSONL + harness progress JSONL + churn/ops event lines + pg-sampler JSONL into one `report-data.json` (aligned time series, event markers, heap slope, counter deltas) + a markdown summary table printed to stdout · `report predict` — capacity/sizing: lazy `require('graphile-cache')` (typed via a minimal local declaration; the workspace dep exists but MUST NOT be imported at module top level — it pulls the PostGraphile chain into every CLI start) and call `computeCapacityFromBudget(heapLimitBytes, perInstanceBytes, baseReserve?, buildReserve?)`; print capacity + a small sizing table for a list of heap sizes
- `regression run` — the one-command suite (below) · `regression baselines` — list known baselines

## Regression suite (`regression run`)

Flags: `--fleet <manifest>` (required), `--suite quick|standard` (default quick), `--baseline <name>` (default `catalog61k-2026-07`), `--port` (default 3345), `--heap-mb` (default 3584), `--out-dir`.
Preflight: PG reachable, catalog `pg_class` count recorded, server dist exists, port free + allowed.
Checks (each returns `{ name, pass, value, threshold, note }`):
1. `instance-heap` (standard suite only): `measure instance-heap` on one tenant-api class → KB/pg_class-row ≤ `maxInstanceHeapKBPerRow`
2. `healthy-single-bp`: ramp step vs same-shape subset at capacity → errRate ≤ 0.005, p99 ≤ 150ms, 0 bleed
3. `zero-marginal-tenants`: two tenant-count steps (e.g. 10 vs max available) → heapMax delta ≤ 100MB
4. `thrash-not-crash` (standard): over-capacity diversity step → server process must SURVIVE (crash = FAIL; degraded latency/errors are EXPECTED and not failures)
5. `bleed`: sentinel violations across all steps == 0 (exit 2 anywhere → suite exit 2)
Verdict: JSON (`regression-results.json`) + human table; exit 0/1/2.

### regression/baselines.ts (typed const, from the 2026-07 program — V2-RESULTS.md/SIZING.md)
```ts
export interface Baseline { name: string; capturedAt: string; catalogPgClassRows: number; instanceHeapKBPerRow: number; pgIntrospectionSpikeKBPerRow: number; minViableHeapMB: number; baseReserveMB: number; buildReserveMB: number; zeroMarginal: { tenants: number[]; heapMaxMB: number[] }; healthy: { rps: number; p99Ms: number; errRate: number }; capacityByHeapMB: Record<string, number>; thresholds: { maxInstanceHeapKBPerRow: number; maxZeroMarginalDeltaMB: number; maxHealthyErrRate: number; maxHealthyP99Ms: number; maxHeapSlopeMBPerHour: number } }
```
Seed entry `catalog61k-2026-07`: rows 61238, 21 KB/row, 37 KB/row PG spike, minViable 1536, reserves 256/768, zeroMarginal tenants [10,20,32] → heapMax [1460.1, 1459.6, 1464.1], healthy { rps: 188, p99Ms: 21, errRate: 0 }, capacity { '2048': 1, '3584': 2 }, thresholds { 28, 100, 0.005, 150, 5 }.

## Testing (default `jest` run needs NO network/PG/docker)

Unit tests (fixtures inline or under `__tests__/fixtures/`): parseArgv/coercions; hub-guardrail (5432 throws, 5433 passes, --allow-hub overrides); mulberry32 determinism; zipf/mix samplers (seeded distributions); Histogram percentiles; buildSubset (diversity, tenant-count, warnings — pure JSON); linregSlope + pickCounter + flattenNumeric (collector); dockerMem toBytes; token-field scoring (scoreTokenField/findTokenSelection — export them from load/harness.ts); RampPlan cfg merge; summarize + merge on fixture JSONL; baseline comparator; canary valueForColumn; tenant-factory shape-fingerprint sha256 (fixture pairs) + retry classification. Anything needing a live server/PG: guard behind `process.env.PERF_E2E === '1'` with `describe.skip`-style gating.

## README.md (the runbook)

Must contain: 30-second "regression reappeared" quickstart (rig up via pgpm docker on a NON-hub port → `fleet provision` or existing fleet → `regression run --fleet ...`); the full soak recipe (`run soak start/status/stop`); a metrics-tracking section (what each artifact file is: metrics JSONL fields incl. counters.connGuard/evictions, /metrics endpoint + loopback gating, pg-sampler line, collector summary, report merge output); the sizing model one-liner (capacity law + 21KB/row + 37KB/row constants, shard-per-PG-database guidance); env knob table (GRAPHILE_* from the instrument recon); hub-safety note; creds via PERF_PASSWORD.

## Out of scope (deliberate)

- Do NOT modify or delete `scripts/scale-validate/` (a live soak uses it; retirement happens later).
- Do NOT touch `graphql/server` / `graphile-cache` source.
- No CI wiring in this pass.
