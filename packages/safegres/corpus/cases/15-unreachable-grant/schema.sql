DROP SCHEMA IF EXISTS c_unreachable_grant CASCADE;
CREATE SCHEMA c_unreachable_grant;
GRANT USAGE ON SCHEMA c_unreachable_grant TO corpus_user;

CREATE TABLE c_unreachable_grant.attachments (
  id bigserial PRIMARY KEY,
  owner_id uuid NOT NULL
);
CREATE INDEX attachments_owner_idx ON c_unreachable_grant.attachments (owner_id);
ALTER TABLE c_unreachable_grant.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_unreachable_grant.attachments FORCE ROW LEVEL SECURITY;

CREATE POLICY attachments_read ON c_unreachable_grant.attachments FOR SELECT TO corpus_anon
  USING (owner_id = (SELECT nullif(current_setting('jwt.claims.user_id', true), '')::uuid));

-- The flaw: the table privilege exists, but the role has no USAGE on the
-- schema, so the grant can never be exercised.
GRANT SELECT ON c_unreachable_grant.attachments TO corpus_anon;
