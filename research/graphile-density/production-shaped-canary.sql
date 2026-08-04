\set ON_ERROR_STOP on

-- Performance-only canary for the local ~62k-catalog fixture. Keeping the
-- field in a real application schema avoids exposing `public`, where PostGIS
-- installs extension-owned catalog views that are not part of this API.
CREATE OR REPLACE FUNCTION "simple-pets-public".tenant_token()
RETURNS text
LANGUAGE sql
STABLE
PARALLEL SAFE
SET search_path = pg_catalog
AS $function$
  SELECT 'production-shaped-token'::text
$function$;

REVOKE ALL
ON FUNCTION "simple-pets-public".tenant_token()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION "simple-pets-public".tenant_token()
TO gdp_runtime_20260801_a;
