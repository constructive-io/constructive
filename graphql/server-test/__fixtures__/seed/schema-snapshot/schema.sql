-- Schema creation for schema-snapshot test scenario
-- Creates a comprehensive schema to test all GraphQL plugins:
-- - Inflection (table/field naming)
-- - Connection filter (filter fields)
-- - Many-to-many relationships
-- - Unique constraints
-- - Foreign key relationships
-- - Various column types

-- Create schema
CREATE SCHEMA IF NOT EXISTS "snapshot_public";

-- Grant schema usage
GRANT USAGE ON SCHEMA "snapshot_public" TO administrator, authenticated, anonymous;

-- Set default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA "snapshot_public"
  GRANT ALL ON TABLES TO administrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA "snapshot_public"
  GRANT USAGE ON SEQUENCES TO administrator, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA "snapshot_public"
  GRANT ALL ON FUNCTIONS TO administrator, authenticated, anonymous;

-- =============================================================================
-- Table 1: users
-- Tests: basic CRUD, unique constraint, email field
-- =============================================================================
CREATE TABLE "snapshot_public".users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text NOT NULL UNIQUE,
  username text NOT NULL UNIQUE,
  display_name text,
  bio text,
  is_active boolean DEFAULT true,
  role text DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX users_email_idx ON "snapshot_public".users (email);
CREATE INDEX users_username_idx ON "snapshot_public".users (username);
CREATE INDEX users_created_at_idx ON "snapshot_public".users (created_at);

-- =============================================================================
-- Table 2: posts
-- Tests: foreign key relationship, text search, nullable fields
-- =============================================================================
CREATE TABLE "snapshot_public".posts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id uuid NOT NULL REFERENCES "snapshot_public".users(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content text,
  excerpt text,
  is_published boolean DEFAULT false,
  published_at timestamptz,
  view_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX posts_author_id_idx ON "snapshot_public".posts (author_id);
CREATE INDEX posts_slug_idx ON "snapshot_public".posts (slug);
CREATE INDEX posts_published_at_idx ON "snapshot_public".posts (published_at);
CREATE INDEX posts_created_at_idx ON "snapshot_public".posts (created_at);

-- =============================================================================
-- Table 3: tags
-- Tests: simple lookup table for many-to-many
-- =============================================================================
CREATE TABLE "snapshot_public".tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  color text DEFAULT '#888888',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX tags_name_idx ON "snapshot_public".tags (name);
CREATE INDEX tags_slug_idx ON "snapshot_public".tags (slug);

-- =============================================================================
-- Table 4: post_tags (junction table)
-- Tests: many-to-many relationship between posts and tags
-- Smart comment enables many-to-many plugin
-- =============================================================================
CREATE TABLE "snapshot_public".post_tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id uuid NOT NULL REFERENCES "snapshot_public".posts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES "snapshot_public".tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, tag_id)
);

CREATE INDEX post_tags_post_id_idx ON "snapshot_public".post_tags (post_id);
CREATE INDEX post_tags_tag_id_idx ON "snapshot_public".post_tags (tag_id);

-- Enable many-to-many for this junction table
COMMENT ON TABLE "snapshot_public".post_tags IS E'@behavior +manyToMany';

-- =============================================================================
-- Table 5: comments
-- Tests: self-referential relationship (parent_id), nested comments
-- =============================================================================
CREATE TABLE "snapshot_public".comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id uuid NOT NULL REFERENCES "snapshot_public".posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES "snapshot_public".users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES "snapshot_public".comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_approved boolean DEFAULT true,
  likes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX comments_post_id_idx ON "snapshot_public".comments (post_id);
CREATE INDEX comments_author_id_idx ON "snapshot_public".comments (author_id);
CREATE INDEX comments_parent_id_idx ON "snapshot_public".comments (parent_id);
CREATE INDEX comments_created_at_idx ON "snapshot_public".comments (created_at);

-- =============================================================================
-- Timestamp triggers
-- =============================================================================
CREATE TRIGGER users_timestamps_tg
  BEFORE INSERT OR UPDATE ON "snapshot_public".users
  FOR EACH ROW EXECUTE PROCEDURE stamps.timestamps();

CREATE TRIGGER posts_timestamps_tg
  BEFORE INSERT OR UPDATE ON "snapshot_public".posts
  FOR EACH ROW EXECUTE PROCEDURE stamps.timestamps();

CREATE TRIGGER comments_timestamps_tg
  BEFORE INSERT OR UPDATE ON "snapshot_public".comments
  FOR EACH ROW EXECUTE PROCEDURE stamps.timestamps();

-- =============================================================================
-- Grant table permissions
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON "snapshot_public".users TO administrator, authenticated, anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON "snapshot_public".posts TO administrator, authenticated, anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON "snapshot_public".tags TO administrator, authenticated, anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON "snapshot_public".post_tags TO administrator, authenticated, anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON "snapshot_public".comments TO administrator, authenticated, anonymous;
