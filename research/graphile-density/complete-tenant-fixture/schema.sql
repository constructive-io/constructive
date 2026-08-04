\set ON_ERROR_STOP on

\if :{?runtime_role_a}
\else
  \echo 'CTF_SETUP_RUNTIME_ROLE_REQUIRED: pass --set=runtime_role_a=<least-privilege-role>'
  \quit 3
\endif
\if :{?runtime_role_b}
\else
  \echo 'CTF_SETUP_RUNTIME_ROLE_REQUIRED: pass --set=runtime_role_b=<least-privilege-role>'
  \quit 3
\endif
\if :{?runtime_role_c}
\else
  \echo 'CTF_SETUP_RUNTIME_ROLE_REQUIRED: pass --set=runtime_role_c=<least-privilege-role>'
  \quit 3
\endif

-- psql deliberately does not interpolate variables inside dollar-quoted PL/pgSQL
-- bodies. Materialize the three safely quoted values as data before entering any
-- DO block, then read them through pg_temp below.
CREATE TEMP TABLE ctf_runtime_roles (
  ordinal smallint PRIMARY KEY,
  role_name name NOT NULL UNIQUE
);
INSERT INTO ctf_runtime_roles (ordinal, role_name) VALUES
  (1, :'runtime_role_a'),
  (2, :'runtime_role_b'),
  (3, :'runtime_role_c');

DO $roles$
DECLARE
  runtime_roles text[];
  runtime_role text;
  role_record pg_catalog.pg_roles%ROWTYPE;
BEGIN
  SELECT pg_catalog.array_agg(role_name::text ORDER BY ordinal)
    INTO runtime_roles
    FROM pg_temp.ctf_runtime_roles;
  IF pg_catalog.array_length(runtime_roles, 1) <> 3
     OR (SELECT pg_catalog.count(DISTINCT value) FROM pg_catalog.unnest(runtime_roles) AS value) <> 3 THEN
    RAISE EXCEPTION 'CTF_RUNTIME_ROLES_MUST_BE_DISTINCT';
  END IF;

  FOREACH runtime_role IN ARRAY runtime_roles
  LOOP
    SELECT * INTO role_record
      FROM pg_catalog.pg_roles
     WHERE rolname = runtime_role;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'CTF_RUNTIME_ROLE_NOT_FOUND:%', runtime_role;
    END IF;
    IF NOT role_record.rolcanlogin
       OR role_record.rolinherit
       OR role_record.rolsuper
       OR role_record.rolbypassrls
       OR role_record.rolcreaterole
       OR role_record.rolcreatedb
       OR role_record.rolreplication THEN
      RAISE EXCEPTION 'CTF_RUNTIME_ROLE_UNSAFE:%', runtime_role;
    END IF;
  END LOOP;
END
$roles$;

CREATE SCHEMA ctf_extensions;
CREATE EXTENSION vector WITH SCHEMA ctf_extensions;
CREATE EXTENSION pg_trgm WITH SCHEMA ctf_extensions;
CREATE EXTENSION pg_textsearch WITH SCHEMA ctf_extensions;
CREATE EXTENSION ltree WITH SCHEMA ctf_extensions;
CREATE EXTENSION postgis WITH SCHEMA ctf_extensions;

-- A shared notification login must be able to CONNECT and LISTEN without
-- inheriting PostgreSQL's default PUBLIC access to application metadata or
-- extension routines. Runtime roles receive the exact extension capabilities
-- they need explicitly below.
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA ctf_extensions FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA ctf_extensions FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA ctf_extensions FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ctf_extensions FROM PUBLIC;

-- PostGIS creates these compatibility views with PostgreSQL's historical
-- owner-rights default. They are dependency metadata, not part of a tenant API;
-- keep any future access under the caller's privileges and remove the PUBLIC
-- read grant before approving ctf_extensions as a runtime dependency schema.
ALTER VIEW ctf_extensions.geometry_columns SET (security_invoker = true);
ALTER VIEW ctf_extensions.geography_columns SET (security_invoker = true);
REVOKE ALL ON ctf_extensions.geometry_columns FROM PUBLIC;
REVOKE ALL ON ctf_extensions.geography_columns FROM PUBLIC;

DO $fixture$
DECLARE
  extension_name text;
  extension_schema text;
