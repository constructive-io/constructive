DROP SCHEMA IF EXISTS c_unreadable_view CASCADE;
CREATE SCHEMA c_unreadable_view;

DO $$ BEGIN
  CREATE ROLE c_unreadable_owner NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT USAGE ON SCHEMA c_unreadable_view TO corpus_anon, corpus_user, c_unreadable_owner;

CREATE TABLE c_unreadable_view.ledger (
  id bigserial PRIMARY KEY,
  subject text NOT NULL,
  amount numeric NOT NULL
);
ALTER TABLE c_unreadable_view.ledger OWNER TO c_unreadable_owner;

-- A definer view that reads one relation the analysis can see and one it
-- cannot: `query_to_xml` takes its query as a *string*, so whatever it
-- touches is invisible to any AST walk. The ledger read is still graded (L8);
-- the part that cannot be followed is reported as a coverage gap (L15) rather
-- than being silently treated as "reaches nothing else".
CREATE VIEW c_unreadable_view.activity AS
  SELECT l.id, l.subject,
         query_to_xml('SELECT count(*) FROM c_unreadable_view.ledger', false, true, '') AS extra
  FROM c_unreadable_view.ledger l;
ALTER VIEW c_unreadable_view.activity OWNER TO c_unreadable_owner;
GRANT SELECT ON c_unreadable_view.activity TO corpus_anon;
