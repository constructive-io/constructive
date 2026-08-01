-- Extension-owned relations vs. application relations.
--
-- `fx_ext.ext_widget` is registered as a dependency of an extension, the way
-- an extension's own tables are. `fx_ext.app_widget` is identical in every
-- other respect, so anything that reports one and not the other is reacting
-- to ownership rather than to shape.
--
-- `fx_ext_runtime` is an extension's *schema* holding a table the extension
-- created without registering it — pg_partman's child partitions in miniature.

DROP SCHEMA IF EXISTS fx_ext CASCADE;
DROP SCHEMA IF EXISTS fx_ext_runtime CASCADE;
DROP EXTENSION IF EXISTS hstore CASCADE;
DROP EXTENSION IF EXISTS pg_trgm CASCADE;

CREATE SCHEMA fx_ext;
CREATE EXTENSION hstore SCHEMA fx_ext;

-- Both tables: granted to PUBLIC, no RLS, no primary key — A2 and X6 material.
CREATE TABLE fx_ext.ext_widget (
  id uuid DEFAULT gen_random_uuid(),
  owner_id uuid,
  label text
);
GRANT SELECT ON fx_ext.ext_widget TO PUBLIC;

CREATE TABLE fx_ext.app_widget (
  id uuid DEFAULT gen_random_uuid(),
  owner_id uuid,
  label text
);
GRANT SELECT ON fx_ext.app_widget TO PUBLIC;

-- Only the first one belongs to the extension.
ALTER EXTENSION hstore ADD TABLE fx_ext.ext_widget;

-- A partition of an owned parent carries no dependency of its own, at any
-- depth: the grandchild is as much the extension's as the root is.
CREATE TABLE fx_ext.ext_events (
  id uuid DEFAULT gen_random_uuid(),
  captured_at timestamptz NOT NULL
) PARTITION BY RANGE (captured_at);
CREATE TABLE fx_ext.ext_events_p1
  PARTITION OF fx_ext.ext_events FOR VALUES FROM ('2020-01-01') TO ('2030-01-01')
  PARTITION BY RANGE (captured_at);
CREATE TABLE fx_ext.ext_events_p1a
  PARTITION OF fx_ext.ext_events_p1 FOR VALUES FROM ('2020-01-01') TO ('2025-01-01');
GRANT SELECT ON fx_ext.ext_events TO PUBLIC;
ALTER EXTENSION hstore ADD TABLE fx_ext.ext_events;

CREATE SCHEMA fx_ext_runtime;
CREATE EXTENSION pg_trgm SCHEMA fx_ext_runtime;

CREATE TABLE fx_ext_runtime.runtime_child (
  id uuid DEFAULT gen_random_uuid(),
  label text
);
GRANT SELECT ON fx_ext_runtime.runtime_child TO PUBLIC;
