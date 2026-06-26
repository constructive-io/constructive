import { Pool } from 'pg';
import type { PgConfig } from './pg';

export interface BusinessProfile {
  key?: string;
  table?: {
    physicalSchema?: string;
    tableName?: string;
    databaseId?: string;
  };
}

export interface PublicAccessTarget {
  schemaName: string;
  tableName: string;
  databaseId?: string | null;
  profileKey?: string | null;
}

export interface PublicAccessPrepared extends PublicAccessTarget {
  dryRun: boolean;
  publicRole: string;
  publicReadRole?: string | null;
  rlsEnabled: boolean | null;
  createdPolicies: string[];
}

export interface PublicAccessFailure extends PublicAccessTarget {
  phase: string;
  error: string;
  sql?: string;
}

const POLICY_NAMES = {
  select: 'perf_load_public_select',
  insert: 'perf_load_public_insert',
  update: 'perf_load_public_update',
};

export function quoteIdent(value: unknown): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function quoteIdentOrNull(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return text.length > 0 ? quoteIdent(text) : null;
}

function policySuffixForRole(role: string): string {
  const suffix = String(role ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return suffix || 'role';
}

function policyNamesForRole(role: string): typeof POLICY_NAMES {
  const suffix = policySuffixForRole(role);
  return {
    select: `${POLICY_NAMES.select}_${suffix}`,
    insert: `${POLICY_NAMES.insert}_${suffix}`,
    update: `${POLICY_NAMES.update}_${suffix}`,
  };
}

export function extractProfiles(payload: unknown): BusinessProfile[] {
  if (Array.isArray(payload)) return payload as BusinessProfile[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { profiles?: unknown }).profiles)) {
    return (payload as { profiles: BusinessProfile[] }).profiles;
  }
  return [];
}

export function buildTargetsFromProfiles(profiles: BusinessProfile[]): PublicAccessTarget[] {
  const dedupe = new Map<string, PublicAccessTarget>();

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
}

export function getUnsafeTargets(targets: PublicAccessTarget[]): PublicAccessTarget[] {
  return targets.filter((target) => !target.schemaName.startsWith('perf-'));
}

export async function ensurePublicAccessForTargets({
  targets,
  pgConfig,
  dryRun = false,
  publicRole = 'authenticated',
  publicReadRole = 'anonymous',
}: {
  targets: PublicAccessTarget[];
  pgConfig: PgConfig;
  dryRun?: boolean;
  publicRole?: string;
  publicReadRole?: string;
}): Promise<{ prepared: PublicAccessPrepared[]; failures: PublicAccessFailure[] }> {
  const prepared: PublicAccessPrepared[] = [];
  const failures: PublicAccessFailure[] = [];

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
        ].filter((sql): sql is string => Boolean(sql));

        for (const sql of accessSql) {
          await pool.query(sql);
        }

        const rlsResult = await pool.query<{ rls_enabled: boolean }>(
          `
            select c.relrowsecurity as rls_enabled
            from pg_class c
            join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = $1 and c.relname = $2
          `,
          [target.schemaName, target.tableName],
        );
        const rlsEnabled = Boolean(rlsResult.rows?.[0]?.rls_enabled);
        const createdPolicies: string[] = [];

        if (rlsEnabled) {
          const policyNames = policyNamesForRole(publicRole);
          const policyResult = await pool.query<{ policyname: string }>(
            `
              select policyname
              from pg_policies
              where schemaname = $1
                and tablename = $2
            `,
            [target.schemaName, target.tableName],
          );
          const existingPolicies = new Set(policyResult.rows?.map((row) => row.policyname));

          const maybeCreatePolicy = async (name: string, sql: string) => {
            if (existingPolicies.has(name)) return;
            await pool.query(sql);
            createdPolicies.push(name);
          };

          await maybeCreatePolicy(
            policyNames.select,
            `create policy ${quoteIdent(policyNames.select)} on ${qualified} for select to ${publicRoleIdent} using (true);`,
          );
          await maybeCreatePolicy(
            policyNames.insert,
            `create policy ${quoteIdent(policyNames.insert)} on ${qualified} for insert to ${publicRoleIdent} with check (true);`,
          );
          await maybeCreatePolicy(
            policyNames.update,
            `create policy ${quoteIdent(policyNames.update)} on ${qualified} for update to ${publicRoleIdent} using (true) with check (true);`,
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
}
