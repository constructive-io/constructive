-- Planner-proof fixture: enough rows (and fresh statistics) for the planner
-- to prefer an index when one can serve the shape.
--   posts.author_id  — FK with no index at all      -> X1 confirmed
--   notes.author_id  — FK served by a HASH index    -> X1 refuted (the catalog
--                      rule only credits btree, but the planner uses it)
--   tiny.author_id   — FK with no index, few rows   -> X1 inconclusive

CREATE SCHEMA IF NOT EXISTS fx_explain;

CREATE TABLE fx_explain.authors (
  id bigint PRIMARY KEY
);

INSERT INTO fx_explain.authors SELECT g FROM generate_series(1, 500) g;

CREATE TABLE fx_explain.posts (
  id bigint PRIMARY KEY,
  author_id bigint NOT NULL REFERENCES fx_explain.authors (id)
);

INSERT INTO fx_explain.posts
SELECT g, (g % 500) + 1 FROM generate_series(1, 20000) g;

CREATE TABLE fx_explain.notes (
  id bigint PRIMARY KEY,
  author_id bigint NOT NULL REFERENCES fx_explain.authors (id)
);

INSERT INTO fx_explain.notes
SELECT g, (g % 500) + 1 FROM generate_series(1, 20000) g;

CREATE INDEX notes_author_hash_idx ON fx_explain.notes USING hash (author_id);

CREATE TABLE fx_explain.tiny (
  id bigint PRIMARY KEY,
  author_id bigint NOT NULL REFERENCES fx_explain.authors (id)
);

INSERT INTO fx_explain.tiny SELECT g, g FROM generate_series(1, 5) g;

ANALYZE fx_explain.authors;
ANALYZE fx_explain.posts;
ANALYZE fx_explain.notes;
ANALYZE fx_explain.tiny;
