/**
 * Selection helper generator for React Query hooks
 *
 * Generates selection.ts as a shared adapter layer between hook-facing
 * `selection` params and ORM-facing args (`select`, `where`, `orderBy`, etc.).
 */
import { getGeneratedFileHeader } from './utils';

/**
 * Generate selection.ts content - shared selection types + runtime mappers
 */
export function generateSelectionFile(): string {
  const header = getGeneratedFileHeader('Selection helpers for React Query hooks');

  const code = `
export interface SelectionConfig<TFields> {
  fields?: TFields;
}

export interface ListSelectionConfig<TFields, TWhere, TOrderBy>
  extends SelectionConfig<TFields> {
  where?: TWhere;
  orderBy?: TOrderBy[];
  first?: number;
  last?: number;
  after?: string;
  before?: string;
  offset?: number;
}

export function buildSelectionArgs<TFields>(
  selection?: SelectionConfig<TFields>
): { select?: TFields } | undefined {
  if (!selection || selection.fields === undefined) {
    return undefined;
  }

  return { select: selection.fields };
}

export function buildListSelectionArgs<TFields, TWhere, TOrderBy>(
  selection?: ListSelectionConfig<TFields, TWhere, TOrderBy>
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
    offset: selection.offset
  };
}
`;

  return header + '\n\n' + code.trim() + '\n';
}
