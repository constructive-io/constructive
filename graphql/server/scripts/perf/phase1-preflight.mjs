#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

import {
  DEFAULT_BASE_URL,
  DEFAULT_TMP_ROOT,
  dedupeBy,
  ensureRunDirs,
  getArgValue,
  getJson,
  hasFlag,
  makeRunId,
  postJson,
  stableStringify,
  writeJson,
} from './common.mjs';

const args = process.argv.slice(2);

const runId = getArgValue(args, '--run-id', makeRunId());
const tmpRoot = path.resolve(getArgValue(args, '--tmp-root', DEFAULT_TMP_ROOT));
const runDir = path.resolve(getArgValue(args, '--run-dir', path.join(tmpRoot, runId)));
const baseUrl = getArgValue(args, '--base-url', DEFAULT_BASE_URL);

const requireTenants = Number.parseInt(getArgValue(args, '--min-tenant-count', '10'), 10);
const enforceTenantScale = !hasFlag(args, '--allow-underprovisioned');

const defaultMinTokenTenants = enforceTenantScale ? String(requireTenants) : '1';
const minTokenTenants = Number.parseInt(
  getArgValue(args, '--min-token-tenants', defaultMinTokenTenants),
  10,
);
const recommendedTokenTenants = Number.parseInt(
  getArgValue(args, '--recommended-token-tenants', String(requireTenants)),
  10,
);
const bootstrapDefaultCredential = !hasFlag(args, '--no-bootstrap-default-credential');

const defaultSigninEmail = getArgValue(
  args,
  '--default-signin-email',
  process.env.PERF_SIGNIN_EMAIL || 'admin@constructive.io',
);
const defaultSigninPassword = getArgValue(
  args,
  '--default-signin-password',
  process.env.PERF_SIGNIN_PASSWORD || 'admin123!@Constructive',
);

const credentialsPath = path.resolve(
  getArgValue(args, '--credentials', path.join(runDir, 'data', 'tenant-credentials.json')),
);
const tokenOutputPath = path.resolve(
  getArgValue(args, '--token-output', path.join(runDir, 'data', 'tokens.json')),
);
const dbTechValidationPath = path.resolve(
  getArgValue(args, '--db-tech-validation', path.join(runDir, 'reports', 'db-tech-validation.json')),
);
const businessManifestPath = path.resolve(
  getArgValue(args, '--business-manifest', path.join(runDir, 'data', 'business-table-manifest.json')),
);
const businessProfilesOutputPath = path.resolve(
  getArgValue(
    args,
    '--business-profiles-output',
    path.join(runDir, 'data', 'business-op-profiles.json'),
  ),
);
const runDbpmTechValidation = !hasFlag(args, '--skip-dbpm-tech-validation');
const dbpmTenantCount = Number.parseInt(
  getArgValue(args, '--dbpm-tenant-count', String(Math.max(requireTenants, 2))),
  10,
);
const dbpmUserPassword = getArgValue(args, '--dbpm-user-password', 'Constructive!23456');
const dbpmUserPrefix = getArgValue(args, '--dbpm-user-prefix', `dbpm-preflight-${Date.now()}`);
const keyspaceOutputPath = path.resolve(
  getArgValue(args, '--keyspace-output', path.join(runDir, 'data', 'tokens.keyspace.json')),
);
const keyspaceMode = getArgValue(args, '--keyspace-mode', 'schemata');
const keyspaceTargetRouteKeys = Number.parseInt(
  getArgValue(args, '--keyspace-target-route-keys', '24'),
  10,
);
const keyspaceMinRouteKeys = Number.parseInt(
  getArgValue(args, '--keyspace-min-route-keys', '16'),
  10,
);
const keyspaceMaxProfiles = Number.parseInt(getArgValue(args, '--keyspace-max-profiles', '5000'), 10);
const keyspaceMaxSchemaWidth = Number.parseInt(
  getArgValue(args, '--keyspace-max-schema-width', '3'),
  10,
);
const keyspaceSchemaPool = getArgValue(
  args,
  '--keyspace-schema-pool',
  'constructive_public,constructive_auth_public,constructive_users_public,constructive_memberships_public,services_public',
);
const keyspaceNoSmokeCheck = hasFlag(args, '--keyspace-no-smoke-check');

