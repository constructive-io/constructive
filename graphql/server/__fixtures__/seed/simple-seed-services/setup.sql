-- Prerequisites
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Custom domain types from @pgpm/types (required by services_public tables)
CREATE DOMAIN hostname AS text CHECK (VALUE ~ '^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$');
CREATE DOMAIN attachment AS text CHECK (VALUE ~ '^(https?)://[^\s/$.?#].[^\s]*$');
CREATE DOMAIN image AS jsonb CHECK (
  jsonb_typeof(VALUE) = 'object' AND
  VALUE ? 'url' AND
  VALUE ? 'width' AND
  VALUE ? 'height'
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'administrator') THEN CREATE ROLE administrator; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anonymous') THEN CREATE ROLE anonymous; END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS stamps;
CREATE OR REPLACE FUNCTION stamps.timestamps() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN NEW.created_at = COALESCE(NEW.created_at, now()); END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
