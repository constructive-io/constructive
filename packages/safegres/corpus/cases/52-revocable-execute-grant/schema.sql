DROP SCHEMA IF EXISTS c_revocable CASCADE;
CREATE SCHEMA c_revocable;

DO $$ BEGIN
  CREATE ROLE c_revocable_owner NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT USAGE ON SCHEMA c_revocable TO corpus_anon, corpus_user, c_revocable_owner;

CREATE TABLE c_revocable.events (
  id bigserial PRIMARY KEY,
  body text NOT NULL
);
ALTER TABLE c_revocable.events OWNER TO c_revocable_owner;
ALTER TABLE c_revocable.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_revocable.events FORCE ROW LEVEL SECURITY;

-- corpus_anon may read, nothing more.
CREATE POLICY events_read ON c_revocable.events
  FOR SELECT TO corpus_anon USING (id > 0);
GRANT SELECT ON c_revocable.events TO corpus_anon;

-- A SECURITY DEFINER trigger function. It fires only on write, and corpus_anon
-- holds no write grant on `events`, so it can never make the trigger run. A
-- trigger function is not directly callable either: Postgres refuses a direct
-- call however wide its EXECUTE ACL is.
CREATE FUNCTION c_revocable.stamp_created_by()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN NEW;
END;
$$;
ALTER FUNCTION c_revocable.stamp_created_by() OWNER TO c_revocable_owner;

CREATE TRIGGER stamp_created_by BEFORE INSERT ON c_revocable.events
  FOR EACH ROW EXECUTE FUNCTION c_revocable.stamp_created_by();

-- The blanket grant: corpus_anon gets EXECUTE the way a schema created with
-- `ALTER DEFAULT PRIVILEGES ... GRANT ALL ON FUNCTIONS TO anonymous` hands it
-- out. corpus_anon now holds EXECUTE on a trigger function it can neither call
-- nor fire — a grant `granted − reachable` should prove revocable.
GRANT EXECUTE ON FUNCTION c_revocable.stamp_created_by() TO corpus_anon;