const pgConfig = {
  host: getArgValue(args, '--pg-host', process.env.PGHOST || 'localhost'),
  port: Number.parseInt(getArgValue(args, '--pg-port', process.env.PGPORT || '5432'), 10),
  database: getArgValue(args, '--pg-database', process.env.PGDATABASE || 'constructive'),
  user: getArgValue(args, '--pg-user', process.env.PGUSER || 'postgres'),
  password: getArgValue(args, '--pg-password', process.env.PGPASSWORD || 'password'),
};

const queries = {
  tenantBaseline: `
    select
      (select count(*)::int from constructive_users_public.users where type = 2) as org_count,
      (select count(distinct entity_id)::int from constructive_memberships_public.org_memberships) as org_membership_org_count,
      (select count(distinct actor_id)::int from constructive_memberships_public.org_memberships) as org_membership_actor_count,
      (select count(distinct database_id)::int from services_public.apis) as api_distinct_database_count,
      (select count(*)::int from services_public.apis where is_public = true) as public_api_count,
      (select count(*)::int from services_public.apis where is_public = false) as private_api_count
  `,
  apiCandidates: `
    select
      a.id::text as api_id,
      a.name as api_name,
      a.database_id::text as database_id,
      a.is_public,
      d.domain,
      d.subdomain
    from services_public.apis a
    left join services_public.domains d on d.api_id = a.id
    order by a.is_public, a.name, a.database_id
  `,
};

const pathExists = async (targetPath) => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const buildProfiles = (rows) => {
  const privateProfiles = rows
    .filter((row) => row.is_public === false)
    .map((row) => ({
      key: `private:${row.database_id}:${row.api_name}`,
      mode: 'private-header-routing',
      databaseId: row.database_id,
      apiName: row.api_name,
      graphqlUrl: '/graphql',
      headers: {
        Host: 'localhost',
        'X-Api-Name': row.api_name,
        'X-Database-Id': row.database_id,
      },
    }));

  const publicProfiles = rows
    .filter((row) => row.is_public === true && row.domain)
    .map((row) => {
      const host = row.subdomain ? `${row.subdomain}.${row.domain}` : row.domain;
      return {
        key: `public:${host}`,
        mode: 'public-domain-routing',
        graphqlUrl: '/graphql',
        headers: {
          Host: host,
        },
      };
    });

  return dedupeBy([...privateProfiles, ...publicProfiles], (profile) => stableStringify(profile));
};

const smokeCheckGraphql = async ({ baseUrl: root, profiles }) => {
  const checks = [];
  for (const profile of profiles) {
    const result = await postJson({
      url: `${root}${profile.graphqlUrl}`,
      headers: profile.headers,
      payload: { query: '{ __typename }' },
      timeoutMs: 15000,
    });

    const hasTypename = result.json?.data?.__typename === 'Query';
    const hasErrors = Array.isArray(result.json?.errors) && result.json.errors.length > 0;

    checks.push({
      profileKey: profile.key,
      ok: result.ok && hasTypename,
      status: result.status,
      elapsedMs: result.elapsedMs,
      hasTypename,
      hasErrors,
      error: result.error || null,
      firstError: hasErrors ? result.json.errors[0]?.message ?? 'unknown GraphQL error' : null,
    });
  }
  return checks;
};

const buildBootstrapCredentials = ({ readyProfiles }) => {
  const privateProfiles = readyProfiles.filter((profile) => profile.mode === 'private-header-routing');

  return privateProfiles.map((profile, index) => ({
    tenantKey: profile.key || `tenant-${index + 1}`,
    email: defaultSigninEmail,
    password: defaultSigninPassword,
    host: profile.headers?.Host || 'localhost',
    apiName: profile.headers?.['X-Api-Name'],
    databaseId: profile.headers?.['X-Database-Id'],
  }));
};

