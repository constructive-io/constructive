// Jest setup for realtime-codegen-e2e integration tests.
// pgsql-test reads PGHOST, PGPORT, PGUSER, PGPASSWORD from the environment.
// Defaults used when env vars are absent:
//   PGHOST=localhost, PGPORT=5432, PGUSER=postgres, PGPASSWORD=password

process.env['PGHOST'] = process.env['PGHOST'] ?? 'localhost';
process.env['PGPORT'] = process.env['PGPORT'] ?? '5432';
process.env['PGUSER'] = process.env['PGUSER'] ?? 'postgres';
process.env['PGPASSWORD'] = process.env['PGPASSWORD'] ?? 'password';
