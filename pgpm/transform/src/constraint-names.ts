/**
 * Postgres default constraint names.
 *
 * When a constraint is authored without a name, Postgres derives one at
 * deploy time (`ChooseConstraintName` in the server): `{table}_pkey` for
 * primary keys, `{table}_{cols}_key` for unique constraints,
 * `{table}_{col}_fkey` for foreign keys, `{table}_{col}_check` (first
 * referenced column) or `{table}_check` for check constraints. Synthesizing
 * the same names makes unnamed authorship comparable to (and revertible as)
 * what the catalog will actually contain.
 */

/** A parsed `Constraint` node (structural — the fields this module reads). */
export interface ConstraintNode {
  contype?: string;
  conname?: string;
  keys?: { String?: { sval?: string } }[];
  fk_attrs?: { String?: { sval?: string } }[];
  raw_expr?: unknown;
}

const svals = (items?: { String?: { sval?: string } }[]): string[] =>
  (items ?? []).map(k => k.String?.sval).filter((s): s is string => typeof s === 'string');

/** First `ColumnRef` column name reached in an expression tree, DFS order. */
export function firstColumnRef(node: unknown): string | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = firstColumnRef(item);
      if (found) return found;
    }
    return null;
  }
  if (node && typeof node === 'object') {
    const record = node as Record<string, unknown>;
    const ref = record.ColumnRef as { fields?: unknown[] } | undefined;
    if (ref?.fields) {
      const names = svals(ref.fields as { String?: { sval?: string } }[]);
      if (names.length > 0) return names[names.length - 1];
    }
    for (const value of Object.values(record)) {
      const found = firstColumnRef(value);
      if (found) return found;
    }
  }
  return null;
}

/**
 * The name Postgres would assign to an unnamed constraint on `table`, given
 * the constraint node and (for column-attached constraints) the owning
 * column. Returns `null` for kinds without a stable derivation (exclusion
 * constraints and anything unrecognized).
 */
export function defaultConstraintName(
  table: string,
  constraint: ConstraintNode,
  column?: string
): string | null {
  const cols = (): string[] => {
    const keyed = svals(constraint.keys);
    if (keyed.length > 0) return keyed;
    return column ? [column] : [];
  };
  switch (constraint.contype) {
  case 'CONSTR_PRIMARY':
    return `${table}_pkey`;
  case 'CONSTR_UNIQUE': {
    const names = cols();
    return names.length > 0 ? `${table}_${names.join('_')}_key` : null;
  }
  case 'CONSTR_FOREIGN': {
    const attrs = svals(constraint.fk_attrs);
    const names = attrs.length > 0 ? attrs : column ? [column] : [];
    return names.length > 0 ? `${table}_${names.join('_')}_fkey` : null;
  }
  case 'CONSTR_CHECK': {
    const col = column ?? firstColumnRef(constraint.raw_expr);
    return col ? `${table}_${col}_check` : `${table}_check`;
  }
  default:
    return null;
  }
}
