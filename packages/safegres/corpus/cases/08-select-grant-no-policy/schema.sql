DROP SCHEMA IF EXISTS c_select_no_policy CASCADE;
CREATE SCHEMA c_select_no_policy;
GRANT USAGE ON SCHEMA c_select_no_policy TO corpus_user, corpus_anon;

CREATE TABLE c_select_no_policy.orders (
  id bigserial PRIMARY KEY,
  customer_id uuid NOT NULL,
  total numeric
);
CREATE INDEX orders_customer_idx ON c_select_no_policy.orders (customer_id);
ALTER TABLE c_select_no_policy.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_select_no_policy.orders FORCE ROW LEVEL SECURITY;

-- Only the write path has a policy.
CREATE POLICY orders_insert ON c_select_no_policy.orders FOR INSERT TO corpus_user
  WITH CHECK (customer_id = (SELECT nullif(current_setting('jwt.claims.user_id', true), '')::uuid));

-- The flaw: reads are granted but no policy covers SELECT, so the API
-- returns an empty list and looks like a data bug.
GRANT SELECT, INSERT ON c_select_no_policy.orders TO corpus_user;
