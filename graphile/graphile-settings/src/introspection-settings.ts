export const normalizeIntrospectionDependencySchemas = (
  schemas: readonly string[] | null | undefined
): string[] => [
  ...new Set(
    (schemas ?? []).map((schema) => {
      if (typeof schema !== 'string' || schema.trim().length === 0) {
        throw new Error(
          'Introspection dependency schemas must be non-empty strings'
        );
      }
      const normalized = schema.trim();
      if (normalized === 'information_schema' || normalized.startsWith('pg_')) {
        throw new Error(
          `Introspection dependency schema '${normalized}' must not be a system schema`
        );
      }
      if (normalized.includes('\0')) {
        throw new Error(
          'Introspection dependency schemas must not contain NUL bytes'
        );
      }
      return normalized;
    })
  ),
];

export const resolveIntrospectionSettings = (
  introspectionJit: boolean,
  settings: Record<string, string | undefined> | null | undefined
): Record<string, string | undefined> => ({
  ...settings,
  jit: introspectionJit ? 'on' : 'off',
});
