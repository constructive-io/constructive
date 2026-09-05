-- Registers the fixture events schemas as the tenant's app-scoped events module.
-- Composed separately so a suite can run the same endpoint without one.

SET session_replication_role TO replica;

INSERT INTO metaschema_modules_public.events_module
  (id, database_id, scope, schema_id, private_schema_id, public_schema_name, private_schema_name, events_table_name, record_event)
VALUES
  ('6dba0004-0000-4000-8000-000000000001', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', 'app',
   '6dba0001-0000-4000-8000-000000000002', '6dba0001-0000-4000-8000-000000000003',
   'simple-pets-events-public', 'simple-pets-events-private', 'app_events', 'record_event')
ON CONFLICT (id) DO NOTHING;

SET session_replication_role TO DEFAULT;
