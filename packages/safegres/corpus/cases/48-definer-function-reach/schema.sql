DROP SCHEMA IF EXISTS c_definer_fn CASCADE;
CREATE SCHEMA c_definer_fn;

-- The role the function executes as, and the owner of the table behind it.
DO $$ BEGIN
  CREATE ROLE c_definer_fn_owner NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT USAGE ON SCHEMA c_definer_fn TO corpus_anon, corpus_user, c_definer_fn_owner;

CREATE TABLE c_definer_fn.secrets (
  id bigserial PRIMARY KEY,
  subject text NOT NULL,
  body text NOT NULL
);
ALTER TABLE c_definer_fn.secrets OWNER TO c_definer_fn_owner;
ALTER TABLE c_definer_fn.secrets ENABLE ROW LEVEL SECURITY;

-- Signed-in users see their own rows. corpus_anon holds no grant on the table
-- at all, and no policy names it.
CREATE POLICY secrets_own_rows ON c_definer_fn.secrets
  FOR SELECT TO corpus_user
  USING (subject = (SELECT current_setting('app.subject', true)));
CREATE INDEX secrets_subject_idx ON c_definer_fn.secrets (subject);
GRANT SELECT ON c_definer_fn.secrets TO corpus_user;

-- The flaw: the function is SECURITY DEFINER, so its body runs as
-- c_definer_fn_owner — who owns `secrets` and, because RLS is not FORCEd, is
-- not filtered by its policy. EXECUTE is the only grant corpus_anon needs, and
-- nothing in the ACL of `secrets` names it. Postgres grants EXECUTE to PUBLIC
-- by default, so this reach exists even where nobody wrote a grant.
CREATE FUNCTION c_definer_fn.recent_subjects()
RETURNS TABLE (id bigint, subject text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO c_definer_fn, pg_catalog
AS $$
  SELECT s.id, s.subject FROM c_definer_fn.secrets s ORDER BY s.id DESC LIMIT 20;
$$;
ALTER FUNCTION c_definer_fn.recent_subjects() OWNER TO c_definer_fn_owner;
