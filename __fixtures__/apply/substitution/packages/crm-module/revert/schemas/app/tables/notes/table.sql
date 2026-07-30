-- Revert schemas/app/tables/notes/table from pg

BEGIN;

DROP TABLE app.notes;

COMMIT;
