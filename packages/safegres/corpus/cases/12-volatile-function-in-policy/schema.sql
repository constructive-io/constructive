DROP SCHEMA IF EXISTS c_volatile_policy CASCADE;
CREATE SCHEMA c_volatile_policy;
GRANT USAGE ON SCHEMA c_volatile_policy TO corpus_user, corpus_anon;

CREATE FUNCTION c_volatile_policy.current_actor() RETURNS uuid
  LANGUAGE sql VOLATILE AS $$ SELECT gen_random_uuid() $$;

CREATE TABLE c_volatile_policy.events (
  id bigserial PRIMARY KEY,
  actor_id uuid NOT NULL
);
CREATE INDEX events_actor_idx ON c_volatile_policy.events (actor_id);
ALTER TABLE c_volatile_policy.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_volatile_policy.events FORCE ROW LEVEL SECURITY;

-- The flaw: a VOLATILE function cannot be hoisted, so it runs once per row
-- scanned — not once per query.
CREATE POLICY events_actor ON c_volatile_policy.events FOR SELECT TO corpus_user
  USING (actor_id = c_volatile_policy.current_actor());

GRANT SELECT ON c_volatile_policy.events TO corpus_user;
