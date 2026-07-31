-- X7/X8 seed: search columns with and without a usable index, and
-- sort-shaped (timestamp) columns with and without a leading index.
-- Expected findings: X7 on articles(search_doc), X8 on articles(updated_at),
-- notes(created_at) and notes(updated_at).

CREATE SCHEMA IF NOT EXISTS fx_x7;

-- tsvector with no GIN/GiST index — the search field is a seq scan.
-- created_at leads an index; updated_at does not.
CREATE TABLE fx_x7.articles (
  id bigint PRIMARY KEY,
  body text,
  search_doc tsvector,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX articles_created_at_idx ON fx_x7.articles (created_at DESC);

-- tsvector with a GIN index — must not be reported.
CREATE TABLE fx_x7.pages (
  id bigint PRIMARY KEY,
  search_doc tsvector
);

CREATE INDEX pages_search_doc_idx ON fx_x7.pages USING gin (search_doc);

-- tsvector with a GiST index — also serves the search, must not be reported.
CREATE TABLE fx_x7.snippets (
  id bigint PRIMARY KEY,
  search_doc tsvector
);

CREATE INDEX snippets_search_doc_idx ON fx_x7.snippets USING gist (search_doc);

-- A trailing-position and a partial index: neither can serve the sort alone.
CREATE TABLE fx_x7.notes (
  id bigint PRIMARY KEY,
  owner_id bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  archived boolean NOT NULL DEFAULT false
);

CREATE INDEX notes_owner_created_idx ON fx_x7.notes (owner_id, created_at);
CREATE INDEX notes_updated_live_idx ON fx_x7.notes (updated_at) WHERE NOT archived;
