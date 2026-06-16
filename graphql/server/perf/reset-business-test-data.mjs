#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';

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

const runId = getArgValue(args, '--run-id', makeRunId('graphile-cache-reset'));
const runDir = path.resolve(getArgValue(args, '--run-dir', path.join(DEFAULT_TMP_ROOT, runId)));
const profilesPath = path.resolve(
  getArgValue(args, '--profiles', path.join(runDir, 'data', 'business-op-profiles.json')),
);
const dryRun = hasFlag(args, '--dry-run');
const allowNonPerfSchema = hasFlag(args, '--allow-non-perf-schema');
const ensurePublicTestAccess = hasFlag(args, '--ensure-public-test-access');
const publicRole = getArgValue(args, '--public-role', 'authenticated');
const publicReadRole = getArgValue(args, '--public-read-role', 'anonymous');
const tag = getArgValue(args, '--tag', '').trim();

const pgConfig = {
  host: getArgValue(args, '--pg-host', process.env.PGHOST || 'localhost'),
  port: Number.parseInt(getArgValue(args, '--pg-port', process.env.PGPORT || '5432'), 10),
  database: getArgValue(args, '--pg-database', process.env.PGDATABASE || 'constructive'),
  user: getArgValue(args, '--pg-user', process.env.PGUSER || 'postgres'),
  password: getArgValue(args, '--pg-password', process.env.PGPASSWORD || 'password'),
};

const quoteIdent = (value) => `"${String(value).replace(/"/g, '""')}"`;

const readJson = async (filePath) => {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
};

const main = async () => {
  const dirs = await ensureRunDirs(runDir);
  const reportName = tag ? `reset-business-test-data-${tag}.json` : 'reset-business-test-data.json';
  const reportPath = path.join(dirs.reportsDir, reportName);

  const profilesPayload = await readJson(profilesPath);
  const profiles = extractProfiles(profilesPayload);
  if (profiles.length === 0) {
    throw new Error(`No business profiles found in ${profilesPath}`);
  }

  const targets = buildTargetsFromProfiles(profiles);
  if (targets.length === 0) {
    throw new Error(`No truncation targets found from profiles in ${profilesPath}`);
  }

  const unsafeTargets = getUnsafeTargets(targets);
  if (unsafeTargets.length > 0 && !allowNonPerfSchema) {
    throw new Error(
      `Refusing to truncate non-perf schemas: ${unsafeTargets
        .map((target) => `${target.schemaName}.${target.tableName}`)
        .join(', ')}`,
    );
  }

  const startedAt = new Date().toISOString();
  const truncateFailures = [];
  const executed = [];
  const pool = new Pool(pgConfig);

  try {
    for (const target of targets) {
      const qualified = `${quoteIdent(target.schemaName)}.${quoteIdent(target.tableName)}`;
      const sql = `truncate table ${qualified};`;

      if (dryRun) {
        executed.push({ ...target, sql, dryRun: true });
        continue;
      }

      try {
        await pool.query(sql);
        executed.push({ ...target, sql, dryRun: false });
      } catch (error) {
        truncateFailures.push({
          ...target,
          sql,
          phase: 'truncate',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } finally {
    await pool.end();
  }

  const accessTargets = dryRun
    ? targets
    : executed.map((entry) => ({
        schemaName: entry.schemaName,
        tableName: entry.tableName,
        databaseId: entry.databaseId ?? null,
        profileKey: entry.profileKey ?? null,
      }));
  const accessResult = ensurePublicTestAccess
    ? await ensurePublicAccessForTargets({
        targets: accessTargets,
        pgConfig,
        dryRun,
        publicRole,
        publicReadRole,
      })
    : { prepared: [], failures: [] };
  const accessPrepared = accessResult.prepared;
  const accessFailures = accessResult.failures;

  const failures = [...truncateFailures, ...accessFailures];

  const report = {
    createdAt: new Date().toISOString(),
    startedAt,
    endedAt: new Date().toISOString(),
    runDir,
    profilesPath,
    pg: {
      host: pgConfig.host,
      port: pgConfig.port,
      database: pgConfig.database,
      user: pgConfig.user,
    },
    options: {
      dryRun,
      allowNonPerfSchema,
      ensurePublicTestAccess,
      publicRole,
      publicReadRole: publicReadRole || null,
      tag: tag || null,
    },
    totals: {
      profileCount: profiles.length,
      targetCount: targets.length,
      truncatedCount: executed.length,
      accessPreparedCount: accessPrepared.length,
      failureCount: failures.length,
    },
    targets,
    executed,
    accessPrepared,
    truncateFailures,
    accessFailures,
    failures,
  };

  await writeJson(reportPath, report);

  console.log(
    JSON.stringify(
      {
        reportPath,
        targetCount: targets.length,
        truncatedCount: executed.length,
        failureCount: failures.length,
      },
      null,
      2,
    ),
  );

  if (failures.length > 0) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
