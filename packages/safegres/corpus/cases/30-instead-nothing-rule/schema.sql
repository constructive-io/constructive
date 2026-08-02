DROP SCHEMA IF EXISTS c_instead_nothing_rule CASCADE;
CREATE SCHEMA c_instead_nothing_rule;

DO $$ BEGIN
  CREATE ROLE c_readonly_view_owner NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT USAGE ON SCHEMA c_instead_nothing_rule
  TO corpus_anon, corpus_user, c_readonly_view_owner;

CREATE TABLE c_instead_nothing_rule.messages (
  id bigserial PRIMARY KEY,
  author text NOT NULL,
  body text NOT NULL
);
ALTER TABLE c_instead_nothing_rule.messages OWNER TO c_readonly_view_owner;
ALTER TABLE c_instead_nothing_rule.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY messages_own_rows ON c_instead_nothing_rule.messages
  FOR ALL TO corpus_user
  USING (author = (SELECT current_setting('app.author', true)))
  WITH CHECK (author = (SELECT current_setting('app.author', true)));
CREATE INDEX messages_author_idx ON c_instead_nothing_rule.messages (author);
GRANT SELECT, INSERT ON c_instead_nothing_rule.messages TO corpus_user;
GRANT USAGE ON SEQUENCE c_instead_nothing_rule.messages_id_seq TO corpus_user;

-- The commonest rule in the wild, and a correct one: `DO INSTEAD NOTHING`
-- makes the view read-only by swallowing the write. It reaches no relation at
-- all, so it confers nothing, and a rule that reported a write edge here would
-- be flagging the very construct that closes the write path.
CREATE VIEW c_instead_nothing_rule.message_feed
  WITH (security_invoker = true) AS
  SELECT id, author, body FROM c_instead_nothing_rule.messages;
ALTER VIEW c_instead_nothing_rule.message_feed OWNER TO c_readonly_view_owner;

CREATE RULE message_feed_no_insert AS
  ON INSERT TO c_instead_nothing_rule.message_feed DO INSTEAD NOTHING;
CREATE RULE message_feed_no_update AS
  ON UPDATE TO c_instead_nothing_rule.message_feed DO INSTEAD NOTHING;
CREATE RULE message_feed_no_delete AS
  ON DELETE TO c_instead_nothing_rule.message_feed DO INSTEAD NOTHING;

GRANT SELECT, INSERT ON c_instead_nothing_rule.message_feed TO corpus_anon;
