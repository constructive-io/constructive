-- Verify app:posts

BEGIN;

SELECT 1 / count(*) FROM information_schema.tables
WHERE table_schema = 'app' AND table_name = 'posts';

ROLLBACK;
