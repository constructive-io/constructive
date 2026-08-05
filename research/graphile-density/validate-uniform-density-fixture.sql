\set ON_ERROR_STOP on
\pset pager off

-- Standalone, repeatable validation for the local uniform density fixture.
-- It does not mutate persistent objects. The temporary validation procedure
-- runs with invoker rights and is dropped before the session ends.

\connect graphile_density_uniform_20260801_a

SET statement_timeout = 0;
SET lock_timeout = '30s';

\echo 'PERFORMANCE_ONLY_ROUTING_CANARY: gd_runtime_20260801_a can read every tenant schema'
\echo 'This fixture measures Graphile memory density; it does not prove database-enforced tenant isolation or complete customer qualification.'

DO $catalog_validation$
DECLARE
  class_count integer;
  tenant_schema_count integer;
BEGIN
  IF current_database() <> 'graphile_density_uniform_20260801_a' THEN
    RAISE EXCEPTION 'GRAPHILE_DENSITY_WRONG_DATABASE: %', current_database();
  END IF;

  SELECT count(*) INTO class_count FROM pg_catalog.pg_class;
  IF class_count <> 61239 THEN
    RAISE EXCEPTION
      'GRAPHILE_DENSITY_FINAL_CLASS_COUNT_MISMATCH: expected 61239, got %',
      class_count;
  END IF;

  SELECT count(*) INTO tenant_schema_count
  FROM pg_catalog.pg_namespace
  WHERE nspname ~ '^gd_t([0-9]{3}|[0-9]{4})_api$';
  IF tenant_schema_count <> 4000 THEN
    RAISE EXCEPTION
      'GRAPHILE_DENSITY_SCHEMA_COUNT_MISMATCH: expected 4000, got %',
      tenant_schema_count;
  END IF;

  IF EXISTS (
    WITH expected AS (
      SELECT 'gd_t' ||
        CASE WHEN tenant_number < 1000
          THEN pg_catalog.lpad(tenant_number::text, 3, '0')
          ELSE tenant_number::text
        END || '_api' AS nspname
      FROM pg_catalog.generate_series(1, 4000) AS tenant(tenant_number)
    ), actual AS (
      SELECT nspname
      FROM pg_catalog.pg_namespace
      WHERE nspname ~ '^gd_t([0-9]{3}|[0-9]{4})_api$'
    )
    (SELECT nspname FROM expected EXCEPT SELECT nspname FROM actual)
    UNION ALL
    (SELECT nspname FROM actual EXCEPT SELECT nspname FROM expected)
  ) THEN
    RAISE EXCEPTION 'GRAPHILE_DENSITY_SCHEMA_SET_MISMATCH';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_namespace AS namespace
    WHERE namespace.nspname ~ '^gd_t([0-9]{3}|[0-9]{4})_api$'
      AND (
        (SELECT pg_catalog.array_agg(
           class.relname || ':' || class.relkind::text ORDER BY class.relname)
         FROM pg_catalog.pg_class AS class
         WHERE class.relnamespace = namespace.oid)
          IS DISTINCT FROM ARRAY[
            'tenant_canary:r',
            'tenant_canary_id_seq:S',
            'tenant_canary_pkey:i',
            'tenant_canary_tenant_token_key:i',
            'widget:r',
            'widget_id_seq:S',
            'widget_pkey:i'
          ]::text[]
        OR
        (SELECT pg_catalog.array_agg(
           constraint_row.conname || ':' || constraint_row.contype::text
           ORDER BY constraint_row.conname)
         FROM pg_catalog.pg_constraint AS constraint_row
         WHERE constraint_row.connamespace = namespace.oid)
          IS DISTINCT FROM ARRAY[
            'tenant_canary_id_not_null:n',
            'tenant_canary_pkey:p',
            'tenant_canary_tenant_token_key:u',
            'tenant_canary_tenant_token_not_null:n',
            'widget_canary_id_fkey:f',
            'widget_canary_id_not_null:n',
            'widget_id_not_null:n',
            'widget_label_not_null:n',
            'widget_pkey:p'
          ]::text[]
        OR
        (SELECT pg_catalog.array_agg(
           pg_catalog.concat_ws(':', class.relname, attribute.attnum,
             attribute.attname,
             pg_catalog.format_type(attribute.atttypid, attribute.atttypmod),
             attribute.attnotnull, attribute.attidentity)
           ORDER BY class.relname, attribute.attnum)
         FROM pg_catalog.pg_class AS class
         JOIN pg_catalog.pg_attribute AS attribute
           ON attribute.attrelid = class.oid
         WHERE class.relnamespace = namespace.oid
           AND class.relkind = 'r'
           AND attribute.attnum > 0
           AND NOT attribute.attisdropped)
          IS DISTINCT FROM ARRAY[
            'tenant_canary:1:id:bigint:t:a',
            'tenant_canary:2:tenant_token:text:t:',
            'widget:1:id:bigint:t:a',
            'widget:2:canary_id:bigint:t:',
            'widget:3:label:text:t:'
          ]::text[]
        OR
        (SELECT count(*)
         FROM pg_catalog.pg_proc AS procedure
         WHERE procedure.pronamespace = namespace.oid
           AND procedure.proname = 'tenant_token'
           AND pg_catalog.pg_get_function_identity_arguments(procedure.oid) = ''
           AND pg_catalog.pg_get_function_result(procedure.oid) = 'text'
           AND procedure.provolatile = 's'
           AND NOT procedure.prosecdef) <> 1
        OR
        (SELECT count(*)
         FROM pg_catalog.pg_class AS table_class
         WHERE table_class.relnamespace = namespace.oid
           AND table_class.relkind = 'r'
           AND table_class.reltoastrelid <> 0) <> 2
        OR
        (SELECT sum(1 + (
           SELECT count(*)
           FROM pg_catalog.pg_index AS toast_index
           WHERE toast_index.indrelid = table_class.reltoastrelid
         ))
         FROM pg_catalog.pg_class AS table_class
         WHERE table_class.relnamespace = namespace.oid
           AND table_class.relkind = 'r') <> 4
      )
  ) THEN
    RAISE EXCEPTION
      'GRAPHILE_DENSITY_NON_UNIFORM_SHAPE: expected identical 7/1/9 direct shape plus four TOAST classes';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_namespace AS namespace
    WHERE namespace.nspname ~ '^gd_t([0-9]{3}|[0-9]{4})_api$'
      AND (
        namespace.nspowner <> 'postgres'::regrole
        OR NOT pg_catalog.has_schema_privilege(
          'gd_runtime_20260801_a', namespace.oid, 'USAGE'
        )
        OR pg_catalog.has_schema_privilege(
          'gd_runtime_20260801_a', namespace.oid, 'CREATE'
        )
      )
  ) OR EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class AS class
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = class.relnamespace
    WHERE namespace.nspname ~ '^gd_t([0-9]{3}|[0-9]{4})_api$'
      AND class.relowner <> 'postgres'::regrole
  ) OR EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS procedure
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname ~ '^gd_t([0-9]{3}|[0-9]{4})_api$'
      AND procedure.proowner <> 'postgres'::regrole
  ) THEN
    RAISE EXCEPTION 'GRAPHILE_DENSITY_OWNER_OR_SCHEMA_PRIVILEGE_MISMATCH';
  END IF;

  IF pg_catalog.has_database_privilege(
    'gd_runtime_20260801_a', current_database(), 'CREATE'
  ) OR NOT pg_catalog.has_database_privilege(
    'gd_runtime_20260801_a', current_database(), 'CONNECT'
  ) THEN
    RAISE EXCEPTION 'GRAPHILE_DENSITY_RUNTIME_DATABASE_PRIVILEGE_MISMATCH';
  END IF;
