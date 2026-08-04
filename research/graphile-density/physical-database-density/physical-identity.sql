\set ON_ERROR_STOP on

-- The function body is identical in every customer database. The returned
-- value differs because current_database() is connection-bound, which makes a
-- wrong-database route conclusive without making the canonical schema drift.
CREATE OR REPLACE FUNCTION ctf_a.physical_database_identity()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
  SELECT pg_catalog.current_database()::text
$function$;

CREATE OR REPLACE FUNCTION ctf_b.physical_database_identity()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
  SELECT pg_catalog.current_database()::text
$function$;

CREATE OR REPLACE FUNCTION ctf_c.physical_database_identity()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
  SELECT pg_catalog.current_database()::text
$function$;

-- Graphile exposes VOLATILE functions on the mutation root. Selecting this
-- fixture-only sibling in the same GraphQL mutation as uploadAppFile proves
-- which physical database executed every upload invocation, including timed
-- workload calls whose upload payload cannot carry a table-stamped column.
CREATE OR REPLACE FUNCTION ctf_a.physical_database_mutation_identity()
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
  SELECT pg_catalog.current_database()::text
$function$;

CREATE OR REPLACE FUNCTION ctf_b.physical_database_mutation_identity()
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
  SELECT pg_catalog.current_database()::text
$function$;

CREATE OR REPLACE FUNCTION ctf_c.physical_database_mutation_identity()
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
  SELECT pg_catalog.current_database()::text
$function$;

-- Realtime verification must derive its database oracle inside PostgreSQL.
-- A caller-provided payload can be identical on the wrong physical database,
-- so each row carries an immutable value stamped from current_database(). The
-- BEFORE trigger overwrites both inserts and updates even if raw SQL or a
-- generated GraphQL mutation attempts to supply another value.
ALTER TABLE ctf_a.realtime_items
  ADD COLUMN physical_database_identity text;
UPDATE ctf_a.realtime_items
SET physical_database_identity = pg_catalog.current_database()::text;
ALTER TABLE ctf_a.realtime_items
  ALTER COLUMN physical_database_identity SET NOT NULL;

CREATE FUNCTION ctf_a.stamp_realtime_physical_database_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
BEGIN
  NEW.physical_database_identity := pg_catalog.current_database()::text;
  RETURN NEW;
END
$function$;

CREATE TRIGGER realtime_items_physical_database_identity
BEFORE INSERT OR UPDATE ON ctf_a.realtime_items
FOR EACH ROW EXECUTE FUNCTION ctf_a.stamp_realtime_physical_database_identity();

ALTER TABLE ctf_b.realtime_items
  ADD COLUMN physical_database_identity text;
UPDATE ctf_b.realtime_items
SET physical_database_identity = pg_catalog.current_database()::text;
ALTER TABLE ctf_b.realtime_items
  ALTER COLUMN physical_database_identity SET NOT NULL;

CREATE FUNCTION ctf_b.stamp_realtime_physical_database_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
BEGIN
  NEW.physical_database_identity := pg_catalog.current_database()::text;
  RETURN NEW;
END
$function$;

CREATE TRIGGER realtime_items_physical_database_identity
BEFORE INSERT OR UPDATE ON ctf_b.realtime_items
FOR EACH ROW EXECUTE FUNCTION ctf_b.stamp_realtime_physical_database_identity();

ALTER TABLE ctf_c.realtime_items
  ADD COLUMN physical_database_identity text;
UPDATE ctf_c.realtime_items
SET physical_database_identity = pg_catalog.current_database()::text;
ALTER TABLE ctf_c.realtime_items
  ALTER COLUMN physical_database_identity SET NOT NULL;

CREATE FUNCTION ctf_c.stamp_realtime_physical_database_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
BEGIN
  NEW.physical_database_identity := pg_catalog.current_database()::text;
  RETURN NEW;
END
$function$;

CREATE TRIGGER realtime_items_physical_database_identity
BEFORE INSERT OR UPDATE ON ctf_c.realtime_items
FOR EACH ROW EXECUTE FUNCTION ctf_c.stamp_realtime_physical_database_identity();

-- Every capability response must carry evidence derived by the physical
-- database that executed its SQL. These columns are fixture-only and are
-- stamped in PostgreSQL, so a request payload cannot forge the oracle. The
-- same trigger also covers the tables written by the upload, bulk-mutation,
-- and function-binding plugins.
CREATE PROCEDURE pg_temp.add_physical_response_oracles(schema_name text)
LANGUAGE plpgsql
AS $procedure$
DECLARE
  table_name text;
