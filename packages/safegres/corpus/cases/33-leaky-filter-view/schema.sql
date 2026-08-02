DROP SCHEMA IF EXISTS c_leaky_filter_view CASCADE;
CREATE SCHEMA c_leaky_filter_view;

DO $$ BEGIN
  CREATE ROLE c_leaky_view_owner NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT USAGE ON SCHEMA c_leaky_filter_view TO corpus_anon, corpus_user, c_leaky_view_owner;

CREATE TABLE c_leaky_filter_view.documents (
  id bigserial PRIMARY KEY,
  visibility text NOT NULL,
  title text NOT NULL,
  body text NOT NULL
);
ALTER TABLE c_leaky_filter_view.documents OWNER TO c_leaky_view_owner;

-- The flaw: the view's WHERE is the only thing separating corpus_anon from the
-- private documents, and without `security_barrier` the planner may evaluate a
-- caller-supplied qual before it. A cheap leaky function
-- (`... WHERE leak(body)`) then runs against every row, private ones included,
-- and reports what it sees through a notice, an error or a timing difference.
CREATE VIEW c_leaky_filter_view.public_documents AS
  SELECT id, title, body
  FROM c_leaky_filter_view.documents
  WHERE visibility = 'public';
ALTER VIEW c_leaky_filter_view.public_documents OWNER TO c_leaky_view_owner;
GRANT SELECT ON c_leaky_filter_view.public_documents TO corpus_anon, corpus_user;