END
$catalog_validation$;

CREATE PROCEDURE pg_temp.validate_runtime_batch(
  batch_start integer,
  batch_end integer
)
LANGUAGE plpgsql
AS $runtime_validation$
DECLARE
  tenant_number integer;
  tenant_suffix text;
  tenant_schema text;
  expected_token text;
  expected_label text;
  function_token text;
  table_token text;
  widget_label text;
  role_row record;
BEGIN
  SELECT * INTO role_row
  FROM pg_catalog.pg_roles
  WHERE rolname = current_user;

  IF session_user <> 'gd_runtime_20260801_a'
     OR current_user <> 'gd_runtime_20260801_a'
     OR role_row.rolsuper
     OR role_row.rolcreaterole
     OR role_row.rolcreatedb
     OR role_row.rolbypassrls THEN
    RAISE EXCEPTION 'GRAPHILE_DENSITY_RUNTIME_ROLE_UNSAFE: %', current_user;
  END IF;

  FOR tenant_number IN batch_start..batch_end LOOP
    tenant_suffix := CASE
      WHEN tenant_number < 1000
        THEN pg_catalog.lpad(tenant_number::text, 3, '0')
      ELSE tenant_number::text
    END;
    tenant_schema := 'gd_t' || tenant_suffix || '_api';
    expected_token := 'tenant-' || tenant_suffix || '-token';
    expected_label := 'tenant-' || tenant_suffix || '-widget';

    IF NOT pg_catalog.has_schema_privilege(
      current_user, tenant_schema, 'USAGE'
    ) OR pg_catalog.has_schema_privilege(
      current_user, tenant_schema, 'CREATE'
    ) OR NOT pg_catalog.has_table_privilege(
      current_user,
      pg_catalog.format('%I.tenant_canary', tenant_schema),
      'SELECT'
    ) OR pg_catalog.has_table_privilege(
      current_user,
      pg_catalog.format('%I.tenant_canary', tenant_schema),
      'INSERT,UPDATE,DELETE'
    ) OR NOT pg_catalog.has_function_privilege(
      current_user,
      pg_catalog.format('%I.tenant_token()', tenant_schema),
      'EXECUTE'
    ) THEN
      RAISE EXCEPTION
        'GRAPHILE_DENSITY_RUNTIME_PRIVILEGE_MISMATCH: %', tenant_schema;
    END IF;

    EXECUTE pg_catalog.format(
      'SELECT %I.tenant_token()', tenant_schema
    ) INTO function_token;
    EXECUTE pg_catalog.format(
      'SELECT tenant_token FROM %I.tenant_canary', tenant_schema
    ) INTO table_token;
    EXECUTE pg_catalog.format(
      'SELECT label FROM %I.widget', tenant_schema
    ) INTO widget_label;

    IF function_token <> expected_token
       OR table_token <> expected_token
       OR widget_label <> expected_label THEN
      RAISE EXCEPTION
        'GRAPHILE_DENSITY_RUNTIME_CANARY_MISMATCH: schema %, function %, table %, widget %',
        tenant_schema, function_token, table_token, widget_label;
    END IF;
  END LOOP;
