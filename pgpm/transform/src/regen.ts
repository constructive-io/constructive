/**
 * Regeneration driver: derive revert/verify scripts for a single pgpm
 * change from its deploy SQL.
 *
 * Deploy scripts are classified into statement facts (`classifyStatements`)
 * and fed through `revertFor`/`verifyFor` from `@pgsql/scripts`: revert is
 * the mechanical inverses in reverse topological order, verify is one
 * raise-on-failure existence check per created object. Transaction control
 * statements (the BEGIN/COMMIT wrapper some modules carry inside their
 * scripts) are excluded before classification — the caller owns the wrapper.
 *
 * Requires `loadModule()` from `plpgsql-parser` to have completed.
 */
import type { GeneratedScript } from '@pgsql/scripts';
import { revertFor, verifyFor } from '@pgsql/scripts';
import type { StatementFacts } from '@pgsql/transform';
import { classifyStatements } from '@pgsql/transform';

export type { GeneratedScript } from '@pgsql/scripts';

/** Generated revert and verify scripts for one change's deploy SQL. */
export interface RegeneratedScripts {
  revert: GeneratedScript;
  verify: GeneratedScript;
}

/**
 * Classify a pgpm script's substantive statements: every top-level statement
 * except transaction control (`BEGIN`/`COMMIT`/`ROLLBACK` wrappers).
 */
export function classifyScript(sql: string): StatementFacts[] {
  return classifyStatements(sql).filter(f => f.nodeTag !== 'TransactionStmt');
}

/**
 * Whether a script is an empty stub: nothing but comments, whitespace, and
 * a transaction wrapper — no substantive statements. Scaffolded
 * `-- Add your revert SQL here` files and bare `BEGIN; ... COMMIT;` shells
 * are stubs. A script that fails to parse is NOT a stub (never treat content
 * we cannot understand as safe to overwrite).
 */
export function isStubScript(sql: string): boolean {
  if (!sql || !sql.trim()) return true;
  try {
    return classifyScript(sql).length === 0;
  } catch {
    return false;
  }
}

/**
 * Generate revert and verify scripts (headerless, unwrapped) for one
 * change's deploy SQL. Statements with no derivable inverse contribute a
 * `-- revert not derivable: <reason>` comment and a warning; statements
 * whose effect cannot be existence-checked add a verify warning.
 */
export function regenerateScripts(deploySql: string): RegeneratedScripts {
  const facts = classifyScript(deploySql);
  return {
    revert: revertFor(facts),
    verify: verifyFor(facts)
  };
}
