# Env Vars Dependencies + Dual Config Plan

## Env dependencies inventory

### Jobs
- `constructive/jobs/job-utils/src/runtime.ts`
  - `process.env.JOBS_SUPPORT_ANY`
  - `process.env.HOSTNAME`
  - `process.env.INTERNAL_GATEWAY_DEVELOPMENT_MAP`
  - `process.env.JOBS_CALLBACK_BASE_URL`
  - `process.env.JOBS_CALLBACK_HOST`
  - PG env vars via `getEnvOptions()` and `getPgEnvVars()` (PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE)
- `constructive/jobs/job-utils/src/index.ts`
  - Module-level `JOBS_SCHEMA = getJobSchema()` (reads env via `getEnvOptions()` + defaults)
- `constructive/jobs/job-pg/src/index.ts`
  - Module-level `pgPoolConfig = getJobPgConfig()` (reads env)
- `constructive/jobs/job-worker/src/index.ts`
  - Module-level `pgPoolConfig` uses `getJobConnectionString()` (reads env)
  - Default `workerId = jobs.getWorkerHostname()` (reads env)
- `constructive/jobs/knative-job-worker/src/req.ts`
  - Module-level `completeUrl = getCallbackBaseUrl()` (reads env)
  - Module-level `DEV_MAP = getJobGatewayDevMap()` (reads env)
- `constructive/jobs/knative-job-service/src/run.ts`
  - Uses `getJobPgConfig`, `getJobSchema`, `getSchedulerHostname`, `getWorkerHostname`, `getJobSupported`, `getJobsCallbackPort` (all env-backed)
- `constructive/jobs/knative-job-example/src/index.ts`
  - `process.env.PORT` (example only)

### GraphQL server
- `constructive/graphql/server/src/server.ts`
  - `getEnvOptions()` / `getNodeEnv()`
  - `process.env.NODE_ENV` check for CORS warnings
- `constructive/graphql/server/src/middleware/auth.ts`
  - `getNodeEnv()`
- `constructive/graphql/server/src/middleware/api.ts`
  - `getNodeEnv()`
- `constructive/graphql/server/src/run.ts`
  - `getEnvOptions()`
- `constructive/graphql/server/src/scripts/codegen-schema.ts`
  - `process.env.CODEGEN_SCHEMA_OUT`
  - `process.env.CODEGEN_DATABASE`, `process.env.PGDATABASE`
  - `getEnvOptions()`
- `constructive/graphql/server/src/scripts/create-bucket.ts`
  - `getEnvOptions()`

## Approach (refined)

### 1) Define config precedence + naming
- Precedence: explicit constructor params override env; env overrides defaults.
- Prefer config param names that end in `Config` (e.g. `jobsConfig`, `pgConfig`, `gatewayConfig`).
- Accept an optional `envConfig` object everywhere env is consulted to enable testing and non-Node runtimes (avoid reading `process.env` directly).

### 2) Jobs config resolution (single source of truth)
- Add `resolveJobsConfig(jobsConfig?, envConfig?)` in `job-utils` that returns a normalized, fully merged config object:
  - `pgConfig` (from explicit `jobsConfig.pgConfig`, else env PG vars via `getEnvOptions`/`getPgEnvVars`, else defaults)
  - `schemaConfig` (`schema`, from explicit `jobsConfig.schemaConfig`, else env/opts, else defaults)
  - `supportConfig` (`supportAny`, `supportedTasks`)
  - `workerConfig` (`workerId`/`hostname`)
  - `schedulerConfig` (`workerId`/`hostname`)
  - `gatewayConfig` (`gatewayUrl`, `callbackUrl`, `callbackPort`)
  - `devMapConfig` (`devMap` parsed from `INTERNAL_GATEWAY_DEVELOPMENT_MAP`)
  - `callbackConfig` (`callbackBaseUrl`, derived from `gatewayConfig` + `envConfig` overrides)
- Update existing helpers (`getJobPgConfig`, `getJobSchema`, etc.) to accept `{ jobsConfig, envConfig }` and delegate to `resolveJobsConfig` for consistency.
- Remove module-level capture: `JOBS_SCHEMA`, `pgPoolConfig`, `completeUrl`, `DEV_MAP`. These values must be computed per-call or via a resolved config passed down.

