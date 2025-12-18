-- Grant CONNECT privilege on a database to a role
-- Parameters: $1 = role_name, $2 = db_name
DO $do$
DECLARE
  v_role_name TEXT := $1;
  v_db_name TEXT := $2;
BEGIN
  BEGIN
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', v_db_name, v_role_name);
  EXCEPTION
    WHEN undefined_object THEN
      RAISE NOTICE 'Role % does not exist when granting CONNECT on %', v_role_name, v_db_name;
    WHEN insufficient_privilege THEN
      RAISE EXCEPTION 'Insufficient privileges to grant CONNECT on % to %', v_db_name, v_role_name;
  END;
END
$do$;
