-- Revert app:posts

BEGIN;

DROP TABLE app.posts;

COMMIT;