### 3) Jobs component changes (constructor + params)
- `job-pg`: accept `pgConfig` or `jobsConfig` in the `PoolManager` constructor; default to `resolveJobsConfig().pgConfig` if omitted.
- `job-worker`: add optional `jobsConfig` and/or `workerConfig` params; keep `pgPool` override; use resolved `workerConfig.workerId` and `supportConfig` instead of env reads.
- `knative-job-worker`: accept `jobsConfig` (or `gatewayConfig` + `callbackConfig`) and pass resolved config to `createRequest`.
- `job-scheduler`: accept `jobsConfig` and use resolved `schedulerConfig` + `supportConfig`.
- `knative-job-service`: add a `jobsConfig` param to `startJobsServices` and `bootJobs`; pass through to worker, scheduler, and callback server creation.
- `knative-job-worker/src/req.ts`: convert to `createRequest({ gatewayConfig, callbackConfig, devMapConfig, nodeEnvConfig })` so URLs are not resolved at import time.

### 4) GraphQL server changes (constructor + params)
- Provide `resolveGraphqlConfig(graphqlConfig?, envConfig?)` that merges explicit config with env-based defaults.
- Replace direct `process.env.NODE_ENV` reads with `nodeEnvConfig` on the resolved config; keep `getNodeEnv()` as the env fallback in the resolver.
- `run.ts` should call `resolveGraphqlConfig()` and pass the result to `GraphQLServer`.
- Scripts (`codegen-schema.ts`, `create-bucket.ts`) should accept a `graphqlConfig` param and optional `envConfig` for overrides; keep env fallback for CLI usage.

### 5) Tests & docs
- Add tests validating precedence: `xxxConfig` overrides env; env-only behavior remains unchanged.
- Add a small fixture test to ensure module import does not capture env values (rely on passed `xxxConfig` instead).
- Update README usage examples to show `xxxConfig` usage and precedence.

## Combined server (constructive/packages/server)

### Current usage
- `constructive/packages/server/src/run.ts` reads env flags for orchestration: `CONSTRUCTIVE_GRAPHQL_ENABLED`, `CONSTRUCTIVE_JOBS_ENABLED`, `CONSTRUCTIVE_FUNCTIONS`, `CONSTRUCTIVE_FUNCTION_PORTS`.
- `constructive/packages/server/src/server.ts` passes GraphQL options via `CombinedServerOptions.graphql.options`, but jobs runtime pulls env via `job-utils` and functions rely on env in their packages.
- `constructive/packages/server/__tests__/jobs.e2e.test.ts` sets env for jobs + functions (e.g. `JOBS_*`, `INTERNAL_GATEWAY_DEVELOPMENT_MAP`, `JOBS_CALLBACK_BASE_URL`, `GRAPHQL_URL`, `DEFAULT_DATABASE_ID`, `SIMPLE_EMAIL_DRY_RUN`, `SEND_EMAIL_LINK_DRY_RUN`, Mailgun vars) while only GraphQL uses explicit options.
- Functions in `constructive/functions/simple-email` and `constructive/functions/send-email-link` read env for Mailgun/SMTP, GraphQL URLs/headers, dry-run flags, and default database IDs.

### Config-based alternative (preferred path)
- Extend `CombinedServerOptions` to include explicit config objects:
  - `graphql`: `{ enabled?: boolean; graphqlConfig?: ConstructiveOptions; envConfig?: Record<string, string | undefined> }`
  - `jobs`: `{ enabled?: boolean; jobsConfig?: JobsConfig; envConfig?: Record<string, string | undefined> }`
  - `functions`: `{ enabled?: boolean; services?: FunctionServiceConfig[]; functionsConfig?: Record<FunctionName, FunctionConfig>; envConfig?: Record<string, string | undefined> }`
- Update `CombinedServer` to thread config to dependencies:
  - GraphQL: pass `graphqlConfig` directly to `@constructive-io/graphql-server` (no env reads).
  - Jobs: call `resolveJobsConfig({ jobsConfig, envConfig })` once and pass to `job-pg`, `knative-job-server`, `knative-job-worker`, and `job-scheduler`.
  - Functions: update function packages to expose a config-aware factory (e.g. `createSimpleEmailApp(functionConfig?)`, `createSendEmailLinkApp(functionConfig?)`). `CombinedServer` should detect and call these factories when `functionsConfig` is provided; otherwise fall back to the current default export and env-based behavior.
- Keep `buildCombinedServerOptionsFromEnv()` as a CLI helper, but it should build the same `xxxConfig` objects to avoid divergence between CLI and SDK paths.

### Test adjustments
- Update `constructive/packages/server/__tests__/jobs.e2e.test.ts` to pass explicit `jobsConfig` and `functionsConfig` instead of relying on env, except where env fallback is explicitly under test.
- Add a small unit test for `buildCombinedServerOptionsFromEnv()` that verifies env parsing feeds into the new config objects.

## Deliverables
- New or updated config resolver APIs in `job-utils` and `graphql/server`.
- Refactored components and scripts to avoid import-time env capture.
- Minimal test updates to cover precedence and maintain existing behavior.
