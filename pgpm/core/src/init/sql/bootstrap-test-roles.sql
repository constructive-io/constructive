BEGIN;
DO $do$
BEGIN
  -- app_user: pre-check + exception handling for TOCTOU safety
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN
    BEGIN
      EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', 'app_user', 'app_password');
    EXCEPTION
      WHEN duplicate_object THEN
        -- 42710: Role already exists (race condition); safe to ignore
        NULL;
      WHEN unique_violation THEN
        -- 23505: Concurrent CREATE ROLE hit unique index; safe to ignore
        NULL;
      WHEN insufficient_privilege THEN
        -- 42501: Must surface this error - caller lacks permission
        RAISE;
    END;
  END IF;
  
  -- app_admin: pre-check + exception handling for TOCTOU safety
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'app_admin') THEN
    BEGIN
      EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', 'app_admin', 'admin_password');
    EXCEPTION
      WHEN duplicate_object THEN
        -- 42710: Role already exists (race condition); safe to ignore
        NULL;
      WHEN unique_violation THEN
        -- 23505: Concurrent CREATE ROLE hit unique index; safe to ignore
        NULL;
      WHEN insufficient_privilege THEN
        -- 42501: Must surface this error - caller lacks permission
        RAISE;
    END;
  END IF;
END
$do$;

DO $do$
BEGIN
  -- Grant anonymous to app_user: pre-check + exception handling for TOCTOU safety
  IF NOT EXISTS (
    SELECT 1 FROM pg_auth_members am
    JOIN pg_roles r1 ON am.roleid = r1.oid
    JOIN pg_roles r2 ON am.member = r2.oid
    WHERE r1.rolname = 'anonymous' AND r2.rolname = 'app_user'
  ) THEN
    BEGIN
      EXECUTE format('GRANT %I TO %I', 'anonymous', 'app_user');
    EXCEPTION
      WHEN unique_violation THEN
        -- 23505: Membership was granted concurrently; safe to ignore
        NULL;
      WHEN undefined_object THEN
        -- 42704: One of the roles doesn't exist; log notice and continue
        RAISE NOTICE 'Missing role when granting % to %', 'anonymous', 'app_user';
      WHEN insufficient_privilege THEN
        -- 42501: Must surface this error - caller lacks permission
        RAISE;
      WHEN invalid_grant_operation THEN
        -- 0LP01: Must surface this error - invalid grant operation
        RAISE;
    END;
  END IF;

  -- Grant authenticated to app_user: pre-check + exception handling for TOCTOU safety
  IF NOT EXISTS (
    SELECT 1 FROM pg_auth_members am
    JOIN pg_roles r1 ON am.roleid = r1.oid
    JOIN pg_roles r2 ON am.member = r2.oid
    WHERE r1.rolname = 'authenticated' AND r2.rolname = 'app_user'
  ) THEN
    BEGIN
      EXECUTE format('GRANT %I TO %I', 'authenticated', 'app_user');
    EXCEPTION
      WHEN unique_violation THEN
        -- 23505: Membership was granted concurrently; safe to ignore
        NULL;
      WHEN undefined_object THEN
        -- 42704: One of the roles doesn't exist; log notice and continue
        RAISE NOTICE 'Missing role when granting % to %', 'authenticated', 'app_user';
      WHEN insufficient_privilege THEN
        -- 42501: Must surface this error - caller lacks permission
        RAISE;
      WHEN invalid_grant_operation THEN
        -- 0LP01: Must surface this error - invalid grant operation
        RAISE;
    END;
  END IF;

  -- Grant anonymous to administrator: pre-check + exception handling for TOCTOU safety
  IF NOT EXISTS (
    SELECT 1 FROM pg_auth_members am
    JOIN pg_roles r1 ON am.roleid = r1.oid
    JOIN pg_roles r2 ON am.member = r2.oid
    WHERE r1.rolname = 'anonymous' AND r2.rolname = 'administrator'
  ) THEN
    BEGIN
      EXECUTE format('GRANT %I TO %I', 'anonymous', 'administrator');
    EXCEPTION
      WHEN unique_violation THEN
        -- 23505: Membership was granted concurrently; safe to ignore
        NULL;
      WHEN undefined_object THEN
        -- 42704: One of the roles doesn't exist; log notice and continue
        RAISE NOTICE 'Missing role when granting % to %', 'anonymous', 'administrator';
      WHEN insufficient_privilege THEN
        -- 42501: Must surface this error - caller lacks permission
        RAISE;
      WHEN invalid_grant_operation THEN
        -- 0LP01: Must surface this error - invalid grant operation
        RAISE;
    END;
  END IF;

  -- Grant authenticated to administrator: pre-check + exception handling for TOCTOU safety
  IF NOT EXISTS (
    SELECT 1 FROM pg_auth_members am
    JOIN pg_roles r1 ON am.roleid = r1.oid
    JOIN pg_roles r2 ON am.member = r2.oid
    WHERE r1.rolname = 'authenticated' AND r2.rolname = 'administrator'
  ) THEN
    BEGIN
      EXECUTE format('GRANT %I TO %I', 'authenticated', 'administrator');
    EXCEPTION
      WHEN unique_violation THEN
        -- 23505: Membership was granted concurrently; safe to ignore
        NULL;
      WHEN undefined_object THEN
        -- 42704: One of the roles doesn't exist; log notice and continue
        RAISE NOTICE 'Missing role when granting % to %', 'authenticated', 'administrator';
      WHEN insufficient_privilege THEN
        -- 42501: Must surface this error - caller lacks permission
        RAISE;
      WHEN invalid_grant_operation THEN
        -- 0LP01: Must surface this error - invalid grant operation
        RAISE;
    END;
  END IF;

  -- Grant administrator to app_admin: pre-check + exception handling for TOCTOU safety
  IF NOT EXISTS (
    SELECT 1 FROM pg_auth_members am
    JOIN pg_roles r1 ON am.roleid = r1.oid
    JOIN pg_roles r2 ON am.member = r2.oid
    WHERE r1.rolname = 'administrator' AND r2.rolname = 'app_admin'
  ) THEN
    BEGIN
      EXECUTE format('GRANT %I TO %I', 'administrator', 'app_admin');
    EXCEPTION
      WHEN unique_violation THEN
        -- 23505: Membership was granted concurrently; safe to ignore
        NULL;
      WHEN undefined_object THEN
        -- 42704: One of the roles doesn't exist; log notice and continue
        RAISE NOTICE 'Missing role when granting % to %', 'administrator', 'app_admin';
      WHEN insufficient_privilege THEN
        -- 42501: Must surface this error - caller lacks permission
        RAISE;
      WHEN invalid_grant_operation THEN
        -- 0LP01: Must surface this error - invalid grant operation
        RAISE;
    END;
  END IF;
END
$do$;
COMMIT;
