-- Deploy schemas/function_resolution/procedures/realtime_module_registrations to pg

-- requires: schemas/function_resolution/schema
-- requires: metaschema-modules:schemas/metaschema_modules_public/tables/realtime_module/table
-- requires: metaschema-schema:schemas/metaschema_public/tables/schema/table

BEGIN;

-- One database's physical realtime schema, for the serving login before a
-- request identity exists. No request role may execute this reader.
CREATE FUNCTION function_resolution.realtime_module_registrations(owner_database_id uuid)
RETURNS TABLE (
    database_id uuid,
    runtime_schema text
) AS $$
SELECT rm.database_id, s.schema_name::text
FROM metaschema_modules_public.realtime_module AS rm
    LEFT JOIN metaschema_public.schema AS s
    ON s.id = rm.private_schema_id AND s.database_id = rm.database_id
WHERE rm.database_id = $1
$$ LANGUAGE sql STABLE SECURITY DEFINER;

REVOKE ALL ON FUNCTION function_resolution.realtime_module_registrations(uuid) FROM PUBLIC;

COMMIT;
