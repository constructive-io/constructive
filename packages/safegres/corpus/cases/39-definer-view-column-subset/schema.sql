DROP SCHEMA IF EXISTS c_view_columns CASCADE;
CREATE SCHEMA c_view_columns;

DO $$ BEGIN
  CREATE ROLE c_view_columns_owner NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT USAGE ON SCHEMA c_view_columns TO corpus_anon, corpus_user, c_view_columns_owner;

CREATE TABLE c_view_columns.people (
  id bigserial PRIMARY KEY,
  handle text NOT NULL,
  email text NOT NULL,
  ssn text NOT NULL
);
ALTER TABLE c_view_columns.people OWNER TO c_view_columns_owner;

-- corpus_anon already reads these two columns, by column-level grant. No RLS,
-- so the owner's read returns exactly the rows corpus_anon's own read would.
GRANT SELECT (id, handle) ON c_view_columns.people TO corpus_anon;

-- A definer view over the *same two columns* launders nothing: every value it
-- returns was already readable by the caller. L8 must stay silent, which it
-- can only do by knowing the projection, not just the relation.
CREATE VIEW c_view_columns.handles AS
  SELECT id, handle FROM c_view_columns.people;
ALTER VIEW c_view_columns.handles OWNER TO c_view_columns_owner;
GRANT SELECT ON c_view_columns.handles TO corpus_anon;
