DROP SCHEMA IF EXISTS c_foreign_grant CASCADE;
CREATE SCHEMA c_foreign_grant;

GRANT USAGE ON SCHEMA c_foreign_grant TO corpus_anon, corpus_user;

CREATE EXTENSION IF NOT EXISTS postgres_fdw;

DO $$ BEGIN
  CREATE SERVER c_foreign_grant_srv FOREIGN DATA WRAPPER postgres_fdw
    OPTIONS (host 'localhost', dbname 'postgres');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- A foreign table cannot carry RLS: Postgres rejects
-- `ALTER FOREIGN TABLE ... ENABLE ROW LEVEL SECURITY` outright. So unlike the
-- A2 shape it resembles, the remedy "add a policy" does not exist, and every
-- row the remote side returns is returned to corpus_anon.
CREATE FOREIGN TABLE c_foreign_grant.remote_customers (
  id int,
  email text
) SERVER c_foreign_grant_srv OPTIONS (schema_name 'public', table_name 'customers');

GRANT SELECT ON c_foreign_grant.remote_customers TO corpus_anon;
