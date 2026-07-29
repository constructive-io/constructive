-- Revert schemas/app/procedures/total_accounts from pg

BEGIN;

DROP FUNCTION app.total_accounts;

COMMIT;
