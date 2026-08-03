DROP SCHEMA IF EXISTS c_policy_reach CASCADE;
DROP SCHEMA IF EXISTS c_policy_priv CASCADE;
CREATE SCHEMA c_policy_reach;
CREATE SCHEMA c_policy_priv;

DO $$ BEGIN
  CREATE ROLE c_policy_owner NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- corpus_anon can reach the API schema, but holds no USAGE on the private one —
-- exactly the constructive-db shape, where the `*_private` schemas hold the
-- check functions the policies call. The private schema is still audited (it is
-- in scope), it is simply not part of the surface corpus_anon addresses.
GRANT USAGE ON SCHEMA c_policy_reach TO corpus_anon, c_policy_owner;
GRANT USAGE ON SCHEMA c_policy_priv TO c_policy_owner;

CREATE TABLE c_policy_reach.docs (
  id bigserial PRIMARY KEY,
  owner_id bigint NOT NULL,
  body text NOT NULL
);
ALTER TABLE c_policy_reach.docs OWNER TO c_policy_owner;
ALTER TABLE c_policy_reach.docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_policy_reach.docs FORCE ROW LEVEL SECURITY;

-- The load-bearing check. It looks dead: corpus_anon never calls it, holds no
-- USAGE on its schema, and no ACL on `docs` names it. But it is the SELECT
-- policy's predicate, which evaluates as corpus_anon on every read of `docs`.
CREATE FUNCTION c_policy_priv.can_read(owner_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT owner_id = NULLIF(current_setting('app.uid', true), '')::bigint;
$$;
ALTER FUNCTION c_policy_priv.can_read(bigint) OWNER TO c_policy_owner;

CREATE POLICY docs_visible ON c_policy_reach.docs
  FOR SELECT TO corpus_anon
  USING (c_policy_priv.can_read(owner_id));

GRANT SELECT ON c_policy_reach.docs TO corpus_anon;

-- The blanket grant again: corpus_anon holds EXECUTE on the private check
-- function. `granted − reachable` must NOT report it revocable — the policy
-- predicate is a reachable path, and losing EXECUTE would break authorization
-- silently, for every anonymous read. This is the case the rule exists for.
GRANT EXECUTE ON FUNCTION c_policy_priv.can_read(bigint) TO corpus_anon;
