import fs from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';
import { getStringFlag, hasFlag, parseArgs } from '../lib/args';
import { pgConfigFromEnv } from '../lib/pg';
import { defaultRunDir, ensureRunDirs, writeJson } from '../lib/run-dir';
import {
  buildTargetsFromProfiles,
  ensurePublicAccessForTargets,
  extractProfiles,
  getUnsafeTargets,
  quoteIdent,
  type PublicAccessFailure,
} from '../lib/public-access';
import type { CommandContext } from '../types';

async function readJson(filePath: string): Promise<unknown> {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

export async function resetBusinessData(ctx: CommandContext): Promise<void> {
  const parsed = parseArgs(ctx.args);
  const runDir = path.resolve(getStringFlag(parsed.flags, '--run-dir', defaultRunDir('graphile-cache-reset')) || defaultRunDir('graphile-cache-reset'));
  const profilesPath = path.resolve(
    getStringFlag(parsed.flags, '--profiles', path.join(runDir, 'data', 'business-op-profiles.json')) ||
      path.join(runDir, 'data', 'business-op-profiles.json'),
  );
  const allowNonPerfSchema = hasFlag(parsed.flags, '--allow-non-perf-schema');
  const ensurePublicTestAccess = hasFlag(parsed.flags, '--ensure-public-test-access');
  const publicRole = getStringFlag(parsed.flags, '--public-role', 'authenticated') || 'authenticated';
  const publicReadRole = getStringFlag(parsed.flags, '--public-read-role', 'anonymous') || 'anonymous';
  const tag = (getStringFlag(parsed.flags, '--tag', '') || '').trim();

  const pgConfig = {
    ...pgConfigFromEnv(),
    host: getStringFlag(parsed.flags, '--pg-host') || process.env.PGHOST || 'localhost',
    port: Number.parseInt(getStringFlag(parsed.flags, '--pg-port') || process.env.PGPORT || '5432', 10),
    database: getStringFlag(parsed.flags, '--pg-database') || process.env.PGDATABASE || 'constructive',
    user: getStringFlag(parsed.flags, '--pg-user') || process.env.PGUSER || 'postgres',
    password: getStringFlag(parsed.flags, '--pg-password') || process.env.PGPASSWORD || 'password',
  };

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
  const truncateFailures: PublicAccessFailure[] = [];
  const executed: Array<Record<string, unknown>> = [];
  const pool = new Pool(pgConfig);

  try {
    for (const target of targets) {
      const qualified = `${quoteIdent(target.schemaName)}.${quoteIdent(target.tableName)}`;
      const sql = `truncate table ${qualified};`;

      if (ctx.dryRun) {
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

  const accessTargets = ctx.dryRun
    ? targets
    : executed.map((entry) => ({
        schemaName: String(entry.schemaName),
        tableName: String(entry.tableName),
        databaseId: (entry.databaseId as string | null | undefined) ?? null,
        profileKey: (entry.profileKey as string | null | undefined) ?? null,
      }));
  const accessResult = ensurePublicTestAccess
    ? await ensurePublicAccessForTargets({
        targets: accessTargets,
        pgConfig,
        dryRun: ctx.dryRun,
        publicRole,
        publicReadRole,
      })
    : { prepared: [], failures: [] };

  const failures = [...truncateFailures, ...accessResult.failures];
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
      dryRun: ctx.dryRun,
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
      accessPreparedCount: accessResult.prepared.length,
      failureCount: failures.length,
    },
    targets,
    executed,
    accessPrepared: accessResult.prepared,
    truncateFailures,
    accessFailures: accessResult.failures,
    failures,
  };

  await writeJson(reportPath, report);
  console.log(JSON.stringify({ reportPath, targetCount: targets.length, truncatedCount: executed.length, failureCount: failures.length }, null, 2));
  if (failures.length > 0) process.exitCode = 1;
}
