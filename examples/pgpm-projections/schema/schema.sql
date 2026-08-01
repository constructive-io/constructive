-- A small but realistic two-schema blog platform, authored as one flat SQL
-- file (as if hand-written, or produced by `pg_dump --schema-only`). This is
-- the SOURCE we project into every shape. Nothing here is pgpm-specific: it is
-- just ordinary PostgreSQL DDL.

CREATE SCHEMA blog_app;
CREATE SCHEMA blog_sec;

-- Authors and posts, with a foreign key, a check constraint, and an index.
CREATE TABLE blog_app.authors (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL UNIQUE,
  display_name text NOT NULL
);

CREATE TABLE blog_app.posts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  author_id bigint NOT NULL REFERENCES blog_app.authors (id),
  title text NOT NULL,
  body text NOT NULL,
  word_count int NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT title_non_empty CHECK (length(title) > 0)
);

CREATE INDEX posts_author_idx ON blog_app.posts (author_id);

-- A read model exposed as a function.
CREATE FUNCTION blog_app.published_post_count() RETURNS bigint
  LANGUAGE sql STABLE
  AS $$ SELECT count(*) FROM blog_app.posts WHERE published $$;

-- Security schema: an append-only audit log, protected by row-level security.
CREATE TABLE blog_sec.audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id bigint NOT NULL REFERENCES blog_app.posts (id),
  action text NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE blog_sec.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_read ON blog_sec.audit_log
  FOR SELECT USING (true);

GRANT SELECT ON blog_app.posts TO PUBLIC;

COMMENT ON TABLE blog_app.posts IS 'Blog posts, one per author.';
