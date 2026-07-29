-- Verify schemas/app/procedures/total_accounts on pg

BEGIN;

SELECT app.total_accounts();

ROLLBACK;
