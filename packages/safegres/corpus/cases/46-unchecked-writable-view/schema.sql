DROP SCHEMA IF EXISTS c_unchecked_view_write CASCADE;
CREATE SCHEMA c_unchecked_view_write;

DO $$ BEGIN
  CREATE ROLE c_unchecked_write_owner NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT USAGE ON SCHEMA c_unchecked_view_write TO corpus_anon, corpus_user, c_unchecked_write_owner;

CREATE TABLE c_unchecked_view_write.notes (
  id bigserial PRIMARY KEY,
  tenant text NOT NULL,
  body text NOT NULL
);
ALTER TABLE c_unchecked_view_write.notes OWNER TO c_unchecked_write_owner;
ALTER TABLE c_unchecked_view_write.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY notes_own_tenant ON c_unchecked_view_write.notes
  FOR ALL TO corpus_user
  USING (tenant = (SELECT current_setting('app.tenant', true)))
  WITH CHECK (tenant = (SELECT current_setting('app.tenant', true)));
CREATE INDEX notes_tenant_idx ON c_unchecked_view_write.notes (tenant);
GRANT SELECT, INSERT ON c_unchecked_view_write.notes TO corpus_user;
GRANT USAGE ON SEQUENCE c_unchecked_view_write.notes_id_seq TO corpus_user;

-- The flaw: the view's `WHERE` decides which rows come *out* and nothing about
-- which rows go *in*. `WITH CHECK OPTION` is not the default, so an INSERT
-- through this view may name any tenant at all — the row lands in `notes`,
-- checked against the view's owner, and the writer cannot then see it. The
-- condition reads like a boundary and is not one.
CREATE VIEW c_unchecked_view_write.tenant_notes AS
  SELECT id, tenant, body
  FROM c_unchecked_view_write.notes
  WHERE tenant = current_setting('app.tenant', true);
ALTER VIEW c_unchecked_view_write.tenant_notes OWNER TO c_unchecked_write_owner;
GRANT INSERT, UPDATE ON c_unchecked_view_write.tenant_notes TO corpus_anon;
