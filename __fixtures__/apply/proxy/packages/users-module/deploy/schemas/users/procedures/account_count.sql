-- Deploy schemas/users/procedures/account_count to pg

-- requires: schemas/users/schema
-- requires: schemas/users/tables/accounts/table

BEGIN;

CREATE FUNCTION users.account_count() RETURNS bigint AS $$
  SELECT count(*) FROM users.accounts;
$$ LANGUAGE sql STABLE;

COMMIT;
