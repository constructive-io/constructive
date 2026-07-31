-- X6 seed: a table with no primary key, one with a PK, and one with no PK but
-- REPLICA IDENTITY FULL (rows are still identifiable).
-- Expected finding: X6 on events only.

CREATE SCHEMA IF NOT EXISTS fx_x6;

CREATE TABLE fx_x6.events (
  payload jsonb,
  recorded_at timestamptz
);

CREATE TABLE fx_x6.keyed (
  id bigint PRIMARY KEY,
  payload jsonb
);

CREATE TABLE fx_x6.full_identity (
  payload jsonb
);
ALTER TABLE fx_x6.full_identity REPLICA IDENTITY FULL;
