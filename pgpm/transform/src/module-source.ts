/**
 * Module ingestion for the dials pipeline: load an on-disk pgpm module into
 * the flattened, classified change list the transform/partition drivers
 * consume. `pgpm transform` uses this today; a future `pgpm import` (dumps)
 * and `pgpm diff` are expected to reuse the same seam.
 */
import { parsePgpmHeader, parsePlanFile, readScript } from '@pgpmjs/ast';
import * as path from 'path';

/** One change of a loaded module: headerless, unwrapped deploy SQL. */
export interface ModuleSourceChange {
  /** Change name (plan token). */
  name: string;
  /** Change names this change requires, as recorded in the plan. */
  dependencies: string[];
  /** Deploy SQL with the pgpm header and BEGIN/COMMIT wrapper stripped. */
  deploy: string;
}

/** A pgpm module loaded from disk, flattened in plan order. */
export interface ModuleSource {
  /** Module (project) name from pgpm.plan. */
  name: string;
  /** Absolute module directory. */
  modulePath: string;
  /** Changes in plan order. */
  changes: ModuleSourceChange[];
  /** Non-fatal notes (missing deploy scripts, etc.). */
  warnings: string[];
}

const TX_LINE = /^\s*(BEGIN|COMMIT|ROLLBACK)\s*;\s*$/i;

/**
 * Strip the transaction wrapper some modules carry inside their scripts
 * (standalone `BEGIN;` / `COMMIT;` / `ROLLBACK;` lines). The caller owns
 * transaction control.
 */
export const stripTransactionWrapper = (sql: string): string =>
  sql
    .split('\n')
    .filter(line => !TX_LINE.test(line))
    .join('\n')
    .trim();

/**
 * Load a pgpm module from disk: parse pgpm.plan and read each change's
 * deploy script, stripping pgpm headers and transaction wrappers so the
 * result can be flattened straight into the dials pipeline
 * (`restructureChanges` / `partitionUnits`).
 */
export const loadModuleSource = (moduleDir: string): ModuleSource => {
  const modulePath = path.resolve(moduleDir);
  const planResult = parsePlanFile(path.join(modulePath, 'pgpm.plan'));
  if (!planResult.data) {
    const reasons = planResult.errors.map(e => e.message).join(', ');
    throw new Error(`Failed to parse pgpm.plan in ${modulePath}: ${reasons}`);
  }

  const warnings: string[] = [];
  const changes: ModuleSourceChange[] = [];

  for (const change of planResult.data.changes) {
    const raw = readScript(modulePath, 'deploy', change.name);
    if (!raw) {
      warnings.push(`${change.name}: no deploy script found, skipping`);
      continue;
    }
    const { body } = parsePgpmHeader(raw);
    changes.push({
      name: change.name,
      dependencies: change.dependencies ?? [],
      deploy: stripTransactionWrapper(body)
    });
  }

  return {
    name: planResult.data.package,
    modulePath,
    changes,
    warnings
  };
};
