DROP SCHEMA IF EXISTS c_invoker_unreadable CASCADE;
CREATE SCHEMA c_invoker_unreadable;

DO $$ BEGIN
  CREATE ROLE c_invoker_unreadable_owner NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT USAGE ON SCHEMA c_invoker_unreadable TO corpus_anon, corpus_user, c_invoker_unreadable_owner;

CREATE TABLE c_invoker_unreadable.ledger (
  id bigserial PRIMARY KEY,
  subject text NOT NULL
);
ALTER TABLE c_invoker_unreadable.ledger OWNER TO c_invoker_unreadable_owner;
GRANT SELECT ON c_invoker_unreadable.ledger TO corpus_anon;

-- The same unreadable body, with `security_invoker`. Nothing the body does
-- runs with privileges corpus_anon does not already have, so there is no
-- ungraded owner-privileged reach to report. An unreadable body is only a
-- coverage gap when the view confers something.
CREATE VIEW c_invoker_unreadable.activity WITH (security_invoker = true) AS
  SELECT l.id,
         query_to_xml('SELECT count(*) FROM c_invoker_unreadable.ledger', false, true, '') AS extra
  FROM c_invoker_unreadable.ledger l;
ALTER VIEW c_invoker_unreadable.activity OWNER TO c_invoker_unreadable_owner;
GRANT SELECT ON c_invoker_unreadable.activity TO corpus_anon;
