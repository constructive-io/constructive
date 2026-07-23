/**
 * @pgpmjs/traverse — traversal primitives for the pgpm AST / migration bundle.
 *
 * A pgpm change is materialized into exactly three script slots — `deploy`,
 * `revert`, `verify` — each of which may be absent. Every operator (create,
 * verify, diff, transpile) walks those slots; this package is the one canonical
 * place that loop lives, so it is not re-rolled (and subtly diverged) in each op.
 *
 * The helpers are generic over the script type `S` and work structurally: both
 * `PgpmChangeAst`/`PgpmScriptAst` (`@pgpmjs/ast`) and `BundleChange`/`BundleScript`
 * (`@pgpmjs/bundle`) satisfy {@link ScriptSlots}, so the same functions traverse
 * a module AST or a bundle. Pure leaf: depends only on `@pgpmjs/ast` for the
 * `PgpmScriptKind` type.
 */
import { PgpmScriptKind } from '@pgpmjs/ast/module/types';

export type { PgpmScriptKind };

/** The three script directions of a pgpm change, in canonical deploy order. */
export const SCRIPT_KINDS: readonly PgpmScriptKind[] = ['deploy', 'revert', 'verify'];

/**
 * A node carrying the three pgpm script slots. `null` means the script is absent
 * (the file does not exist / the bundle change omits it). Both the module AST's
 * change node and the bundle's change node satisfy this shape structurally.
 */
export interface ScriptSlots<S> {
  deploy: S | null;
  revert: S | null;
  verify: S | null;
}

/**
 * Visit each present (non-null) script slot in fixed `deploy → revert → verify`
 * order. Absent slots are skipped.
 */
export function forEachScript<S>(
  slots: ScriptSlots<S>,
  visit: (script: S, kind: PgpmScriptKind) => void
): void {
  for (const kind of SCRIPT_KINDS) {
    const script = slots[kind];
    if (script != null) visit(script, kind);
  }
}

/**
 * Map each present script slot to a new value, preserving nulls and slot order.
 * A slot that is absent stays absent; a mapper that returns `null` also clears
 * the slot.
 */
export function mapScripts<S, T>(
  slots: ScriptSlots<S>,
  map: (script: S, kind: PgpmScriptKind) => T | null
): ScriptSlots<T> {
  return {
    deploy: slots.deploy == null ? null : map(slots.deploy, 'deploy'),
    revert: slots.revert == null ? null : map(slots.revert, 'revert'),
    verify: slots.verify == null ? null : map(slots.verify, 'verify')
  };
}

/**
 * Pair the corresponding script slots of two nodes and visit every kind (either
 * side may be `null`) — the primitive for diffing two revisions of a change.
 */
export function zipScripts<S>(
  a: ScriptSlots<S>,
  b: ScriptSlots<S>,
  visit: (kind: PgpmScriptKind, a: S | null, b: S | null) => void
): void {
  for (const kind of SCRIPT_KINDS) {
    visit(kind, a[kind], b[kind]);
  }
}
