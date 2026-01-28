-- Test data for simple-seed scenario
-- Inserts 5 animals: 2 Dogs, 2 Cats, 1 Bird

INSERT INTO "simple-pets-pets-public".animals (id, name, species, owner_id, created_at, updated_at)
VALUES
  ('a0000001-0000-0000-0000-000000000001', 'Buddy', 'Dog', NULL, now(), now()),
  ('a0000001-0000-0000-0000-000000000002', 'Max', 'Dog', NULL, now(), now()),
  ('a0000001-0000-0000-0000-000000000003', 'Whiskers', 'Cat', NULL, now(), now()),
  ('a0000001-0000-0000-0000-000000000004', 'Mittens', 'Cat', NULL, now(), now()),
  ('a0000001-0000-0000-0000-000000000005', 'Tweety', 'Bird', NULL, now(), now())
ON CONFLICT (id) DO NOTHING;
