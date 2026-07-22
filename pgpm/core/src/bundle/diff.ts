import { PgpmScriptKind } from '../ast/types';
import { BundleChange, BundleScript, MigrationBundle } from './types';

/** Per-script disposition between two revisions of the same change. */
export type ScriptDiff = 'added' | 'removed' | 'modified' | 'unchanged';

/** How a single change differs between two bundles. */
export interface ChangeDiff {
  name: string;
  kind: 'added' | 'removed' | 'modified';
  /** Per-script detail (only populated for `modified`). */
  scripts?: Record<PgpmScriptKind, ScriptDiff>;
}

/**
 * A structural diff between two bundles — the substrate for drift reconciliation
 * (`reconcileSchemaDrift` / `reconcileServicesCatalogDrift`) and apply diff
 * previews. Compares by content digest, so it is immune to formatting noise.
 */
export interface BundleDiff {
  /** True when both bundles have the same content digest. */
  identical: boolean;
  /** Change names present only in `to`. */
  added: string[];
  /** Change names present only in `from`. */
  removed: string[];
  /** Changes present in both whose content differs. */
  modified: ChangeDiff[];
  /** Same change set, but a different deploy order. */
  reordered: boolean;
  /** All differing changes in `to`-then-removed order, for display. */
  changes: ChangeDiff[];
}

function scriptDiff(from: BundleScript | null, to: BundleScript | null): ScriptDiff {
  if (!from && !to) return 'unchanged';
  if (!from) return 'added';
  if (!to) return 'removed';
  return from.digest === to.digest ? 'unchanged' : 'modified';
}

function changeScriptDiffs(from: BundleChange, to: BundleChange): Record<PgpmScriptKind, ScriptDiff> {
  return {
    deploy: scriptDiff(from.deploy, to.deploy),
    revert: scriptDiff(from.revert, to.revert),
    verify: scriptDiff(from.verify, to.verify)
  };
}

/**
 * Diff two migration bundles by content digest.
 *
 * Pure and deterministic. `added`/`removed`/`modified` are keyed on change name;
 * a change in both bundles is `modified` when its change digest differs, with
 * per-script detail. `reordered` flags a pure deploy-order change over an
 * otherwise identical change set.
 */
export function diffBundles(from: MigrationBundle, to: MigrationBundle): BundleDiff {
  const fromByName = new Map(from.changes.map(c => [c.name, c]));
  const toByName = new Map(to.changes.map(c => [c.name, c]));

  const added: string[] = [];
  const removed: string[] = [];
  const modified: ChangeDiff[] = [];
  const changes: ChangeDiff[] = [];

  for (const change of to.changes) {
    const prior = fromByName.get(change.name);
    if (!prior) {
      added.push(change.name);
      changes.push({ name: change.name, kind: 'added' });
    } else if (prior.digest !== change.digest) {
      const diff: ChangeDiff = {
        name: change.name,
        kind: 'modified',
        scripts: changeScriptDiffs(prior, change)
      };
      modified.push(diff);
      changes.push(diff);
    }
  }

  for (const change of from.changes) {
    if (!toByName.has(change.name)) {
      removed.push(change.name);
      changes.push({ name: change.name, kind: 'removed' });
    }
  }

  const sameSet =
    added.length === 0 &&
    removed.length === 0 &&
    from.changes.length === to.changes.length;
  const reordered =
    sameSet && from.manifest.deployOrder.join('\n') !== to.manifest.deployOrder.join('\n');

  return {
    identical: from.manifest.digest === to.manifest.digest,
    added,
    removed,
    modified,
    reordered,
    changes
  };
}
