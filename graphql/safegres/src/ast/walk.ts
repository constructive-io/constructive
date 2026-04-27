/**
 * Tiny, typed AST walker for pgsql-parser v17 output.
 *
 * We deliberately do NOT depend on @pgsql/traverse here — keeping the walker
 * hand-rolled lets the package stay dependency-free at runtime (only
 * `pgsql-parser` + `pg`) which matters for the eventual open-source lift-out.
 */

import type { PgAstNode } from './parse';

export type Visitor = (node: Record<string, unknown>, key: string, parent: Record<string, unknown> | null) => void;

/** Depth-first walk over every tagged node in the AST. */
export function walk(root: PgAstNode, visit: Visitor): void {
  walkNode(root, '__root__', null, visit);
}

function walkNode(
  node: unknown,
  key: string,
  parent: Record<string, unknown> | null,
  visit: Visitor
): void {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) {
    for (const item of node) walkNode(item, key, parent, visit);
    return;
  }
  if (typeof node !== 'object') return;

  const record = node as Record<string, unknown>;

  // pgsql-parser emits discriminated-union objects like `{ FuncCall: {...} }`.
  // We visit the *inner* object with the tag name as `key`, and recurse on its children.
  const keys = Object.keys(record);
  if (keys.length === 1 && isTaggedUnion(keys[0])) {
    const tag = keys[0];
    const inner = record[tag];
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      visit(inner as Record<string, unknown>, tag, parent);
      for (const [childKey, childVal] of Object.entries(inner)) {
        walkNode(childVal, childKey, inner as Record<string, unknown>, visit);
      }
      return;
    }
  }

  // Otherwise it's a plain container — recurse over its values.
  for (const [k, v] of Object.entries(record)) {
    walkNode(v, k, record, visit);
  }
}

function isTaggedUnion(key: string): boolean {
  // pgsql-parser tag names are PascalCase: FuncCall, ColumnRef, A_Expr, etc.
  // A_Expr starts with a capital + underscore, still PascalCase-ish.
  return /^[A-Z]/.test(key);
}

/** Find every tagged node with the given tag name. */
export function findAll(root: PgAstNode, tag: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  walk(root, (node, key) => {
    if (key === tag) out.push(node);
  });
  return out;
}

/**
 * Extract the printable name of a `FuncCall.funcname` field.
 *
 * `funcname` is an array of `{ String: { sval: "..." } }` nodes — usually one
 * element (bare name) or two (schema-qualified).
 */
export function funcNameParts(funcCall: Record<string, unknown>): { schema?: string; name: string } {
  const funcname = funcCall.funcname;
  if (!Array.isArray(funcname)) return { name: '<unknown>' };

  const parts = funcname.map((n) => {
    const rec = n as Record<string, unknown>;
    const str = (rec.String ?? rec.string) as Record<string, unknown> | undefined;
    if (!str) return '';
    return String((str.sval ?? str.str) ?? '');
  }).filter((s) => s.length > 0);

  if (parts.length >= 2) return { schema: parts[0], name: parts[parts.length - 1] };
  if (parts.length === 1) return { name: parts[0] };
  return { name: '<unknown>' };
}

/** Get the printable qualified name (`schema.name` or `name`). */
export function funcNameQualified(funcCall: Record<string, unknown>): string {
  const { schema, name } = funcNameParts(funcCall);
  return schema ? `${schema}.${name}` : name;
}

/**
 * Get a ColumnRef's dotted name path. Example: `s.actor_id` → `['s', 'actor_id']`.
 * Returns `['*']` for `SELECT *`.
 */
export function columnRefPath(columnRef: Record<string, unknown>): string[] {
  const fields = columnRef.fields;
  if (!Array.isArray(fields)) return [];
  const out: string[] = [];
  for (const f of fields) {
    const rec = f as Record<string, unknown>;
    const str = (rec.String ?? rec.string) as Record<string, unknown> | undefined;
    if (str) {
      out.push(String((str.sval ?? str.str) ?? ''));
      continue;
    }
    if ('A_Star' in rec) {
      out.push('*');
    }
  }
  return out;
}
