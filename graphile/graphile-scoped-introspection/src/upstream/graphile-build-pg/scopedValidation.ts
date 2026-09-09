import type { Introspection, ScopedCatalogTypes } from "../pg-introspection";

export function assertAllowedDependencySchemas(
  schemas: readonly string[]
): void {
  for (const schema of schemas) {
    if (schema.length === 0 || schema.trim() !== schema) {
      throw new Error(
        'Introspection dependency schemas must contain exact non-empty schema names'
      );
    }
    if (schema === 'information_schema' || schema.startsWith('pg_')) {
      throw new Error(
        `Introspection dependency schema '${schema}' must not be a system schema`
      );
    }
    if (schema.includes('\0')) {
      throw new Error(
        'Introspection dependency schemas must not contain NUL bytes'
      );
    }
  }
}

export function assertScopedNamespaces(
  introspection: Introspection,
  requiredSchemas: readonly string[] | null,
  allowedSchemas: readonly string[] | null,
  serviceName: string
): void {
  if (requiredSchemas === null || allowedSchemas === null) return;

  const found = new Set(
    introspection.namespaces.map((namespace) => namespace.nspname)
  );
  const missing = requiredSchemas.filter((schema) => !found.has(schema));
  if (missing.length > 0) {
    throw new Error(
      `Schema-scoped introspection for service '${serviceName}' did not find required schema(s): ${missing.join(', ')}`
    );
  }
  const allowed = new Set(allowedSchemas);
  const unexpected = [...found].filter((schema) => !allowed.has(schema));
  if (unexpected.length > 0) {
    throw new Error(
      `Schema-scoped introspection for service '${serviceName}' crossed into unapproved dependency schema(s): ${unexpected.join(', ')}`
    );
  }
}
export function assertDependencyClosureTypes(
  introspection: Introspection,
  scopedCatalogTypes: ScopedCatalogTypes | null,
  serviceName: string
): void {
  if (scopedCatalogTypes !== 'dependency-closure') return;

  const retainedTypeOids = new Set(
    introspection.types.map((type) => type._id)
  );
  const requireType = (
    oid: string | null | undefined,
    objectKind: string,
    objectContext: string,
    field: string
  ): void => {
    if (oid === null || oid === undefined || oid === '0') return;
    // pg-introspection removes extension-owned composite resources from its
    // public arrays after building lookups. Validate the runtime lookup too.
    const introspectionLookups = (
      introspection as Introspection & {
        _lookups?: { typeById?: Map<string, unknown> };
      }
    )._lookups;
    const resolves =
      retainedTypeOids.has(oid) || introspectionLookups?.typeById?.has(oid);
    if (!resolves) {
      throw new Error(
        `Dependency-closure introspection for service '${serviceName}' retained ${objectKind} '${objectContext}' field '${field}' referencing missing pg_type OID '${oid}'`
      );
    }
  };
  const requireTypes = (
    oids: readonly string[] | null | undefined,
    objectKind: string,
    objectContext: string,
    field: string
  ): void => {
    for (const oid of oids ?? []) {
      requireType(oid, objectKind, objectContext, field);
    }
  };

  for (const entity of introspection.classes) {
    const context = `${entity.relname} (${entity._id})`;
    requireType(entity.reltype, 'pg_class', context, 'reltype');
    requireType(entity.reloftype, 'pg_class', context, 'reloftype');
  }
  for (const entity of introspection.attributes) {
    requireType(
      entity.atttypid,
      'pg_attribute',
      `${entity.attrelid}.${entity.attname}`,
      'atttypid'
    );
  }
  for (const entity of introspection.constraints) {
    requireType(
      entity.contypid,
      'pg_constraint',
      `${entity.conname} (${entity._id})`,
      'contypid'
    );
  }
  for (const entity of introspection.procs) {
    const context = `${entity.proname} (${entity._id})`;
    requireType(entity.prorettype, 'pg_proc', context, 'prorettype');
    requireTypes(entity.proargtypes, 'pg_proc', context, 'proargtypes');
    requireTypes(entity.proallargtypes, 'pg_proc', context, 'proallargtypes');
  }
  for (const entity of introspection.types) {
    const context = `${entity.typname} (${entity._id})`;
    requireType(entity.typbasetype, 'pg_type', context, 'typbasetype');
    requireType(entity.typelem, 'pg_type', context, 'typelem');
    requireType(entity.typarray, 'pg_type', context, 'typarray');
  }
  for (const entity of introspection.enums) {
    requireType(
      entity.enumtypid,
      'pg_enum',
      `${entity.enumlabel} (${entity._id})`,
      'enumtypid'
    );
  }
  for (const entity of introspection.ranges) {
    const context = `range ${entity.rngtypid ?? 'unknown'}`;
    requireType(entity.rngtypid, 'pg_range', context, 'rngtypid');
    requireType(entity.rngsubtype, 'pg_range', context, 'rngsubtype');
    requireType(entity.rngmultitypid, 'pg_range', context, 'rngmultitypid');
  }
}
