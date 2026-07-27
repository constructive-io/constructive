import { hashString } from '@pgpmjs/ast';
import { forEachScript } from '@pgpmjs/traverse';
import { computeBundleDigest, computeChangeDigest } from './create';
import { MigrationBundle } from './types';

/**
 * A single bundle integrity discrepancy found by {@link verifyBundle}.
 */
export interface BundleIssue {
  kind:
    | 'script-digest'
    | 'change-digest'
    | 'bundle-digest'
    | 'order-mismatch'
    | 'change-count';
  change?: string;
  script?: string;
  message: string;
}

/**
 * Recompute every digest in a bundle and confirm it matches the recorded values.
 *
 * This is the integrity gate `applyMigrationBundle` / `transpileMigrationBundle`
 * run before trusting a transported artifact: it proves the SQL bytes, per-change
 * digests, deploy order, and top-level digest are internally consistent. Read-only;
 * returns the issues rather than throwing.
 */
export function verifyBundle(bundle: MigrationBundle): BundleIssue[] {
  const issues: BundleIssue[] = [];

  if (bundle.changes.length !== bundle.manifest.changeCount) {
    issues.push({
      kind: 'change-count',
      message: `manifest.changeCount=${bundle.manifest.changeCount} but ${bundle.changes.length} changes present`
    });
  }

  const order = bundle.changes.map(c => c.name);
  if (order.join('\n') !== bundle.manifest.deployOrder.join('\n')) {
    issues.push({
      kind: 'order-mismatch',
      message: 'changes order does not match manifest.deployOrder'
    });
  }

  for (const change of bundle.changes) {
    forEachScript(change, script => {
      if (hashString(script.sql) !== script.digest) {
        issues.push({
          kind: 'script-digest',
          change: change.name,
          script: script.kind,
          message: 'script digest does not match its sql'
        });
      }
    });
    const expected = computeChangeDigest(change.name, {
      deploy: change.deploy?.digest,
      revert: change.revert?.digest,
      verify: change.verify?.digest
    });
    if (expected !== change.digest) {
      issues.push({
        kind: 'change-digest',
        change: change.name,
        message: 'change digest does not match its scripts'
      });
    }
  }

  const expectedBundle = computeBundleDigest(
    bundle.plan,
    bundle.control?.content ?? null,
    bundle.changes.map(c => c.digest)
  );
  if (expectedBundle !== bundle.manifest.digest) {
    issues.push({
      kind: 'bundle-digest',
      message: 'manifest.digest does not match bundle content'
    });
  }

  return issues;
}
