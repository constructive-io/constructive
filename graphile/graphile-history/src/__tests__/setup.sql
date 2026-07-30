-- Integration test seed for graphile-history
-- Emulates what metaschema_generators.data_history produces: a source table
-- tagged @history, a zero-constraint companion <table>_history, and NEW-append
-- AFTER triggers.

CREATE SCHEMA IF NOT EXISTS history_test;
GRANT USAGE ON SCHEMA history_test TO PUBLIC;

-- ── Source table ─────────────────────────────────────────────────────────────
CREATE TABLE history_test.posts (
  id serial PRIMARY KEY,
  title text NOT NULL,
  body text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed source rows BEFORE the trigger exists so history is seeded deterministically.
INSERT INTO history_test.posts (id, title, body, created_at) VALUES
  (1, 'Hello World v3', 'Body v3', '2024-01-01T00:00:00Z'),
  (2, 'Second Post',    'Second body', '2024-01-01T00:00:00Z');
SELECT setval('history_test.posts_id_seq', 10);

-- ── History companion (zero keys / constraints, all-nullable copies) ──────────
CREATE TABLE history_test.posts_history (
  id int,
  title text,
  body text,
  created_at timestamptz,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  history_op text
);
CREATE INDEX idx_posts_history_id ON history_test.posts_history (id, recorded_at DESC);

-- Deterministic version stream for post 1 (oldest → newest).
INSERT INTO history_test.posts_history (id, title, body, created_at, recorded_at, history_op) VALUES
  (1, 'Hello World',    'Body v1', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z', 'INSERT'),
  (1, 'Hello World v2', 'Body v2', '2024-01-01T00:00:00Z', '2024-02-01T00:00:00Z', 'UPDATE'),
  (1, 'Hello World v3', 'Body v3', '2024-01-01T00:00:00Z', '2024-03-01T00:00:00Z', 'UPDATE');

-- History stream for post 2 (ends in a DELETE tombstone).
INSERT INTO history_test.posts_history (id, title, body, created_at, recorded_at, history_op) VALUES
  (2, 'Second Post', 'Second body', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z', 'INSERT');

-- ── NEW-append triggers (so restores are themselves recorded) ─────────────────
CREATE FUNCTION history_test.tg_posts_history_write() RETURNS trigger AS $$
BEGIN
  INSERT INTO history_test.posts_history (id, title, body, created_at, recorded_at, history_op)
  VALUES (NEW.id, NEW.title, NEW.body, NEW.created_at, now(), TG_OP);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION history_test.tg_posts_history_del() RETURNS trigger AS $$
BEGIN
  INSERT INTO history_test.posts_history (id, title, body, created_at, recorded_at, history_op)
  VALUES (OLD.id, OLD.title, OLD.body, OLD.created_at, now(), 'DELETE');
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER history_write AFTER INSERT OR UPDATE ON history_test.posts
  FOR EACH ROW EXECUTE FUNCTION history_test.tg_posts_history_write();
CREATE TRIGGER history_del AFTER DELETE ON history_test.posts
  FOR EACH ROW EXECUTE FUNCTION history_test.tg_posts_history_del();

COMMENT ON TABLE history_test.posts IS E'@history posts_history';

-- Grant access so the withPgClient pool can query.
GRANT ALL ON ALL TABLES IN SCHEMA history_test TO PUBLIC;
GRANT ALL ON ALL SEQUENCES IN SCHEMA history_test TO PUBLIC;
