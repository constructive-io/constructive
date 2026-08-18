import { buildIntrospectionQuery } from "./introspection";

export type ScopedCatalogTypes = "all" | "dependency-closure";

export interface SchemaScopedIntrospectionOptions {
  catalogTypes?: ScopedCatalogTypes;
  capabilityExtensions?: readonly string[];
}

export interface SchemaScopedIntrospectionQuery {
  text: string;
  values: [string[], string[]];
}

const SCOPED_CTES = `recursive
  requested_schema_names(schema_name) as (
    select distinct requested.schema_name
    from pg_catalog.unnest($1::text[]) as requested(schema_name)
  ),

  capability_extension_names(extension_name) as (
    select distinct capability.extension_name
    from pg_catalog.unnest($2::text[]) as capability(extension_name)
  ),

  requested_namespaces as (
    select pg_namespace.oid as _id, pg_namespace.nspname
    from pg_catalog.pg_namespace
    inner join requested_schema_names
      on requested_schema_names.schema_name = pg_namespace.nspname
  ),

  root_objects(object_class, object_id) as (
    select 'pg_catalog.pg_class'::regclass::oid, pg_class.oid
    from pg_catalog.pg_class
    where pg_class.relnamespace in (select requested_namespaces._id from requested_namespaces)

    union

    select 'pg_catalog.pg_constraint'::regclass::oid, pg_constraint.oid
    from pg_catalog.pg_constraint
    where pg_constraint.connamespace in (select requested_namespaces._id from requested_namespaces)

    union

    select 'pg_catalog.pg_proc'::regclass::oid, pg_proc.oid
    from pg_catalog.pg_proc
    where pg_proc.pronamespace in (select requested_namespaces._id from requested_namespaces)
      and pg_proc.prorettype operator(pg_catalog.<>) 2279

    union

    select 'pg_catalog.pg_type'::regclass::oid, pg_type.oid
    from pg_catalog.pg_type
    where pg_type.typnamespace in (select requested_namespaces._id from requested_namespaces)
  ),

  object_closure(object_class, object_id) as (
    select root_objects.object_class, root_objects.object_id
    from root_objects

    union

    select dependency.object_class, dependency.object_id
    from object_closure
    cross join lateral (
      select
        'pg_catalog.pg_type'::regclass::oid as object_class,
        pg_class.reltype as object_id
      from pg_catalog.pg_class
      where object_closure.object_class = 'pg_catalog.pg_class'::regclass
        and pg_class.oid = object_closure.object_id

      union all

      select 'pg_catalog.pg_type'::regclass::oid, pg_class.reloftype
      from pg_catalog.pg_class
      where object_closure.object_class = 'pg_catalog.pg_class'::regclass
        and pg_class.oid = object_closure.object_id

      union all

      select 'pg_catalog.pg_type'::regclass::oid, pg_attribute.atttypid
      from pg_catalog.pg_attribute
      where object_closure.object_class = 'pg_catalog.pg_class'::regclass
        and pg_attribute.attrelid = object_closure.object_id

      union all

      select 'pg_catalog.pg_constraint'::regclass::oid, pg_constraint.oid
      from pg_catalog.pg_constraint
      where object_closure.object_class = 'pg_catalog.pg_class'::regclass
        and pg_constraint.conrelid = object_closure.object_id

      union all

      select 'pg_catalog.pg_class'::regclass::oid, pg_index.indexrelid
      from pg_catalog.pg_index
      where object_closure.object_class = 'pg_catalog.pg_class'::regclass
        and pg_index.indrelid = object_closure.object_id

      union all

      select 'pg_catalog.pg_class'::regclass::oid, pg_inherits.inhparent
      from pg_catalog.pg_inherits
      where object_closure.object_class = 'pg_catalog.pg_class'::regclass
        and pg_inherits.inhrelid = object_closure.object_id

      union all

      select 'pg_catalog.pg_class'::regclass::oid, constraint_class.oid
      from pg_catalog.pg_constraint
      cross join lateral pg_catalog.unnest(
        array[
          pg_constraint.conrelid,
          pg_constraint.confrelid,
          pg_constraint.conindid
        ]::oid[]
      ) as constraint_class(oid)
      where object_closure.object_class = 'pg_catalog.pg_constraint'::regclass
        and pg_constraint.oid = object_closure.object_id

      union all

      select 'pg_catalog.pg_type'::regclass::oid, pg_constraint.contypid
      from pg_catalog.pg_constraint
      where object_closure.object_class = 'pg_catalog.pg_constraint'::regclass
        and pg_constraint.oid = object_closure.object_id

      union all

      select 'pg_catalog.pg_constraint'::regclass::oid, pg_constraint.conparentid
      from pg_catalog.pg_constraint
      where object_closure.object_class = 'pg_catalog.pg_constraint'::regclass
        and pg_constraint.oid = object_closure.object_id

      union all

      select 'pg_catalog.pg_type'::regclass::oid, procedure_type.oid
      from pg_catalog.pg_proc
      cross join lateral pg_catalog.unnest(
        coalesce(pg_proc.proallargtypes, pg_proc.proargtypes::oid[])
        || array[pg_proc.prorettype]::oid[]
      ) as procedure_type(oid)
      where object_closure.object_class = 'pg_catalog.pg_proc'::regclass
        and pg_proc.oid = object_closure.object_id

      union all

      select 'pg_catalog.pg_type'::regclass::oid, dependency_type.oid
      from pg_catalog.pg_type
      cross join lateral pg_catalog.unnest(
        array[
          pg_type.typbasetype,
          pg_type.typelem,
          pg_type.typarray
        ]::oid[]
      ) as dependency_type(oid)
      where object_closure.object_class = 'pg_catalog.pg_type'::regclass
        and pg_type.oid = object_closure.object_id

      union all

      select 'pg_catalog.pg_class'::regclass::oid, pg_type.typrelid
      from pg_catalog.pg_type
      where object_closure.object_class = 'pg_catalog.pg_type'::regclass
        and pg_type.oid = object_closure.object_id

      union all

      select 'pg_catalog.pg_constraint'::regclass::oid, pg_constraint.oid
      from pg_catalog.pg_constraint
      where object_closure.object_class = 'pg_catalog.pg_type'::regclass
        and pg_constraint.contypid = object_closure.object_id

      union all

      select 'pg_catalog.pg_type'::regclass::oid, range_type.oid
      from pg_catalog.pg_range
      cross join lateral pg_catalog.unnest(
        array[
          pg_range.rngtypid,
          pg_range.rngsubtype,
          pg_range.rngmultitypid
        ]::oid[]
      ) as range_type(oid)
      where object_closure.object_class = 'pg_catalog.pg_type'::regclass
        and object_closure.object_id in (pg_range.rngtypid, pg_range.rngmultitypid)
    ) as dependency
    where dependency.object_id operator(pg_catalog.<>) 0
  ),

  retained_index_metadata(indexrelid, indclass, indcollation) as (
    select pg_index.indexrelid, pg_index.indclass, pg_index.indcollation
    from object_closure
    inner join pg_catalog.pg_class retained_index
      on object_closure.object_class = 'pg_catalog.pg_class'::regclass
      and retained_index.oid = object_closure.object_id
      and retained_index.relkind in ('i', 'I')
    inner join pg_catalog.pg_index
      on pg_index.indexrelid = retained_index.oid
  ),

  retained_index_opclasses(_id, opcfamily) as (
    select pg_opclass.oid, pg_opclass.opcfamily
    from retained_index_metadata
    cross join lateral pg_catalog.unnest(
      retained_index_metadata.indclass::oid[]
    ) as index_opclass(_id)
    inner join pg_catalog.pg_opclass
      on pg_opclass.oid = index_opclass._id
  ),

  retained_index_support_objects(object_class, object_id) as (
    select 'pg_catalog.pg_opclass'::regclass::oid, retained_index_opclasses._id
    from retained_index_opclasses

    union

    select 'pg_catalog.pg_opfamily'::regclass::oid, retained_index_opclasses.opcfamily
    from retained_index_opclasses

    union

    select 'pg_catalog.pg_operator'::regclass::oid, pg_amop.amopopr
    from retained_index_opclasses
    inner join pg_catalog.pg_amop
      on pg_amop.amopfamily = retained_index_opclasses.opcfamily

    union

    select 'pg_catalog.pg_proc'::regclass::oid, pg_amproc.amproc
    from retained_index_opclasses
    inner join pg_catalog.pg_amproc
      on pg_amproc.amprocfamily = retained_index_opclasses.opcfamily

    union

    select 'pg_catalog.pg_collation'::regclass::oid, index_collation._id
    from retained_index_metadata
    cross join lateral pg_catalog.unnest(
      retained_index_metadata.indcollation::oid[]
    ) as index_collation(_id)
    where index_collation._id operator(pg_catalog.<>) 0
  ),

  installed_extensions(_id, extnamespace) as (
    select pg_extension.oid, pg_extension.extnamespace
    from pg_catalog.pg_extension
    where pg_extension.extname in (
      select capability_extension_names.extension_name
      from capability_extension_names
    )
    or exists (
      select 1
      from object_closure
      inner join pg_catalog.pg_depend
        on pg_depend.classid = object_closure.object_class
        and pg_depend.objid = object_closure.object_id
        and pg_depend.refclassid = 'pg_catalog.pg_extension'::regclass
        and pg_depend.refobjid = pg_extension.oid
        and pg_depend.deptype = 'e'
    )
    or exists (
      select 1
      from retained_index_support_objects
      inner join pg_catalog.pg_depend
        on pg_depend.classid = retained_index_support_objects.object_class
        and pg_depend.objid = retained_index_support_objects.object_id
        and pg_depend.refclassid = 'pg_catalog.pg_extension'::regclass
        and pg_depend.refobjid = pg_extension.oid
        and pg_depend.deptype = 'e'
    )
    or exists (
      select 1
      from object_closure
      inner join pg_catalog.pg_class retained_index
        on object_closure.object_class = 'pg_catalog.pg_class'::regclass
        and retained_index.oid = object_closure.object_id
        and retained_index.relkind = 'i'
      inner join pg_catalog.pg_depend
        on pg_depend.classid = 'pg_catalog.pg_am'::regclass
        and pg_depend.objid = retained_index.relam
        and pg_depend.refclassid = 'pg_catalog.pg_extension'::regclass
        and pg_depend.refobjid = pg_extension.oid
        and pg_depend.deptype = 'e'
    )
  ),

  scoped_namespaces(_id) as (
    select requested_namespaces._id
    from requested_namespaces

    union

    select pg_class.relnamespace
    from object_closure
    inner join pg_catalog.pg_class
      on object_closure.object_class = 'pg_catalog.pg_class'::regclass
      and pg_class.oid = object_closure.object_id

    union

    select pg_constraint.connamespace
    from object_closure
    inner join pg_catalog.pg_constraint
      on object_closure.object_class = 'pg_catalog.pg_constraint'::regclass
      and pg_constraint.oid = object_closure.object_id

    union

    select pg_proc.pronamespace
    from object_closure
    inner join pg_catalog.pg_proc
      on object_closure.object_class = 'pg_catalog.pg_proc'::regclass
      and pg_proc.oid = object_closure.object_id

    union

    select pg_type.typnamespace
    from object_closure
    inner join pg_catalog.pg_type
      on object_closure.object_class = 'pg_catalog.pg_type'::regclass
      and pg_type.oid = object_closure.object_id

    union

    select installed_extensions.extnamespace
    from installed_extensions
    where installed_extensions.extnamespace operator(pg_catalog.<>) 0

    union

    select pg_namespace.oid
    from pg_catalog.pg_namespace
    where pg_namespace.nspname = 'pg_catalog'
  ),

`;
/**
 * Builds a parameterized introspection query scoped to the requested schemas
 * and the transitive object dependencies required by their objects.
 */
