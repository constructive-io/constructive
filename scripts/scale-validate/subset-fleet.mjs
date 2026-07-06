#!/usr/bin/env node
// =============================================================================
// subset-fleet.mjs — derive ramp-specific fleet manifests from fleet.json +
// drifted.json (V2 limits discovery).
//
// Blueprint groups: group 0 = undrifted tenants (majority blueprint; includes
// column-drift tenants — same relname set => same blueprint), groups 1..K =
// drift_marker_g<g> table-drift groups from drift-tenants.mjs.
//
// Modes:
//   --blueprints K --per-blueprint N   diversity subset: first K groups
//                                      (0,1,2,...), N tenants from each →
//                                      K distinct blueprints, K*N tenants.
//   --tenants N                        tenant-count subset: N undrifted
//                                      (group-0) tenants → 1 blueprint.
//
// Usage:
//   node scripts/scale-validate/subset-fleet.mjs --fleet fleet.json \
//     --drifted drifted.json --blueprints 3 --per-blueprint 5 --out out/fleet-k3.json
//   node scripts/scale-validate/subset-fleet.mjs --fleet fleet.json \
//     --drifted drifted.json --tenants 50 --out out/fleet-t50.json
// =============================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : dflt;
};

const FLEET = path.resolve(__dirname, arg('fleet', 'fleet.json'));
const DRIFTED = path.resolve(__dirname, arg('drifted', 'drifted.json'));
const BLUEPRINTS = parseInt(arg('blueprints', '0'), 10);
const PER_BLUEPRINT = parseInt(arg('per-blueprint', '5'), 10);
const TENANTS = parseInt(arg('tenants', '0'), 10);
const OUT = path.resolve(__dirname, arg('out', ''));
if (!OUT || OUT === __dirname) {
  console.error('--out is required');
  process.exit(1);
}

const fleet = JSON.parse(fs.readFileSync(FLEET, 'utf8'));
const drifted = JSON.parse(fs.readFileSync(DRIFTED, 'utf8'));
const all = fleet.tenants;
const byName = new Map(all.map((t) => [t.dbname, t]));

const driftedNames = new Set();
for (const names of Object.values(drifted.groups || {})) names.forEach((n) => driftedNames.add(n));

// group 0 = the KNOWN-identical blueprint pool, minus table-drifted tenants.
// Factory tenants are clones of marketplace_db_tenant1 (fingerprint-validated);
// other seeder tenants (tenant2...) have DIVERGENT shapes — never group 0.
// Column-drift tenants keep their relname set => still the same blueprint.
const SAME_BP_RE = new RegExp(arg('same-bp-regex', '^(factory[0-9]+|marketplace_db_tenant1)$'));
const group0 = all
  .filter((t) => SAME_BP_RE.test(t.dbname) && !driftedNames.has(t.dbname))
  .map((t) => t.dbname);
const groups = [group0];
for (const g of Object.keys(drifted.groups || {}).sort((a, b) => Number(a) - Number(b))) {
  groups.push(drifted.groups[g]);
}

let picked = [];
let label = '';
if (BLUEPRINTS > 0) {
  if (BLUEPRINTS > groups.length) {
    console.error(`only ${groups.length} blueprint groups available, asked for ${BLUEPRINTS}`);
    process.exit(1);
  }
  for (let k = 0; k < BLUEPRINTS; k++) {
    const take = groups[k].slice(0, PER_BLUEPRINT);
    if (take.length < PER_BLUEPRINT)
      console.error(`warn: group ${k} has only ${take.length}/${PER_BLUEPRINT} tenants`);
    picked.push(...take);
  }
  label = `diversity k=${BLUEPRINTS} per=${PER_BLUEPRINT}`;
} else if (TENANTS > 0) {
  picked = group0.slice(0, TENANTS);
  if (picked.length < TENANTS)
    console.error(`warn: only ${picked.length}/${TENANTS} undrifted tenants available`);
  label = `tenant-count n=${picked.length} (single blueprint)`;
} else {
  console.error('one of --blueprints or --tenants is required');
  process.exit(1);
}

const tenants = picked.map((n) => byName.get(n)).filter(Boolean);
const missing = picked.filter((n) => !byName.has(n));
if (missing.length) console.error(`warn: ${missing.length} drifted names not in fleet: ${missing.join(',')}`);

const manifest = {
  generatedAt: new Date().toISOString(),
  derivedFrom: FLEET,
  subset: label,
  count: tenants.length,
  tenants
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(manifest) + '\n');
console.log(`[subset] ${label}: ${tenants.length} tenants -> ${OUT}`);
