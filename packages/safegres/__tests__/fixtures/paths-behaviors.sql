-- Declared API surface: PostGraphile behaviors on object comments say which
-- relations the generated schema exposes. Only an explicit denial counts —
-- silence means the preset's default, which is usually "exposed".

DROP SCHEMA IF EXISTS fx_bhv CASCADE;
CREATE SCHEMA fx_bhv;

CREATE TABLE fx_bhv.users (
  id uuid PRIMARY KEY
);

CREATE TABLE fx_bhv.tables (
  id uuid PRIMARY KEY
);

-- Every reverse relation of this table is denied outright.
CREATE TABLE fx_bhv.hidden_module (
  id uuid PRIMARY KEY,
  hidden_owner_id uuid NOT NULL REFERENCES fx_bhv.users (id),
  table_id uuid NOT NULL REFERENCES fx_bhv.tables (id)
);

COMMENT ON CONSTRAINT hidden_module_hidden_owner_id_fkey ON fx_bhv.hidden_module IS
  '@behavior -list -connection -single';
COMMENT ON CONSTRAINT hidden_module_table_id_fkey ON fx_bhv.hidden_module IS
$$@behavior -list -connection -single
The provisioner fills this in; nothing traverses it.$$;

-- Partial denials. Neither is enough: a relation you can still reach as a
-- single record is still reachable.
CREATE TABLE fx_bhv.partial_module (
  id uuid PRIMARY KEY,
  partial_owner_id uuid NOT NULL REFERENCES fx_bhv.users (id),
  table_id uuid NOT NULL REFERENCES fx_bhv.tables (id)
);

COMMENT ON CONSTRAINT partial_module_partial_owner_id_fkey ON fx_bhv.partial_module IS
  '@behavior -list -connection';
-- A denial the author then took back: later fragments win.
COMMENT ON CONSTRAINT partial_module_table_id_fkey ON fx_bhv.partial_module IS
  '@behavior -* +list +connection +single';

-- The whole table is unselectable, so no key of it has an API path.
CREATE TABLE fx_bhv.internal_log (
  id uuid PRIMARY KEY,
  log_owner_id uuid NOT NULL REFERENCES fx_bhv.users (id)
);

COMMENT ON TABLE fx_bhv.internal_log IS '@behavior -select';

-- A denied relation whose column an RLS policy still reads: the read wins,
-- because RLS traverses the key whatever the API exposes. Its column name is
-- unique in the schema — policy tokens are matched database-wide, deliberately
-- over-eagerly, so a shared name would put a read signal on every table.
CREATE TABLE fx_bhv.tenant_scoped (
  id uuid PRIMARY KEY,
  tenant_owner_id uuid NOT NULL REFERENCES fx_bhv.users (id)
);

COMMENT ON CONSTRAINT tenant_scoped_tenant_owner_id_fkey ON fx_bhv.tenant_scoped IS
  '@behavior -list -connection -single';

ALTER TABLE fx_bhv.tenant_scoped ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_scoped_select ON fx_bhv.tenant_scoped
  FOR SELECT USING (tenant_owner_id = current_setting('fx.tenant_owner_id', true)::uuid);

-- No behavior at all: the default surface, which is not a denial.
CREATE TABLE fx_bhv.posts (
  id uuid PRIMARY KEY,
  author_id uuid NOT NULL REFERENCES fx_bhv.users (id)
);

COMMENT ON TABLE fx_bhv.posts IS 'Just a description, no smart tags.';
