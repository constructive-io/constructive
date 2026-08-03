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

/** Options controlling how {@link loadModuleSource} ingests a module. */
export interface LoadModuleSourceOptions {
  /**
   * Parsed plans of the other packages in the same workspace, keyed by
   * package name (`%project`). Lets a cross-package tag dependency
   * (`pkg:@tag`) resolve against the plan that defines the tag. Without it,
   * cross-package tags cannot be resolved from a single module's plan and are
   * left verbatim with a warning.
   */
  crossPackagePlans?: Map<string, ExtendedPlanFile>;
}

const CROSS_PACKAGE_TAG = /^([^:]+):@(.+)$/;

/**
 * Resolve a plan dependency token to a concrete change identity.
 *
 * Non-tag tokens (a bare change name, or a `pkg:change` cross-package name)
 * pass through unchanged — they are already the identity the ledger and
 * generated plans record. A tag token is resolved so a dependency written
 * against a tag is never re-emitted verbatim into a generated plan or a
 * ledger row:
 * - a local tag (`@tag`) resolves to its change name via this plan;
 * - a cross-package tag (`pkg:@tag`) resolves to the canonical `pkg:change`
 *   qualified name via `crossPackagePlans[pkg]` when available.
 *
 * Anything that cannot be resolved (unknown tag, or a cross-package tag with
 * no plan in context) is kept verbatim — never dropped — with a warning.
 */
const resolveDependencyToken = (
  token: string,
  plan: ExtendedPlanFile,
  warnings: string[],
  changeName: string,
  crossPackagePlans?: Map<string, ExtendedPlanFile>
): string => {
  if (!token.includes('@')) return token;

  const cross = token.match(CROSS_PACKAGE_TAG);
  if (cross && cross[1] !== plan.package) {
    const pkg = cross[1];
    const otherPlan = crossPackagePlans?.get(pkg);
    if (!otherPlan) {
      warnings.push(
        `${changeName}: dependency tag "${token}" is cross-package; left unresolved (no plan for "${pkg}" in context)`
      );
      return token;
    }
    const resolved = resolveReference(token, otherPlan, pkg);
    if (resolved.error || !resolved.change) {
      warnings.push(
        `${changeName}: could not resolve cross-package dependency tag "${token}" (${resolved.error ?? 'no matching change'}); left as-is`
      );
      return token;
    }
    return `${pkg}:${resolved.change}`;
  }

  const resolved = resolveReference(token, plan, plan.package);
  if (resolved.error || !resolved.change) {
    warnings.push(
      `${changeName}: could not resolve dependency tag "${token}" (${resolved.error ?? 'no matching change'}); left as-is`
    );
    return token;
  }
  return resolved.change;
};

/**
 * Load a pgpm module from disk: parse pgpm.plan and read each change's
 * deploy script, stripping pgpm headers and transaction wrappers so the
 * result can be flattened straight into the dials pipeline
 * (`restructureChanges` / `partitionUnits`).
 */
export const loadModuleSource = (
  moduleDir: string,
  options: LoadModuleSourceOptions = {}
): ModuleSource => {
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
        resolveDependencyToken(dep, plan, warnings, change.name, options.crossPackagePlans)
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
