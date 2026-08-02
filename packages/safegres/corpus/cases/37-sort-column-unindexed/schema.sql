DROP SCHEMA IF EXISTS c_sort_no_index CASCADE;
CREATE SCHEMA c_sort_no_index;
GRANT USAGE ON SCHEMA c_sort_no_index TO corpus_user, corpus_anon;

CREATE TABLE c_sort_no_index.feed_items (
  id bigserial PRIMARY KEY,
  body text,
  -- The flaw, such as it is: a timestamp column that leads no index. A
  -- heuristic — nothing here proves anything orders by it — so the rule is
  -- info and costs the score nothing.
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON c_sort_no_index.feed_items TO corpus_user;
