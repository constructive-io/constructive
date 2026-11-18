-- TEMPORARY COPY of three readers from constructive-db
-- (pgpm-modules/function-resolution/deploy/schemas/function_resolution/procedures/).
-- Delete this file, and its entry in each test's seed list, when a
-- @pgpm/function-resolution release newer than 0.47.9 is pinned in pgpm.json.
--
-- The module grants these to no request role: the platform login is granted
-- EXECUTE at install time (fun platform COMPONENT_GRANTS). Tests that serve as
-- a non-superuser login grant it themselves, as they do for the module's
-- other readers.

-- TEMPORARY COPY: delete when @pgpm/function-resolution > 0.47.9 is pinned.
CREATE FUNCTION function_resolution.auth_surface_entry(database_id uuid)
RETURNS TABLE (
    private_schema text,
    public_schema text,
    identifiers_public_schema text,
    emails_table text,
    connected_accounts_view text
) AS $$
SELECT
    auth_private.schema_name::text,
    auth_public.schema_name::text,
    identifiers_public.schema_name::text,
    emails.table_name,
    'user_' || connected.table_name
FROM metaschema_modules_public.identity_providers_module AS providers
    JOIN metaschema_public.schema AS auth_private ON auth_private.id = providers.private_schema_id
    JOIN metaschema_public.schema AS auth_public ON auth_public.id = providers.schema_id
    JOIN metaschema_modules_public.connected_accounts_module AS connected
    ON connected.database_id = providers.database_id
    JOIN metaschema_public.schema AS identifiers_public ON identifiers_public.id = connected.schema_id
    JOIN metaschema_modules_public.emails_module AS emails
    ON emails.database_id = providers.database_id
WHERE providers.database_id = $1
LIMIT 1
$$ LANGUAGE sql STABLE SECURITY DEFINER;

REVOKE ALL ON FUNCTION function_resolution.auth_surface_entry(uuid) FROM PUBLIC;

-- TEMPORARY COPY: delete when @pgpm/function-resolution > 0.47.9 is pinned.
CREATE FUNCTION function_resolution.compute_entry(database_id uuid)
RETURNS TABLE (
    functions_schema_name text,
    definitions_table_name text,
    bindings_table_name text,
    invocations_schema_name text,
    invocations_table_name text,
    invocations_entity_field text
) AS $$
SELECT
    fs.schema_name::text,
    fm.definitions_table_name,
    fm.bindings_table_name,
    ivs.schema_name::text,
    ivm.invocations_table_name,
    ivm.entity_field
FROM metaschema_modules_public.function_module AS fm
    JOIN metaschema_public.schema AS fs ON fs.id = fm.schema_id
    JOIN metaschema_modules_public.function_invocation_module AS ivm
    ON ivm.database_id = fm.database_id AND ivm.scope = fm.scope
    JOIN metaschema_public.schema AS ivs ON ivs.id = ivm.schema_id
WHERE fm.database_id = $1
ORDER BY fs.schema_name
$$ LANGUAGE sql STABLE SECURITY DEFINER;

REVOKE ALL ON FUNCTION function_resolution.compute_entry(uuid) FROM PUBLIC;

-- TEMPORARY COPY: delete when @pgpm/function-resolution > 0.47.9 is pinned.
CREATE FUNCTION function_resolution.events_entry(database_id uuid)
RETURNS TABLE (
    private_schema_name text,
    record_event text,
    record_error text
) AS $$
SELECT
    s.schema_name::text,
    em.record_event,
    em.record_error
FROM metaschema_modules_public.events_module AS em
    JOIN metaschema_public.schema AS s ON s.id = em.private_schema_id
WHERE em.database_id = $1
  AND em.scope = 'app'
LIMIT 1
$$ LANGUAGE sql STABLE SECURITY DEFINER;

REVOKE ALL ON FUNCTION function_resolution.events_entry(uuid) FROM PUBLIC;
