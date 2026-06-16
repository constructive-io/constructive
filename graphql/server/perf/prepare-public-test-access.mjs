#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_TMP_ROOT,
  ensureRunDirs,
  getArgValue,
  hasFlag,
  makeRunId,
  writeJson,
} from './common.mjs';
import {
  buildTargetsFromProfiles,
  ensurePublicAccessForTargets,
  extractProfiles,
  getUnsafeTargets,
} from './public-test-access-lib.mjs';

const args = process.argv.slice(2);

const runId = getArgValue(args, '--run-id', makeRunId('graphile-cache-public-access'));
const runDir = path.resolve(getArgValue(args, '--run-dir', path.join(DEFAULT_TMP_ROOT, runId)));
const profilesPath = path.resolve(
  getArgValue(args, '--profiles', path.join(runDir, 'data', 'business-op-profiles.public.json')),
);
const dryRun = hasFlag(args, '--dry-run');
const allowNonPerfSchema = hasFlag(args, '--allow-non-perf-schema');
const tag = getArgValue(args, '--tag', '').trim();
const publicRole = getArgValue(args, '--public-role', 'authenticated').trim();
const publicReadRole = getArgValue(args, '--public-read-role', 'anonymous').trim();

if (!publicRole) {
  throw new Error('--public-role cannot be empty');
}

const pgConfig = {
  host: getArgValue(args, '--pg-host', process.env.PGHOST || 'localhost'),
  port: Number.parseInt(getArgValue(args, '--pg-port', process.env.PGPORT || '5432'), 10),
  database: getArgValue(args, '--pg-database', process.env.PGDATABASE || 'constructive'),
  user: getArgValue(args, '--pg-user', process.env.PGUSER || 'postgres'),
  password: getArgValue(args, '--pg-password', process.env.PGPASSWORD || 'password'),
};

const readJson = async (filePath) => {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
};

const main = async () => {
  const dirs = await ensureRunDirs(runDir);
  const reportName = tag ? `prepare-public-test-access-${tag}.json` : 'prepare-public-test-access.json';
  const reportPath = path.join(dirs.reportsDir, reportName);

  const profilesPayload = await readJson(profilesPath);
  const profiles = extractProfiles(profilesPayload);
  if (profiles.length === 0) {
    throw new Error(`No profiles found in ${profilesPath}`);
  }

  const targets = buildTargetsFromProfiles(profiles);
  if (targets.length === 0) {
    throw new Error(`No table targets found in ${profilesPath}`);
  }

  const unsafeTargets = getUnsafeTargets(targets);
  if (unsafeTargets.length > 0 && !allowNonPerfSchema) {
    throw new Error(
      `Refusing to prepare non-perf schemas: ${unsafeTargets
        .map((target) => `${target.schemaName}.${target.tableName}`)
        .join(', ')}`,
    );
  }

  const preparedResult = await ensurePublicAccessForTargets({
    targets,
    pgConfig,
    dryRun,
    publicRole,
    publicReadRole,
  });

  const report = {
    createdAt: new Date().toISOString(),
    runDir,
    profilesPath,
    options: {
      dryRun,
      allowNonPerfSchema,
      publicRole,
      publicReadRole: publicReadRole || null,
      tag: tag || null,
    },
    totals: {
      profileCount: profiles.length,
      targetCount: targets.length,
      preparedCount: preparedResult.prepared.length,
      failureCount: preparedResult.failures.length,
    },
    targets,
    prepared: preparedResult.prepared,
    failures: preparedResult.failures,
  };

  await writeJson(reportPath, report);

  console.log(
    JSON.stringify(
      {
        reportPath,
        targetCount: targets.length,
        preparedCount: preparedResult.prepared.length,
        failureCount: preparedResult.failures.length,
      },
      null,
      2,
    ),
  );

  if (preparedResult.failures.length > 0) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
