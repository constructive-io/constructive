-- X1 seed: one FK with a covering index, one without, and a multi-column FK
-- whose columns are indexed but not in the leading position.
-- Expected findings: X1 on posts(author_id), X1 on pairs(a, b)

CREATE SCHEMA IF NOT EXISTS fx_x1;

CREATE TABLE fx_x1.authors (
  id bigint PRIMARY KEY
);

CREATE TABLE fx_x1.author_pairs (
  a bigint,
  b bigint,
  PRIMARY KEY (a, b)
);

-- Unindexed FK.
CREATE TABLE fx_x1.posts (
  id bigint PRIMARY KEY,
  author_id bigint REFERENCES fx_x1.authors (id)
);

-- Indexed FK — must not be reported.
CREATE TABLE fx_x1.comments (
  id bigint PRIMARY KEY,
  author_id bigint REFERENCES fx_x1.authors (id)
);
CREATE INDEX comments_author_id_idx ON fx_x1.comments (author_id);

-- FK columns appear in a wider index, but not as its leading columns.
CREATE TABLE fx_x1.pairs (
  id bigint PRIMARY KEY,
  a bigint,
  b bigint,
  FOREIGN KEY (a, b) REFERENCES fx_x1.author_pairs (a, b)
);
CREATE INDEX pairs_id_a_b_idx ON fx_x1.pairs (id, a, b);

-- Leading columns match the FK in the other order — equality lookups still
-- use it, so this must not be reported.
CREATE TABLE fx_x1.pairs_ok (
  id bigint PRIMARY KEY,
  a bigint,
  b bigint,
  FOREIGN KEY (a, b) REFERENCES fx_x1.author_pairs (a, b)
);
CREATE INDEX pairs_ok_b_a_idx ON fx_x1.pairs_ok (b, a, id);
