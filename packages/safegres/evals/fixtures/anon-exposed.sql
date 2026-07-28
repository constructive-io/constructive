-- Scenario: an untrusted `anonymous` role wired directly into a table. This is
-- the case the `safegres:constructive` preset is built to catch — R1/R2/R3
-- fire here but are silent under the pure-Postgres presets (which do not know
-- which role is untrusted).

CREATE SCHEMA IF NOT EXISTS eval_anon;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anonymous') THEN
    CREATE ROLE anonymous NOLOGIN;
  END IF;
END $$;

CREATE TABLE eval_anon.submissions (
  id bigserial PRIMARY KEY,
  email text,
  payload text
);

ALTER TABLE eval_anon.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_anon.submissions FORCE ROW LEVEL SECURITY;

-- R1: anonymous holds write grants.
GRANT SELECT, INSERT, UPDATE, DELETE ON eval_anon.submissions TO anonymous;

-- R3: RLS table also granted TO PUBLIC.
GRANT SELECT ON eval_anon.submissions TO PUBLIC;

-- R2: permissive write policies that apply to anonymous / PUBLIC.
CREATE POLICY anon_ins ON eval_anon.submissions FOR INSERT TO anonymous
  WITH CHECK (true);
CREATE POLICY anon_del ON eval_anon.submissions FOR DELETE TO anonymous
  USING (true);
CREATE POLICY public_upd ON eval_anon.submissions FOR UPDATE TO PUBLIC
  USING (true) WITH CHECK (true);
CREATE POLICY sel ON eval_anon.submissions FOR SELECT TO anonymous
  USING (true);
