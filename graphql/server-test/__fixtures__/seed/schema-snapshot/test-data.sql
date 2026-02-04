-- Test data for schema-snapshot test scenario
-- Minimal data to ensure schema builds correctly

-- Insert test users
INSERT INTO "snapshot_public".users (id, email, username, display_name, bio, role)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', 'alice', 'Alice Smith', 'Software engineer', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com', 'bob', 'Bob Jones', 'Designer', 'user');

-- Insert test tags
INSERT INTO "snapshot_public".tags (id, name, slug, description, color)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Technology', 'technology', 'Tech related posts', '#3B82F6'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Design', 'design', 'Design related posts', '#EC4899');

-- Insert test posts
INSERT INTO "snapshot_public".posts (id, author_id, title, slug, content, is_published, published_at)
VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'Hello World', 'hello-world', 'First post content', true, now());

-- Insert test post_tags (many-to-many)
INSERT INTO "snapshot_public".post_tags (post_id, tag_id)
VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

-- Insert test comments (including nested)
INSERT INTO "snapshot_public".comments (id, post_id, author_id, content)
VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'Great post!');

INSERT INTO "snapshot_public".comments (id, post_id, author_id, parent_id, content)
VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Thanks!');
