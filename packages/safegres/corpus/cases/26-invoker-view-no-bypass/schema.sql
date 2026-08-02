DROP SCHEMA IF EXISTS c_invoker_view_no_bypass CASCADE;
CREATE SCHEMA c_invoker_view_no_bypass;

-- The same shape as 25-definer-view-bypass, with the one difference that
-- decides it: the view is `security_invoker`, so it executes as the caller.
DO $$ BEGIN
  CREATE ROLE c_invoker_view_owner NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT USAGE ON SCHEMA c_invoker_view_no_bypass TO corpus_anon, corpus_user, c_invoker_view_owner;

CREATE TABLE c_invoker_view_no_bypass.orders (
  id bigserial PRIMARY KEY,
  customer text NOT NULL,
  total numeric NOT NULL
);
ALTER TABLE c_invoker_view_no_bypass.orders OWNER TO c_invoker_view_owner;
ALTER TABLE c_invoker_view_no_bypass.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY orders_own_rows ON c_invoker_view_no_bypass.orders
  FOR SELECT TO corpus_user USING (customer = (SELECT current_setting('app.customer', true)));
CREATE INDEX orders_customer_idx ON c_invoker_view_no_bypass.orders (customer);
GRANT SELECT ON c_invoker_view_no_bypass.orders TO corpus_user;

-- corpus_anon can SELECT the view and nothing else, exactly as in case 25 —
-- but `security_invoker` means Postgres checks *corpus_anon's* privileges on
-- `orders`, which are none, so the read is denied. There is no bypass here and
-- a rule that reported one would be recommending a change to a correct schema.
CREATE VIEW c_invoker_view_no_bypass.order_totals
  WITH (security_invoker = true) AS
  SELECT id, customer, total FROM c_invoker_view_no_bypass.orders;
ALTER VIEW c_invoker_view_no_bypass.order_totals OWNER TO c_invoker_view_owner;
GRANT SELECT ON c_invoker_view_no_bypass.order_totals TO corpus_anon;

-- `security_invoker` is a boolean reloption, and Postgres stores whichever
-- spelling was written: `on` here is exactly as invoker as `true` above. A
-- reader that string-matches 'true' calls this view a definer view and tells
-- the author to fix a schema that is already correct.
CREATE VIEW c_invoker_view_no_bypass.order_totals_on
  WITH (security_invoker = on) AS
  SELECT id, customer, total FROM c_invoker_view_no_bypass.orders;
ALTER VIEW c_invoker_view_no_bypass.order_totals_on OWNER TO c_invoker_view_owner;
GRANT SELECT ON c_invoker_view_no_bypass.order_totals_on TO corpus_anon;
