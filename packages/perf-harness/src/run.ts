import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { prepareFixture } from './fixture';
import { compareArms, makeSchedule, summarizeArm } from './matrix';
import { DATABASE_URL_ENV, runWorkerProcess } from './process';
import {
  ARM_DEFINITIONS,
  ARM_NAMES,
  type ArmName,
  type MatrixReport,
  type MatrixRun,
} from './types';

interface ParsedArgs {
  values: Map<string, string>;
}

interface RunOptions {
  databaseUrl: string;
  schemas: string[];
  allowedDependencySchemas: string[];
  repetitions: number;
  seed: number;
  order: ArmName[] | null;
  output: string;
}

const parseArgs = (args: readonly string[]): ParsedArgs => {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!flag?.startsWith('--') || value === undefined || value.startsWith('--')) {
      throw new Error(`expected --name value near '${flag ?? '<end>'}'`);
    }
    const name = flag.slice(2);
    if (values.has(name)) throw new Error(`--${name} may only be specified once`);
    values.set(name, value);
  }
  return { values };
};

const exactStringList = (
  value: string | undefined,
  name: string,
  allowEmpty = false
): string[] => {
  if (value === undefined) {
    if (allowEmpty) return [];
    throw new Error(`--${name} is required`);
  }
  const result = value.split(',');
  if (
    result.some(
      (item) =>
        item.length === 0 || item.trim() !== item || item.includes('\0')
    ) ||
    new Set(result).size !== result.length
  ) {
    throw new Error(
      `--${name} must be a comma-separated list of unique exact non-empty values`
    );
  }
  return result;
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

const seedValue = (value: string | undefined): number => {
  if (value === undefined) return 20260813;
  if (!/^\d+$/.test(value)) throw new Error('--seed must be an integer');
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 0xffffffff) {
    throw new Error('--seed must be between 0 and 4294967295');
  }
  return parsed;
};

const databaseUrl = (args: ParsedArgs): string => {
  const value = args.values.get('database-url') ?? process.env[DATABASE_URL_ENV];
  if (!value) {
    throw new Error(
      `--database-url or the ${DATABASE_URL_ENV} environment variable is required`
    );
  }
  return value;
};

const parseOrder = (value: string | undefined): ArmName[] | null => {
  if (value === undefined) return null;
  const order = exactStringList(value, 'order');
  if (
    order.length !== ARM_NAMES.length ||
    order.some((arm) => !(arm in ARM_DEFINITIONS)) ||
    new Set(order).size !== ARM_NAMES.length
  ) {
    throw new Error('--order must contain each benchmark arm exactly once');
  }
  return order as ArmName[];
};

const rejectUnknown = (
  args: ParsedArgs,
  allowed: readonly string[]
): void => {
  for (const name of args.values.keys()) {
    if (!allowed.includes(name)) throw new Error(`unknown option --${name}`);
  }
};

export const parseRunOptions = (rawArgs: readonly string[]): RunOptions => {
  const args = parseArgs(rawArgs);
  rejectUnknown(args, [
    'database-url',
    'schemas',
    'allowed-dependency-schemas',
    'repetitions',
    'seed',
    'order',
    'output',
  ]);
  return {
    databaseUrl: databaseUrl(args),
    schemas: exactStringList(args.values.get('schemas'), 'schemas'),
    allowedDependencySchemas: exactStringList(
      args.values.get('allowed-dependency-schemas'),
      'allowed-dependency-schemas',
      true
    ),
    repetitions: positiveInteger(
      args.values.get('repetitions'),
      'repetitions',
      3,
      50
    ),
    seed: seedValue(args.values.get('seed')),
    order: parseOrder(args.values.get('order')),
    output:
      args.values.get('output') ?? 'scoped-retirement-performance.json',
  };
};

