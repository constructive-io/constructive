-- Test schema for graphql-server-test
CREATE SCHEMA IF NOT EXISTS app_public;

-- Create a simple users table
CREATE TABLE app_public.users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create a posts table with foreign key
CREATE TABLE app_public.posts (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES app_public.users(id),
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant permissions
GRANT USAGE ON SCHEMA app_public TO anonymous;
GRANT SELECT ON ALL TABLES IN SCHEMA app_public TO anonymous;

GRANT USAGE ON SCHEMA app_public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA app_public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app_public TO authenticated;

-- Insert some test data
INSERT INTO app_public.users (username, email) VALUES
  ('alice', 'alice@example.com'),
  ('bob', 'bob@example.com');

INSERT INTO app_public.posts (user_id, title, content) VALUES
  (1, 'Hello World', 'This is my first post'),
  (1, 'GraphQL is awesome', 'Testing with SuperTest'),
  (2, 'Bob''s post', 'Hello from Bob');
