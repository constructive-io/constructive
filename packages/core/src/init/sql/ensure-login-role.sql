-- Ensure a login role exists with the given username and password
-- Parameters: $1 = username, $2 = password, $3 = use_locks (boolean), $4 = lock_namespace (int)
DO $do$
DECLARE
  v_username TEXT := $1;
  v_password TEXT := $2;
  v_use_locks BOOLEAN := COALESCE($3::boolean, false);
  v_lock_namespace INT := COALESCE($4::int, 42);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = v_username) THEN
    BEGIN
      -- Acquire advisory lock if requested (prevents race conditions in concurrent CI/CD)
      IF v_use_locks THEN
        PERFORM pg_advisory_xact_lock(v_lock_namespace, hashtext(v_username));
      END IF;
      
      EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', v_username, v_password);
    EXCEPTION
      WHEN duplicate_object THEN
        -- Role was created concurrently, safe to ignore
        NULL;
      WHEN unique_violation THEN
        -- Concurrent insert, safe to ignore
        NULL;
      WHEN insufficient_privilege THEN
        RAISE EXCEPTION 'Insufficient privileges to create role %: ensure the connecting user has CREATEROLE', v_username;
    END;
  END IF;
END
$do$;
