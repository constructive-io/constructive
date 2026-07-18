-- Test-role grants over the pgpm-installed metaschema/services modules.
--
-- The real modules (deployed via seed.pgpm from __fixtures__/pgpm/workspace)
-- only grant to the production roles; tests exercise the API as
-- administrator/authenticated/anonymous, so widen the grants here.
--
-- Depends on: seed.pgpm('@pgpm/metaschema-modules')

GRANT USAGE ON SCHEMA metaschema_public, services_public, metaschema_modules_public
  TO administrator, authenticated, anonymous;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA metaschema_public
  TO administrator, authenticated, anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA services_public
  TO administrator, authenticated, anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA metaschema_modules_public
  TO administrator, authenticated, anonymous;
