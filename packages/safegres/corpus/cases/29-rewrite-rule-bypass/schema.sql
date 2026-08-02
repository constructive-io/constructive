DROP SCHEMA IF EXISTS c_rewrite_rule_bypass CASCADE;
CREATE SCHEMA c_rewrite_rule_bypass;

DO $$ BEGIN
  CREATE ROLE c_rule_owner NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT USAGE ON SCHEMA c_rewrite_rule_bypass TO corpus_anon, corpus_user, c_rule_owner;

CREATE TABLE c_rewrite_rule_bypass.messages (
  id bigserial PRIMARY KEY,
  author text NOT NULL,
  body text NOT NULL
);
ALTER TABLE c_rewrite_rule_bypass.messages OWNER TO c_rule_owner;
ALTER TABLE c_rewrite_rule_bypass.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_rewrite_rule_bypass.messages FORCE ROW LEVEL SECURITY;

CREATE POLICY messages_own_rows ON c_rewrite_rule_bypass.messages
  FOR ALL TO corpus_user
  USING (author = (SELECT current_setting('app.author', true)))
  WITH CHECK (author = (SELECT current_setting('app.author', true)));
CREATE INDEX messages_author_idx ON c_rewrite_rule_bypass.messages (author);
GRANT SELECT, INSERT ON c_rewrite_rule_bypass.messages TO corpus_user;
GRANT USAGE ON SEQUENCE c_rewrite_rule_bypass.messages_id_seq TO corpus_user;

-- An append-only audit trail nobody but the owner is meant to write.
CREATE TABLE c_rewrite_rule_bypass.audit_log (
  id bigserial PRIMARY KEY,
  note text NOT NULL
);
ALTER TABLE c_rewrite_rule_bypass.audit_log OWNER TO c_rule_owner;
ALTER TABLE c_rewrite_rule_bypass.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_rewrite_rule_bypass.audit_log FORCE ROW LEVEL SECURITY;

-- The flaw, and note what it survives: the view *is* `security_invoker`, so
-- its own base relation is read and written as the caller. That setting does
-- not reach the rule. A rewrite rule's actions are permission-checked against
-- the owner of the relation the rule is on, so corpus_anon's INSERT on the
-- view writes `audit_log` as c_rule_owner. `pg_get_viewdef` never names
-- `audit_log`: no reading of the view's definition can find this edge.
CREATE VIEW c_rewrite_rule_bypass.message_inbox
  WITH (security_invoker = true) AS
  SELECT id, author, body FROM c_rewrite_rule_bypass.messages;
ALTER VIEW c_rewrite_rule_bypass.message_inbox OWNER TO c_rule_owner;

CREATE RULE message_inbox_insert AS
  ON INSERT TO c_rewrite_rule_bypass.message_inbox
  DO INSTEAD INSERT INTO c_rewrite_rule_bypass.audit_log (note) VALUES (new.body);

GRANT INSERT ON c_rewrite_rule_bypass.message_inbox TO corpus_anon;
