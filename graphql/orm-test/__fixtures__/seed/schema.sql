-- Schema for orm-test: M:N integration tests
-- posts <-> tags via post_tags junction table

CREATE SCHEMA IF NOT EXISTS "orm_test";

-- =============================================================================
-- Table: posts
-- =============================================================================
CREATE TABLE "orm_test".posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================================================
-- Table: tags
-- =============================================================================
CREATE TABLE "orm_test".tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text DEFAULT '#888888',
  created_at timestamptz DEFAULT now()
);

-- =============================================================================
-- Table: post_tags (junction)
-- M:N relationship between posts and tags
-- =============================================================================
CREATE TABLE "orm_test".post_tags (
  post_id uuid NOT NULL REFERENCES "orm_test".posts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES "orm_test".tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX post_tags_post_id_idx ON "orm_test".post_tags (post_id);
CREATE INDEX post_tags_tag_id_idx ON "orm_test".post_tags (tag_id);

-- Enable many-to-many for this junction table
COMMENT ON TABLE "orm_test".post_tags IS E'@behavior +manyToMany';

-- =============================================================================
-- Grant table permissions
-- =============================================================================
GRANT ALL ON "orm_test".posts TO PUBLIC;
GRANT ALL ON "orm_test".tags TO PUBLIC;
GRANT ALL ON "orm_test".post_tags TO PUBLIC;
