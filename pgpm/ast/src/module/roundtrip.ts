import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { readModule } from './reader';
import { serializePlan, serializeScript, writeModule } from './writer';

/**
 * A single discrepancy found by {@link verifyModuleRoundTrip}.
 */
export interface RoundTripIssue {
  kind: 'script-drift' | 'plan-drift' | 'change-count' | 'change-identity';
  change?: string;
  script?: string;
  message: string;
}

/**
 * Read-only invariant check for the module AST: proves a module survives a
 * read → serialize → re-read cycle without drifting.
 *
 * Guarantees checked:
 *   - every script serializes byte-identically to its source (the SQL header
 *     parser is lossless), and
 *   - the plan serialization is idempotent and the structured change set is
 *     stable across a serialize → re-read round trip.
 *
 * Returns the issues found rather than throwing.
 */
export function verifyModuleRoundTrip(dir: string): RoundTripIssue[] {
  const issues: RoundTripIssue[] = [];
  const module = readModule(dir);

  for (const change of module.changes) {
    for (const script of [change.deploy, change.revert, change.verify]) {
      if (!script) continue;
      if (serializeScript(script) !== script.raw) {
        issues.push({
          kind: 'script-drift',
          change: change.name,
          script: script.kind,
          message: 'header serialize is not byte-identical to source'
        });
      }
    }
  }

  const planOnce = serializePlan(module);
  const tmp = mkdtempSync(join(tmpdir(), 'pgpm-ast-rt-'));
  try {
    writeModule(module, { outDir: tmp, fromRaw: false });
    const reread = readModule(tmp);

    if (serializePlan(reread) !== planOnce) {
      issues.push({ kind: 'plan-drift', message: 'plan serialization is not idempotent' });
    }

    if (reread.changes.length !== module.changes.length) {
      issues.push({
        kind: 'change-count',
        message: `change count drifted: ${module.changes.length} -> ${reread.changes.length}`
      });
    } else {
      for (let i = 0; i < module.changes.length; i++) {
        if (reread.changes[i].name !== module.changes[i].name) {
          issues.push({
            kind: 'change-identity',
            change: module.changes[i].name,
            message: `change at index ${i} drifted to "${reread.changes[i].name}"`
          });
        }
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  return issues;
}
