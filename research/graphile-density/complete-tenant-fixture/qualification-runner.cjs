'use strict';

const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const {
  FIXTURE_DIR,
  REPO_ROOT,
  TENANTS,
  assertProviderGates,
  parseArgs,
  parsePositiveInteger,
  readManifest,
  requireString,
} = require('./lib.cjs');
const { atomicWriteJson, generateInputs } = require('./generate-inputs.cjs');
const { runHostileValidation } = require('./hostile-validation.cjs');
const { createFixtureServer, parseServerOptions } = require('./server.cjs');

const IN_PROCESS_ENVIRONMENT_KEYS = Object.freeze([
  'NODE_ENV',
  'DATABASE_URL',
  'PGHOST',
  'PGPORT',
  'PGDATABASE',
  'PGUSER',
  'PGPASSWORD',
  'PGSSLMODE',
  'PGSSLROOTCERT',
  'PGSSLCERT',
  'PGSSLKEY',
  'GRAPHQL_RUNTIME_PGPASSWORD',
  ...TENANTS.flatMap((tenant) => [
    tenant.runtimePasswordEnvironment,
    `CTF_RUNTIME_${tenant.id.toUpperCase()}_PGUSER`,
  ]),
  'CTF_CONTROL_TOKEN',
  'GRAPHQL_OBSERVABILITY_ENABLED',
  'GRAPHQL_OBSERVABILITY_TOKEN',
  'GRAPHILE_CACHE_MAX',
  'GRAPHILE_CACHE_INSTANCE_HEAP_BYTES',
  'GRAPHILE_CACHE_SERVER_RESERVE_BYTES',
  'GRAPHILE_CACHE_BUILD_RESERVE_BYTES',
  'GRAPHILE_BUILD_MAX_CONCURRENCY',
  'GRAPHILE_BUILD_CONCURRENCY',
  'GRAPHILE_BUILD_QUEUE_MAX',
  'PG_CACHE_MAX',
  'PG_POOL_MAX',
  'PG_POOL_MAX_USES',
  'DATAPLAN_PG_PREPARED_STATEMENT_CACHE_SIZE',
]);

const installProcessEnvironment = (
  source,
  keys = IN_PROCESS_ENVIRONMENT_KEYS,
) => {
  const previous = new Map();
  for (const key of keys) {
    previous.set(key, Object.prototype.hasOwnProperty.call(process.env, key)
      ? { present: true, value: process.env[key] }
      : { present: false });
    const value = source[key];
    if (value === undefined || value === null) delete process.env[key];
    else process.env[key] = String(value);
  }
  let restored = false;
  return () => {
    if (restored) return;
    restored = true;
    for (const [key, state] of previous) {
      if (state.present) process.env[key] = state.value;
      else delete process.env[key];
    }
  };
};

const runCommand = (command, cwd, environment = process.env) => new Promise((resolve, reject) => {
  const child = spawn(command[0], command.slice(1), {
    cwd,
    env: environment,
    stdio: 'inherit',
  });
  child.once('error', reject);
  child.once('exit', (code, signal) => {
    if (code === 0) resolve();
    else reject(new Error(
      `CTF_COMMAND_FAILED:${command[0]}:code=${code ?? 'null'}:signal=${signal ?? 'null'}`,
    ));
  });
});

const runRepositorySuites = async (manifest, environment) => {
  const results = [];
  for (const suite of manifest.mandatoryRepositorySuites) {
    await runCommand(suite.command, path.join(REPO_ROOT, suite.cwd), environment);
    results.push({ id: suite.id, passed: true });
  }
  return results;
};

