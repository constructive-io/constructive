-- Deploy schemas/app/procedures/total_accounts to pg

-- requires: schemas/app/schema

BEGIN;

CREATE FUNCTION app.total_accounts() RETURNS bigint AS $$
  SELECT tenant_a.account_count() + tenant_b.account_count();
$$ LANGUAGE sql STABLE;

COMMIT;
