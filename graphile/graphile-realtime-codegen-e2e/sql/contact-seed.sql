-- Seed for graphile-realtime-codegen-e2e integration tests.
-- Creates a contact table that the RealtimeSubscriptionsPlugin can discover
-- via the @realtime smart tag injected by getConnections().
--
-- No emit_change trigger is included here. Events are fired via
-- ctx.notifyChange() which calls pg_notify() directly on the root
-- pg client (outside any transaction), matching the pattern used by
-- realtime-websocket.integration.test.ts. A DB-trigger-driven test
-- would require the constructive-db emit_change trigger (out of scope).

CREATE SCHEMA IF NOT EXISTS realtime_codegen_test;

CREATE TABLE realtime_codegen_test.contact (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT ''
);

GRANT USAGE ON SCHEMA realtime_codegen_test TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON realtime_codegen_test.contact TO PUBLIC;