const summarizeQualification = ({
  qualificationClass,
  providerState,
  hostilePassed,
  repositorySuites,
  densityResults,
  productionEquivalent = false,
  error = null,
}) => {
  const localPassed = error === null
    && hostilePassed
    && repositorySuites.length > 0
    && repositorySuites.every((suite) => suite.passed)
    && densityResults.length > 0
    && densityResults.every((result) => result.accepted === true);
  const customerQualified = qualificationClass === 'production'
    && productionEquivalent === true
    && providerState.customerQualified === true
    && localPassed;
  return {
    localPassed,
    customerQualified,
    unresolvedExternalGates: [...providerState.unresolved],
    ...(error ? { failure: error instanceof Error ? error.message : String(error) } : {}),
  };
};

const runQualification = async ({
  qualificationClass,
  arm,
  mode,
  port,
  postgresContainer,
  runtimeRoles,
  durationSec,
  outputDir,
  providerArguments = {},
  environment = process.env,
} = {}) => {
  const manifest = readManifest();
  fs.mkdirSync(outputDir, { recursive: true, mode: 0o700 });
  const reportFile = path.join(outputDir, 'qualification.json');
  let providerState = {
    customerQualified: false,
    unresolved: manifest.externalProviderGates.map((gate) => gate.id),
  };
  let failure = null;
  try {
    providerState = assertProviderGates(
      manifest,
      qualificationClass,
      providerArguments,
    );
    if (qualificationClass === 'production') {
      throw new Error(
        'CTF_PRODUCTION_EQUIVALENCE_NOT_IMPLEMENTED:the exact fixture still uses deterministic LLM and signing-only storage paths',
      );
    }
  } catch (error) {
    failure = error;
  }
  const controlToken = crypto.randomBytes(32).toString('hex');
  const observabilityToken = crypto.randomBytes(32).toString('hex');
  const runEnvironment = {
    ...environment,
    NODE_ENV: 'production',
    CTF_CONTROL_TOKEN: controlToken,
    GRAPHQL_OBSERVABILITY_ENABLED: 'true',
    GRAPHQL_OBSERVABILITY_TOKEN: observabilityToken,
    GRAPHILE_CACHE_MAX: '3',
    GRAPHILE_CACHE_INSTANCE_HEAP_BYTES: String(64 * 1024 * 1024),
    GRAPHILE_CACHE_SERVER_RESERVE_BYTES: String(256 * 1024 * 1024),
    GRAPHILE_CACHE_BUILD_RESERVE_BYTES: String(768 * 1024 * 1024),
    GRAPHILE_BUILD_MAX_CONCURRENCY: '1',
    GRAPHILE_BUILD_CONCURRENCY: '1',
    GRAPHILE_BUILD_QUEUE_MAX: '8',
    PG_CACHE_MAX: '4',
    PG_POOL_MAX: '1',
    PG_POOL_MAX_USES: '0',
    DATAPLAN_PG_PREPARED_STATEMENT_CACHE_SIZE: '100',
  };
  const serverArgs = [
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
    '--arm',
    arm,
    '--mode',
    mode,
    '--runtime-pool-max',
    '1',
    '--runtime-pool-max-uses',
    'unlimited',
    ...TENANTS.flatMap((tenant) => [
      `--${tenant.runtimeRoleArgument}`,
      runtimeRoles[tenant.id],
    ]),
  ];
  let server = null;
  let hostilePassed = false;
  let repositorySuites = [];
  let densityResults = [];
  let generated = null;
  let localExecutionStarted = false;
  let restoreProcessEnvironment = null;
  try {
    if (!failure) {
      // The server loads pg-cache and graphile-cache lazily, but those modules
      // snapshot governor and pool settings from process.env at first require.
      // Install the exact run environment before that load and retain it for
      // the child cperf arm, which inherits runtime credentials from this
      // process without ever writing them into the generated plan.
      restoreProcessEnvironment = installProcessEnvironment(runEnvironment);
      localExecutionStarted = true;
      server = await createFixtureServer(parseServerOptions(serverArgs, runEnvironment), runEnvironment);
      await server.listen();
      generated = await generateInputs({
        arm,
        mode,
        port,
        postgresContainer,
        runtimeRoles,
        durationSec,
        outputDir: path.join(outputDir, 'generated'),
      });
      const generatedFleet = JSON.parse(fs.readFileSync(generated.fleetFile, 'utf8'));
      const expectedPhysicalDatabaseIdentity =
        generatedFleet.tenants?.[0]?.databases?.[0]?.physicalDatabase;
      await runHostileValidation({
        baseUrl: `http://127.0.0.1:${port}`,
        expectedPhysicalDatabaseIdentity,
        controlToken,
        arm,
        mode,
        outputFile: path.join(outputDir, 'hostile-validation.json'),
      });
      hostilePassed = true;
      await server.close();
      server = null;

      repositorySuites = await runRepositorySuites(manifest, runEnvironment);
      const perfHarness = require(path.join(REPO_ROOT, 'packages/perf-harness/dist/index.js'));
      const plan = perfHarness.loadPlan(generated.planFile);
      const fleet = perfHarness.loadFleet(generated.fleetFile);
      perfHarness.validateCoverage(plan, fleet);
      densityResults = await perfHarness.runDensityPlan(plan, fleet);
    }
  } catch (error) {
    failure ??= error;
  } finally {
    try {
      if (server) await server.close().catch(() => undefined);
    } finally {
      restoreProcessEnvironment?.();
    }
  }

  const summary = summarizeQualification({
    qualificationClass,
    providerState,
    hostilePassed,
    repositorySuites,
    densityResults,
    productionEquivalent: false,
    error: failure,
  });
  const report = {
    version: 1,
    fixture: manifest.fixture,
    qualificationClass,
    startedLocally: localExecutionStarted,
    productionEquivalent: false,
    endedAt: new Date().toISOString(),
    arm,
    mode,
    durationSec,
    ...summary,
    providerGates: manifest.externalProviderGates.map((gate) => ({
      id: gate.id,
      passed: false,
      blocking: true,
    })),
    hostileValidation: { passed: hostilePassed },
    repositorySuites,
    densityRuns: densityResults.map((result) => ({
      arm: result.arm,
      heapMiB: result.heapMiB,
      configuredTenants: result.configuredTenants,
      repetition: result.repetition,
      accepted: result.accepted,
      artifactDir: path.relative(REPO_ROOT, result.artifactDir),
    })),
    generatedInputs: generated ? {
      plan: path.relative(REPO_ROOT, generated.planFile),
      fleet: path.relative(REPO_ROOT, generated.fleetFile),
    } : null,
  };
  atomicWriteJson(reportFile, report);
  if (failure) throw failure;
  if (!summary.localPassed) throw new Error('CTF_OFFLINE_RESEARCH_GATES_FAILED');
  return { reportFile, report };
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const qualificationClass = requireString(args, 'class', 'production');
  const runtimeRoles = Object.fromEntries(TENANTS.map((tenant) => [
    tenant.id,
    requireString(args, tenant.runtimeRoleArgument),
  ]));
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const result = await runQualification({
    qualificationClass,
    arm: requireString(args, 'arm', 'local-complete-tenant'),
    mode: requireString(args, 'mode', 'scoped-required'),
    port: parsePositiveInteger(args.port ?? '3391', 'port'),
    postgresContainer: requireString(args, 'postgres-container'),
    runtimeRoles,
    durationSec: parsePositiveInteger(args['duration-sec'] ?? '900', 'duration-sec'),
    outputDir: path.resolve(requireString(
      args,
      'output-dir',
      path.join(FIXTURE_DIR, 'qualification-artifacts', timestamp),
    )),
    providerArguments: args,
  });
  process.stdout.write(`${JSON.stringify({
    reportFile: result.reportFile,
    localPassed: result.report.localPassed,
    customerQualified: result.report.customerQualified,
  })}\n`);
};

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  IN_PROCESS_ENVIRONMENT_KEYS,
  installProcessEnvironment,
  runCommand,
  runQualification,
  summarizeQualification,
};
