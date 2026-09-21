BEGIN;
INSERT INTO :"schema".account (external_id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Cache benchmark account');

INSERT INTO :"schema".entity_1 (account_id, title, status, tags, metadata)
SELECT 1, 'Entity ' || i, 'active', ARRAY['benchmark'], jsonb_build_object('n', i)
FROM generate_series(1, 20) i;
COMMIT;
