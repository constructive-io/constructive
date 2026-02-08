/**
 * Selection helpers for React Query hooks
 *
 * This is the RUNTIME code that gets copied to generated output.
 * Provides selection types and runtime mappers between hook-facing
 * `selection` params and ORM-facing args (`select`, `where`, `orderBy`, etc.).
 *
 * NOTE: This file is read at codegen time and written to output.
 * Any changes here will affect all generated hook selection helpers.
 */

export interface SelectionConfig<TFields> {
  fields?: TFields;
}

export interface ListSelectionConfig<
  TFields,
  TWhere,
  TOrderBy,
> extends SelectionConfig<TFields> {
  where?: TWhere;
  orderBy?: TOrderBy[];
  first?: number;
  last?: number;
  after?: string;
  before?: string;
  offset?: number;
}

export function buildSelectionArgs<TFields>(
  selection?: SelectionConfig<TFields>,
): { select?: TFields } | undefined {
  if (!selection || selection.fields === undefined) {
    return undefined;
  }

  return { select: selection.fields };
}

export function buildListSelectionArgs<TFields, TWhere, TOrderBy>(
  selection?: ListSelectionConfig<TFields, TWhere, TOrderBy>,
):
  | {
      select?: TFields;
      where?: TWhere;
      orderBy?: TOrderBy[];
      first?: number;
      last?: number;
      after?: string;
      before?: string;
      offset?: number;
    }
  | undefined {
  if (!selection) {
    return undefined;
  }

  const hasAnyValues =
    selection.fields !== undefined ||
    selection.where !== undefined ||
    selection.orderBy !== undefined ||
    selection.first !== undefined ||
    selection.last !== undefined ||
    selection.after !== undefined ||
    selection.before !== undefined ||
    selection.offset !== undefined;

  if (!hasAnyValues) {
    return undefined;
  }

  return {
    select: selection.fields,
    where: selection.where,
    orderBy: selection.orderBy,
    first: selection.first,
    last: selection.last,
    after: selection.after,
    before: selection.before,
    offset: selection.offset,
  };
}
