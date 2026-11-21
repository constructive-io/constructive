CREATE SCHEMA bulk_test;
CREATE TYPE bulk_test.item_state AS ENUM ('queued', 'in progress');
CREATE TYPE bulk_test.item_position AS (x integer, label text);
CREATE TABLE bulk_test.items (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  quantity int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT '2026-11-20 12:34:56.123456+00',
  local_time timestamp NOT NULL DEFAULT '2026-11-20 12:34:56.654321',
  day date NOT NULL DEFAULT '2026-11-20',
  metadata jsonb DEFAULT '{"nested": [1, null, {"enabled": true}], "text": "commas,quotes\"and\\slashes"}',
  labels text[] DEFAULT ARRAY['comma,value', 'quote"value', E'back\\slash', '', NULL],
  state bulk_test.item_state DEFAULT 'queued',
  history bulk_test.item_state[] DEFAULT ARRAY['queued', 'in progress']::bulk_test.item_state[],
  position bulk_test.item_position DEFAULT ROW(7, 'nested,record')::bulk_test.item_position,
  optional_at timestamptz
);
COMMENT ON TABLE bulk_test.items IS E'@behavior +bulkInsert +bulkUpsert +bulkUpdate +bulkDelete';
INSERT INTO bulk_test.items (name, quantity) VALUES ('Widget A', 100);
