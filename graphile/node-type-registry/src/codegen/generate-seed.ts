/**
 * Generate SQL seed scripts from TypeScript node type definitions.
 *
 * Uses pgsql-deparser to produce individual INSERT statements per node type,
 * suitable for use as separate pgpm migration files.
 *
 * Usage:
 *   npx ts-node src/codegen/generate-seed.ts [--outdir <dir>] [--single] [--pgpm <dir>]
 *
 *   --outdir <dir>   Directory to write individual SQL files (default: stdout)
 *   --single         Emit a single combined seed.sql instead of per-node files
 *   --pgpm <dir>     Generate deploy/revert/verify files in pgpm package layout.
 *                     <dir> is the pgpm package root (e.g. packages/metaschema).
 *                     Files are written relative to this root at:
 *                       deploy/schemas/metaschema_public/tables/node_type_registry/data/seed.sql
 *                       revert/schemas/metaschema_public/tables/node_type_registry/data/seed.sql
 *                       verify/schemas/metaschema_public/tables/node_type_registry/data/seed.sql
 *
 * Examples:
 *   # Print all INSERT statements to stdout
 *   npx ts-node src/codegen/generate-seed.ts
 *
 *   # Generate individual migration files
 *   npx ts-node src/codegen/generate-seed.ts --outdir ./deploy/seed
 *
 *   # Generate a single combined seed file
 *   npx ts-node src/codegen/generate-seed.ts --single --outdir ./deploy
 *
 *   # Generate pgpm deploy/revert/verify files
 *   npx ts-node src/codegen/generate-seed.ts --pgpm ../../constructive-db/packages/metaschema
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { deparse } from 'pgsql-deparser';
import { ast, nodes } from '@pgsql/utils';
import type { Node } from '@pgsql/types';
import { allNodeTypes } from '../index';
import type { NodeTypeDefinition } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIGRATION_PATH =
  'schemas/metaschema_public/tables/node_type_registry/data/seed';

// ---------------------------------------------------------------------------
// AST helpers
// ---------------------------------------------------------------------------

const astr = (val: string): Node =>
  nodes.aConst({ sval: ast.string({ sval: val }) });

const makeCast = (arg: Node, typeName: string): Node => ({
  TypeCast: {
    arg,
    typeName: {
      names: [{ String: { sval: typeName } }],
      typemod: -1,
    },
  },
});

const makeArrayExpr = (elements: Node[]): Node => ({
  A_ArrayExpr: { elements },
});

// ---------------------------------------------------------------------------
// Build a single INSERT statement for one node type
// ---------------------------------------------------------------------------

function buildInsertStmt(nt: NodeTypeDefinition): Node {
  const cols = [
    'name',
    'slug',
    'category',
    'display_name',
    'description',
    'parameter_schema',
    'tags',
  ];

  const vals: Node[] = [
    astr(nt.name),
    astr(nt.slug),
    astr(nt.category),
    astr(nt.display_name),
    astr(nt.description),
    makeCast(astr(JSON.stringify(nt.parameter_schema)), 'jsonb'),
    makeArrayExpr(nt.tags.map((t) => astr(t))),
  ];

  return {
    RawStmt: {
      stmt: {
        InsertStmt: {
          relation: {
            schemaname: 'metaschema_public',
            relname: 'node_type_registry',
            inh: true,
            relpersistence: 'p',
          },
          cols: cols.map((name) => nodes.resTarget({ name })),
          selectStmt: {
            SelectStmt: {
              valuesLists: [
                {
                  List: { items: vals },
                },
              ],
              op: 'SETOP_NONE',
              limitOption: 'LIMIT_OPTION_DEFAULT',
            },
          },
          onConflictClause: {
            action: 'ONCONFLICT_NOTHING',
            infer: {
              indexElems: [
                {
                  IndexElem: {
                    name: 'slug',
                    ordering: 'SORTBY_DEFAULT',
                    nulls_ordering: 'SORTBY_NULLS_DEFAULT',
                  },
                },
              ],
            },
          },
          override: 'OVERRIDING_NOT_SET',
        },
      },
      stmt_len: 1,
    },
  };
}

// ---------------------------------------------------------------------------
// pgpm file generators
// ---------------------------------------------------------------------------

async function buildDeploySql(): Promise<string> {
  const header = [
    `-- Deploy ${MIGRATION_PATH} to pg`,
    '',
    '-- requires: schemas/metaschema_public/tables/node_type_registry/table',
    '',
    'BEGIN;',
    '',
  ].join('\n');

  const stmts = allNodeTypes.map(buildInsertStmt);
  const body = await deparse(stmts);

  return header + body + '\n\nCOMMIT;\n';
}

function buildRevertSql(): string {
  const names = allNodeTypes.map((nt) => `    '${nt.name}'`);

  // Wrap names at ~4 per line for readability
  const chunks: string[] = [];
  for (let i = 0; i < names.length; i += 4) {
    chunks.push(names.slice(i, i + 4).join(', '));
  }

  return [
    `-- Revert ${MIGRATION_PATH} from pg`,
    '',
    'BEGIN;',
    '',
    'DELETE FROM metaschema_public.node_type_registry',
    'WHERE name IN (',
    chunks.join(',\n'),
    ');',
    '',
    'COMMIT;',
    '',
  ].join('\n');
}

function buildVerifySql(): string {
  // Pick one representative from each category
  const categories = new Map<string, NodeTypeDefinition>();
  for (const nt of allNodeTypes) {
    if (!categories.has(nt.category)) {
      categories.set(nt.category, nt);
    }
  }

  const checks = Array.from(categories.values()).map(
    (nt) =>
      `SELECT 1 FROM metaschema_public.node_type_registry WHERE name = '${nt.name}';`
  );

  return [
    `-- Verify ${MIGRATION_PATH} on pg`,
    '',
    'BEGIN;',
    '',
    ...checks,
    '',
    'ROLLBACK;',
    '',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// File writer helper
// ---------------------------------------------------------------------------

function writeFile(filePath: string, content: string): void {
  const dir = join(filePath, '..');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, content);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const outdirIdx = args.indexOf('--outdir');
  const outdir = outdirIdx !== -1 ? args[outdirIdx + 1] : undefined;
  const single = args.includes('--single');
  const pgpmIdx = args.indexOf('--pgpm');
  const pgpmRoot = pgpmIdx !== -1 ? args[pgpmIdx + 1] : undefined;

  // --pgpm mode: generate deploy/revert/verify in pgpm package layout
  if (pgpmRoot) {
    const relPath = 'schemas/metaschema_public/tables/node_type_registry/data/seed.sql';

    const deployPath = join(pgpmRoot, 'deploy', relPath);
    const revertPath = join(pgpmRoot, 'revert', relPath);
    const verifyPath = join(pgpmRoot, 'verify', relPath);

    writeFile(deployPath, await buildDeploySql());
    writeFile(revertPath, buildRevertSql());
    writeFile(verifyPath, buildVerifySql());

    console.log(`Wrote ${allNodeTypes.length} node types to pgpm layout:`);
    console.log(`  deploy: ${deployPath}`);
    console.log(`  revert: ${revertPath}`);
    console.log(`  verify: ${verifyPath}`);
    return;
  }

  if (single) {
    // Emit all INSERT statements as a single SQL string
    const stmts = allNodeTypes.map(buildInsertStmt);
    const sql = await deparse(stmts);
    if (outdir) {
      if (!existsSync(outdir)) mkdirSync(outdir, { recursive: true });
      writeFileSync(join(outdir, 'seed.sql'), sql + '\n');
      console.log(`Wrote ${allNodeTypes.length} node types to ${join(outdir, 'seed.sql')}`);
    } else {
      process.stdout.write(sql + '\n');
    }
    return;
  }

  // Emit individual SQL files per node type
  const stmts = await Promise.all(
    allNodeTypes.map(async (nt) => ({
      nt,
      sql: await deparse([buildInsertStmt(nt)]),
    }))
  );

  if (outdir) {
    if (!existsSync(outdir)) mkdirSync(outdir, { recursive: true });
    for (const { nt, sql } of stmts) {
      const filename = `${nt.slug}.sql`;
      writeFileSync(join(outdir, filename), sql + '\n');
    }
    console.log(`Wrote ${stmts.length} individual migration files to ${outdir}/`);
  } else {
    for (const { nt, sql } of stmts) {
      console.log(`-- ${nt.name} (${nt.slug})`);
      console.log(sql + ';\n');
    }
  }
}

main();
