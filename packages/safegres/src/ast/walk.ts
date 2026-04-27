/**
 * Domain-specific AST helpers for the safegres auditor, layered on top of
 * `@pgsql/traverse`'s `walk` / `NodePath`.
 */

import { NodePath, walk } from '@pgsql/traverse';

import type { PgAstNode } from './parse';

/** Find every node tagged with `tag` (e.g. `FuncCall`, `ColumnRef`). */
export function findAll(root: PgAstNode, tag: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  walk(root as object, (path: NodePath) => {
    if (path.tag === tag) {
      out.push(path.node as Record<string, unknown>);
    }
  });
  return out;
}

/** Visit every tagged node. `visit(node, tag, parent)` matches the old API. */
export type Visitor = (
  node: Record<string, unknown>,
  tag: string,
  parent: Record<string, unknown> | null
) => void;

export function visitAll(root: PgAstNode, visit: Visitor): void {
  walk(root as object, (path: NodePath) => {
    visit(
      path.node as Record<string, unknown>,
      path.tag,
      (path.parent?.node as Record<string, unknown> | undefined) ?? null
    );
  });
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

  const parts = funcname
    .map((n) => {
      const rec = n as Record<string, unknown>;
      const str = (rec.String ?? rec.string) as Record<string, unknown> | undefined;
      if (!str) return '';
      return String((str.sval ?? str.str) ?? '');
    })
    .filter((s) => s.length > 0);

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
