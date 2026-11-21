CREATE TABLE "simple-pets-public".realtime_users (id uuid PRIMARY KEY, name text NOT NULL);
INSERT INTO "simple-pets-public".realtime_users VALUES
  ('bbbbbbbb-0000-4000-8000-000000000002', 'Alice'),
  ('bbbbbbbb-0000-4000-8000-000000000003', 'Bob'),
  ('bbbbbbbb-0000-4000-8000-000000000004', 'Charlie');
ALTER TABLE "simple-pets-auth-private".sessions ADD FOREIGN KEY (user_id)
  REFERENCES "simple-pets-public".realtime_users(id);

CREATE TABLE "simple-pets-public".rls_notes (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES "simple-pets-public".realtime_users(id),
  title text NOT NULL DEFAULT 'private contents',
  shared boolean NOT NULL DEFAULT false
);
COMMENT ON TABLE "simple-pets-public".rls_notes IS E'@realtime';
ALTER TABLE "simple-pets-public".rls_notes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "simple-pets-public".rls_notes TO authenticated;
CREATE POLICY read_notes ON "simple-pets-public".rls_notes FOR SELECT TO authenticated
  USING (shared OR owner_id = nullif(current_setting('jwt.claims.user_id', true), '')::uuid);
CREATE POLICY create_notes ON "simple-pets-public".rls_notes FOR INSERT TO authenticated
  WITH CHECK (owner_id = nullif(current_setting('jwt.claims.user_id', true), '')::uuid);
CREATE POLICY update_notes ON "simple-pets-public".rls_notes FOR UPDATE TO authenticated
  USING (owner_id = nullif(current_setting('jwt.claims.user_id', true), '')::uuid)
  WITH CHECK (owner_id = nullif(current_setting('jwt.claims.user_id', true), '')::uuid);
CREATE POLICY delete_notes ON "simple-pets-public".rls_notes FOR DELETE TO authenticated
  USING (owner_id = nullif(current_setting('jwt.claims.user_id', true), '')::uuid);

CREATE FUNCTION "simple-pets-private".notify_rls_note() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('realtime:' || md5(octet_length(TG_TABLE_SCHEMA)::text || ':' || TG_TABLE_SCHEMA || TG_TABLE_NAME),
    TG_OP || ':' || string_agg(id::text, ',' ORDER BY id))
    FROM changed_rows HAVING count(*) > 0;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER notify_rls_note_insert AFTER INSERT ON "simple-pets-public".rls_notes
  REFERENCING NEW TABLE AS changed_rows FOR EACH STATEMENT EXECUTE FUNCTION "simple-pets-private".notify_rls_note();
CREATE TRIGGER notify_rls_note_update AFTER UPDATE ON "simple-pets-public".rls_notes
  REFERENCING NEW TABLE AS changed_rows FOR EACH STATEMENT EXECUTE FUNCTION "simple-pets-private".notify_rls_note();
CREATE TRIGGER notify_rls_note_delete AFTER DELETE ON "simple-pets-public".rls_notes
  REFERENCING OLD TABLE AS changed_rows FOR EACH STATEMENT EXECUTE FUNCTION "simple-pets-private".notify_rls_note();

CREATE FUNCTION "simple-pets-public".bulk_write_rls_notes(note_ids uuid[], operation text)
RETURNS boolean AS $$
BEGIN
  IF operation = 'UPDATE' THEN
    UPDATE "simple-pets-public".rls_notes AS n SET title = n.title || '!' WHERE n.id = ANY(note_ids);
  ELSIF operation = 'DELETE' THEN
    DELETE FROM "simple-pets-public".rls_notes WHERE id = ANY(note_ids);
  ELSE
    RAISE EXCEPTION 'Unknown test operation';
  END IF;
  RETURN true;
END;
$$ LANGUAGE plpgsql VOLATILE;
GRANT EXECUTE ON FUNCTION "simple-pets-public".bulk_write_rls_notes(uuid[], text) TO authenticated;

CREATE FUNCTION "simple-pets-public".write_rls_note(note_id uuid, operation text, shared boolean DEFAULT NULL)
RETURNS uuid AS $$
BEGIN
  IF operation = 'INSERT' THEN
    INSERT INTO "simple-pets-public".rls_notes (id, owner_id, shared)
    VALUES (note_id, current_setting('jwt.claims.user_id')::uuid, coalesce(shared, false));
  ELSIF operation = 'UPDATE' THEN
    UPDATE "simple-pets-public".rls_notes AS n SET title = n.title || '!', shared = coalesce(write_rls_note.shared, n.shared)
    WHERE n.id = note_id;
  ELSIF operation = 'DELETE' THEN
    DELETE FROM "simple-pets-public".rls_notes WHERE id = note_id;
  ELSE
    RAISE EXCEPTION 'Unknown test operation';
  END IF;
  RETURN note_id;
