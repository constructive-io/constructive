/**
 * `fleet` command group — provision / discover / drift / canary / subset /
 * teardown the perf tenant fleet.
 *
 * Each subcommand delegates to a `src/fleet/*` module, except `subset`, whose
 * pure algorithm lives in `core/fleetfile.buildSubset`; the CLI glue (read
 * --fleet + --drifted, write --out) is implemented inline here.
 */
import fs from 'node:fs';
import path from 'node:path';

import { Argv, asBool, asInt, usageExit } from '../core/args';
import { buildSubset, loadFleet, SubsetOpts } from '../core/fleetfile';
import * as canary from '../fleet/canary';
import * as discover from '../fleet/discover';
import * as drift from '../fleet/drift';
import * as provision from '../fleet/provision';
import * as teardown from '../fleet/teardown';

export const domain = 'fleet';
export const summary = 'discover / provision / drift / canary / subset / teardown the perf tenant fleet';

export interface Subcommand {
  usage: string;
  run(argv: Argv): Promise<number>;
}

const SUBSET_USAGE = `perf-harness fleet subset — derive a ramp-specific fleet manifest from a fleet + drift assignment

Options:
  --fleet <file>         fleet manifest from \`fleet discover\` (required)
  --drifted <file>       drift assignment from \`fleet drift\` (optional)
  --out <file>           write the subset manifest here (required)
  --blueprints <K>       diversity subset: first K blueprint groups
  --per-blueprint <N>    tenants per blueprint group (default: 5)
  --tenants <N>          tenant-count subset: N group-0 tenants (single blueprint)
  --same-bp-regex <re>   group-0 membership regex (default: ^(factory[0-9]+|marketplace_db_tenant1)$)
  --help
`;

async function runSubset(argv: Argv): Promise<number> {
  if (asBool(argv.help)) return usageExit(SUBSET_USAGE, 0);

  const fleetFile = typeof argv.fleet === 'string' ? argv.fleet : null;
  const out = typeof argv.out === 'string' ? argv.out : null;
  if (!fleetFile) {
    console.error('--fleet is required');
    return 1;
  }
  if (!out) {
    console.error('--out is required');
    return 1;
  }

  try {
    const fleet = loadFleet(fleetFile).tenants;
    const drifted =
      typeof argv.drifted === 'string'
        ? JSON.parse(fs.readFileSync(argv.drifted, 'utf8'))
        : { groups: {}, columnDrift: [] };
    const o: SubsetOpts = {
      blueprints: asInt(argv.blueprints, 0),
      perBlueprint: asInt(argv['per-blueprint'], 5),
      tenants: asInt(argv.tenants, 0),
      sameBpRegex: typeof argv['same-bp-regex'] === 'string' ? argv['same-bp-regex'] : undefined
    };

    const { subset, tenants, warnings } = buildSubset(fleet, drifted, o);
    for (const w of warnings) console.error(w);

    // Preserve the original subset-fleet.mjs manifest shape (adds `derivedFrom`,
    // which core/fleetfile.buildSubset omits).
    const manifest = {
      generatedAt: subset.generatedAt,
      derivedFrom: fleetFile,
      subset: subset.subset,
      count: subset.count,
      tenants: subset.tenants
    };

    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(manifest) + '\n');
    console.error(`[subset] ${subset.subset}: ${tenants.length} tenants -> ${out}`);
    return 0;
  } catch (err: any) {
    console.error(String((err && err.message) || err));
    return 1;
  }
}

// Concise one-line synopses for the composed domain-level help listing; each
// subcommand's own `--help` prints its fuller USAGE (via its `run`).
export const subcommands: Record<string, Subcommand> = {
  discover: {
    usage: "fleet discover [--like '%'] [--out fleet.json] [--pretty] [--pg-* ...]",
    run: discover.run
  },
  provision: {
    usage:
      'fleet provision [--count 1] [--prefix factory] [--blueprint marketplace] [--concurrency 1] [--dry-run] [--validate <db>] [--pg-* ...]',
    run: provision.run
  },
  drift: {
    usage: 'fleet drift [--groups K] [--per-group 4] [--column-drift N] [--out <f>] [--pg-* ...]',
    run: drift.run
  },
  canary: {
    usage: 'fleet canary --fleet <file> [--table categories] [--cleanup] [--pg-* ...]',
    run: canary.run
  },
  subset: {
    usage:
      'fleet subset --fleet <file> --out <file> [--drifted <file>] [--blueprints K --per-blueprint N | --tenants N] [--same-bp-regex <re>]',
    run: runSubset
  },
  teardown: {
    usage: 'fleet teardown [--prefix factory] [--keep 40] [--only <db>] [--dry-run] [--pg-* ...]',
    run: teardown.run
  }
};
