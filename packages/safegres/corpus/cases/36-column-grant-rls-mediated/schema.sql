DROP SCHEMA IF EXISTS c_column_grant_rls CASCADE;
CREATE SCHEMA c_column_grant_rls;

GRANT USAGE ON SCHEMA c_column_grant_rls TO corpus_anon, corpus_user;

CREATE TABLE c_column_grant_rls.notes (
  id bigserial PRIMARY KEY,
  author text NOT NULL,
  title text NOT NULL,
  body text NOT NULL
);
ALTER TABLE c_column_grant_rls.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_column_grant_rls.notes FORCE ROW LEVEL SECURITY;

-- The column grant is mediated: only published rows are visible, and the
-- column list narrows that further. The point of this case is the pairing —
-- L13 still reports the reach, because nothing else in the audit can see it,
-- but it reports it as mediated and recommends nothing.
CREATE POLICY notes_published ON c_column_grant_rls.notes
  FOR SELECT TO corpus_anon
  USING (author = (SELECT current_setting('app.author', true)));
CREATE INDEX notes_author_idx ON c_column_grant_rls.notes (author);

GRANT SELECT (title) ON c_column_grant_rls.notes TO corpus_anon;

-- The negative half: corpus_user holds the whole relation, so its column
-- grant adds no reach and must not be reported twice.
GRANT SELECT ON c_column_grant_rls.notes TO corpus_user;
GRANT SELECT (title) ON c_column_grant_rls.notes TO corpus_user;
CREATE POLICY notes_own ON c_column_grant_rls.notes
  FOR SELECT TO corpus_user
  USING (author = (SELECT current_setting('app.author', true)));
