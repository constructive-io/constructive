DROP SCHEMA IF EXISTS c_barrier_view CASCADE;
CREATE SCHEMA c_barrier_view;

DO $$ BEGIN
  CREATE ROLE c_barrier_view_owner NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT USAGE ON SCHEMA c_barrier_view TO corpus_anon, corpus_user, c_barrier_view_owner;

CREATE TABLE c_barrier_view.documents (
  id bigserial PRIMARY KEY,
  visibility text NOT NULL,
  title text NOT NULL,
  body text NOT NULL
);
ALTER TABLE c_barrier_view.documents OWNER TO c_barrier_view_owner;

-- Case 33 with the one option that makes the filter a boundary: the planner
-- may not push a caller's qual below the view's own, so the excluded rows are
-- never evaluated. L12 must stay silent. L8 still fires — the view does hand
-- corpus_anon rows of a table it holds no grant on, which is what the view is
-- for; the barrier only settles *which* rows.
CREATE VIEW c_barrier_view.public_documents WITH (security_barrier = true) AS
  SELECT id, title, body
  FROM c_barrier_view.documents
  WHERE visibility = 'public';
ALTER VIEW c_barrier_view.public_documents OWNER TO c_barrier_view_owner;
GRANT SELECT ON c_barrier_view.public_documents TO corpus_anon, corpus_user;