BEGIN
  IF schema_name NOT IN ('ctf_a', 'ctf_b', 'ctf_c') THEN
    RAISE EXCEPTION 'PDCF_UNKNOWN_TENANT_SCHEMA:%', schema_name;
  END IF;

  FOREACH table_name IN ARRAY ARRAY[
    'documents',
    'posts',
    'posts_translations',
    'articles',
    'articles_chunks',
    'bulk_items',
    'app_files',
    'function_invocations'
  ]
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ADD COLUMN physical_database_identity text',
      schema_name,
      table_name
    );
    EXECUTE format(
      'UPDATE %I.%I SET physical_database_identity = pg_catalog.current_database()::text',
      schema_name,
      table_name
    );
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN physical_database_identity SET NOT NULL',
      schema_name,
      table_name
    );
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN physical_database_identity SET DEFAULT pg_catalog.current_database()::text',
      schema_name,
      table_name
    );
  END LOOP;

  -- The i18n and RAG plugins return derived/custom shapes rather than every
  -- source-table column. Stamp their returned text as an operation-specific
  -- oracle in addition to the root/database field selected by the probe.
  EXECUTE format(
    'UPDATE %I.posts_translations SET title = title || %L || pg_catalog.current_database()::text',
    schema_name,
    ' @'
  );
  EXECUTE format(
    'UPDATE %I.articles_chunks SET content = content || %L || pg_catalog.current_database()::text',
    schema_name,
    ' @'
  );

  EXECUTE format($ddl$
    CREATE FUNCTION %I.stamp_physical_database_identity()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY INVOKER
    SET search_path = pg_catalog
    AS $function$
    BEGIN
      NEW.physical_database_identity := pg_catalog.current_database()::text;
      RETURN NEW;
    END
    $function$
  $ddl$, schema_name);

  FOREACH table_name IN ARRAY ARRAY[
    'documents',
    'posts',
    'posts_translations',
    'articles',
    'articles_chunks',
    'bulk_items',
    'app_files',
    'function_invocations'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON %I.%I FOR EACH ROW EXECUTE FUNCTION %I.stamp_physical_database_identity()',
      table_name || '_physical_database_identity',
      schema_name,
      table_name,
      schema_name
    );
  END LOOP;
END
$procedure$;

CALL pg_temp.add_physical_response_oracles('ctf_a');
CALL pg_temp.add_physical_response_oracles('ctf_b');
CALL pg_temp.add_physical_response_oracles('ctf_c');

REVOKE ALL ON FUNCTION ctf_a.physical_database_identity() FROM PUBLIC;
REVOKE ALL ON FUNCTION ctf_b.physical_database_identity() FROM PUBLIC;
REVOKE ALL ON FUNCTION ctf_c.physical_database_identity() FROM PUBLIC;
REVOKE ALL ON FUNCTION ctf_a.physical_database_mutation_identity() FROM PUBLIC;
REVOKE ALL ON FUNCTION ctf_b.physical_database_mutation_identity() FROM PUBLIC;
REVOKE ALL ON FUNCTION ctf_c.physical_database_mutation_identity() FROM PUBLIC;
REVOKE ALL ON FUNCTION ctf_a.stamp_realtime_physical_database_identity() FROM PUBLIC;
REVOKE ALL ON FUNCTION ctf_b.stamp_realtime_physical_database_identity() FROM PUBLIC;
REVOKE ALL ON FUNCTION ctf_c.stamp_realtime_physical_database_identity() FROM PUBLIC;
REVOKE ALL ON FUNCTION ctf_a.stamp_physical_database_identity() FROM PUBLIC;
REVOKE ALL ON FUNCTION ctf_b.stamp_physical_database_identity() FROM PUBLIC;
REVOKE ALL ON FUNCTION ctf_c.stamp_physical_database_identity() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION ctf_a.physical_database_identity() TO :"runtime_role_a";
GRANT EXECUTE ON FUNCTION ctf_b.physical_database_identity() TO :"runtime_role_b";
GRANT EXECUTE ON FUNCTION ctf_c.physical_database_identity() TO :"runtime_role_c";
GRANT EXECUTE ON FUNCTION ctf_a.physical_database_mutation_identity() TO :"runtime_role_a";
GRANT EXECUTE ON FUNCTION ctf_b.physical_database_mutation_identity() TO :"runtime_role_b";
GRANT EXECUTE ON FUNCTION ctf_c.physical_database_mutation_identity() TO :"runtime_role_c";
GRANT EXECUTE ON FUNCTION ctf_a.stamp_realtime_physical_database_identity() TO :"runtime_role_a";
GRANT EXECUTE ON FUNCTION ctf_b.stamp_realtime_physical_database_identity() TO :"runtime_role_b";
GRANT EXECUTE ON FUNCTION ctf_c.stamp_realtime_physical_database_identity() TO :"runtime_role_c";
GRANT EXECUTE ON FUNCTION ctf_a.stamp_physical_database_identity() TO :"runtime_role_a";
GRANT EXECUTE ON FUNCTION ctf_b.stamp_physical_database_identity() TO :"runtime_role_b";
GRANT EXECUTE ON FUNCTION ctf_c.stamp_physical_database_identity() TO :"runtime_role_c";
