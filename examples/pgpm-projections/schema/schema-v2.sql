-- The next version of the same platform. Diffing schema.sql -> schema-v2.sql
-- yields exactly these changes: a new column (posts.slug), a dropped column
-- (posts.word_count), a changed function body, two new tables (tags,
-- post_tags), and a new policy on the audit log. `pgpm diff` derives the
-- migration from the two states; nothing is hand-written.

CREATE SCHEMA blog_app;
CREATE SCHEMA blog_sec;

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
  slug text,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT title_non_empty CHECK (length(title) > 0)
);

CREATE INDEX posts_author_idx ON blog_app.posts (author_id);

-- Changed body: now counts all posts, not only published ones.
CREATE FUNCTION blog_app.published_post_count() RETURNS bigint
  LANGUAGE sql STABLE
  AS $$ SELECT count(*) FROM blog_app.posts $$;

-- New: a tagging model.
CREATE TABLE blog_app.tags (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE
);

CREATE TABLE blog_app.post_tags (
  post_id bigint NOT NULL REFERENCES blog_app.posts (id),
  tag_id bigint NOT NULL REFERENCES blog_app.tags (id),
  PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE blog_sec.audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id bigint NOT NULL REFERENCES blog_app.posts (id),
  action text NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE blog_sec.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_read ON blog_sec.audit_log
  FOR SELECT USING (true);

-- New policy.
CREATE POLICY audit_log_insert ON blog_sec.audit_log
  FOR INSERT WITH CHECK (true);

GRANT SELECT ON blog_app.posts TO PUBLIC;

COMMENT ON TABLE blog_app.posts IS 'Blog posts, one per author.';
