#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { parseValueArgs, redactSecret } from './process';
import { runBenchmarkSuite, writeJsonAtomically } from './run';
import {
  inspectScopedCatalogFixture,
  parseScopedCatalogSize,
  prepareScopedCatalogFixture,
} from './scoped-catalog-fixture';
import { analyzeScopedIntrospectionReports } from './scoped-introspection-analysis';
import {
  makeScopedIntrospectionQuerySuite,
  makeScopedIntrospectionSuite,
} from './scoped-introspection-suite';
import type { BenchmarkReport } from './types';

const required = (
  values: Map<string, string>,
  name: string
): string => {
  const value = values.get(name);
  if (!value) throw new Error(`--${name} is required`);
  return value;
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

const sha256File = async (file: string): Promise<string> =>
  createHash('sha256').update(await readFile(file)).digest('hex');

const assertCredentialFree = (text: string, databaseUrl: string): void => {
  if (text.includes(databaseUrl)) {
    throw new Error('benchmark artifact contains the database URL');
  }
  try {
    const password = new URL(databaseUrl).password;
    if (password && text.includes(password)) {
      throw new Error('benchmark artifact contains the database password');
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('artifact contains')) {
      throw error;
    }
    // PostgreSQL accepts connection strings that are not URL-shaped.
  }
};

export const runScopedCatalogMatrix = async (options: {
  databaseUrl: string;
  fixture: string;
  size: 'small' | 'medium' | 'large';
  repetitions: number;
  seed: number;
  outputDirectory: string;
}) => {
  const fixture = await inspectScopedCatalogFixture(options);
  const outputDirectory = resolve(options.outputDirectory);
  const workerOptions = {
    schemas: [fixture.schemas.rootSchema],
    allowedDependencySchemas: [fixture.schemas.dependencySchema],
    noiseSchemas: [fixture.schemas.noiseSchema],
  };
  const buildReports = {} as Record<'off' | 'on', BenchmarkReport>;
  const queryReports = {} as Record<'off' | 'on', BenchmarkReport>;
  const reportFiles: Record<string, string> = {};
  for (const jit of ['off', 'on'] as const) {
    const introspectionJit = jit === 'on';
    buildReports[jit] = await runBenchmarkSuite(
      makeScopedIntrospectionSuite({ ...workerOptions, introspectionJit }),
      {
        databaseUrl: options.databaseUrl,
        repetitions: options.repetitions,
        seed: options.seed,
        order: null,
      },
      resolve(__dirname, 'scoped-introspection-worker.js')
    );
    queryReports[jit] = await runBenchmarkSuite(
      makeScopedIntrospectionQuerySuite({ ...workerOptions, introspectionJit }),
      {
        databaseUrl: options.databaseUrl,
        repetitions: options.repetitions,
        seed: options.seed,
        order: null,
      },
      resolve(__dirname, 'scoped-introspection-query-worker.js')
    );
    reportFiles[`build-jit-${jit}`] = await writeJsonAtomically(
      resolve(outputDirectory, `build-jit-${jit}.json`),
      buildReports[jit]
    );
    reportFiles[`query-jit-${jit}`] = await writeJsonAtomically(
      resolve(outputDirectory, `query-jit-${jit}.json`),
      queryReports[jit]
    );
  }
  const fixtureFile = await writeJsonAtomically(
    resolve(outputDirectory, 'fixture.json'),
    fixture
  );
  const rawReportSha256 = Object.fromEntries(
    await Promise.all(
      Object.entries(reportFiles).map(async ([name, file]) => [
        name,
        await sha256File(file),
      ])
    )
  );
  const analysis = analyzeScopedIntrospectionReports({
    fixture,
    buildReports,
    queryReports,
    rawReportSha256,
  });
  const analysisFile = await writeJsonAtomically(
    resolve(outputDirectory, 'analysis.json'),
    analysis
  );
  for (const file of [fixtureFile, ...Object.values(reportFiles), analysisFile]) {
    assertCredentialFree(await readFile(file, 'utf8'), options.databaseUrl);
  }
  return {
    fixture,
    outputDirectory,
    analysisFile,
    reportFiles,
    rawReportSha256,
    validationPassed:
      analysis.validation.errors.length === 0 &&
      Object.values(analysis.jit).every(
        (jit) => jit.validationErrors.length === 0
      ),
  };
};

export const scopedCatalogCliMain = async (
  args = process.argv.slice(2)
): Promise<void> => {
  const [command, ...rest] = args;
  const parsed = parseValueArgs(rest);
  const databaseUrl = required(parsed.values, 'database-url');
  const fixture = required(parsed.values, 'fixture');
  const size = parseScopedCatalogSize(required(parsed.values, 'size'));
  if (command === 'prepare') {
    const prepared = await prepareScopedCatalogFixture({
      databaseUrl,
      fixture,
      size,
    });
    process.stdout.write(`${JSON.stringify(prepared)}\n`);
    return;
  }
  if (command !== 'run') {
    throw new Error("expected 'prepare' or 'run' command");
  }
  const result = await runScopedCatalogMatrix({
    databaseUrl,
    fixture,
    size,
    repetitions: positiveInteger(
      parsed.values.get('repetitions'),
      'repetitions',
      10,
      50
    ),
    seed: positiveInteger(
      parsed.values.get('seed'),
      'seed',
      20260819,
      0xffffffff
    ),
    outputDirectory:
      parsed.values.get('output-directory') ??
      resolve('packages/perf-harness/artifacts', fixture),
  });
  process.stdout.write(
    `${JSON.stringify({
      outputDirectory: result.outputDirectory,
      analysisFile: result.analysisFile,
      validationPassed: result.validationPassed,
    })}\n`
  );
  if (!result.validationPassed) process.exitCode = 1;
};

if (require.main === module) {
  void scopedCatalogCliMain().catch((error: unknown) => {
    const args = process.argv.slice(2);
    const databaseUrlIndex = args.indexOf('--database-url');
    const databaseUrl =
      databaseUrlIndex >= 0 ? (args[databaseUrlIndex + 1] ?? '') : '';
    process.stderr.write(
      `${redactSecret(
        error instanceof Error ? error.message : String(error),
        databaseUrl
      )}\n`
    );
    process.exitCode = 1;
  });
}
