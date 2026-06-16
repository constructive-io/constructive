import { Pool } from 'pg';

const quoteIdent = (value) => `"${String(value).replace(/"/g, '""')}"`;
const quoteIdentOrNull = (value) => {
  const text = String(value ?? '').trim();
  return text.length > 0 ? quoteIdent(text) : null;
};

const POLICY_NAMES = {
  select: 'perf_load_public_select',
  insert: 'perf_load_public_insert',
  update: 'perf_load_public_update',
};

export const extractProfiles = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.profiles)) return payload.profiles;
  return [];
};

export const buildTargetsFromProfiles = (profiles) => {
  const dedupe = new Map();

  for (const profile of profiles) {
    const schemaName = profile?.table?.physicalSchema;
    const tableName = profile?.table?.tableName;
    if (!schemaName || !tableName) continue;
    dedupe.set(`${schemaName}.${tableName}`, {
      schemaName,
      tableName,
      databaseId: profile?.table?.databaseId ?? null,
      profileKey: profile?.key ?? null,
    });
  }

  return [...dedupe.values()].sort((a, b) =>
    `${a.schemaName}.${a.tableName}`.localeCompare(`${b.schemaName}.${b.tableName}`),
  );
};

export const getUnsafeTargets = (targets) =>
  targets.filter((target) => !target.schemaName.startsWith('perf-'));

export const ensurePublicAccessForTargets = async ({
  targets,
  pgConfig,
  dryRun = false,
  publicRole = 'authenticated',
  publicReadRole = 'anonymous',
}) => {
  const prepared = [];
  const failures = [];

  if (!Array.isArray(targets) || targets.length === 0) {
    return { prepared, failures };
  }

  if (dryRun) {
    for (const target of targets) {
      prepared.push({
        ...target,
        dryRun: true,
        publicRole,
        publicReadRole,
        rlsEnabled: null,
        createdPolicies: [],
      });
    }
    return { prepared, failures };
  }

  const pool = new Pool(pgConfig);
  try {
    for (const target of targets) {
      try {
        const schemaIdent = quoteIdent(target.schemaName);
        const tableIdent = quoteIdent(target.tableName);
        const qualified = `${schemaIdent}.${tableIdent}`;
        const publicRoleIdent = quoteIdent(publicRole);
        const publicReadRoleIdent = quoteIdentOrNull(publicReadRole);

        const accessSql = [
          `grant usage on schema ${schemaIdent} to ${publicRoleIdent};`,
          publicReadRoleIdent ? `grant usage on schema ${schemaIdent} to ${publicReadRoleIdent};` : null,
          `grant select, insert, update, delete on table ${qualified} to ${publicRoleIdent};`,
          publicReadRoleIdent ? `grant select on table ${qualified} to ${publicReadRoleIdent};` : null,
        ].filter(Boolean);

        for (const sql of accessSql) {
          await pool.query(sql);
        }

        const rlsResult = await pool.query(
          `
            select c.relrowsecurity as rls_enabled
            from pg_class c
            join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = $1 and c.relname = $2
          `,
          [target.schemaName, target.tableName],
        );
        const rlsEnabled = Boolean(rlsResult.rows?.[0]?.rls_enabled);

        const createdPolicies = [];
        if (rlsEnabled) {
          const policyResult = await pool.query(
            `
              select policyname
              from pg_policies
              where schemaname = $1
                and tablename = $2
            `,
            [target.schemaName, target.tableName],
          );
          const existingPolicies = new Set(policyResult.rows?.map((row) => row.policyname));

          const maybeCreatePolicy = async (name, sql) => {
            if (existingPolicies.has(name)) return;
            await pool.query(sql);
            createdPolicies.push(name);
          };

          await maybeCreatePolicy(
            POLICY_NAMES.select,
            `create policy ${quoteIdent(POLICY_NAMES.select)} on ${qualified} for select to ${publicRoleIdent} using (true);`,
          );
          await maybeCreatePolicy(
            POLICY_NAMES.insert,
            `create policy ${quoteIdent(POLICY_NAMES.insert)} on ${qualified} for insert to ${publicRoleIdent} with check (true);`,
          );
          await maybeCreatePolicy(
            POLICY_NAMES.update,
            `create policy ${quoteIdent(POLICY_NAMES.update)} on ${qualified} for update to ${publicRoleIdent} using (true) with check (true);`,
          );
        }

        prepared.push({
          ...target,
          dryRun: false,
          publicRole,
          publicReadRole,
          rlsEnabled,
          createdPolicies,
        });
      } catch (error) {
        failures.push({
          ...target,
          phase: 'ensurePublicAccess',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } finally {
    await pool.end();
  }

  return { prepared, failures };
};
