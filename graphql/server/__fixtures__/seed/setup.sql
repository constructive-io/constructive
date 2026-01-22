-- Setup: Extensions and Roles
-- This file sets up the required extensions and roles for testing

-- Required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create roles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'administrator') THEN
    CREATE ROLE administrator;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anonymous') THEN
    CREATE ROLE anonymous;
  END IF;
END
$$;

-- Create a simple timestamps function (standalone, no external dependencies)
CREATE OR REPLACE FUNCTION public.timestamps()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at = COALESCE(NEW.created_at, now());
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
