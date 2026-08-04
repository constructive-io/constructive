export type GraphileIntrospectionMode = 'stock' | 'scoped-required';

export const DEFAULT_INTROSPECTION_STATEMENT_TIMEOUT = '120s';

export const normalizeIntrospectionDependencySchemas = (
  schemas: readonly string[] | null | undefined
): string[] => [...new Set((schemas ?? []).map((schema) => {
  if (typeof schema !== 'string' || schema.trim().length === 0) {
    throw new Error('Introspection dependency schemas must be non-empty strings');
  }
  const normalized = schema.trim();
  if (normalized === 'information_schema' || normalized.startsWith('pg_')) {
    throw new Error(`Introspection dependency schema '${normalized}' must not be a system schema`);
  }
  if (normalized.includes('\0')) {
    throw new Error('Introspection dependency schemas must not contain NUL bytes');
  }
  return normalized;
}))];

export const resolveIntrospectionSettings = (
  mode: GraphileIntrospectionMode,
  settings: Record<string, string | undefined> | null | undefined
): Record<string, string | undefined> => {
  const boundedSettings = { ...settings };
  if (!boundedSettings.statement_timeout) {
    // An admitted build owns the sole process-wide heap slot. Bound catalog
    // SQL so a lock wait or pathological plan cannot block every cold tenant
    // indefinitely; the setting is transaction-local in @dataplan/pg.
    boundedSettings.statement_timeout = DEFAULT_INTROSPECTION_STATEMENT_TIMEOUT;
  }
  return mode === 'scoped-required'
    ? {
      ...boundedSettings,
      // The scoped recursive query is deliberately short-lived. PostgreSQL's
      // JIT compilation costs more than the catalog work, while wide catalog
      // hashes multiply work_mem. Bound both only inside the introspection
      // transaction; @dataplan/pg restores the runtime session afterwards.
      jit: 'off',
      work_mem: '512kB'
    }
    : boundedSettings;
};
