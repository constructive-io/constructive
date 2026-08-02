DROP SCHEMA IF EXISTS c_checked_view_write CASCADE;
CREATE SCHEMA c_checked_view_write;

DO $$ BEGIN
  CREATE ROLE c_checked_write_owner NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT USAGE ON SCHEMA c_checked_view_write TO corpus_anon, corpus_user, c_checked_write_owner;

CREATE TABLE c_checked_view_write.notes (
  id bigserial PRIMARY KEY,
  tenant text NOT NULL,
  body text NOT NULL
);
ALTER TABLE c_checked_view_write.notes OWNER TO c_checked_write_owner;
ALTER TABLE c_checked_view_write.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY notes_own_tenant ON c_checked_view_write.notes
  FOR ALL TO corpus_user
  USING (tenant = (SELECT current_setting('app.tenant', true)))
  WITH CHECK (tenant = (SELECT current_setting('app.tenant', true)));
CREATE INDEX notes_tenant_idx ON c_checked_view_write.notes (tenant);
GRANT SELECT, INSERT ON c_checked_view_write.notes TO corpus_user;
GRANT USAGE ON SEQUENCE c_checked_view_write.notes_id_seq TO corpus_user;

-- Case 46 with the one clause that makes the filter apply to writes: a row
-- written through the view must satisfy the view's own condition. L18 must
-- stay silent. L9 still fires — the write does still land on `notes` as the
-- view's owner, which is what the view is for; the check option only settles
-- *which* rows may be written.
CREATE VIEW c_checked_view_write.tenant_notes AS
  SELECT id, tenant, body
  FROM c_checked_view_write.notes
  WHERE tenant = current_setting('app.tenant', true)
  WITH LOCAL CHECK OPTION;
ALTER VIEW c_checked_view_write.tenant_notes OWNER TO c_checked_write_owner;
GRANT INSERT, UPDATE ON c_checked_view_write.tenant_notes TO corpus_anon;
