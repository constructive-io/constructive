\set ON_ERROR_STOP on
\pset pager off

-- Rebuilds the local density fixture without modifying its source database.
-- This is a psql script, not generic SQL. Run it as a PostgreSQL administrator:
--
--   psql -X -d postgres \
--     -f research/graphile-density/create-uniform-density-fixture.sql
--
-- The target name is intentionally fixed. The script fails closed when the
-- target already exists; it never replaces or drops a database. `-v resume=1`
-- is only for continuing a clone that passed the pristine-source assertions
-- but stopped before tenant DDL; those assertions run again before mutation.
--
-- PERFORMANCE-ONLY ROUTING CANARY: the shared gd_runtime_20260801_a login has
-- SELECT/EXECUTE access across every tenant schema. This fixture brackets the
-- Graphile memory-density curve; it does not prove database-enforced tenant
-- isolation and cannot qualify a complete customer surface for production.

\if :{?resume}
\else
  \set resume 0
\endif

\echo 'Preflighting source, target, and runtime role'
\echo 'PERFORMANCE_ONLY_ROUTING_CANARY: this fixture is not a tenant-isolation proof'

SELECT EXISTS (
  SELECT 1 FROM pg_catalog.pg_database
  WHERE datname = 'graphile_density_20260801_a'
) AS source_exists,
EXISTS (
  SELECT 1 FROM pg_catalog.pg_database
  WHERE datname = 'graphile_density_uniform_20260801_a'
) AS target_exists,
EXISTS (
  SELECT 1 FROM pg_catalog.pg_roles
  WHERE rolname = 'gd_runtime_20260801_a'
) AS runtime_role_exists
\gset

\if :source_exists
\else
  \echo 'GRAPHILE_DENSITY_SOURCE_MISSING: graphile_density_20260801_a'
  \quit 3
\endif

\if :target_exists
  \if :resume
    \echo 'Resuming explicitly against the existing asserted-pristine clone'
  \else
    \echo 'GRAPHILE_DENSITY_TARGET_EXISTS: graphile_density_uniform_20260801_a'
    \quit 4
  \endif
\endif

\if :runtime_role_exists
\else
  \echo 'GRAPHILE_DENSITY_RUNTIME_ROLE_MISSING: gd_runtime_20260801_a'
  \quit 5
\endif

\echo 'Creating immutable physical clone graphile_density_uniform_20260801_a'

\if :target_exists
\else
  CREATE DATABASE graphile_density_uniform_20260801_a
    WITH TEMPLATE graphile_density_20260801_a
    OWNER postgres;
\endif

\connect graphile_density_uniform_20260801_a

SET client_min_messages = warning;
SET statement_timeout = 0;
SET lock_timeout = '30s';
SET idle_in_transaction_session_timeout = '5min';

REVOKE CREATE ON DATABASE graphile_density_uniform_20260801_a
  FROM PUBLIC, gd_runtime_20260801_a;
GRANT CONNECT ON DATABASE graphile_density_uniform_20260801_a
  TO gd_runtime_20260801_a;

\echo 'Validating the cloned heterogeneous source shape'

DO $preflight$
DECLARE
  class_count integer;
  tenant_schema_count integer;
  full_schema_count integer;
  function_only_schema_count integer;
