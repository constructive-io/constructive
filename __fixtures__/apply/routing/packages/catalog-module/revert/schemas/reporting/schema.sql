-- Revert schemas/reporting/schema from pg

BEGIN;

DROP SCHEMA reporting;

COMMIT;
