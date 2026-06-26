import fs from 'node:fs/promises';
import path from 'node:path';
import { getStringFlag, hasFlag, parseArgs } from '../lib/args';
import { pgConfigFromEnv } from '../lib/pg';
import { defaultRunDir, ensureRunDirs, writeJson } from '../lib/run-dir';
import {
  buildTargetsFromProfiles,
  ensurePublicAccessForTargets,
  extractProfiles,
  getUnsafeTargets,
} from '../lib/public-access';
import type { CommandContext } from '../types';

async function readJson(filePath: string): Promise<unknown> {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

export async function preparePublicAccess(ctx: CommandContext): Promise<void> {
  const parsed = parseArgs(ctx.args);
  const runDir = path.resolve(getStringFlag(parsed.flags, '--run-dir', defaultRunDir('graphile-cache-public-access')) || defaultRunDir('graphile-cache-public-access'));
  const profilesPath = path.resolve(
    getStringFlag(parsed.flags, '--profiles', path.join(runDir, 'data', 'business-op-profiles.public.json')) ||
      path.join(runDir, 'data', 'business-op-profiles.public.json'),
  );
  const allowNonPerfSchema = hasFlag(parsed.flags, '--allow-non-perf-schema');
  const tag = (getStringFlag(parsed.flags, '--tag', '') || '').trim();
  const publicRole = (getStringFlag(parsed.flags, '--public-role', 'authenticated') || 'authenticated').trim();
  const publicReadRole = (getStringFlag(parsed.flags, '--public-read-role', 'anonymous') || 'anonymous').trim();

  if (!publicRole) {
    throw new Error('--public-role cannot be empty');
  }

  const pgConfig = {
    ...pgConfigFromEnv(),
    host: getStringFlag(parsed.flags, '--pg-host') || process.env.PGHOST || 'localhost',
    port: Number.parseInt(getStringFlag(parsed.flags, '--pg-port') || process.env.PGPORT || '5432', 10),
    database: getStringFlag(parsed.flags, '--pg-database') || process.env.PGDATABASE || 'constructive',
    user: getStringFlag(parsed.flags, '--pg-user') || process.env.PGUSER || 'postgres',
    password: getStringFlag(parsed.flags, '--pg-password') || process.env.PGPASSWORD || 'password',
  };

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
    dryRun: ctx.dryRun,
    publicRole,
    publicReadRole,
  });

  const report = {
    createdAt: new Date().toISOString(),
    runDir,
    profilesPath,
    options: {
      dryRun: ctx.dryRun,
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
  console.log(JSON.stringify({ reportPath, targetCount: targets.length, preparedCount: preparedResult.prepared.length, failureCount: preparedResult.failures.length }, null, 2));
  if (preparedResult.failures.length > 0) process.exitCode = 1;
}
