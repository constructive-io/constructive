DROP SCHEMA IF EXISTS c_rls_off_public CASCADE;
CREATE SCHEMA c_rls_off_public;
GRANT USAGE ON SCHEMA c_rls_off_public TO corpus_user, corpus_anon;

CREATE TABLE c_rls_off_public.audit_log (
  id bigserial PRIMARY KEY,
  actor_id uuid,
  detail text
);
-- The flaw: no RLS at all. The named grant is the one a reviewer sees; the
-- PUBLIC grant is the one that also hands the table to the anonymous role.
GRANT SELECT ON c_rls_off_public.audit_log TO corpus_user;
GRANT SELECT ON c_rls_off_public.audit_log TO PUBLIC;
