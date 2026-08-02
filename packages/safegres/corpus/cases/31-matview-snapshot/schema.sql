DROP SCHEMA IF EXISTS c_matview_snapshot CASCADE;
CREATE SCHEMA c_matview_snapshot;

-- The role that owns the table and runs REFRESH.
DO $$ BEGIN
  CREATE ROLE c_matview_owner NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT USAGE ON SCHEMA c_matview_snapshot TO corpus_anon, corpus_user, c_matview_owner;

CREATE TABLE c_matview_snapshot.readings (
  id bigserial PRIMARY KEY,
  tenant text NOT NULL,
  value numeric NOT NULL
);
ALTER TABLE c_matview_snapshot.readings OWNER TO c_matview_owner;
ALTER TABLE c_matview_snapshot.readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_matview_snapshot.readings FORCE ROW LEVEL SECURITY;

-- Signed-in users see only their own tenant's rows.
CREATE POLICY readings_own_tenant ON c_matview_snapshot.readings
  FOR SELECT TO corpus_user
  USING (tenant = (SELECT current_setting('app.tenant', true)));
CREATE INDEX readings_tenant_idx ON c_matview_snapshot.readings (tenant);
GRANT SELECT ON c_matview_snapshot.readings TO corpus_user;

-- The flaw: a materialized view is a stored copy. Its rows were computed once,
-- as c_matview_owner, and reading it never consults `readings` — so neither
-- the table's ACL nor its policies apply, and the matview can carry neither
-- policies nor `security_invoker` of its own. corpus_anon holds nothing on
-- `readings` and reads every tenant's rows out of the snapshot.
CREATE MATERIALIZED VIEW c_matview_snapshot.readings_rollup AS
  SELECT id, tenant, value FROM c_matview_snapshot.readings;
ALTER MATERIALIZED VIEW c_matview_snapshot.readings_rollup OWNER TO c_matview_owner;
GRANT SELECT ON c_matview_snapshot.readings_rollup TO corpus_anon, corpus_user;