BEGIN
  FOREACH extension_name IN ARRAY ARRAY['vector', 'pg_trgm', 'pg_textsearch', 'ltree', 'postgis']
  LOOP
    SELECT n.nspname
      INTO extension_schema
      FROM pg_catalog.pg_extension e
      JOIN pg_catalog.pg_namespace n ON n.oid = e.extnamespace
     WHERE e.extname = extension_name;
    IF extension_schema IS DISTINCT FROM 'ctf_extensions' THEN
      RAISE EXCEPTION 'CTF_EXTENSION_SCHEMA_MISMATCH:%:%', extension_name, extension_schema;
    END IF;
  END LOOP;
END
$fixture$;

SET search_path TO pg_catalog, ctf_extensions;

CREATE SCHEMA jwt_private;
REVOKE ALL ON SCHEMA jwt_private FROM PUBLIC;

CREATE FUNCTION jwt_private.current_database_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = pg_catalog
AS $function$
  SELECT nullif(current_setting('jwt.claims.database_id', true), '')::uuid
$function$;
REVOKE ALL ON FUNCTION jwt_private.current_database_id() FROM PUBLIC;

CREATE SCHEMA ctf_control;
REVOKE ALL ON SCHEMA ctf_control FROM PUBLIC;

CREATE PROCEDURE pg_temp.create_complete_tenant(
  schema_name text,
  tenant_token text,
  database_id uuid,
  runtime_role text,
  metadata_function text,
  storage_module_id uuid,
  bucket_id uuid,
  binding_id uuid,
  definition_id uuid
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
  table_name text;
  fn_body text;
  realtime_schema_name text;
BEGIN
  IF schema_name NOT IN ('ctf_a', 'ctf_b', 'ctf_c') THEN
    RAISE EXCEPTION 'CTF_UNKNOWN_TENANT_SCHEMA:%', schema_name;
  END IF;

  EXECUTE format('CREATE SCHEMA %I', schema_name);
  EXECUTE format('REVOKE ALL ON SCHEMA %I FROM PUBLIC', schema_name);

  realtime_schema_name := schema_name || '_realtime';
  EXECUTE format('CREATE SCHEMA %I', realtime_schema_name);
  EXECUTE format('REVOKE ALL ON SCHEMA %I FROM PUBLIC', realtime_schema_name);
  EXECUTE format(
    'CREATE FUNCTION %I.touch_listener(node_id text) RETURNS void LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = pg_catalog AS %L',
    realtime_schema_name,
    'SELECT NULL::void'
  );
  EXECUTE format(
    'CREATE FUNCTION %I.drain_changes(node_id text, batch_limit integer) RETURNS SETOF jsonb LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = pg_catalog AS %L',
    realtime_schema_name,
    'SELECT NULL::jsonb WHERE false'
  );
  EXECUTE format(
    'CREATE FUNCTION %I.cleanup_ephemeral(node_id text) RETURNS void LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = pg_catalog AS %L',
    realtime_schema_name,
    'SELECT NULL::void'
  );
  EXECUTE format(
    'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA %I FROM PUBLIC',
    realtime_schema_name
  );
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO %I', realtime_schema_name, runtime_role);
  EXECUTE format(
    'GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA %I TO %I',
    realtime_schema_name,
    runtime_role
  );

  EXECUTE format($sql$
    CREATE TABLE %I.tenant_canary (
      id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      database_id uuid NOT NULL DEFAULT %L::uuid,
      tenant_id text NOT NULL DEFAULT %L,
      secret text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT clock_timestamp()
    )
  $sql$, schema_name, database_id, tenant_token);

  EXECUTE format($sql$
    CREATE TABLE %I.documents (
      id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      database_id uuid NOT NULL DEFAULT %L::uuid,
      tenant_id text NOT NULL DEFAULT %L,
      title text NOT NULL,
      body text NOT NULL,
      tsv tsvector NOT NULL,
      embedding ctf_extensions.vector(3) NOT NULL,
      location ctf_extensions.geometry(Point, 4326) NOT NULL,
      path ctf_extensions.ltree NOT NULL,
      attachment text
    )
  $sql$, schema_name, database_id, tenant_token);
  EXECUTE format('COMMENT ON COLUMN %I.documents.attachment IS %L', schema_name, E'@upload');
  EXECUTE format('CREATE INDEX documents_tsv_idx ON %I.documents USING gin (tsv)', schema_name);
  EXECUTE format(
    'CREATE INDEX documents_embedding_idx ON %I.documents USING ivfflat (embedding ctf_extensions.vector_cosine_ops) WITH (lists = 1)',
    schema_name
  );
  EXECUTE format('CREATE INDEX documents_body_bm25_idx ON %I.documents USING bm25 (body) WITH (text_config = %L)', schema_name, 'english');
  EXECUTE format('CREATE INDEX documents_title_trgm_idx ON %I.documents USING gin (title ctf_extensions.gin_trgm_ops)', schema_name);
  EXECUTE format('CREATE INDEX documents_location_idx ON %I.documents USING gist (location)', schema_name);
  EXECUTE format('CREATE INDEX documents_path_idx ON %I.documents USING gist (path)', schema_name);

  EXECUTE format($sql$
    INSERT INTO %I.documents (id, title, body, tsv, embedding, location, path, attachment)
    VALUES (
      1,
      %L,
      %L,
      to_tsvector('english', %L),
      '[1,0,0]'::ctf_extensions.vector,
      ctf_extensions.st_setsrid(ctf_extensions.st_makepoint(106.7, 10.8), 4326),
      'root.%s'::ctf_extensions.ltree,
      'fixture://%s/document.txt'
    )
  $sql$,
    schema_name,
    tenant_token || ' Machine Learning',
    tenant_token || ' machine learning artificial intelligence',
    tenant_token || ' machine learning artificial intelligence',
    right(schema_name, 1),
    tenant_token
  );

  EXECUTE format($sql$
    CREATE TABLE %I.posts (
      id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      database_id uuid NOT NULL DEFAULT %L::uuid,
      tenant_id text NOT NULL DEFAULT %L,
      title text NOT NULL,
      body text
    )
  $sql$, schema_name, database_id, tenant_token);
  EXECUTE format('COMMENT ON TABLE %I.posts IS %L', schema_name, E'@i18n posts_translations');
  EXECUTE format($sql$
    CREATE TABLE %I.posts_translations (
      id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      database_id uuid NOT NULL DEFAULT %L::uuid,
      post_id integer NOT NULL REFERENCES %I.posts(id) ON DELETE CASCADE,
      lang_code text NOT NULL,
      title text NOT NULL,
      body text,
      UNIQUE (post_id, lang_code)
    )
  $sql$, schema_name, database_id, schema_name);
  EXECUTE format('INSERT INTO %I.posts (id, title, body) VALUES (1, %L, %L)', schema_name, tenant_token, tenant_token || ' base body');
  EXECUTE format(
    'INSERT INTO %I.posts_translations (post_id, lang_code, title, body) VALUES (1, %L, %L, %L), (1, %L, %L, %L)',
    schema_name,
    'en', tenant_token || ' English', tenant_token || ' English body',
    'es', tenant_token || ' español', tenant_token || ' cuerpo español'
  );

  EXECUTE format($sql$
    CREATE TABLE %I.articles (
      id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      database_id uuid NOT NULL DEFAULT %L::uuid,
      tenant_id text NOT NULL DEFAULT %L,
      title text NOT NULL,
      body text NOT NULL,
      embedding ctf_extensions.vector(3) NOT NULL
    )
  $sql$, schema_name, database_id, tenant_token);
  EXECUTE format(
    'COMMENT ON TABLE %I.articles IS %L',
    schema_name,
    E'@hasChunks {"chunksTable":"articles_chunks","parentFk":"parent_id","parentPk":"id","embeddingField":"embedding","contentField":"content"}'
  );
  EXECUTE format($sql$
    CREATE TABLE %I.articles_chunks (
      id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      database_id uuid NOT NULL DEFAULT %L::uuid,
      parent_id integer NOT NULL REFERENCES %I.articles(id) ON DELETE CASCADE,
      content text NOT NULL,
      embedding ctf_extensions.vector(3) NOT NULL
    )
  $sql$, schema_name, database_id, schema_name);
  EXECUTE format('CREATE INDEX articles_embedding_idx ON %I.articles USING hnsw (embedding ctf_extensions.vector_cosine_ops)', schema_name);
  EXECUTE format('CREATE INDEX articles_chunks_embedding_idx ON %I.articles_chunks USING hnsw (embedding ctf_extensions.vector_cosine_ops)', schema_name);
  EXECUTE format(
    'INSERT INTO %I.articles (id, title, body, embedding) VALUES (1, %L, %L, %L::ctf_extensions.vector)',
    schema_name, tenant_token || ' article', tenant_token || ' machine learning article', '[1,0,0]'
  );
  EXECUTE format(
    'INSERT INTO %I.articles_chunks (id, parent_id, content, embedding) VALUES (1, 1, %L, %L::ctf_extensions.vector)',
    schema_name, tenant_token || ' machine learning tenant fixture context', '[0.99,0.01,0]'
  );

  EXECUTE format($sql$
    CREATE TABLE %I.bulk_items (
      id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      database_id uuid NOT NULL DEFAULT %L::uuid,
      tenant_id text NOT NULL DEFAULT %L,
      name text NOT NULL,
      quantity integer NOT NULL DEFAULT 0,
      CONSTRAINT bulk_items_name_key UNIQUE (name)
    )
  $sql$, schema_name, database_id, tenant_token);
  EXECUTE format('COMMENT ON TABLE %I.bulk_items IS %L', schema_name, E'@behavior +bulkInsert +bulkUpsert +bulkUpdate +bulkDelete');

  EXECUTE format($sql$
    CREATE TABLE %I.realtime_items (
      id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      database_id uuid NOT NULL DEFAULT %L::uuid,
      tenant_id text NOT NULL DEFAULT %L,
      payload text NOT NULL
    )
  $sql$, schema_name, database_id, tenant_token);
  EXECUTE format('COMMENT ON TABLE %I.realtime_items IS %L', schema_name, E'@realtime');
  EXECUTE format('INSERT INTO %I.realtime_items (id, payload) VALUES (1, %L)', schema_name, tenant_token || '-initial');

  fn_body := format($body$
    BEGIN
      IF TG_OP = 'DELETE' THEN
        PERFORM pg_catalog.pg_notify(%L, TG_OP || ':' || OLD.id::text);
        RETURN OLD;
      END IF;
      PERFORM pg_catalog.pg_notify(%L, TG_OP || ':' || NEW.id::text);
      RETURN NEW;
    END
  $body$,
    'realtime:' || schema_name || '.realtime_items',
    'realtime:' || schema_name || '.realtime_items'
  );
  EXECUTE format(
    'CREATE FUNCTION %I.notify_realtime_item() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS %L',
    schema_name,
    fn_body
  );
  EXECUTE format(
    'CREATE TRIGGER realtime_items_notify AFTER INSERT OR UPDATE OR DELETE ON %I.realtime_items FOR EACH ROW EXECUTE FUNCTION %I.notify_realtime_item()',
    schema_name,
    schema_name
  );

  EXECUTE format($sql$
    CREATE TABLE %I.app_buckets (
      id uuid PRIMARY KEY,
      database_id uuid NOT NULL DEFAULT %L::uuid,
      tenant_id text NOT NULL DEFAULT %L,
      key text NOT NULL UNIQUE,
      type text NOT NULL,
      is_public boolean NOT NULL DEFAULT false,
      owner_id uuid,
      allowed_mime_types text[],
      max_file_size integer,
      allow_custom_keys boolean NOT NULL DEFAULT false,
      physical_name text
    )
  $sql$, schema_name, database_id, tenant_token);
  EXECUTE format('COMMENT ON TABLE %I.app_buckets IS %L', schema_name, E'@storageBuckets');
  EXECUTE format($sql$
    CREATE TABLE %I.app_files (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      database_id uuid NOT NULL DEFAULT %L::uuid,
      tenant_id text NOT NULL DEFAULT %L,
      bucket_id uuid NOT NULL REFERENCES %I.app_buckets(id),
      key text NOT NULL,
      content_hash text NOT NULL,
      mime_type text NOT NULL,
      size integer NOT NULL,
      filename text,
      is_public boolean NOT NULL DEFAULT false,
      previous_version_id uuid REFERENCES %I.app_files(id),
      created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      UNIQUE (bucket_id, content_hash)
    )
  $sql$, schema_name, database_id, tenant_token, schema_name, schema_name);
  EXECUTE format('COMMENT ON TABLE %I.app_files IS %L', schema_name, E'@storageFiles');
  EXECUTE format(
    'INSERT INTO %I.app_buckets (id, key, type, allowed_mime_types, max_file_size, physical_name) VALUES (%L::uuid, %L, %L, ARRAY[%L], 1048576, NULL)',
    schema_name, bucket_id, 'private', 'private', 'text/plain'
  );

  EXECUTE format($sql$
    CREATE TABLE %I.function_invocations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      database_id uuid NOT NULL DEFAULT %L::uuid,
      tenant_id text NOT NULL DEFAULT %L,
      task_identifier text NOT NULL,
      function_definition_id uuid NOT NULL,
      api_binding_id uuid NOT NULL,
      status text NOT NULL,
      payload jsonb,
      created_at timestamptz NOT NULL DEFAULT clock_timestamp()
    )
  $sql$, schema_name, database_id, tenant_token);

  EXECUTE format($sql$
    CREATE TABLE %I.schema_state (
      id integer PRIMARY KEY CHECK (id = 1),
      database_id uuid NOT NULL DEFAULT %L::uuid,
      epoch integer NOT NULL
    )
  $sql$, schema_name, database_id);
  EXECUTE format('INSERT INTO %I.schema_state (id, epoch) VALUES (1, 1)', schema_name);

  FOREACH table_name IN ARRAY ARRAY[
    'tenant_canary',
    'documents',
    'posts',
    'posts_translations',
    'articles',
    'articles_chunks',
    'bulk_items',
    'realtime_items',
    'app_buckets',
    'app_files',
    'function_invocations',
    'schema_state'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', schema_name, table_name);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', schema_name, table_name);
    EXECUTE format(
      'CREATE POLICY tenant_guard ON %I.%I USING (database_id::text = nullif(current_setting(%L, true), %L)) WITH CHECK (database_id::text = nullif(current_setting(%L, true), %L))',
      schema_name,
      table_name,
      'jwt.claims.database_id',
      '',
      'jwt.claims.database_id',
      ''
    );
  END LOOP;

  fn_body := format('SELECT CASE WHEN nullif(current_setting(%L, true), %L) = %L THEN %L::text ELSE %L::text END', 'jwt.claims.database_id', '', database_id::text, tenant_token, 'guc-mismatch');
  EXECUTE format('CREATE FUNCTION %I.tenant_identity() RETURNS text LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog AS %L', schema_name, fn_body);
  EXECUTE format(
    'CREATE FUNCTION %I.physical_database_identity() RETURNS text LANGUAGE sql STABLE PARALLEL SAFE SECURITY INVOKER SET search_path = pg_catalog AS %L',
    schema_name,
    'SELECT pg_catalog.current_database()::text'
  );
  EXECUTE format('CREATE FUNCTION %I.%I() RETURNS text LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog AS %L', schema_name, metadata_function, format('SELECT %L::text', tenant_token));
  EXECUTE format(
    'CREATE FUNCTION %I.request_identity() RETURNS text LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog AS %L',
    schema_name,
    format('SELECT %L || %L || nullif(current_setting(%L, true), %L)', tenant_token, ':', 'jwt.claims.database_id', '')
  );
  fn_body := format($body$
    DECLARE
      observed text;
    BEGIN
      BEGIN
        PERFORM set_config('jwt.claims.database_id', 'poisoned-savepoint', true);
        RAISE EXCEPTION 'fixture subtransaction rollback';
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
      observed := nullif(current_setting('jwt.claims.database_id', true), '');
      RETURN observed;
    END
  $body$);
  EXECUTE format('CREATE FUNCTION %I.savepoint_identity() RETURNS text LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = pg_catalog AS %L', schema_name, fn_body);
  EXECUTE format('COMMENT ON FUNCTION %I.savepoint_identity() IS %L', schema_name, E'@behavior -*');
  fn_body := format($body$
    BEGIN
      PERFORM set_config('jwt.claims.database_id', %L, false);
      PERFORM set_config('jwt.claims.user_id', %L, false);
      RETURN 'poisoned';
    END
  $body$, 'ffffffff-ffff-4fff-8fff-ffffffffffff', 'poisoned-user');
  EXECUTE format('CREATE FUNCTION %I.poison_session() RETURNS text LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = pg_catalog AS %L', schema_name, fn_body);
  EXECUTE format('COMMENT ON FUNCTION %I.poison_session() IS %L', schema_name, E'@behavior -*');
  fn_body := format($body$
    DECLARE
      row_count integer;
    BEGIN
      IF target_schema NOT IN ('ctf_a', 'ctf_b', 'ctf_c') THEN
        RAISE EXCEPTION 'CTF_FOREIGN_SCHEMA_NOT_ALLOWED:%%', target_schema;
      END IF;
      BEGIN
        EXECUTE format('SELECT count(*)::integer FROM %%I.documents', target_schema) INTO row_count;
      EXCEPTION WHEN insufficient_privilege THEN
        RETURN 'acl-denied';
      END;
      RETURN CASE WHEN row_count = 0 THEN 'rls-empty' ELSE 'visible' END;
    END
  $body$);
  EXECUTE format('CREATE FUNCTION %I.foreign_access_state(target_schema text) RETURNS text LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = pg_catalog AS %L', schema_name, fn_body);
  fn_body := format($body$
    SELECT NOT r.rolsuper
       AND NOT r.rolbypassrls
       AND NOT r.rolcreaterole
       AND NOT pg_has_role(session_user, n.nspowner, 'MEMBER')
       AND NOT has_schema_privilege(session_user, %L, 'CREATE')
      FROM pg_roles r
      JOIN pg_namespace n ON n.nspname = %L
     WHERE r.rolname = session_user
  $body$, schema_name, schema_name);
  EXECUTE format('CREATE FUNCTION %I.runtime_role_safe() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog AS %L', schema_name, fn_body);
  EXECUTE format(
    'CREATE FUNCTION %I.schema_epoch() RETURNS integer LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog AS %L',
    schema_name,
    format('SELECT epoch FROM %I.schema_state WHERE id = 1', schema_name)
  );

  EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA %I FROM PUBLIC', schema_name);
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO %I', schema_name, runtime_role);
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO %I', schema_name, runtime_role);
  EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA %I TO %I', schema_name, runtime_role);
  EXECUTE format('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA %I TO %I', schema_name, runtime_role);