const runTokenBuilder = async () => {
  const scriptPath = fileURLToPath(new URL('./build-token-pool.mjs', import.meta.url));

  return await new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [
        scriptPath,
        '--run-dir',
        runDir,
        '--base-url',
        baseUrl,
        '--credentials',
        credentialsPath,
        '--output',
        tokenOutputPath,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('close', (code) => {
      resolve({
        code,
        ok: code === 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
};

const runDbpmTechValidationScript = async () => {
  const scriptPath = fileURLToPath(new URL('./phase1-tech-validate-dbpm.mjs', import.meta.url));

  return await new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [
        scriptPath,
        '--run-dir',
        runDir,
        '--base-url',
        baseUrl,
        '--tenant-count',
        String(dbpmTenantCount),
        '--user-password',
        dbpmUserPassword,
        '--user-prefix',
        dbpmUserPrefix,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('close', (code) => {
      resolve({
        code,
        ok: code === 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
};

const runBusinessProfileBuilder = async () => {
  const scriptPath = fileURLToPath(new URL('./build-business-op-profiles.mjs', import.meta.url));

  return await new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [
        scriptPath,
        '--run-dir',
        runDir,
        '--base-url',
        baseUrl,
        '--manifest',
        businessManifestPath,
        '--tokens',
        tokenOutputPath,
        '--output',
        businessProfilesOutputPath,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('close', (code) => {
      resolve({
        code,
        ok: code === 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
};

const runKeyspaceBuilder = async () => {
  const scriptPath = fileURLToPath(new URL('./build-keyspace-profiles.mjs', import.meta.url));

  const cmd = [
    scriptPath,
    '--run-dir',
    runDir,
    '--base-url',
    baseUrl,
    '--input',
    tokenOutputPath,
    '--output',
    keyspaceOutputPath,
    '--mode',
    keyspaceMode,
    '--target-route-keys',
    String(keyspaceTargetRouteKeys),
    '--max-profiles',
    String(keyspaceMaxProfiles),
    '--max-schema-width',
    String(keyspaceMaxSchemaWidth),
    '--schema-pool',
    keyspaceSchemaPool,
  ];

  if (keyspaceNoSmokeCheck) {
    cmd.push('--no-smoke-check');
  }

  return await new Promise((resolve) => {
    const child = spawn(process.execPath, cmd, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('close', (code) => {
      resolve({
        code,
        ok: code === 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
};

const main = async () => {
  const dirs = await ensureRunDirs(runDir);
  const pool = new Pool(pgConfig);

  const startedAt = new Date();
  const report = {
    startedAt: startedAt.toISOString(),
    runId,
    runDir,
    baseUrl,
    pg: {
      host: pgConfig.host,
      port: pgConfig.port,
      database: pgConfig.database,
      user: pgConfig.user,
    },
    readiness: {
      phase1AReady: false,
      phase1BReady: false,
      phase1CReady: false,
      phase1Ready: false,
      tenantReadyForPhase2: false,
    },
    checks: {},
    warnings: [],
    errors: [],
  };

  try {
    let phase1BReady = false;
    let phase1CReady = false;

    const [memoryCheck, dbCheck] = await Promise.all([
      getJson({ url: `${baseUrl}/debug/memory` }),
      getJson({ url: `${baseUrl}/debug/db` }),
    ]);

    report.checks.debugMemory = {
      ok: memoryCheck.ok,
      status: memoryCheck.status,
      elapsedMs: memoryCheck.elapsedMs,
      pid: memoryCheck.json?.pid ?? null,
      error: memoryCheck.error ?? null,
    };

    report.checks.debugDb = {
      ok: dbCheck.ok,
      status: dbCheck.status,
      elapsedMs: dbCheck.elapsedMs,
      hasPool: !!dbCheck.json?.pool,
      error: dbCheck.error ?? null,
    };

    const [tenantBaselineResult, apiCandidatesResult] = await Promise.all([
      pool.query(queries.tenantBaseline),
      pool.query(queries.apiCandidates),
    ]);

    const tenantBaseline = tenantBaselineResult.rows[0] ?? null;
    const profiles = buildProfiles(apiCandidatesResult.rows ?? []);
    const smoke = await smokeCheckGraphql({ baseUrl, profiles });

    const healthyProfiles = smoke.filter((item) => item.ok);
    const healthyProfileKeys = new Set(healthyProfiles.map((item) => item.profileKey));
    const readyProfiles = profiles.filter((profile) => healthyProfileKeys.has(profile.key));

    report.checks.tenantBaseline = tenantBaseline;
    report.checks.routingProfiles = {
      discovered: profiles.length,
      healthy: readyProfiles.length,
      unhealthy: profiles.length - readyProfiles.length,
      smoke,
    };

    const orgCount = Number(tenantBaseline?.org_count ?? 0);
    const orgScaleReady = orgCount >= requireTenants;

    if (!runDbpmTechValidation && !orgScaleReady) {
      const msg = `tenant scale insufficient: org_count=${orgCount} < min=${requireTenants}`;
      if (enforceTenantScale) {
        report.errors.push(msg);
      } else {
        report.warnings.push(`${msg} (allow-underprovisioned enabled)`);
      }
    } else if (!orgScaleReady) {
      report.warnings.push(
        `org_count (${orgCount}) is below min-tenant-count (${requireTenants}); DBPM technical validation path will provide tenant scale gate.`,
      );
    }

    if (!report.checks.debugMemory.ok) {
      report.errors.push('/debug/memory is not reachable.');
    }
    if (!report.checks.debugDb.ok) {
      report.errors.push('/debug/db is not reachable.');
    }
    if (readyProfiles.length === 0) {
      report.errors.push('No healthy GraphQL request profile found for this server/database config.');
    }

    report.readiness.phase1AReady = report.errors.length === 0;

    await writeJson(path.join(dirs.dataDir, 'request-profiles.discovered.json'), profiles);
    await writeJson(path.join(dirs.dataDir, 'request-profiles.ready.json'), readyProfiles);

    if (runDbpmTechValidation && report.errors.length === 0) {
      const dbpmTechValidation = await runDbpmTechValidationScript();
      report.checks.dbpmTechValidation = dbpmTechValidation;

      if (!dbpmTechValidation.ok) {
        report.errors.push(
          `DBPM tech validation failed (exit=${dbpmTechValidation.code}). stderr=${dbpmTechValidation.stderr || 'none'}`,
        );
      } else if (!(await pathExists(dbTechValidationPath))) {
        report.errors.push(`DBPM tech validation report not found: ${dbTechValidationPath}`);
      } else if (!(await pathExists(businessManifestPath))) {
        report.errors.push(`Business manifest not found: ${businessManifestPath}`);
      } else {
        const dbTechPayload = JSON.parse(await fs.readFile(dbTechValidationPath, 'utf8'));
        const manifestPayload = JSON.parse(await fs.readFile(businessManifestPath, 'utf8'));
        const manifestRows = Array.isArray(manifestPayload) ? manifestPayload : [];
        const manifestTenantCount = manifestRows.length;

        report.checks.dbpmValidation = {
          reportPath: dbTechValidationPath,
          manifestPath: businessManifestPath,
          requestedTenants: Number(dbTechPayload?.summary?.requestedTenants ?? dbpmTenantCount),
          successTenants: Number(dbTechPayload?.summary?.successTenants ?? manifestTenantCount),
          failedTenants: Number(dbTechPayload?.summary?.failedTenants ?? 0),
          passed: !!dbTechPayload?.summary?.passed,
          manifestTenantCount,
          minTenantCount: requireTenants,
        };

        const dbpmScaleReady = manifestTenantCount >= requireTenants;
        report.readiness.tenantReadyForPhase2 = dbpmScaleReady;

        if (!dbpmScaleReady) {
          const msg = `DBPM manifest tenant count insufficient: manifestTenantCount=${manifestTenantCount} < min=${requireTenants}`;
          if (enforceTenantScale) {
            report.errors.push(msg);
          } else {
            report.warnings.push(`${msg} (allow-underprovisioned enabled)`);
          }
        }
      }
    }

    const hasCredentials = await pathExists(credentialsPath);
    if (!hasCredentials) {
      if (!bootstrapDefaultCredential) {
        report.errors.push(
          `Token phase requires credentials file but it does not exist: ${credentialsPath}`,
        );
      } else {
        const credentials = buildBootstrapCredentials({ readyProfiles });
        if (credentials.length === 0) {
          report.errors.push(
            'Cannot bootstrap credentials because no healthy private-header routing profile is available.',
          );
        } else {
          await writeJson(credentialsPath, credentials);
          report.warnings.push(
            `No credentials file provided; bootstrapped ${credentials.length} credential rows using default local admin credential.`,
          );
        }
      }
    }

    if (report.errors.length === 0) {
      const tokenBuild = await runTokenBuilder();
      report.checks.tokenBuild = tokenBuild;

      if (!tokenBuild.ok) {
        report.errors.push(
          `Token pool build failed (exit=${tokenBuild.code}). stderr=${tokenBuild.stderr || 'none'}`,
        );
      } else if (!(await pathExists(tokenOutputPath))) {
        report.errors.push(`Token pool output not found: ${tokenOutputPath}`);
      } else {
        const tokenPayload = JSON.parse(await fs.readFile(tokenOutputPath, 'utf8'));
        const profilesFromToken = Array.isArray(tokenPayload?.profiles) ? tokenPayload.profiles : [];
        const distinctTenantKeys = new Set(
          profilesFromToken.map((row) => row.tenantKey || row.key).filter(Boolean),
        );

        const successCount = Number(tokenPayload?.successCount ?? profilesFromToken.length);
        const failureCount = Number(tokenPayload?.failureCount ?? 0);

        report.checks.tokenPool = {
          credentialsPath,
          outputPath: tokenOutputPath,
          successCount,
          failureCount,
          distinctTenantKeys: distinctTenantKeys.size,
          minTokenTenants,
          recommendedTokenTenants,
        };

        report.readiness.tenantReadyForPhase2 = distinctTenantKeys.size >= requireTenants;

        if (successCount <= 0) {
          report.errors.push('Token pool generated zero usable token profiles.');
        }

        if (distinctTenantKeys.size < minTokenTenants) {
          report.errors.push(
            `Token coverage insufficient: distinctTenantKeys=${distinctTenantKeys.size} < minTokenTenants=${minTokenTenants}`,
          );
        }

        if (distinctTenantKeys.size < recommendedTokenTenants) {
          report.warnings.push(
            `Token coverage is below recommended scale: distinctTenantKeys=${distinctTenantKeys.size}, recommended=${recommendedTokenTenants}`,
          );
        }

        if (failureCount > 0) {
          report.warnings.push(
            `Token pool had partial credential failures: failureCount=${failureCount}.`,
          );
        }

        phase1BReady = report.errors.length === 0;

        if (phase1BReady) {
          const keyspaceBuild = await runKeyspaceBuilder();
          report.checks.keyspaceBuild = keyspaceBuild;

          if (!keyspaceBuild.ok) {
            report.errors.push(
              `Keyspace build failed (exit=${keyspaceBuild.code}). stderr=${keyspaceBuild.stderr || 'none'}`,
            );
          } else if (!(await pathExists(keyspaceOutputPath))) {
            report.errors.push(`Keyspace output not found: ${keyspaceOutputPath}`);
          } else {
            const keyspacePayload = JSON.parse(await fs.readFile(keyspaceOutputPath, 'utf8'));
            const selectedRouteKeys = Number(
              keyspacePayload?.selectedRouteKeys ?? keyspacePayload?.selectedRoutes?.length ?? 0,
            );
            const totalOutputProfiles = Number(
              keyspacePayload?.totalOutputProfiles ?? keyspacePayload?.profiles?.length ?? 0,
            );
            const totalInputProfiles = Number(
              keyspacePayload?.totalInputProfiles ?? profilesFromToken.length,
            );

            report.checks.keyspace = {
              inputPath: tokenOutputPath,
              outputPath: keyspaceOutputPath,
              mode: keyspaceMode,
              targetRouteKeys: keyspaceTargetRouteKeys,
              minRouteKeys: keyspaceMinRouteKeys,
              selectedRouteKeys,
              totalInputProfiles,
              totalOutputProfiles,
              noSmokeCheck: keyspaceNoSmokeCheck,
            };

            if (selectedRouteKeys < keyspaceMinRouteKeys) {
              report.errors.push(
                `Keyspace coverage insufficient: selectedRouteKeys=${selectedRouteKeys} < minRouteKeys=${keyspaceMinRouteKeys}`,
              );
            }

            if (totalOutputProfiles <= 0) {
              report.errors.push('Keyspace builder produced zero output profiles.');
            }

            if (selectedRouteKeys < keyspaceTargetRouteKeys) {
              report.warnings.push(
                `Keyspace route keys below target: selected=${selectedRouteKeys}, target=${keyspaceTargetRouteKeys}`,
              );
            }

            const businessProfilesBuild = await runBusinessProfileBuilder();
            report.checks.businessProfilesBuild = businessProfilesBuild;

            if (!businessProfilesBuild.ok) {
              report.errors.push(
                `Business op profile build failed (exit=${businessProfilesBuild.code}). stderr=${businessProfilesBuild.stderr || 'none'}`,
              );
            } else if (!(await pathExists(businessProfilesOutputPath))) {
              report.errors.push(`Business op profile output not found: ${businessProfilesOutputPath}`);
            } else {
              const businessPayload = JSON.parse(
                await fs.readFile(businessProfilesOutputPath, 'utf8'),
              );
              const businessProfiles = Array.isArray(businessPayload?.profiles)
                ? businessPayload.profiles
                : [];
              const businessTenantKeys = new Set(
                businessProfiles.map((profile) => profile.tenantKey || profile.key).filter(Boolean),
              );

              report.checks.businessProfiles = {
                outputPath: businessProfilesOutputPath,
                successCount: Number(businessPayload?.successCount ?? businessProfiles.length),
                failureCount: Number(businessPayload?.failureCount ?? 0),
                distinctTenantKeys: businessTenantKeys.size,
              };

              if (businessProfiles.length === 0) {
                report.errors.push('Business op profile builder produced zero profiles.');
              }
            }
          }
        }
      }
    }

    phase1CReady = report.errors.length === 0 && !!report.checks.keyspace?.outputPath;
    report.readiness.phase1BReady = phase1BReady;
    report.readiness.phase1CReady = phase1CReady;
    report.readiness.phase1Ready =
      report.readiness.phase1AReady &&
      report.readiness.phase1BReady &&
      report.readiness.phase1CReady;

    await writeJson(path.join(dirs.reportsDir, 'preflight.json'), report);

    const summary = {
      runDir,
      phase1AReady: report.readiness.phase1AReady,
      phase1BReady: report.readiness.phase1BReady,
      phase1CReady: report.readiness.phase1CReady,
      phase1Ready: report.readiness.phase1Ready,
      tenantReadyForPhase2: report.readiness.tenantReadyForPhase2,
      discoveredProfiles: report.checks.routingProfiles?.discovered ?? 0,
      healthyProfiles: report.checks.routingProfiles?.healthy ?? 0,
      tokenSuccessCount: report.checks.tokenPool?.successCount ?? 0,
      tokenDistinctTenants: report.checks.tokenPool?.distinctTenantKeys ?? 0,
      keyspaceRouteKeys: report.checks.keyspace?.selectedRouteKeys ?? 0,
      keyspaceOutputProfiles: report.checks.keyspace?.totalOutputProfiles ?? 0,
      warnings: report.warnings.length,
      errors: report.errors.length,
    };

    console.log(JSON.stringify(summary, null, 2));

    if (!report.readiness.phase1Ready) {
      process.exit(2);
    }
    if (enforceTenantScale && !report.readiness.tenantReadyForPhase2) {
      process.exit(3);
    }
  } finally {
    await pool.end();
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