BEGIN
  SELECT count(*) INTO class_count FROM pg_catalog.pg_class;
  IF class_count <> 61239 THEN
    RAISE EXCEPTION
      'GRAPHILE_DENSITY_SOURCE_CLASS_COUNT_MISMATCH: expected 61239, got %',
      class_count;
  END IF;

  WITH tenant_shapes AS (
    SELECT namespace.nspname,
      (SELECT count(*)
       FROM pg_catalog.pg_class AS class
       WHERE class.relnamespace = namespace.oid) AS class_count,
      (SELECT count(*)
       FROM pg_catalog.pg_proc AS procedure
       WHERE procedure.pronamespace = namespace.oid) AS proc_count,
      (SELECT count(*)
       FROM pg_catalog.pg_constraint AS constraint_row
       WHERE constraint_row.connamespace = namespace.oid) AS constraint_count
    FROM pg_catalog.pg_namespace AS namespace
    WHERE namespace.nspname ~ '^gd_t([0-9]{3}|[0-9]{4})_api$'
  )
  SELECT count(*),
    count(*) FILTER (
      WHERE tenant_shapes.class_count = 7
        AND tenant_shapes.proc_count = 1
        AND tenant_shapes.constraint_count = 9
    ),
    count(*) FILTER (
      WHERE tenant_shapes.class_count = 0
        AND tenant_shapes.proc_count = 1
        AND tenant_shapes.constraint_count = 0
    )
  INTO tenant_schema_count, full_schema_count, function_only_schema_count
  FROM tenant_shapes;

  IF tenant_schema_count <> 2000
     OR full_schema_count <> 400
     OR function_only_schema_count <> 1600 THEN
    RAISE EXCEPTION
      'GRAPHILE_DENSITY_SOURCE_SHAPE_MISMATCH: schemas %, full %, function-only %',
      tenant_schema_count, full_schema_count, function_only_schema_count;
  END IF;
END
$preflight$;