END
$procedure$;

CALL pg_temp.create_complete_tenant(
  'ctf_a',
  'tenant-a-canary',
  '10000000-0000-4000-8000-00000000000a',
  :'runtime_role_a',
  'metadata_a',
  '30000000-0000-4000-8000-00000000000a',
  '40000000-0000-4000-8000-00000000000a',
  '50000000-0000-4000-8000-00000000000a',
  '60000000-0000-4000-8000-00000000000a'
);
CALL pg_temp.create_complete_tenant(
  'ctf_b',
  'tenant-b-canary',
  '10000000-0000-4000-8000-00000000000b',
  :'runtime_role_b',
  'metadata_b',
  '30000000-0000-4000-8000-00000000000b',
  '40000000-0000-4000-8000-00000000000b',
  '50000000-0000-4000-8000-00000000000b',
  '60000000-0000-4000-8000-00000000000b'
);
CALL pg_temp.create_complete_tenant(
  'ctf_c',
  'tenant-c-canary',
  '10000000-0000-4000-8000-00000000000c',
  :'runtime_role_c',
  'metadata_c',
  '30000000-0000-4000-8000-00000000000c',
  '40000000-0000-4000-8000-00000000000c',
  '50000000-0000-4000-8000-00000000000c',
  '60000000-0000-4000-8000-00000000000c'
);

