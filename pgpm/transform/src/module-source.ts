/**
 * Module ingestion for the dials pipeline: load an on-disk pgpm module into
 * the flattened, classified change list the transform/partition drivers
 * consume. `pgpm transform` uses this today; a future `pgpm import` (dumps)
 * and `pgpm diff` are expected to reuse the same seam.
 */
import type { ExtendedPlanFile } from '@pgpmjs/ast';
import { parsePgpmHeader, parsePlanFile, readScript, resolveReference } from '@pgpmjs/ast';
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
 * Resolve a plan dependency token to a concrete change name.
 *
 * Non-tag tokens (a bare change name, or a `pkg:change` cross-package name)
 * pass through unchanged — they are already the identity the ledger and
 * generated plans record. A tag token (`@tag`) is resolved to its change via
 * the plan that defines it, so a dependency written against a tag is not
 * re-emitted verbatim into a generated plan or a ledger row. Cross-package
 * tags (`pkg:@tag`) cannot be resolved from a single module's plan and are
 * left as-is with a warning; the resolver returns them unchanged. Anything
 * that fails to resolve is kept verbatim (never dropped) with a warning.
 */
const resolveDependencyToken = (
  token: string,
  plan: ExtendedPlanFile,
  warnings: string[],
  changeName: string
): string => {
  if (!token.includes('@')) return token;
  const resolved = resolveReference(token, plan, plan.package);
  if (resolved.error || !resolved.change) {
    warnings.push(
      `${changeName}: could not resolve dependency tag "${token}" (${resolved.error ?? 'no matching change'}); left as-is`
    );
    return token;
  }
  if (resolved.change === token) {
    warnings.push(
      `${changeName}: dependency tag "${token}" is cross-package; left unresolved (resolve it in workspace context)`
    );
  }
  return resolved.change;
};

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
  const plan = planResult.data;

  const warnings: string[] = [];
  const changes: ModuleSourceChange[] = [];

  for (const change of plan.changes) {
    const raw = readScript(modulePath, 'deploy', change.name);
    if (!raw) {
      warnings.push(`${change.name}: no deploy script found, skipping`);
      continue;
    }
    const { body } = parsePgpmHeader(raw);
    changes.push({
      name: change.name,
      dependencies: (change.dependencies ?? []).map(dep =>
        resolveDependencyToken(dep, plan, warnings, change.name)
      ),
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
