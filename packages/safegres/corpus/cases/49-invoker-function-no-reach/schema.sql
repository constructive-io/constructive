DROP SCHEMA IF EXISTS c_invoker_fn CASCADE;
CREATE SCHEMA c_invoker_fn;

DO $$ BEGIN
  CREATE ROLE c_invoker_fn_owner NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT USAGE ON SCHEMA c_invoker_fn TO corpus_anon, corpus_user, c_invoker_fn_owner;

CREATE TABLE c_invoker_fn.secrets (
  id bigserial PRIMARY KEY,
  subject text NOT NULL,
  body text NOT NULL
);
ALTER TABLE c_invoker_fn.secrets OWNER TO c_invoker_fn_owner;
ALTER TABLE c_invoker_fn.secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY secrets_own_rows ON c_invoker_fn.secrets
  FOR SELECT TO corpus_user
  USING (subject = (SELECT current_setting('app.subject', true)));
CREATE INDEX secrets_subject_idx ON c_invoker_fn.secrets (subject);
GRANT SELECT ON c_invoker_fn.secrets TO corpus_user;

-- The same body over the same shape, with the one difference that matters:
-- a function is SECURITY INVOKER unless it says otherwise, so the body runs
-- with the caller's privileges and corpus_anon is denied on `secrets` exactly
-- as a direct SELECT would be. There is no reach edge here, and a rule that
-- reported one would be flagging a correct schema — which is why this case
-- forbids L19 rather than merely omitting it.
CREATE FUNCTION c_invoker_fn.recent_subjects()
RETURNS TABLE (id bigint, subject text)
LANGUAGE sql
SET search_path TO c_invoker_fn, pg_catalog
AS $$
  SELECT s.id, s.subject FROM c_invoker_fn.secrets s ORDER BY s.id DESC LIMIT 20;
$$;
ALTER FUNCTION c_invoker_fn.recent_subjects() OWNER TO c_invoker_fn_owner;
