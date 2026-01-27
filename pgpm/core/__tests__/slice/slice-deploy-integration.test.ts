import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';

import { PgpmMigrate } from '../../src/migrate/client';
import { slicePlan, writeSliceResult } from '../../src/slice';
import { MigrateTestFixture, teardownAllPools, TestDatabase } from '../../test-utils';

describe('Slice Deploy Integration', () => {
  let fixture: MigrateTestFixture;
  let db: TestDatabase;
  let client: PgpmMigrate;
  let tempDir: string;

  beforeEach(async () => {
    fixture = new MigrateTestFixture();
    db = await fixture.setupTestDatabase();
    client = new PgpmMigrate(db.config);
    tempDir = join(tmpdir(), `slice-deploy-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fixture.cleanup();
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  afterAll(async () => {
    await teardownAllPools();
  });

  test('sliced packages deploy successfully in computed order', async () => {
    const sourcePlanPath = join(tempDir, 'source', 'pgpm.plan');
    const sourceDir = join(tempDir, 'source');
    const outputDir = join(tempDir, 'sliced');

    mkdirSync(sourceDir, { recursive: true });
    mkdirSync(join(sourceDir, 'deploy'), { recursive: true });
    mkdirSync(join(sourceDir, 'revert'), { recursive: true });

    const planContent = `%syntax-version=1.0.0
%project=test-monolith
%uri=https://github.com/test/monolith

schemas/auth/schema 2024-01-01T00:00:00Z Developer <dev@example.com> # Auth schema
schemas/auth/tables/users [schemas/auth/schema] 2024-01-02T00:00:00Z Developer <dev@example.com> # Users table
schemas/auth/tables/sessions [schemas/auth/tables/users] 2024-01-03T00:00:00Z Developer <dev@example.com> # Sessions table
schemas/public/schema 2024-01-04T00:00:00Z Developer <dev@example.com> # Public schema
schemas/public/functions/get_user [schemas/auth/tables/users schemas/public/schema] 2024-01-05T00:00:00Z Developer <dev@example.com> # Get user function
`;
    writeFileSync(sourcePlanPath, planContent);

    writeFileSync(
      join(sourceDir, 'deploy', 'schemas/auth/schema.sql'),
      'CREATE SCHEMA auth;'
    );
    writeFileSync(
      join(sourceDir, 'deploy', 'schemas/auth/tables/users.sql'),
      'CREATE TABLE auth.users (id SERIAL PRIMARY KEY, email TEXT NOT NULL);'
    );
    writeFileSync(
      join(sourceDir, 'deploy', 'schemas/auth/tables/sessions.sql'),
      'CREATE TABLE auth.sessions (id SERIAL PRIMARY KEY, user_id INT REFERENCES auth.users(id));'
    );
    writeFileSync(
      join(sourceDir, 'deploy', 'schemas/public/schema.sql'),
      'SELECT 1;'
    );
    writeFileSync(
      join(sourceDir, 'deploy', 'schemas/public/functions/get_user.sql'),
      'CREATE FUNCTION public.get_user(uid INT) RETURNS auth.users AS $$ SELECT * FROM auth.users WHERE id = uid $$ LANGUAGE sql;'
    );

    writeFileSync(
      join(sourceDir, 'revert', 'schemas/auth/schema.sql'),
      'DROP SCHEMA auth CASCADE;'
    );
    writeFileSync(
      join(sourceDir, 'revert', 'schemas/auth/tables/users.sql'),
      'DROP TABLE auth.users;'
    );
    writeFileSync(
      join(sourceDir, 'revert', 'schemas/auth/tables/sessions.sql'),
      'DROP TABLE auth.sessions;'
    );
    writeFileSync(
      join(sourceDir, 'revert', 'schemas/public/schema.sql'),
      'SELECT 1;'
    );
    writeFileSync(
      join(sourceDir, 'revert', 'schemas/public/functions/get_user.sql'),
      'DROP FUNCTION public.get_user(INT);'
    );

    const result = slicePlan({
      sourcePlan: sourcePlanPath,
      outputDir,
      strategy: { type: 'folder', depth: 1, prefixToStrip: 'schemas' },
      defaultPackage: 'core'
    });

    expect(result.stats.totalChanges).toBe(5);
    expect(result.stats.packagesCreated).toBe(2);

    const packageNames = result.packages.map(p => p.name);
    expect(packageNames).toContain('auth');
    expect(packageNames).toContain('public');

    writeSliceResult(result, {
      outputDir,
      overwrite: true,
      copySourceFiles: true,
      sourceDir
    });

    for (const pkgName of result.workspace.deployOrder) {
      const pkgPath = join(outputDir, 'packages', pkgName);
      const deployResult = await client.deploy({
        modulePath: pkgPath
      });
      expect(deployResult.deployed.length).toBeGreaterThan(0);
    }

    expect(await db.exists('schema', 'auth')).toBe(true);
    expect(await db.exists('table', 'auth.users')).toBe(true);
    expect(await db.exists('table', 'auth.sessions')).toBe(true);

    const deployed = await db.getDeployedChanges();
    expect(deployed).toHaveLength(5);

    const publicPkgDeps = await db.getDependencies('public', 'schemas/public/functions/get_user');
    expect(publicPkgDeps).toContain('auth:schemas/auth/tables/users');
  });

  test('sliced packages with pattern strategy deploy successfully', async () => {
    const sourcePlanPath = join(tempDir, 'source2', 'pgpm.plan');
    const sourceDir = join(tempDir, 'source2');
    const outputDir = join(tempDir, 'sliced2');

    mkdirSync(sourceDir, { recursive: true });
    mkdirSync(join(sourceDir, 'deploy'), { recursive: true });
    mkdirSync(join(sourceDir, 'revert'), { recursive: true });

    const planContent = `%syntax-version=1.0.0
%project=test-pattern
%uri=https://github.com/test/pattern

schemas/app_auth_public/schema 2024-01-01T00:00:00Z Developer <dev@example.com>
schemas/app_auth_public/tables/users [schemas/app_auth_public/schema] 2024-01-02T00:00:00Z Developer <dev@example.com>
schemas/app_users_public/schema 2024-01-03T00:00:00Z Developer <dev@example.com>
schemas/app_users_public/tables/profiles [schemas/app_users_public/schema schemas/app_auth_public/tables/users] 2024-01-04T00:00:00Z Developer <dev@example.com>
`;
    writeFileSync(sourcePlanPath, planContent);

    writeFileSync(
      join(sourceDir, 'deploy', 'schemas/app_auth_public/schema.sql'),
      'CREATE SCHEMA app_auth_public;'
    );
    writeFileSync(
      join(sourceDir, 'deploy', 'schemas/app_auth_public/tables/users.sql'),
      'CREATE TABLE app_auth_public.users (id SERIAL PRIMARY KEY);'
    );
    writeFileSync(
      join(sourceDir, 'deploy', 'schemas/app_users_public/schema.sql'),
      'CREATE SCHEMA app_users_public;'
    );
    writeFileSync(
      join(sourceDir, 'deploy', 'schemas/app_users_public/tables/profiles.sql'),
      'CREATE TABLE app_users_public.profiles (id SERIAL PRIMARY KEY, user_id INT REFERENCES app_auth_public.users(id));'
    );

    writeFileSync(join(sourceDir, 'revert', 'schemas/app_auth_public/schema.sql'), 'DROP SCHEMA app_auth_public CASCADE;');
    writeFileSync(join(sourceDir, 'revert', 'schemas/app_auth_public/tables/users.sql'), 'DROP TABLE app_auth_public.users;');
    writeFileSync(join(sourceDir, 'revert', 'schemas/app_users_public/schema.sql'), 'DROP SCHEMA app_users_public CASCADE;');
    writeFileSync(join(sourceDir, 'revert', 'schemas/app_users_public/tables/profiles.sql'), 'DROP TABLE app_users_public.profiles;');

    const result = slicePlan({
      sourcePlan: sourcePlanPath,
      outputDir,
      strategy: {
        type: 'pattern',
        slices: [
          { packageName: 'auth', patterns: ['schemas/*_auth_*/**'] },
          { packageName: 'users', patterns: ['schemas/*_users_*/**'] }
        ]
      },
      defaultPackage: 'core'
    });

    expect(result.stats.totalChanges).toBe(4);

    const packageNames = result.packages.map(p => p.name);
    expect(packageNames).toContain('auth');
    expect(packageNames).toContain('users');

    writeSliceResult(result, {
      outputDir,
      overwrite: true,
      copySourceFiles: true,
      sourceDir
    });

    for (const pkgName of result.workspace.deployOrder) {
      const pkgPath = join(outputDir, 'packages', pkgName);
      const deployResult = await client.deploy({
        modulePath: pkgPath
      });
      expect(deployResult.deployed.length).toBeGreaterThan(0);
    }

    expect(await db.exists('schema', 'app_auth_public')).toBe(true);
    expect(await db.exists('schema', 'app_users_public')).toBe(true);
    expect(await db.exists('table', 'app_auth_public.users')).toBe(true);
    expect(await db.exists('table', 'app_users_public.profiles')).toBe(true);

    const deployed = await db.getDeployedChanges();
    expect(deployed).toHaveLength(4);
  });
});
