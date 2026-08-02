DROP SCHEMA IF EXISTS c_seq_grant CASCADE;
CREATE SCHEMA c_seq_grant;

GRANT USAGE ON SCHEMA c_seq_grant TO corpus_anon, corpus_user;

-- A free-standing sequence: nothing inserts through it, so the grant is not
-- load-bearing for any write path. USAGE lets corpus_anon burn the counter
-- and SELECT lets it read `last_value`. RLS has nothing to say about either:
-- a sequence cannot carry a policy.
CREATE SEQUENCE c_seq_grant.invoice_number;
GRANT USAGE, SELECT ON SEQUENCE c_seq_grant.invoice_number TO corpus_anon;

CREATE TABLE c_seq_grant.invoices (
  id bigserial PRIMARY KEY,
  subject text NOT NULL
);
ALTER TABLE c_seq_grant.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_seq_grant.invoices FORCE ROW LEVEL SECURITY;
CREATE POLICY invoices_own ON c_seq_grant.invoices
  FOR SELECT TO corpus_user
  USING (subject = (SELECT current_setting('app.subject', true)));
CREATE INDEX invoices_subject_idx ON c_seq_grant.invoices (subject);
GRANT SELECT ON c_seq_grant.invoices TO corpus_user;
