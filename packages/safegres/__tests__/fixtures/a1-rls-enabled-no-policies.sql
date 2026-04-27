-- A1 seed: RLS enabled on a table with zero policies.
-- Expected finding: A1 (critical)

CREATE SCHEMA IF NOT EXISTS fx_a1;

CREATE TABLE fx_a1.posts (
  id bigserial PRIMARY KEY,
  body text
);

ALTER TABLE fx_a1.posts ENABLE ROW LEVEL SECURITY;
