/**
 * Fleet manifest loading + canary naming + the pure subset algorithm.
 *
 * `loadFleet`, `CANARY_PREFIX`, `canaryName` port from
 * `scripts/scale-validate/_lib.mjs`; `buildSubset` is the pure core of
 * `scripts/scale-validate/subset-fleet.mjs` (file IO / process.exit stripped —
 * hard errors throw, soft conditions are collected into `warnings`).
 */
import fs from 'node:fs';

export interface Tenant {
  dbname: string;
  databaseId?: string;
  apiHost?: string;
  authHost?: string;
  schemas?: string[];
  appPublicSchema?: string;
}

export function loadFleet(file: string): { manifest: any; tenants: Tenant[] } {
  const raw = fs.readFileSync(file, 'utf8');
  const parsed = JSON.parse(raw);
  const tenants = Array.isArray(parsed) ? parsed : parsed.tenants;
  if (!Array.isArray(tenants) || tenants.length === 0) {
    throw new Error(`fleet file ${file} has no tenants`);
  }
  return { manifest: parsed, tenants };
}

// The token used inside CANARY-<token> rows. MUST match between the canary
// seeder and the harness sentinel so bleed can be attributed to a foreign
// tenant. Token == tenant.dbname.
export const CANARY_PREFIX = 'CANARY-';

export function canaryName(t: Tenant): string {
  return `${CANARY_PREFIX}${t.dbname}`;
}

export interface SubsetOpts {
  blueprints?: number;
  perBlueprint?: number;
  tenants?: number;
  sameBpRegex?: string;
}

// Blueprint groups: group 0 = the KNOWN-identical blueprint pool (matches
// sameBpRegex, minus table-drifted tenants; column-drift tenants keep their
// relname set so they STAY in group 0), groups 1..K = drift-marker groups.
//
// Modes:
//   blueprints=K, perBlueprint=N  -> diversity subset: first K groups, N each.
//   tenants=N                     -> tenant-count subset: N group-0 tenants.
export function buildSubset(
  fleet: Tenant[],
  drifted: { groups?: Record<string, string[]>; columnDrift?: string[] },
  o: SubsetOpts
): { subset: any; tenants: Tenant[]; warnings: string[] } {
  const warnings: string[] = [];
  const blueprints = o.blueprints ?? 0;
  const perBlueprint = o.perBlueprint ?? 5;
  const tenantCount = o.tenants ?? 0;
  const sameBpRe = new RegExp(o.sameBpRegex || '^(factory[0-9]+|marketplace_db_tenant1)$');

  const all = fleet;
  const byName = new Map(all.map((t) => [t.dbname, t]));

  const driftGroups = (drifted && drifted.groups) || {};
  const driftedNames = new Set<string>();
  for (const names of Object.values(driftGroups)) names.forEach((n) => driftedNames.add(n));

  const group0 = all
    .filter((t) => sameBpRe.test(t.dbname) && !driftedNames.has(t.dbname))
    .map((t) => t.dbname);
  const groups: string[][] = [group0];
  for (const g of Object.keys(driftGroups).sort((a, b) => Number(a) - Number(b))) {
    groups.push(driftGroups[g]);
  }

  let picked: string[] = [];
  let label = '';
  if (blueprints > 0) {
    if (blueprints > groups.length) {
      throw new Error(`only ${groups.length} blueprint groups available, asked for ${blueprints}`);
    }
    for (let k = 0; k < blueprints; k++) {
      const take = groups[k].slice(0, perBlueprint);
      if (take.length < perBlueprint) {
        warnings.push(`warn: group ${k} has only ${take.length}/${perBlueprint} tenants`);
      }
      picked.push(...take);
    }
    label = `diversity k=${blueprints} per=${perBlueprint}`;
  } else if (tenantCount > 0) {
    picked = group0.slice(0, tenantCount);
    if (picked.length < tenantCount) {
      warnings.push(`warn: only ${picked.length}/${tenantCount} undrifted tenants available`);
    }
    label = `tenant-count n=${picked.length} (single blueprint)`;
  } else {
    throw new Error('one of --blueprints or --tenants is required');
  }

  const tenants = picked.map((n) => byName.get(n)).filter(Boolean) as Tenant[];
  const missing = picked.filter((n) => !byName.has(n));
  if (missing.length) {
    warnings.push(`warn: ${missing.length} drifted names not in fleet: ${missing.join(',')}`);
  }

  const subset = {
    generatedAt: new Date().toISOString(),
    subset: label,
    count: tenants.length,
    tenants
  };
  return { subset, tenants, warnings };
}
