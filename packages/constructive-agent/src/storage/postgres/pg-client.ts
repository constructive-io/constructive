export interface PgQueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number | null;
}

export interface PgQueryable {
  query<T = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<PgQueryResult<T>>;
}