DO $realtime_isolation$
DECLARE
  runtime_record record;
  target_ordinal integer;
  target_schema text;
  function_signature text;
  function_oid oid;
  should_have_access boolean;
BEGIN
  FOR runtime_record IN
    SELECT ordinal, role_name::text
      FROM pg_temp.ctf_runtime_roles
     ORDER BY ordinal
  LOOP
    FOR target_ordinal IN 1..3
    LOOP
      target_schema := format(
        'ctf_%s_realtime',
        chr(ascii('a') + target_ordinal - 1)
      );
      should_have_access := runtime_record.ordinal = target_ordinal;

      IF pg_catalog.has_schema_privilege(
        runtime_record.role_name,
        target_schema,
        'USAGE'
      ) IS DISTINCT FROM should_have_access THEN
        RAISE EXCEPTION 'CTF_REALTIME_SCHEMA_ISOLATION_FAILED:%:%',
          runtime_record.role_name,
          target_schema;
      END IF;
      IF pg_catalog.has_schema_privilege(
        runtime_record.role_name,
        target_schema,
        'CREATE'
      ) THEN
        RAISE EXCEPTION 'CTF_REALTIME_SCHEMA_CREATE_FORBIDDEN:%:%',
          runtime_record.role_name,
          target_schema;
      END IF;

      FOREACH function_signature IN ARRAY ARRAY[
        'touch_listener(text)',
        'drain_changes(text,integer)',
        'cleanup_ephemeral(text)'
      ]
      LOOP
        function_oid := pg_catalog.to_regprocedure(
          format('%I.%s', target_schema, function_signature)
        );
        IF function_oid IS NULL THEN
          RAISE EXCEPTION 'CTF_REALTIME_FUNCTION_MISSING:%:%',
            target_schema,
            function_signature;
        END IF;
        IF pg_catalog.has_function_privilege(
          runtime_record.role_name,
          function_oid,
          'EXECUTE'
        ) IS DISTINCT FROM should_have_access THEN
          RAISE EXCEPTION 'CTF_REALTIME_FUNCTION_ISOLATION_FAILED:%:%:%',
            runtime_record.role_name,
            target_schema,
            function_signature;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END
