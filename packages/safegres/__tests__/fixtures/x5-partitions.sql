-- X5 seed for partitioned tables: the parent carries a prefix index and a
-- prefix-of-the-primary-key index; every partition inherits attached copies.
-- Expected findings: X5 on the parent for events_actor_id_idx and
-- events_captured_at_idx, none for the attached copies on the partitions, and
-- X5 on events_p2_local_idx (created on one partition alone, a duplicate of
-- the attached copy of events_actor_id_idx).

CREATE SCHEMA IF NOT EXISTS fx_x5p;

CREATE TABLE fx_x5p.events (
  id bigint NOT NULL,
  captured_at timestamptz NOT NULL,
  actor_id bigint,
  name text,
  PRIMARY KEY (captured_at, id)
) PARTITION BY RANGE (captured_at);

CREATE INDEX events_actor_id_idx ON fx_x5p.events (actor_id);
CREATE INDEX events_actor_id_name_idx ON fx_x5p.events (actor_id, name);
CREATE INDEX events_captured_at_idx ON fx_x5p.events (captured_at);

CREATE TABLE fx_x5p.events_p1 PARTITION OF fx_x5p.events
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE fx_x5p.events_p2 PARTITION OF fx_x5p.events
  FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
CREATE TABLE fx_x5p.events_default PARTITION OF fx_x5p.events DEFAULT;

CREATE INDEX events_p2_local_idx ON fx_x5p.events_p2 (actor_id);
