/**
 * Small typed helpers for inspecting `pgsql-parser` AST nodes.
 *
 * Operates on the raw shape returned by `parse()` rather than the typed
 * `@pgsql/types` view, so the runtime cost is just object lookups.
 */

import type { PgAstNode } from './parse';

type Obj = Record<string, unknown>;

function isObj(x: unknown): x is Obj {
  return typeof x === 'object' && x !== null;
}

/** Extract the single wrapping key (e.g. `A_Expr`, `BoolExpr`) and its payload. */
export function unwrap(node: PgAstNode): { kind: string; body: Obj } | null {
  if (!isObj(node)) return null;
  const keys = Object.keys(node);
  if (keys.length !== 1) return null;
  const body = (node as Obj)[keys[0]];
  if (!isObj(body)) return null;
  return { kind: keys[0], body };
}

/** Returns the boolean literal value, or null if not an `A_Const(bool)`. */
export function boolConst(node: PgAstNode): boolean | null {
  const u = unwrap(node);
  if (!u || u.kind !== 'A_Const') return null;
  // `pgsql-parser` represents `true` as `{ boolval: { boolval: true } }` and
  // `false` as `{ boolval: {} }` (the parser elides the default value). The
  // *presence* of the `boolval` key is what identifies a boolean literal.
  if (!('boolval' in u.body)) return null;
  const boolval = u.body.boolval as Obj | undefined;
  if (!boolval || typeof boolval !== 'object') return null;
  return boolval.boolval === true;
}
