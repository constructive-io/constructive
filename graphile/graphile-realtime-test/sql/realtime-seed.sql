-- Minimal seed for graphile-realtime-test integration tests.
-- Creates a simple table with a UUID primary key that the
-- RealtimeSubscriptionsPlugin can discover via the @realtime smart tag.

CREATE SCHEMA IF NOT EXISTS realtime_test;

CREATE TABLE realtime_test.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Grant access so the test can query as different roles
GRANT USAGE ON SCHEMA realtime_test TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON realtime_test.items TO PUBLIC;