$realtime_isolation$;

CREATE FUNCTION ctf_control.apply_schema_drift(target_schema text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  target_database_id uuid;
BEGIN
  target_database_id := CASE target_schema
    WHEN 'ctf_a' THEN '10000000-0000-4000-8000-00000000000a'::uuid
    WHEN 'ctf_b' THEN '10000000-0000-4000-8000-00000000000b'::uuid
    WHEN 'ctf_c' THEN '10000000-0000-4000-8000-00000000000c'::uuid
    ELSE NULL
  END;
  IF target_database_id IS NULL THEN
    RAISE EXCEPTION 'CTF_DRIFT_SCHEMA_NOT_ALLOWED:%', target_schema;
  END IF;
  PERFORM pg_catalog.set_config(
    'jwt.claims.database_id',
    target_database_id::text,
    true
  );
  EXECUTE format('ALTER TABLE %I.documents ADD COLUMN IF NOT EXISTS drift_probe text NOT NULL DEFAULT %L', target_schema, 'drift-applied');
  EXECUTE format('UPDATE %I.schema_state SET epoch = 2 WHERE id = 1', target_schema);
END
$function$;

CREATE FUNCTION ctf_control.revert_schema_drift(target_schema text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  target_database_id uuid;
BEGIN
  target_database_id := CASE target_schema
    WHEN 'ctf_a' THEN '10000000-0000-4000-8000-00000000000a'::uuid
    WHEN 'ctf_b' THEN '10000000-0000-4000-8000-00000000000b'::uuid
    WHEN 'ctf_c' THEN '10000000-0000-4000-8000-00000000000c'::uuid
    ELSE NULL
  END;
  IF target_database_id IS NULL THEN
    RAISE EXCEPTION 'CTF_DRIFT_SCHEMA_NOT_ALLOWED:%', target_schema;
  END IF;
  PERFORM pg_catalog.set_config(
    'jwt.claims.database_id',
    target_database_id::text,
    true
  );
  EXECUTE format('ALTER TABLE %I.documents DROP COLUMN IF EXISTS drift_probe', target_schema);
  EXECUTE format('UPDATE %I.schema_state SET epoch = 1 WHERE id = 1', target_schema);
END
$function$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ctf_control FROM PUBLIC;

DO $grants$
DECLARE
  runtime_role text;
BEGIN
  FOR runtime_role IN
    SELECT role_name::text
      FROM pg_temp.ctf_runtime_roles
     ORDER BY ordinal
  LOOP
    EXECUTE format('GRANT USAGE ON SCHEMA ctf_extensions, jwt_private TO %I', runtime_role);
    EXECUTE format(
      'GRANT SELECT ON ALL TABLES IN SCHEMA ctf_extensions TO %I',
      runtime_role
    );
    EXECUTE format(
      'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ctf_extensions TO %I',
      runtime_role
    );
    EXECUTE format(
      'GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA ctf_extensions TO %I',
      runtime_role
    );
    EXECUTE format('GRANT EXECUTE ON FUNCTION jwt_private.current_database_id() TO %I', runtime_role);
  END LOOP;
END
$grants$;

RESET search_path;