END
$runtime_validation$;

REVOKE ALL PRIVILEGES ON PROCEDURE
  pg_temp.validate_runtime_batch(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON PROCEDURE
  pg_temp.validate_runtime_batch(integer, integer)
  TO gd_runtime_20260801_a;

SET SESSION AUTHORIZATION gd_runtime_20260801_a;

SELECT pg_catalog.format(
  'CALL pg_temp.validate_runtime_batch(%s, %s)',
  batch_start,
  least(batch_start + 99, 4000)
)
FROM pg_catalog.generate_series(1, 4000, 100) AS batch(batch_start)
\gexec

RESET SESSION AUTHORIZATION;

DROP PROCEDURE pg_temp.validate_runtime_batch(integer, integer);

WITH normalized_classes AS (
  SELECT pg_catalog.concat_ws('|',
    CASE WHEN namespace.nspname = 'pg_toast'
      THEN 'pg_toast.<normalized>'
      ELSE namespace.nspname || '.' || class.relname
    END,
    class.relkind,
    class.relpersistence,
    class.relowner::regrole::text,
    coalesce(access_method.amname, ''),
    class.relnatts,
    class.relchecks,
    class.relhasindex,
    class.reltoastrelid <> 0,
    class.relispartition,
    coalesce(class.relacl::text, '')
  ) AS logical_class
  FROM pg_catalog.pg_class AS class
  JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = class.relnamespace
  LEFT JOIN pg_catalog.pg_am AS access_method
    ON access_method.oid = class.relam
), tenant_shapes AS (
  SELECT namespace.nspname,
    pg_catalog.concat_ws('|',
      (SELECT count(*) FROM pg_catalog.pg_class AS class
       WHERE class.relnamespace = namespace.oid),
      (SELECT count(*) FROM pg_catalog.pg_proc AS procedure
       WHERE procedure.pronamespace = namespace.oid),
      (SELECT count(*) FROM pg_catalog.pg_constraint AS constraint_row
       WHERE constraint_row.connamespace = namespace.oid),
      (SELECT pg_catalog.string_agg(
         class.relname || ':' || class.relkind::text,
         ',' ORDER BY class.relname)
       FROM pg_catalog.pg_class AS class
       WHERE class.relnamespace = namespace.oid)
    ) AS logical_shape
  FROM pg_catalog.pg_namespace AS namespace
  WHERE namespace.nspname ~ '^gd_t([0-9]{3}|[0-9]{4})_api$'
)
SELECT current_database() AS database_name,
  (SELECT count(*) FROM pg_catalog.pg_class) AS pg_class_count,
  (SELECT pg_catalog.md5(pg_catalog.string_agg(
     logical_class, E'\n' ORDER BY logical_class))
   FROM normalized_classes) AS logical_pg_class_fingerprint,
  (SELECT count(*) FROM tenant_shapes) AS tenant_schema_count,
  (SELECT count(DISTINCT logical_shape) FROM tenant_shapes)
    AS distinct_tenant_shapes,
  (SELECT pg_catalog.md5(pg_catalog.string_agg(
     nspname || '|' || logical_shape, E'\n' ORDER BY nspname))
   FROM tenant_shapes) AS tenant_shape_fingerprint;

\echo 'Uniform density fixture validation completed successfully'
