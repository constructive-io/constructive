DROP SCHEMA IF EXISTS c_column_grant CASCADE;
CREATE SCHEMA c_column_grant;

GRANT USAGE ON SCHEMA c_column_grant TO corpus_anon, corpus_user;

CREATE TABLE c_column_grant.profiles (
  id bigserial PRIMARY KEY,
  handle text NOT NULL,
  display_name text NOT NULL,
  email text NOT NULL,
  password_reset_token text
);

-- The flaw is not the projection — exposing a handle and a display name
-- anonymously is a reasonable thing to want. The flaw is that this grant is
-- written to `pg_attribute.attacl` and nothing at all appears in the table's
-- `relacl`, so every relacl-only rule concludes corpus_anon reaches nothing
-- here. RLS is off, so the grant reads every row of those columns.
GRANT SELECT (handle, display_name) ON c_column_grant.profiles TO corpus_anon;
GRANT SELECT (handle, display_name, email) ON c_column_grant.profiles TO corpus_user;
GRANT UPDATE (display_name) ON c_column_grant.profiles TO corpus_user;
