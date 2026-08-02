DROP SCHEMA IF EXISTS c_definer_view_bypass CASCADE;
CREATE SCHEMA c_definer_view_bypass;

-- The role the view executes as. It owns the base table, so its reach is
-- everything the table's policies were written to constrain.
DO $$ BEGIN
  CREATE ROLE c_definer_view_owner NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT USAGE ON SCHEMA c_definer_view_bypass TO corpus_anon, corpus_user, c_definer_view_owner;

CREATE TABLE c_definer_view_bypass.orders (
  id bigserial PRIMARY KEY,
  customer text NOT NULL,
  total numeric NOT NULL
);
ALTER TABLE c_definer_view_bypass.orders OWNER TO c_definer_view_owner;
ALTER TABLE c_definer_view_bypass.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_definer_view_bypass.orders FORCE ROW LEVEL SECURITY;

-- The table is correctly locked down: only the signed-in role can read it, and
-- only its own rows. corpus_anon holds no grant on it at all.
CREATE POLICY orders_own_rows ON c_definer_view_bypass.orders
  FOR SELECT TO corpus_user USING (customer = (SELECT current_setting('app.customer', true)));
CREATE INDEX orders_customer_idx ON c_definer_view_bypass.orders (customer);
GRANT SELECT ON c_definer_view_bypass.orders TO corpus_user;

-- The flaw: the view is not `security_invoker`, so it executes as its owner —
-- who owns the base table. corpus_anon holds nothing but SELECT on the view,
-- and reads every order through it. No ACL row on `orders` names corpus_anon,
-- so every catalog-only check sees a table the anonymous role cannot reach.
CREATE VIEW c_definer_view_bypass.order_totals AS
  SELECT id, customer, total FROM c_definer_view_bypass.orders;
ALTER VIEW c_definer_view_bypass.order_totals OWNER TO c_definer_view_owner;
GRANT SELECT ON c_definer_view_bypass.order_totals TO corpus_anon;