const writeJsonAtomically = async (
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

const redactDatabaseUrl = (message: string, databaseUrl: string): string =>
  message.replaceAll(databaseUrl, '<redacted database URL>');

export const runMatrix = async (
  options: RunOptions,
  workerPath = resolve(__dirname, 'worker.js')
): Promise<MatrixReport> => {
  const schedule = makeSchedule(
    options.repetitions,
    options.seed,
    options.order
  );
  const runs: MatrixRun[] = [];
  for (const coordinate of schedule) {
    process.stderr.write(
      `[${runs.length + 1}/${schedule.length}] repetition ${
        coordinate.repetition
      }, ${coordinate.arm}\n`
    );
    try {
      const spawned = await runWorkerProcess(workerPath, options.databaseUrl, {
        arm: coordinate.arm,
        schemas: options.schemas,
        allowedDependencySchemas: options.allowedDependencySchemas,
      });
      runs.push({ ...coordinate, result: spawned.result });
    } catch (error) {
      runs.push({
        ...coordinate,
        result: {
          status: 'error',
          pid: -1,
          arm: coordinate.arm,
          error: redactDatabaseUrl(
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
  const schemaHashes = new Set(
    successfulRuns.map((run) =>
      run.result.status === 'ok' ? run.result.schemaHash : ''
    )
  );
  const schemaEquivalent = allRunsSucceeded && schemaHashes.size === 1;
  const errors = runs.flatMap((run) =>
    run.result.status === 'error'
      ? [`${run.arm} repetition ${run.repetition}: ${run.result.error}`]
      : []
  );
  if (!freshProcessPerRun) {
    errors.push('fresh-process validation did not pass for every run');
  }
  if (!schemaEquivalent) {
    errors.push('schema hashes were not equivalent across all four arms and repetitions');
  }

  const summaries: MatrixReport['summaries'] = {};
  for (const arm of ARM_NAMES) {
    const summary = summarizeArm(runs, arm);
    if (summary) summaries[arm] = summary;
  }
  const stock = summaries.stock;
  const scoped = summaries.scoped;
  const retire = summaries.retire;
  const combined = summaries['scoped-retire'];

  return {
    format: 'constructive-scoped-retirement-matrix/v1',
    generatedAt: new Date().toISOString(),
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
    config: {
      schemas: options.schemas,
      allowedDependencySchemas: options.allowedDependencySchemas,
      repetitions: options.repetitions,
      seed: options.seed,
      order: options.order,
    },
    arms: ARM_NAMES.map((arm) => ARM_DEFINITIONS[arm]),
    schedule,
    runs,
    validation: {
      allRunsSucceeded,
      freshProcessPerRun,
      schemaEquivalent,
      schemaHash: schemaEquivalent ? [...schemaHashes][0] : null,
      errors,
    },
    summaries,
    comparisons: {
      ...(stock && scoped
        ? { scopedVsStock: compareArms('stock', 'scoped', stock, scoped) }
        : {}),
      ...(stock && retire
        ? { retireVsStock: compareArms('stock', 'retire', stock, retire) }
        : {}),
      ...(stock && combined
        ? {
          combinedVsStock: compareArms(
            'stock',
            'scoped-retire',
            stock,
            combined
          ),
        }
        : {}),
      ...(scoped && combined
        ? {
          retireWithinScoped: compareArms(
            'scoped',
            'scoped-retire',
            scoped,
            combined
          ),
        }
        : {}),
      ...(retire && combined
        ? {
          scopedWithinRetire: compareArms(
            'retire',
            'scoped-retire',
            retire,
            combined
          ),
        }
        : {}),
    },
  };
};

const runCommand = async (rawArgs: readonly string[]): Promise<void> => {
  const options = parseRunOptions(rawArgs);
  const report = await runMatrix(options);
  const output = await writeJsonAtomically(options.output, report);
  process.stdout.write(
    `${JSON.stringify({
      output,
      validation: report.validation,
      comparisons: report.comparisons,
    })}\n`
  );
  if (
    !report.validation.allRunsSucceeded ||
    !report.validation.freshProcessPerRun ||
    !report.validation.schemaEquivalent
  ) {
    process.exitCode = 1;
  }
};

const prepareCommand = async (rawArgs: readonly string[]): Promise<void> => {
  const args = parseArgs(rawArgs);
  rejectUnknown(args, ['database-url', 'schema', 'tables']);
  const schema = args.values.get('schema');
  if (!schema) throw new Error('--schema is required');
  const result = await prepareFixture({
    databaseUrl: databaseUrl(args),
    schema,
    tables: positiveInteger(args.values.get('tables'), 'tables', 64, 500),
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
};

const usage = `Usage:
  cperf prepare --schema cperf_NAME [--tables 64] [--database-url URL]
  cperf run --schemas NAME[,NAME] [--allowed-dependency-schemas NAME[,NAME]]
    [--repetitions 3] [--seed 20260813]
    [--order stock,scoped,retire,scoped-retire] [--output FILE]

Database URL may also be supplied in ${DATABASE_URL_ENV}.
`;

export const cliMain = async (args = process.argv.slice(2)): Promise<void> => {
  const [command, ...rest] = args;
  if (command === 'run') {
    await runCommand(rest);
  } else if (command === 'prepare') {
    await prepareCommand(rest);
  } else {
    throw new Error(usage.trimEnd());
  }
};
