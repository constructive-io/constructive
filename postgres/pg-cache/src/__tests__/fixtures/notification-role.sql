-- Run only in a disposable test PostgreSQL cluster, after other tests finish.
-- The listener contract forbids CONNECT to every database except its target.
CREATE ROLE cnc_notify_fixture LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS
  NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD 'pg-cache-notify-test';
CREATE DATABASE cnc_notify_fixture TEMPLATE template0;
SELECT format('REVOKE CONNECT ON DATABASE %I FROM PUBLIC', datname)
FROM pg_database
\gexec
REVOKE ALL ON DATABASE cnc_notify_fixture FROM PUBLIC;
GRANT CONNECT ON DATABASE cnc_notify_fixture TO cnc_notify_fixture;
\connect cnc_notify_fixture
REVOKE ALL ON SCHEMA public FROM PUBLIC;
