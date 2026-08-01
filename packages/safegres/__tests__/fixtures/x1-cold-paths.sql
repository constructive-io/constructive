-- Cold access paths: provisioning-config tables whose foreign keys are
-- write-once pointers nothing ever looks rows up by (X1 must stay quiet),
-- alongside real relations on the same shape (X1 must still fire).

DROP SCHEMA IF EXISTS fx_cold CASCADE;
CREATE SCHEMA fx_cold;

CREATE TABLE fx_cold.databases (
  id uuid PRIMARY KEY
);

CREATE TABLE fx_cold.tables (
  id uuid PRIMARY KEY,
  database_id uuid NOT NULL REFERENCES fx_cold.databases (id)
);

CREATE TABLE fx_cold.users (
  id uuid PRIMARY KEY
);

-- A config record: several write-once pointers filled in at provisioning
-- time, none of them read by a policy or a view. Every FK here is cold,
-- including `field_table_id`, which carries no default of its own — the
-- table-level classification is what catches it.
CREATE TABLE fx_cold.agent_module (
  id uuid PRIMARY KEY,
  database_id uuid NOT NULL REFERENCES fx_cold.databases (id),
  thread_table_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES fx_cold.tables (id),
  message_table_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES fx_cold.tables (id),
  field_table_id uuid REFERENCES fx_cold.tables (id)
);

ALTER TABLE fx_cold.agent_module ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_module_select ON fx_cold.agent_module
  FOR SELECT USING (database_id = current_setting('fx.database_id', true)::uuid);

-- One write-once pointer is not enough to call a table a config record.
CREATE TABLE fx_cold.one_pointer (
  id uuid PRIMARY KEY,
  thread_table_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES fx_cold.tables (id),
  owner_id uuid NOT NULL REFERENCES fx_cold.users (id)
);

-- A hot relationship table: same "several uuid FKs" shape, but the keys carry
-- no constant default, so nothing here is cold.
CREATE TABLE fx_cold.grants (
  id uuid PRIMARY KEY,
  actor_id uuid NOT NULL REFERENCES fx_cold.users (id),
  grantor_id uuid NOT NULL REFERENCES fx_cold.users (id)
);

-- A config-record-shaped table whose pointers a view reads, which refutes
-- coldness: something does look rows up by them.
CREATE TABLE fx_cold.read_module (
  id uuid PRIMARY KEY,
  primary_view_table_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES fx_cold.tables (id),
  secondary_view_table_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES fx_cold.tables (id)
);

CREATE VIEW fx_cold.read_module_tables AS
  SELECT t.id
  FROM fx_cold.tables t
  JOIN fx_cold.read_module m
    ON m.primary_view_table_id = t.id OR m.secondary_view_table_id = t.id;
