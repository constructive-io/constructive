-- Ensure role membership (grant a role to a user)
-- Parameters: $1 = role_to_grant, $2 = username, $3 = use_locks (boolean), $4 = lock_namespace (int), $5 = on_missing_role ('error', 'notice', 'ignore')
DO $do$
DECLARE
  v_role_to_grant TEXT := $1;
  v_username TEXT := $2;
  v_use_locks BOOLEAN := COALESCE($3::boolean, false);
  v_lock_namespace INT := COALESCE($4::int, 43);
  v_on_missing_role TEXT := COALESCE($5, 'notice');
BEGIN
  -- Check if membership already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_auth_members am
    JOIN pg_roles r1 ON am.roleid = r1.oid
    JOIN pg_roles r2 ON am.member = r2.oid
    WHERE r1.rolname = v_role_to_grant AND r2.rolname = v_username
  ) THEN
    BEGIN
      -- Acquire advisory lock if requested (prevents race conditions in concurrent CI/CD)
      IF v_use_locks THEN
        PERFORM pg_advisory_xact_lock(v_lock_namespace, hashtext(v_role_to_grant || ':' || v_username));
      END IF;
      
      EXECUTE format('GRANT %I TO %I', v_role_to_grant, v_username);
    EXCEPTION
      WHEN unique_violation THEN
        -- Membership was granted concurrently, safe to ignore
        NULL;
      WHEN undefined_object THEN
        -- Role doesn't exist
        CASE v_on_missing_role
          WHEN 'error' THEN
            RAISE EXCEPTION 'Role % does not exist when granting to %', v_role_to_grant, v_username;
          WHEN 'notice' THEN
            RAISE NOTICE 'Missing role when granting % to %', v_role_to_grant, v_username;
          WHEN 'ignore' THEN
            NULL;
          ELSE
            RAISE NOTICE 'Missing role when granting % to %', v_role_to_grant, v_username;
        END CASE;
      WHEN insufficient_privilege THEN
        RAISE EXCEPTION 'Insufficient privileges to grant % to %: ensure the connecting user has appropriate permissions', v_role_to_grant, v_username;
    END;
  END IF;
END
$do$;