END;
$$ LANGUAGE plpgsql VOLATILE;
GRANT EXECUTE ON FUNCTION "simple-pets-public".write_rls_note(uuid, text, boolean) TO authenticated;

CREATE FUNCTION "simple-pets-public".rls_note_visible(note_id uuid) RETURNS boolean AS $$
  SELECT EXISTS (SELECT FROM "simple-pets-public".rls_notes WHERE id = note_id);
$$ LANGUAGE sql STABLE;
GRANT EXECUTE ON FUNCTION "simple-pets-public".rls_note_visible(uuid) TO authenticated;

CREATE FUNCTION "simple-pets-public".bulk_create_rls_notes(note_ids uuid[], shared_ids uuid[])
RETURNS uuid[] AS $$
  WITH added AS (
    INSERT INTO "simple-pets-public".rls_notes (id, owner_id, shared)
    SELECT id, current_setting('jwt.claims.user_id')::uuid, id = ANY(shared_ids)
    FROM unnest(note_ids) AS n(id)
    RETURNING id
  ) SELECT array_agg(id ORDER BY id) FROM added;
$$ LANGUAGE sql VOLATILE;
GRANT EXECUTE ON FUNCTION "simple-pets-public".bulk_create_rls_notes(uuid[], uuid[]) TO authenticated;

UPDATE routing_public.database_settings SET max_concurrent_requests = 8, max_request_bytes = 16384
WHERE database_id = '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9';

CREATE TABLE "simple-pets-public".long_realtime_notification_lifecycle_notes (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'long channel contents'
);
COMMENT ON TABLE "simple-pets-public".long_realtime_notification_lifecycle_notes IS E'@realtime';
ALTER TABLE "simple-pets-public".long_realtime_notification_lifecycle_notes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "simple-pets-public".long_realtime_notification_lifecycle_notes TO authenticated;
CREATE POLICY own_long_notes ON "simple-pets-public".long_realtime_notification_lifecycle_notes TO authenticated
  USING (owner_id = nullif(current_setting('jwt.claims.user_id', true), '')::uuid)
  WITH CHECK (owner_id = nullif(current_setting('jwt.claims.user_id', true), '')::uuid);

CREATE FUNCTION "simple-pets-private".notify_long_realtime_note() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('realtime:' || md5(octet_length(TG_TABLE_SCHEMA)::text || ':' || TG_TABLE_SCHEMA || TG_TABLE_NAME),
    TG_OP || ':' || string_agg(id::text, ',' ORDER BY id)) FROM changed_rows HAVING count(*) > 0;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER long_note_insert AFTER INSERT ON "simple-pets-public".long_realtime_notification_lifecycle_notes
  REFERENCING NEW TABLE AS changed_rows FOR EACH STATEMENT EXECUTE FUNCTION "simple-pets-private".notify_long_realtime_note();
CREATE TRIGGER long_note_update AFTER UPDATE ON "simple-pets-public".long_realtime_notification_lifecycle_notes
  REFERENCING NEW TABLE AS changed_rows FOR EACH STATEMENT EXECUTE FUNCTION "simple-pets-private".notify_long_realtime_note();
CREATE TRIGGER long_note_delete AFTER DELETE ON "simple-pets-public".long_realtime_notification_lifecycle_notes
  REFERENCING OLD TABLE AS changed_rows FOR EACH STATEMENT EXECUTE FUNCTION "simple-pets-private".notify_long_realtime_note();

CREATE FUNCTION "simple-pets-public".write_long_realtime_note(note_id uuid, operation text) RETURNS uuid AS $$
BEGIN
  IF operation = 'INSERT' THEN
    INSERT INTO "simple-pets-public".long_realtime_notification_lifecycle_notes (id, owner_id)
    VALUES (note_id, current_setting('jwt.claims.user_id')::uuid);
  ELSIF operation = 'UPDATE' THEN
    UPDATE "simple-pets-public".long_realtime_notification_lifecycle_notes SET title = title || '!' WHERE id = note_id;
  ELSIF operation = 'DELETE' THEN
    DELETE FROM "simple-pets-public".long_realtime_notification_lifecycle_notes WHERE id = note_id;
  ELSE
    RAISE EXCEPTION 'Unknown test operation';
  END IF;
  RETURN note_id;
END;
$$ LANGUAGE plpgsql VOLATILE;
GRANT EXECUTE ON FUNCTION "simple-pets-public".write_long_realtime_note(uuid, text) TO authenticated;
