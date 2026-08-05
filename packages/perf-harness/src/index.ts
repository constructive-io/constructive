#!/usr/bin/env node
import { runCatalogBench, runCatalogBenchWorker } from './catalog-bench';
import { loadFleet, loadPlan, validateCoverage } from './config';
import { writeReport } from './report';
import { runDensityPlan } from './run';

const parseList = (value: string | undefined): string[] | undefined => value
  ? value.split(',').map((item) => item.trim()).filter(Boolean)
  : undefined;

const parseNumbers = (value: string | undefined): number[] | undefined => parseList(value)?.map((item) => {
  const parsed = Number(item);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`invalid positive integer '${item}'`);
  return parsed;
});

const parsePositiveInteger = (value: string | undefined, label: string): number | undefined => {
  if (value == null) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || String(parsed) !== value) {
    throw new Error(`${label} must be a positive integer`);
  }
  return parsed;
};

const flag = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const hasFlag = (name: string): boolean => process.argv.includes(`--${name}`);

const usage = (): void => {
  process.stdout.write(`cperf — local Graphile tenant-density research harness

  cperf validate --plan <plan.json> [--allow-reserved-ports]
  cperf run --plan <plan.json> [--arm a,b] [--heaps 1024,2048] [--tenants 1,5] [--repetitions 3] [--smoke]
  cperf report --plan <plan.json> --results <results.ndjson> --out <report.md>
  cperf catalog-bench --database <db> --mode stock|scoped-required --schemas a,b --instances 1,2 --out <dir>
  cperf catalog-bench --database <db> --mode stock|scoped-required --surface-schemas a,b --allowed-dependency-schemas deps,private --instances 1 --out <dir>
    [--scoped-catalog-types all|dependency-closure]
    [--introspection-client-release-mode reuse|destroy]
    [--release-build-state-after-validation]
    [--v8-profile stock|optimize-for-size|baseline-optimize-for-size|jitless-optimize-for-size]
    [--warm-operations-per-instance 500] [--expected-tokens token-a,token-b]
    [--warm-operation-replay-passes 3]
    [--grafast-query-cache-max 8] [--grafast-operations-cache-max 8]
    [--grafast-operation-plans-cache-max 8]
    [--tenant-proxy-surfaces 5]

Full runs honor the plan's 15-minute matrix and optional two-hour soak. --smoke
forces one five-second run and can never satisfy the qualification gates.
`);
};

const main = async (): Promise<number> => {
  const command = process.argv[2];
  if (command === '__catalog-worker') {
    await runCatalogBenchWorker(
      requireFlagForWorker('config'),
      requireFlagForWorker('result')
    );
    return 0;
  }
  if (command === 'catalog-bench') {
    await runCatalogBench(process.argv.slice(3));
    return 0;
  }
  const planFile = flag('plan');
  if (!command || !planFile || hasFlag('help')) {
    usage();
    return command && hasFlag('help') ? 0 : 1;
  }
  const plan = loadPlan(planFile, hasFlag('allow-reserved-ports'));
  const fleet = loadFleet(plan.fleetFile);
  validateCoverage(plan, fleet);
  if (command === 'validate') {
    process.stdout.write(
      `valid plan: ${plan.arms.length} arms, ${fleet.tenants.length} tenants, `
      + `${plan.heapMiB.length} heaps, ${plan.repetitions} repetitions\n`
    );
    return 0;
  }
  if (command === 'run') {
    await runDensityPlan(plan, fleet, {
      arms: parseList(flag('arm')),
      heaps: parseNumbers(flag('heaps')),
      tenantCounts: parseNumbers(flag('tenants')),
      repetitions: parsePositiveInteger(flag('repetitions'), 'repetitions'),
      smoke: hasFlag('smoke')
    });
    return 0;
  }
  if (command === 'report') {
    const results = flag('results');
    const output = flag('out');
    if (!results || !output) throw new Error('report requires --results and --out');
    writeReport(results, output, plan, fleet);
    return 0;
  }
  usage();
  return 1;
};

const requireFlagForWorker = (name: string): string => {
  const value = flag(name);
  if (!value) throw new Error(`catalog worker requires --${name}`);
  return value;
};

void main().then((code) => {
  process.exitCode = code;
}, (error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});

export * from './catalog-bench';
export * from './config';
export * from './http';
export * from './memory';
export * from './postgres';
export * from './report';
export * from './run';
export * from './run-attestation';
export * from './score';
export * from './types';
