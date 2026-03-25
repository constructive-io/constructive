/**
 * Generate SQL seed scripts from TypeScript node type definitions.
 *
 * Uses pgsql-deparser to produce individual INSERT statements per node type,
 * suitable for use as separate pgpm migration files.
 *
 * Usage:
 *   npx ts-node src/codegen/generate-seed.ts [--outdir <dir>] [--single]
 *
 *   --outdir <dir>   Directory to write individual SQL files (default: stdout)
 *   --single         Emit a single combined seed.sql instead of per-node files
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
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { deparse } from 'pgsql-deparser';
import { ast, nodes } from '@pgsql/utils';
import type { Node } from '@pgsql/types';
import { allNodeTypes } from '../index';
import type { NodeTypeDefinition } from '../types';

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
// CLI
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const outdirIdx = args.indexOf('--outdir');
  const outdir = outdirIdx !== -1 ? args[outdirIdx + 1] : undefined;
  const single = args.includes('--single');

  if (single) {
    // Emit all INSERT statements as a single SQL string
    const stmts = allNodeTypes.map(buildInsertStmt);
    const sql = deparse(stmts);
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
  const stmts = allNodeTypes.map((nt) => ({
    nt,
    sql: deparse([buildInsertStmt(nt)]),
  }));

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