-- DDL is deliberately split into 100-tenant transactions. A single
-- transaction would retain locks for tens of thousands of new relations and
-- can exhaust max_locks_per_transaction on an otherwise healthy local server.
CREATE PROCEDURE pg_temp.create_uniform_tenants(
  batch_start integer,
  batch_end integer
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
  tenant_number integer;
  tenant_suffix text;
  tenant_schema text;
  tenant_token text;
BEGIN
  FOR tenant_number IN batch_start..batch_end LOOP
    tenant_suffix := CASE
      WHEN tenant_number < 1000
        THEN pg_catalog.lpad(tenant_number::text, 3, '0')
      ELSE tenant_number::text
    END;
    tenant_schema := 'gd_t' || tenant_suffix || '_api';
    tenant_token := 'tenant-' || tenant_suffix || '-token';

    IF tenant_number > 2000 THEN
      EXECUTE pg_catalog.format(
        'CREATE SCHEMA %I AUTHORIZATION postgres',
        tenant_schema
      );
    END IF;

    EXECUTE pg_catalog.format(
      'CREATE OR REPLACE FUNCTION %I.tenant_token()'
      ' RETURNS text LANGUAGE sql STABLE AS %L',
      tenant_schema,
      'SELECT ' || pg_catalog.quote_literal(tenant_token) || '::text'
    );

    EXECUTE pg_catalog.format(
      'CREATE TABLE %I.tenant_canary ('
      ' id bigint GENERATED ALWAYS AS IDENTITY,'
      ' tenant_token text NOT NULL,'
      ' CONSTRAINT tenant_canary_pkey PRIMARY KEY (id),'
      ' CONSTRAINT tenant_canary_tenant_token_key UNIQUE (tenant_token)'
      ')',
      tenant_schema
    );

    EXECUTE pg_catalog.format(
      'CREATE TABLE %I.widget ('
      ' id bigint GENERATED ALWAYS AS IDENTITY,'
      ' canary_id bigint NOT NULL,'
      ' label text NOT NULL,'
      ' CONSTRAINT widget_pkey PRIMARY KEY (id),'
      ' CONSTRAINT widget_canary_id_fkey FOREIGN KEY (canary_id)'
      '   REFERENCES %I.tenant_canary(id)'
      ')',
      tenant_schema,
      tenant_schema
    );
  END LOOP;
END
$procedure$;

SELECT pg_catalog.format(
  'CALL pg_temp.create_uniform_tenants(%s, %s)',
  batch_start,
  least(batch_start + 99, 4000)
)
FROM pg_catalog.generate_series(401, 4000, 100) AS batch(batch_start)
\gexec

DROP PROCEDURE pg_temp.create_uniform_tenants(integer, integer);

DO $intermediate_count$
DECLARE
  class_count integer;
BEGIN
  SELECT count(*) INTO class_count FROM pg_catalog.pg_class;
  IF class_count <> 100839 THEN
    RAISE EXCEPTION
      'GRAPHILE_DENSITY_UNIFORM_CLASS_DELTA_MISMATCH: expected 100839, got %',
      class_count;
  END IF;
END
$intermediate_count$;

\echo 'Normalizing ownership, grants, identity state, and canary rows'

CREATE PROCEDURE pg_temp.normalize_uniform_tenants(
  batch_start integer,
  batch_end integer
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
  tenant_number integer;
  tenant_suffix text;
  tenant_schema text;
  tenant_token text;
  widget_label text;
BEGIN
  FOR tenant_number IN batch_start..batch_end LOOP
    tenant_suffix := CASE
      WHEN tenant_number < 1000
        THEN pg_catalog.lpad(tenant_number::text, 3, '0')
      ELSE tenant_number::text
    END;
    tenant_schema := 'gd_t' || tenant_suffix || '_api';
    tenant_token := 'tenant-' || tenant_suffix || '-token';
    widget_label := 'tenant-' || tenant_suffix || '-widget';

    EXECUTE pg_catalog.format('ALTER SCHEMA %I OWNER TO postgres', tenant_schema);
    EXECUTE pg_catalog.format(
      'ALTER TABLE %I.tenant_canary OWNER TO postgres', tenant_schema
    );
    EXECUTE pg_catalog.format(
      'ALTER TABLE %I.widget OWNER TO postgres', tenant_schema
    );
    EXECUTE pg_catalog.format(
      'ALTER FUNCTION %I.tenant_token() OWNER TO postgres', tenant_schema
    );

    EXECUTE pg_catalog.format(
      'TRUNCATE TABLE %I.widget, %I.tenant_canary RESTART IDENTITY',
      tenant_schema,
      tenant_schema
    );
    EXECUTE pg_catalog.format(
      'INSERT INTO %I.tenant_canary (tenant_token) VALUES (%L)',
      tenant_schema,
      tenant_token
    );
    EXECUTE pg_catalog.format(
      'INSERT INTO %I.widget (canary_id, label) VALUES (1, %L)',
      tenant_schema,
      widget_label
    );

    EXECUTE pg_catalog.format(
      'REVOKE ALL PRIVILEGES ON SCHEMA %I'
      ' FROM PUBLIC, postgres, gd_runtime_20260801_a',
      tenant_schema
    );
    EXECUTE pg_catalog.format(
      'GRANT ALL PRIVILEGES ON SCHEMA %I TO postgres', tenant_schema
    );
    EXECUTE pg_catalog.format(
      'GRANT USAGE ON SCHEMA %I TO gd_runtime_20260801_a', tenant_schema
    );

    EXECUTE pg_catalog.format(
      'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA %I'
      ' FROM PUBLIC, postgres, gd_runtime_20260801_a',
      tenant_schema
    );
    EXECUTE pg_catalog.format(
      'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA %I TO postgres',
      tenant_schema
    );
    EXECUTE pg_catalog.format(
      'GRANT SELECT ON ALL TABLES IN SCHEMA %I TO gd_runtime_20260801_a',
      tenant_schema
    );

    EXECUTE pg_catalog.format(
      'REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA %I'
      ' FROM PUBLIC, postgres, gd_runtime_20260801_a',
      tenant_schema
    );
    EXECUTE pg_catalog.format(
      'GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA %I TO postgres',
      tenant_schema
    );
    EXECUTE pg_catalog.format(
      'GRANT SELECT, USAGE ON ALL SEQUENCES IN SCHEMA %I'
      ' TO gd_runtime_20260801_a',
      tenant_schema
    );

    EXECUTE pg_catalog.format(
      'REVOKE ALL PRIVILEGES ON FUNCTION %I.tenant_token()'
      ' FROM PUBLIC, postgres, gd_runtime_20260801_a',
      tenant_schema
    );
    EXECUTE pg_catalog.format(
      'GRANT ALL PRIVILEGES ON FUNCTION %I.tenant_token() TO postgres',
      tenant_schema
    );
    EXECUTE pg_catalog.format(
      'GRANT EXECUTE ON FUNCTION %I.tenant_token()'
      ' TO gd_runtime_20260801_a',
      tenant_schema
    );
  END LOOP;
END
$procedure$;

SELECT pg_catalog.format(
  'CALL pg_temp.normalize_uniform_tenants(%s, %s)',
  batch_start,
  least(batch_start + 99, 4000)
)
FROM pg_catalog.generate_series(1, 4000, 100) AS batch(batch_start)
\gexec

DROP PROCEDURE pg_temp.normalize_uniform_tenants(integer, integer);

\echo 'Planning a footprint-exact reduction of disposable gd_noise tables'

CREATE TEMPORARY TABLE noise_drop_plan ON COMMIT PRESERVE ROWS AS
WITH noise_tables AS (
  SELECT class.oid, class.relname, class.reltoastrelid,
    1
    + (
      SELECT count(*)
      FROM pg_catalog.pg_index AS table_index
      WHERE table_index.indrelid = class.oid
    )
    + (
      SELECT count(*)
      FROM pg_catalog.pg_depend AS sequence_dependency
      JOIN pg_catalog.pg_class AS sequence
        ON sequence.oid = sequence_dependency.objid
       AND sequence.relkind = 'S'
      WHERE sequence_dependency.classid = 'pg_catalog.pg_class'::regclass
        AND sequence_dependency.refclassid = 'pg_catalog.pg_class'::regclass
        AND sequence_dependency.refobjid = class.oid
        AND sequence_dependency.deptype = 'i'
    )
    + CASE WHEN class.reltoastrelid = 0 THEN 0 ELSE 1 END
    + (
      SELECT count(*)
      FROM pg_catalog.pg_index AS toast_index
      WHERE toast_index.indrelid = class.reltoastrelid
    ) AS class_footprint
  FROM pg_catalog.pg_class AS class
  JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = class.relnamespace
  WHERE namespace.nspname = 'gd_noise'
    AND class.relkind = 'r'
), candidates AS (
  SELECT relname, class_footprint,
    substring(relname FROM '^r_([0-9]+)$')::integer AS noise_number
  FROM noise_tables
  WHERE class_footprint = 5
)
SELECT row_number() OVER (ORDER BY noise_number DESC) AS ordinal,
  relname,
  class_footprint
FROM candidates
ORDER BY noise_number DESC
LIMIT 7920;

DO $drop_plan$
DECLARE
  candidate_count integer;
  planned_footprint integer;
BEGIN
  SELECT count(*), sum(class_footprint)
  INTO candidate_count, planned_footprint
  FROM pg_temp.noise_drop_plan;

  IF candidate_count <> 7920 OR planned_footprint <> 39600 THEN
    RAISE EXCEPTION
      'GRAPHILE_DENSITY_NOISE_PLAN_MISMATCH: tables %, pg_class footprint %',
      candidate_count, planned_footprint;
  END IF;
END
$drop_plan$;

CREATE PROCEDURE pg_temp.drop_noise_batch(
  batch_start integer,
  batch_end integer
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
  candidate record;
BEGIN
  FOR candidate IN
    SELECT relname
    FROM pg_temp.noise_drop_plan
    WHERE ordinal BETWEEN batch_start AND batch_end
    ORDER BY ordinal
  LOOP
    EXECUTE pg_catalog.format(
      'DROP TABLE gd_noise.%I CASCADE',
      candidate.relname
    );
  END LOOP;
END
$procedure$;

SELECT pg_catalog.format(
  'CALL pg_temp.drop_noise_batch(%s, %s)',
  batch_start,
  least(batch_start + 99, 7920)
)
FROM pg_catalog.generate_series(1, 7920, 100) AS batch(batch_start)
\gexec

DROP PROCEDURE pg_temp.drop_noise_batch(integer, integer);
DROP TABLE pg_temp.noise_drop_plan;

\echo 'Analyzing the catalog tables used by Graphile introspection'

ANALYZE pg_catalog.pg_namespace;
ANALYZE pg_catalog.pg_class;
ANALYZE pg_catalog.pg_attribute;
ANALYZE pg_catalog.pg_constraint;
ANALYZE pg_catalog.pg_proc;
ANALYZE pg_catalog.pg_depend;
ANALYZE pg_catalog.pg_index;

\echo 'Hard-gating the uniform tenant shape and exact catalog count'

DO $uniform_shape$
DECLARE
  class_count integer;
  tenant_schema_count integer;
  distinct_shape_count integer;
  missing_schema_count integer;
BEGIN
  SELECT count(*) INTO class_count FROM pg_catalog.pg_class;
  IF class_count <> 61239 THEN
    RAISE EXCEPTION
      'GRAPHILE_DENSITY_FINAL_CLASS_COUNT_MISMATCH: expected 61239, got %',
      class_count;
  END IF;

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
  ), difference AS (
    (SELECT nspname FROM expected EXCEPT SELECT nspname FROM actual)
    UNION ALL
    (SELECT nspname FROM actual EXCEPT SELECT nspname FROM expected)
  )
  SELECT (SELECT count(*) FROM actual), count(*)
  INTO tenant_schema_count, missing_schema_count
  FROM difference;

  IF tenant_schema_count <> 4000 OR missing_schema_count <> 0 THEN
    RAISE EXCEPTION
      'GRAPHILE_DENSITY_SCHEMA_SET_MISMATCH: actual %, symmetric difference %',
      tenant_schema_count, missing_schema_count;
  END IF;

  WITH tenant_shapes AS (
    SELECT namespace.nspname,
      pg_catalog.md5(pg_catalog.concat_ws('|',
        namespace.nspowner::regrole::text,
        coalesce(namespace.nspacl::text, ''),
        (
          SELECT pg_catalog.string_agg(
            pg_catalog.concat_ws(':', class.relname, class.relkind,
              class.relowner::regrole::text, coalesce(class.relacl::text, '')),
            ',' ORDER BY class.relname
          )
          FROM pg_catalog.pg_class AS class
          WHERE class.relnamespace = namespace.oid
        ),
        (
          SELECT pg_catalog.string_agg(
            pg_catalog.concat_ws(':', class.relname, attribute.attnum,
              attribute.attname,
              pg_catalog.format_type(attribute.atttypid, attribute.atttypmod),
              attribute.attnotnull, attribute.attidentity,
              attribute.attgenerated),
            ',' ORDER BY class.relname, attribute.attnum
          )
          FROM pg_catalog.pg_class AS class
          JOIN pg_catalog.pg_attribute AS attribute
            ON attribute.attrelid = class.oid
          WHERE class.relnamespace = namespace.oid
            AND class.relkind = 'r'
            AND attribute.attnum > 0
            AND NOT attribute.attisdropped
        ),
        (
          SELECT pg_catalog.string_agg(
            pg_catalog.concat_ws(':', constraint_row.conname,
              constraint_row.contype, constraint_row.conkey::text,
              constraint_row.confkey::text,
              coalesce(referenced_class.relname, '')),
            ',' ORDER BY constraint_row.conname
          )
          FROM pg_catalog.pg_constraint AS constraint_row
          LEFT JOIN pg_catalog.pg_class AS referenced_class
            ON referenced_class.oid = constraint_row.confrelid
          WHERE constraint_row.connamespace = namespace.oid
        ),
        (
          SELECT pg_catalog.string_agg(
            pg_catalog.concat_ws(':', procedure.proname,
              pg_catalog.pg_get_function_identity_arguments(procedure.oid),
              pg_catalog.pg_get_function_result(procedure.oid),
              procedure.provolatile, procedure.prosecdef,
              procedure.proowner::regrole::text,
              coalesce(procedure.proacl::text, '')),
            ',' ORDER BY procedure.proname
          )
          FROM pg_catalog.pg_proc AS procedure
          WHERE procedure.pronamespace = namespace.oid
        ),
        (
          SELECT pg_catalog.string_agg(
            pg_catalog.concat_ws(':', sequence.sequencename,
              sequence.data_type, sequence.start_value,
              sequence.min_value, sequence.max_value,
              sequence.increment_by, sequence.cycle,
              sequence.cache_size, sequence.last_value),
            ',' ORDER BY sequence.sequencename
          )
          FROM pg_catalog.pg_sequences AS sequence
          WHERE sequence.schemaname = namespace.nspname
        )
      )) AS shape_fingerprint
    FROM pg_catalog.pg_namespace AS namespace
    WHERE namespace.nspname ~ '^gd_t([0-9]{3}|[0-9]{4})_api$'
  )
  SELECT count(DISTINCT shape_fingerprint)
  INTO distinct_shape_count
  FROM tenant_shapes;

  IF distinct_shape_count <> 1 THEN
    RAISE EXCEPTION
      'GRAPHILE_DENSITY_NON_UNIFORM_SHAPE: % distinct fingerprints',
      distinct_shape_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_namespace AS namespace
    WHERE namespace.nspname ~ '^gd_t([0-9]{3}|[0-9]{4})_api$'
      AND (
        (SELECT count(*) FROM pg_catalog.pg_class AS class
         WHERE class.relnamespace = namespace.oid) <> 7
        OR
        (SELECT count(*) FROM pg_catalog.pg_proc AS procedure
         WHERE procedure.pronamespace = namespace.oid) <> 1
        OR
        (SELECT count(*) FROM pg_catalog.pg_constraint AS constraint_row
         WHERE constraint_row.connamespace = namespace.oid) <> 9
      )
  ) THEN
    RAISE EXCEPTION
      'GRAPHILE_DENSITY_NON_UNIFORM_COUNTS: expected class/proc/constraint 7/1/9';
  END IF;

  IF EXISTS (
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
    RAISE EXCEPTION 'GRAPHILE_DENSITY_OWNER_MISMATCH';
  END IF;
END
$uniform_shape$;

\echo 'Validating all 4,000 surfaces under the runtime identity'

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

  IF NOT pg_catalog.has_database_privilege(
    current_user, current_database(), 'CONNECT'
  ) OR pg_catalog.has_database_privilege(
    current_user, current_database(), 'CREATE'
  ) THEN
    RAISE EXCEPTION 'GRAPHILE_DENSITY_RUNTIME_DATABASE_PRIVILEGE_MISMATCH';
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
    ) THEN
      RAISE EXCEPTION
        'GRAPHILE_DENSITY_RUNTIME_SCHEMA_PRIVILEGE_MISMATCH: %',
        tenant_schema;
    END IF;

    IF NOT pg_catalog.has_table_privilege(
      current_user,
      pg_catalog.format('%I.tenant_canary', tenant_schema),
      'SELECT'
    ) OR pg_catalog.has_table_privilege(
      current_user,
      pg_catalog.format('%I.tenant_canary', tenant_schema),
      'INSERT,UPDATE,DELETE'
    ) THEN
      RAISE EXCEPTION
        'GRAPHILE_DENSITY_RUNTIME_TABLE_PRIVILEGE_MISMATCH: %',
        tenant_schema;
    END IF;

    IF NOT pg_catalog.has_function_privilege(
      current_user,
      pg_catalog.format('%I.tenant_token()', tenant_schema),
      'EXECUTE'
    ) THEN
      RAISE EXCEPTION
        'GRAPHILE_DENSITY_RUNTIME_FUNCTION_PRIVILEGE_MISMATCH: %',
        tenant_schema;
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

\echo 'Recording deterministic logical catalog and tenant-shape fingerprints'

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

\echo 'Uniform density fixture completed successfully'
