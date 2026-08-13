import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { prepareFixture } from './fixture';
import { DATABASE_URL_ENV, redactSecret, runWorkerProcess } from './process';
import { summarizeCase, validateSchemaGroups } from './report';
import { makeSchedule, validateCaseDefinitions } from './schedule';
import type {
  BenchmarkCaseDefinition,
  BenchmarkReport,
  BenchmarkRun,
  BenchmarkSuiteDefinition,
} from './types';

export interface RunSuiteOptions {
  databaseUrl: string;
  repetitions: number;
  seed: number;
  order: string[] | null;
  output?: string;
}

export const runBenchmarkSuite = async (
  suite: BenchmarkSuiteDefinition,
  options: RunSuiteOptions,
  workerPath: string
): Promise<BenchmarkReport> => {
  validateCaseDefinitions(suite.cases);
  const byName = new Map(
    suite.cases.map((definition) => [definition.name, definition])
  );
  const schedule = makeSchedule(
    suite.cases,
    options.repetitions,
    options.seed,
    options.order
  );
  const runs: BenchmarkRun[] = [];
  for (const coordinate of schedule) {
    const definition = byName.get(coordinate.caseName)!;
    process.stderr.write(
      `[${runs.length + 1}/${schedule.length}] repetition ${
        coordinate.repetition
      }, ${coordinate.caseName}\n`
    );
    try {
      const spawned = await runWorkerProcess(
        workerPath,
        options.databaseUrl,
        definition
      );
      runs.push({ ...coordinate, result: spawned.result });
    } catch (error) {
      runs.push({
        ...coordinate,
        result: {
          status: 'error',
          pid: -1,
          caseName: coordinate.caseName,
          error: redactSecret(
            error instanceof Error ? error.message : String(error),
            options.databaseUrl
          ),
        },
      });
    }
  }
  const successfulRuns = runs.filter((run) => run.result.status === 'ok');
  const allRunsSucceeded = successfulRuns.length === schedule.length;
  const pids = successfulRuns.map((run) => run.result.pid);
  const freshProcessPerRun =
    allRunsSucceeded &&
    pids.every((pid) => pid > 0 && pid !== process.pid) &&
    new Set(pids).size === pids.length;
  const caseValidationPassed =
    allRunsSucceeded &&
    successfulRuns.every(
      (run) => run.result.status === 'ok' && run.result.caseValidation.passed
    );
  const schemaGroups = validateSchemaGroups(suite.cases, runs);
  const errors: string[] = [];
  for (const run of runs) {
    if (run.result.status === 'error') {
      errors.push(
        `${run.caseName} repetition ${run.repetition}: ${run.result.error}`
      );
    } else {
      for (const error of run.result.caseValidation.errors) {
        errors.push(`${run.caseName} repetition ${run.repetition}: ${error}`);
      }
    }
  }
  if (!freshProcessPerRun) {
    errors.push('fresh-process validation did not pass for every run');
  }
  errors.push(...schemaGroups.errors);
  const summaries: Record<
    string,
    NonNullable<ReturnType<typeof summarizeCase>>
  > = {};
  for (const definition of suite.cases) {
    const summary = summarizeCase(runs, definition.name);
    if (summary) summaries[definition.name] = summary;
  }
  return {
    format: 'constructive-performance-suite/v1',
    generatedAt: new Date().toISOString(),
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
    suite,
    config: {
      repetitions: options.repetitions,
      seed: options.seed,
      order: options.order,
    },
    schedule,
    runs,
    validation: {
      allRunsSucceeded,
      freshProcessPerRun,
      caseValidationPassed,
      schemaGroupsEquivalent: schemaGroups.equivalent,
      schemaGroups: schemaGroups.hashes,
      errors,
    },
    summaries,
  };
};

export const writeJsonAtomically = async (
  output: string,
  value: unknown
): Promise<string> => {
  const absoluteOutput = resolve(output);
  await mkdir(dirname(absoluteOutput), { recursive: true });
  const temporary = `${absoluteOutput}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  await rename(temporary, absoluteOutput);
  return absoluteOutput;
};

interface ParsedArgs {
  values: Map<string, string>;
}

const parseArgs = (args: readonly string[]): ParsedArgs => {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (
      !flag?.startsWith('--') ||
      value === undefined ||
      value.startsWith('--')
    ) {
      throw new Error(`expected --name value near '${flag ?? '<end>'}'`);
    }
    const name = flag.slice(2);
    if (values.has(name))
      throw new Error(`--${name} may only be specified once`);
    values.set(name, value);
  }
  return { values };
};

const positiveInteger = (
  value: string | undefined,
  name: string,
  defaultValue: number,
  maximum: number
): number => {
  if (value === undefined) return defaultValue;
  if (!/^\d+$/.test(value)) throw new Error(`--${name} must be an integer`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new Error(`--${name} must be between 1 and ${maximum}`);
  }
  return parsed;
};

const databaseUrl = (args: ParsedArgs): string => {
  const value =
    args.values.get('database-url') ?? process.env[DATABASE_URL_ENV];
  if (!value) {
    throw new Error(
      `--database-url or the ${DATABASE_URL_ENV} environment variable is required`
    );
  }
  return value;
};

const stringList = (value: string | undefined): string[] | null => {
  if (value === undefined) return null;
  const result = value.split(',');
  if (
    result.some((item) => item.length === 0 || item.trim() !== item) ||
    new Set(result).size !== result.length
  ) {
    throw new Error('list values must be unique exact non-empty strings');
  }
  return result;
};

const parseCases = (encoded: string): BenchmarkCaseDefinition[] => {
  const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  if (!Array.isArray(parsed))
    throw new Error('--cases must encode a JSON array');
  return parsed as BenchmarkCaseDefinition[];
};

export const cliMain = async (args = process.argv.slice(2)): Promise<void> => {
  const [command, ...rest] = args;
  const parsed = parseArgs(rest);
  if (command === 'prepare') {
    const schema = parsed.values.get('schema');
    if (!schema) throw new Error('--schema is required');
    const result = await prepareFixture({
      databaseUrl: databaseUrl(parsed),
      schema,
      tables: positiveInteger(parsed.values.get('tables'), 'tables', 64, 500),
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  if (command !== 'run') {
    throw new Error('expected prepare or run command');
  }
  const cases = parsed.values.get('cases');
  const worker = parsed.values.get('worker');
  if (!cases || !worker) throw new Error('--cases and --worker are required');
  const report = await runBenchmarkSuite(
    {
      name: parsed.values.get('suite') ?? 'benchmark-suite',
      cases: parseCases(cases),
    },
    {
      databaseUrl: databaseUrl(parsed),
      repetitions: positiveInteger(
        parsed.values.get('repetitions'),
        'repetitions',
        3,
        50
      ),
      seed: positiveInteger(
        parsed.values.get('seed'),
        'seed',
        20260813,
        0xffffffff
      ),
      order: stringList(parsed.values.get('order')),
      output: parsed.values.get('output'),
    },
    resolve(worker)
  );
  const output = await writeJsonAtomically(
    parsed.values.get('output') ?? 'performance-report.json',
    report
  );
  process.stdout.write(
    `${JSON.stringify({ output, validation: report.validation })}\n`
  );
  if (
    !report.validation.allRunsSucceeded ||
    !report.validation.freshProcessPerRun ||
    !report.validation.caseValidationPassed ||
    !report.validation.schemaGroupsEquivalent
  ) {
    process.exitCode = 1;
  }
};