export const makeSchemaScopedIntrospectionQuery = (
  schemas: readonly string[],
  options: SchemaScopedIntrospectionOptions = {}
): SchemaScopedIntrospectionQuery => {
  if (!Array.isArray(schemas) || schemas.length === 0) {
    throw new Error('Schema-scoped introspection requires at least one schema');
  }
  if (
    options === null ||
    typeof options !== 'object' ||
    Array.isArray(options)
  ) {
    throw new Error('Schema-scoped introspection options must be an object');
  }
  const unsupportedOptions = Object.keys(options).filter(
    (key) => key !== 'catalogTypes' && key !== 'capabilityExtensions'
  );
  if (unsupportedOptions.length > 0) {
    throw new Error(
      `Unsupported schema-scoped introspection option(s): ${unsupportedOptions.join(', ')}`
    );
  }
  const catalogTypes = options.catalogTypes ?? 'all';
  if (catalogTypes !== 'all' && catalogTypes !== 'dependency-closure') {
    throw new Error(
      `Unsupported schema-scoped catalog type policy '${catalogTypes}'`
    );
  }
  const capabilityExtensions = options.capabilityExtensions ?? [];
  if (!Array.isArray(capabilityExtensions)) {
    throw new Error(
      'Schema-scoped introspection capabilityExtensions must be an array'
    );
  }
  const normalizedCapabilityExtensions = Array.from(
    new Set(
      capabilityExtensions.map((extension) => {
        if (
          typeof extension !== 'string' ||
          extension.length === 0 ||
          extension.trim() !== extension ||
          extension.includes('\0')
        ) {
          throw new Error(
            'Schema-scoped introspection capabilityExtensions must contain exact non-empty extension names'
          );
        }
        return extension;
      })
    )
  );
  const normalized = Array.from(
    new Set(
      schemas.map((schema) => {
        if (typeof schema !== 'string' || schema.length === 0) {
          throw new Error(
            'Schema-scoped introspection schemas must be non-empty strings'
          );
        }
        if (schema.includes('\0')) {
          throw new Error(
            'Schema-scoped introspection schemas must not contain NUL bytes'
          );
        }
        if (schema === 'information_schema' || schema.startsWith('pg_')) {
          throw new Error(
            `Schema-scoped introspection cannot expose system schema '${schema}'`
          );
        }
        return schema;
      })
    )
  );
  const dependencyClosureTypePredicate =
    "pg_type.oid = any (array(select object_id from object_closure where object_class = 'pg_catalog.pg_type'::regclass))";
  return {
    text: buildIntrospectionQuery({
      ctes: SCOPED_CTES,
      namespacePredicate:
        'pg_namespace.oid = any (array(select scoped_namespaces._id from scoped_namespaces))',
      classPredicate:
        "pg_class.oid = any (array(select object_id from object_closure where object_class = 'pg_catalog.pg_class'::regclass))",
      constraintPredicate:
        "pg_constraint.oid = any (array(select object_id from object_closure where object_class = 'pg_catalog.pg_constraint'::regclass))",
      procPredicate:
        "pg_proc.oid = any (array(select object_id from object_closure where object_class = 'pg_catalog.pg_proc'::regclass))",
      typePredicate:
        catalogTypes === 'all'
          ? `${dependencyClosureTypePredicate} or pg_type.typnamespace = 'pg_catalog'::regnamespace`
          : dependencyClosureTypePredicate,
      extensionPredicate:
        'pg_extension.oid = any (array(select installed_extensions._id from installed_extensions))',
      languagePredicate: 'true',
      accessMethodPredicate: 'true',
    }),
    values: [normalized, normalizedCapabilityExtensions],
  };
};
