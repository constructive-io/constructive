-- Scenario: a mix of common RLS mistakes across several tables. Exercises the
-- coverage + anti-pattern rules and should score poorly, with the grade
-- dropping further under `strict`.

CREATE SCHEMA IF NOT EXISTS eval_leaky;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eval_leaky_user') THEN
    CREATE ROLE eval_leaky_user NOLOGIN;
  END IF;
END $$;

-- A1: RLS on, no policies at all (rows invisible / locked).
CREATE TABLE eval_leaky.secrets (id bigserial PRIMARY KEY, val text);
ALTER TABLE eval_leaky.secrets ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON eval_leaky.secrets TO eval_leaky_user;

-- A2: grants but RLS never enabled (wide open).
CREATE TABLE eval_leaky.audit_log (id bigserial PRIMARY KEY, msg text);
GRANT SELECT, INSERT ON eval_leaky.audit_log TO eval_leaky_user;

-- A3 + A4 + A6: RLS on but not forced; INSERT/UPDATE granted, only a SELECT
-- policy exists, and the UPDATE path has no WITH CHECK.
CREATE TABLE eval_leaky.notes (id bigserial PRIMARY KEY, owner text, body text);
ALTER TABLE eval_leaky.notes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON eval_leaky.notes TO eval_leaky_user;
CREATE POLICY sel ON eval_leaky.notes FOR SELECT TO eval_leaky_user USING (true);
CREATE POLICY upd ON eval_leaky.notes FOR UPDATE TO eval_leaky_user USING (true);

-- A7: trivially permissive policy on a table that otherwise looks locked down.
CREATE TABLE eval_leaky.reports (id bigserial PRIMARY KEY, owner text);
ALTER TABLE eval_leaky.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_leaky.reports FORCE ROW LEVEL SECURITY;
GRANT SELECT ON eval_leaky.reports TO eval_leaky_user;
CREATE POLICY sel ON eval_leaky.reports FOR SELECT TO eval_leaky_user USING (true);
