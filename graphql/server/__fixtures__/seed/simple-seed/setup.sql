-- Setup for simple-seed test scenario
-- Creates the required schemas and extensions

-- Ensure uuid-ossp extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create required roles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'administrator') THEN
    CREATE ROLE administrator;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anonymous') THEN
    CREATE ROLE anonymous;
  END IF;
END
$$;

-- Create stamps schema for timestamp trigger if not exists
CREATE SCHEMA IF NOT EXISTS stamps;

-- Create timestamps trigger function
CREATE OR REPLACE FUNCTION stamps.timestamps()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at = COALESCE(NEW.created_at, now());
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
