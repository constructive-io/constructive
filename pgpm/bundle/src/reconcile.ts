import { BundleDiff, diffBundles } from './diff';
import { MigrationBundle } from './types';

/**
 * An explicit, ordered plan to bring a database currently at bundle `from` to
 * bundle `to`: revert the changes that disappeared or changed (deepest first),
 * then deploy the changes that appeared or changed (dependency order).
 *
 * This is the reconciliation plan `reconcileSchemaDrift` /
 * `reconcileServicesCatalogDrift` emit — computed purely from two artifacts,
 * never mutating either side.
 */
export interface ReconcilePlan {
  /** The underlying structural diff. */
  diff: BundleDiff;
  /** Changes to revert, in reverse `from` deploy order (dependents first). */
  revert: string[];
  /** Changes to deploy, in `to` deploy order (prerequisites first). */
  deploy: string[];
  /** True when the bundles are identical (nothing to do). */
  noop: boolean;
}

/**
 * Compute a {@link ReconcilePlan} between two bundles. Pure and deterministic.
 *
 * A `modified` change is both reverted (old definition) and re-deployed (new
 * definition). A pure reorder over identical content yields no revert/deploy
 * ops — `diff.reordered` records it for the caller to decide on.
 */
export function reconcilePlan(from: MigrationBundle, to: MigrationBundle): ReconcilePlan {
  const diff = diffBundles(from, to);

  const modified = new Set(diff.modified.map(c => c.name));
  const removed = new Set(diff.removed);
  const added = new Set(diff.added);

  const revert = from.changes
    .map(c => c.name)
    .filter(name => removed.has(name) || modified.has(name))
    .reverse();

  const deploy = to.changes
    .map(c => c.name)
    .filter(name => added.has(name) || modified.has(name));

  return { diff, revert, deploy, noop: diff.identical };
}
