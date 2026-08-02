DROP SCHEMA IF EXISTS c_matview_no_bypass CASCADE;
CREATE SCHEMA c_matview_no_bypass;

GRANT USAGE ON SCHEMA c_matview_no_bypass TO corpus_anon, corpus_user;

-- Reference data: public by intent, no RLS, readable directly.
CREATE TABLE c_matview_no_bypass.regions (
  code text PRIMARY KEY,
  label text NOT NULL
);
GRANT SELECT ON c_matview_no_bypass.regions TO corpus_anon, corpus_user;

-- A matview over it is a cache, not a bypass: the snapshot shows corpus_anon
-- nothing it could not select from `regions` itself, and there are no policies
-- for the stored rows to have skipped. L11 must stay silent.
CREATE MATERIALIZED VIEW c_matview_no_bypass.regions_cached AS
  SELECT code, label FROM c_matview_no_bypass.regions;
GRANT SELECT ON c_matview_no_bypass.regions_cached TO corpus_anon, corpus_user;
