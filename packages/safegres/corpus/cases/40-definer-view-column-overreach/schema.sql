DROP SCHEMA IF EXISTS c_view_columns_wide CASCADE;
CREATE SCHEMA c_view_columns_wide;

DO $$ BEGIN
  CREATE ROLE c_view_columns_wide_owner NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT USAGE ON SCHEMA c_view_columns_wide TO corpus_anon, corpus_user, c_view_columns_wide_owner;

CREATE TABLE c_view_columns_wide.people (
  id bigserial PRIMARY KEY,
  handle text NOT NULL,
  email text NOT NULL,
  ssn text NOT NULL
);
ALTER TABLE c_view_columns_wide.people OWNER TO c_view_columns_wide_owner;

-- corpus_anon already reads these two columns, by column-level grant. No RLS,
-- so the owner's read returns exactly the rows corpus_anon's own read would.
GRANT SELECT (id, handle) ON c_view_columns_wide.people TO corpus_anon;

-- One column past the grant, and the view is a bypass: `email` escapes only
-- because the read runs as the owner. The projection is the whole difference
-- between this case and case 39.
CREATE VIEW c_view_columns_wide.contacts AS
  SELECT id, handle, email FROM c_view_columns_wide.people;
ALTER VIEW c_view_columns_wide.contacts OWNER TO c_view_columns_wide_owner;
GRANT SELECT ON c_view_columns_wide.contacts TO corpus_anon;
