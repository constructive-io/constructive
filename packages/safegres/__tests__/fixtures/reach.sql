-- One API schema whose generated surface is narrower than its schema.
--
--   posts            — fully exposed
--   comments         — root-denied, but reachable as posts' reverse relation
--   audit_shadow     — root-denied AND its reverse relation denied: unaddressable
--   policy_shadow    — same denials, but a policy on posts subqueries it, so
--                      revoking its grant would break authorization (L6 must
--                      stay silent about it)

CREATE SCHEMA IF NOT EXISTS fx_reach_api;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fx_reach_api_role') THEN
    CREATE ROLE fx_reach_api_role NOLOGIN;
  END IF;
END $$;

GRANT USAGE ON SCHEMA fx_reach_api TO fx_reach_api_role;

CREATE TABLE fx_reach_api.posts (
  id bigserial PRIMARY KEY,
  owner_id uuid NOT NULL,
  body text
);

CREATE TABLE fx_reach_api.comments (
  id bigserial PRIMARY KEY,
  post_id bigint NOT NULL REFERENCES fx_reach_api.posts (id),
  body text
);

CREATE TABLE fx_reach_api.audit_shadow (
  id bigserial PRIMARY KEY,
  post_id bigint NOT NULL REFERENCES fx_reach_api.posts (id),
  note text
);

CREATE TABLE fx_reach_api.policy_shadow (
  id bigserial PRIMARY KEY,
  post_id bigint NOT NULL REFERENCES fx_reach_api.posts (id),
  owner_id uuid NOT NULL
);

-- comments: no root entry, but the reverse relation on posts survives.
COMMENT ON TABLE fx_reach_api.comments IS '@behavior -select -insert -update -delete';

-- audit_shadow: no root entry and no relation field either way.
COMMENT ON TABLE fx_reach_api.audit_shadow IS '@behavior -select -insert -update -delete';
COMMENT ON CONSTRAINT audit_shadow_post_id_fkey ON fx_reach_api.audit_shadow IS
  E'@backwardBehavior -list -connection -single\n@forwardBehavior -single';

-- policy_shadow: identically hidden, but load-bearing for RLS on posts.
COMMENT ON TABLE fx_reach_api.policy_shadow IS '@behavior -select -insert -update -delete';
COMMENT ON CONSTRAINT policy_shadow_post_id_fkey ON fx_reach_api.policy_shadow IS
  E'@backwardBehavior -list -connection -single\n@forwardBehavior -single';

ALTER TABLE fx_reach_api.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY posts_select ON fx_reach_api.posts FOR SELECT TO fx_reach_api_role
  USING (
    id IN (
      SELECT post_id FROM fx_reach_api.policy_shadow
      WHERE owner_id = current_setting('jwt.claims.user_id', true)::uuid
    )
  );

GRANT SELECT ON fx_reach_api.posts TO fx_reach_api_role;
GRANT SELECT ON fx_reach_api.comments TO fx_reach_api_role;
GRANT SELECT ON fx_reach_api.audit_shadow TO fx_reach_api_role;
GRANT SELECT ON fx_reach_api.policy_shadow TO fx_reach_api_role;
