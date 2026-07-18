-- Anonymous-role grants over the pgpm-installed metaschema/services modules.
--
-- The real modules already grant to administrator/authenticated; tests also
-- exercise the API as anonymous, which production modules never grant to.
--
-- Depends on: seed.pgpm(<workspace root>)

GRANT USAGE ON SCHEMA metaschema_public, services_public, metaschema_modules_public
  TO anonymous;

GRANT SELECT ON ALL TABLES IN SCHEMA metaschema_public TO anonymous;
GRANT SELECT ON ALL TABLES IN SCHEMA services_public TO anonymous;
GRANT SELECT ON ALL TABLES IN SCHEMA metaschema_modules_public TO anonymous;
