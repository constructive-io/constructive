-- Seed data for orm-test

INSERT INTO "orm_test".posts (id, title, body, is_published)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Hello World', 'First post content', true),
  ('22222222-2222-2222-2222-222222222222', 'Second Post', 'Another post', false);

INSERT INTO "orm_test".tags (id, name, color)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Technology', '#3B82F6'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Design', '#EC4899'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Science', '#10B981');

-- Seed one existing junction row: post1 <-> Technology
INSERT INTO "orm_test".post_tags (post_id, tag_id)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
