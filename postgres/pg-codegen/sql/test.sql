BEGIN;

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP SCHEMA IF EXISTS codegen_test CASCADE;
CREATE SCHEMA codegen_test;

CREATE TYPE codegen_test.run_status AS ENUM ('queued', 'running', 'succeeded', 'failed');

CREATE DOMAIN codegen_test.email AS citext CHECK (VALUE ~ '@');

-- Users table
CREATE TABLE codegen_test.users (
    id serial PRIMARY KEY,
    username citext NOT NULL UNIQUE CHECK (length(username) < 127),
    email codegen_test.email,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Posts table
CREATE TABLE codegen_test.posts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id int NOT NULL REFERENCES codegen_test.users(id),
    title text NOT NULL,
    body text,
    published boolean DEFAULT false,
    published_at timestamptz
);

-- Runs table: enums, arrays, jsonb, bigint, numeric
CREATE TABLE codegen_test.agent_runs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id uuid NOT NULL,
    status codegen_test.run_status NOT NULL DEFAULT 'queued',
    tags text[] NOT NULL DEFAULT '{}',
    retry_seconds int[],
    metadata jsonb NOT NULL DEFAULT '{}',
    settings json,
    last_event_seq bigint NOT NULL DEFAULT 0,
    score numeric(10, 4),
    started_at timestamptz,
    finished_at timestamptz
);

COMMENT ON TABLE codegen_test.agent_runs IS 'One run of an agent within a thread';
COMMENT ON COLUMN codegen_test.agent_runs.last_event_seq IS 'Highest event seq appended for this run';

-- A simple view (to test classKind !== 'r')
CREATE VIEW codegen_test.active_users AS
SELECT id, username FROM codegen_test.users WHERE username IS NOT NULL;

-- A partitioned table with child partitions: only the parent is an API surface
CREATE TABLE codegen_test.usage_events (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    recorded_at timestamptz NOT NULL,
    amount numeric(10, 4),
    PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

CREATE TABLE codegen_test.usage_events_p_20260101
    PARTITION OF codegen_test.usage_events
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE codegen_test.usage_events_p_20260201
    PARTITION OF codegen_test.usage_events
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- A function (to test procedure introspection)
CREATE FUNCTION codegen_test.user_count() RETURNS integer AS $$
BEGIN
  RETURN (SELECT count(*) FROM codegen_test.users);
END;
$$ LANGUAGE plpgsql STABLE;

COMMIT;
