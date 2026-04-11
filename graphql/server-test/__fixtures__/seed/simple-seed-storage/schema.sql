-- Schema creation for simple-seed-storage test scenario
-- Creates the app schema with storage tables (buckets, files, upload_requests)

-- Create app schemas
CREATE SCHEMA IF NOT EXISTS "simple-storage-public";

-- Grant schema usage
GRANT USAGE ON SCHEMA "simple-storage-public" TO administrator, authenticated, anonymous;

-- Set default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-storage-public"
  GRANT ALL ON TABLES TO administrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-storage-public"
  GRANT USAGE ON SEQUENCES TO administrator, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-storage-public"
  GRANT ALL ON FUNCTIONS TO administrator, authenticated, anonymous;

-- =====================================================
-- STORAGE TABLES (mirroring what the storage module generator creates)
-- =====================================================

-- Buckets table
CREATE TABLE IF NOT EXISTS "simple-storage-public".buckets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key text NOT NULL,
  type text NOT NULL DEFAULT 'private',
  is_public boolean NOT NULL DEFAULT false,
  owner_id uuid,
  allowed_mime_types text[] NULL,
  max_file_size bigint NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (key)
);

COMMENT ON TABLE "simple-storage-public".buckets IS E'@storageBuckets\nStorage buckets table';

-- Files table
CREATE TABLE IF NOT EXISTS "simple-storage-public".files (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bucket_id uuid NOT NULL REFERENCES "simple-storage-public".buckets(id),
  key text NOT NULL,
  content_type text NOT NULL,
  content_hash text,
  size bigint,
  filename text,
  owner_id uuid,
  is_public boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE "simple-storage-public".files IS E'@storageFiles\nStorage files table';

-- Upload requests table
CREATE TABLE IF NOT EXISTS "simple-storage-public".upload_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id uuid NOT NULL REFERENCES "simple-storage-public".files(id),
  bucket_id uuid NOT NULL REFERENCES "simple-storage-public".buckets(id),
  key text NOT NULL,
  content_type text NOT NULL,
  content_hash text,
  size bigint,
  status text NOT NULL DEFAULT 'issued',
  expires_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Grant table permissions (allow anonymous to do CRUD for tests — no RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON "simple-storage-public".buckets TO administrator, authenticated, anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON "simple-storage-public".files TO administrator, authenticated, anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON "simple-storage-public".upload_requests TO administrator, authenticated, anonymous;
