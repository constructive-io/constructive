'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

test('schema requires three distinct pre-existing least-privilege logins', () => {
  for (const suffix of ['a', 'b', 'c']) {
    assert.match(sql, new RegExp(`\\{\\?runtime_role_${suffix}\\}`));
  }
  assert.match(sql, /CTF_RUNTIME_ROLES_MUST_BE_DISTINCT/);
  assert.match(sql, /NOT role_record\.rolcanlogin/);
  assert.match(sql, /role_record\.rolinherit/);
  assert.match(sql, /role_record\.rolsuper/);
  assert.match(sql, /role_record\.rolbypassrls/);
  assert.match(sql, /CREATE TEMP TABLE ctf_runtime_roles/);
  assert.doesNotMatch(sql, /CREATE TEMP TABLE ctf_runtime_roles[\s\S]*?ON COMMIT DROP/);
  assert.match(sql, /FROM pg_temp\.ctf_runtime_roles/);
  const doBlocks = [...sql.matchAll(/DO (\$[^$]+\$)([\s\S]*?)\1;/g)];
  assert.ok(doBlocks.length >= 3);
  for (const [, , body] of doBlocks) {
    assert.doesNotMatch(body, /:'runtime_role_[abc]'/);
  }
});

test('runtime grants stay tenant-local and exclude drift control', () => {
  assert.match(sql, /GRANT USAGE ON SCHEMA %I TO %I/);
  assert.match(sql, /GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO %I/);
  assert.doesNotMatch(sql, /GRANT[^;]+ctf_control[^;]+runtime_role/is);
  assert.doesNotMatch(sql, /GRANT[^;]+apply_schema_drift/is);
  assert.doesNotMatch(sql, /GRANT[^;]+revert_schema_drift/is);
  assert.match(sql, /REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ctf_control FROM PUBLIC/);
});

test('realtime startup functions are isolated in per-tenant least-privilege schemas', () => {
  assert.match(sql, /realtime_schema_name := schema_name \|\| '_realtime'/);
  assert.match(sql, /CREATE FUNCTION %I\.touch_listener\(node_id text\)/);
  assert.match(sql, /CREATE FUNCTION %I\.drain_changes\(node_id text, batch_limit integer\) RETURNS SETOF jsonb/);
  assert.match(sql, /CREATE FUNCTION %I\.cleanup_ephemeral\(node_id text\)/);
  assert.match(sql, /REVOKE ALL ON SCHEMA %I FROM PUBLIC/);
  assert.match(sql, /REVOKE ALL ON ALL FUNCTIONS IN SCHEMA %I FROM PUBLIC/);
  assert.match(sql, /GRANT USAGE ON SCHEMA %I TO %I/);
  assert.match(sql, /GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA %I TO %I/);
  assert.match(sql, /CTF_REALTIME_SCHEMA_ISOLATION_FAILED/);
  assert.match(sql, /CTF_REALTIME_FUNCTION_ISOLATION_FAILED/);
  assert.match(sql, /CTF_REALTIME_SCHEMA_CREATE_FORBIDDEN/);
});

test('PostGIS dependency views execute with invoker rights and no public grant', () => {
  for (const view of ['geometry_columns', 'geography_columns']) {
    assert.match(
      sql,
      new RegExp(`ALTER VIEW ctf_extensions\\.${view} SET \\(security_invoker = true\\)`),
    );
    assert.match(sql, new RegExp(`REVOKE ALL ON ctf_extensions\\.${view} FROM PUBLIC`));
  }
});

test('extension defaults do not grant the notification-only role application access', () => {
  assert.match(sql, /REVOKE ALL ON SCHEMA public FROM PUBLIC/);
  assert.match(sql, /REVOKE ALL ON SCHEMA ctf_extensions FROM PUBLIC/);
  assert.match(sql, /REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ctf_extensions FROM PUBLIC/);
  assert.match(sql, /GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA ctf_extensions TO %I/);
});

test('session mutators are volatile and drift mutators restore an RLS identity', () => {
  assert.match(sql, /savepoint_identity\(\) RETURNS text LANGUAGE plpgsql VOLATILE/);
  assert.match(sql, /poison_session\(\) RETURNS text LANGUAGE plpgsql VOLATILE/);
  assert.match(
    sql,
    /physical_database_identity\(\) RETURNS text LANGUAGE sql STABLE PARALLEL SAFE SECURITY INVOKER SET search_path = pg_catalog/,
  );
  assert.match(sql, /SELECT pg_catalog\.current_database\(\)::text/);
  assert.equal((sql.match(/PERFORM pg_catalog\.set_config\(/g) ?? []).length, 2);
  assert.equal((sql.match(/SECURITY DEFINER\nSET search_path = pg_catalog/g) ?? []).length, 2);
});

test('the first upload must provision a physical bucket through the system lane', () => {
  assert.match(
    sql,
    /INSERT INTO %I\.app_buckets \(id, key, type, allowed_mime_types, max_file_size, physical_name\) VALUES \(%L::uuid, %L, %L, ARRAY\[%L\], 1048576, NULL\)/,
  );
  for (const table of ['app_buckets', 'app_files']) {
    assert.ok(sql.includes(`'${table}'`));
  }
  assert.match(sql, /ALTER TABLE %I\.%I FORCE ROW LEVEL SECURITY/);
});

test('realtime trigger returns the correct transition row for DELETE and writes', () => {
  assert.match(sql, /IF TG_OP = 'DELETE' THEN[\s\S]+RETURN OLD;[\s\S]+RETURN NEW;/);
  assert.doesNotMatch(sql, /coalesce\(NEW, OLD\)/i);
});
