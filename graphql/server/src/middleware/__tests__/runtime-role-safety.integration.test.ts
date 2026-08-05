import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { getPgEnvOptions } from 'pg-env';

import {
  assertRuntimeRoleSafety,
  UnsafeRuntimeRoleError
} from '../runtime-role-safety';

const describeWithPostgres =
  process.env.GRAPHQL_SERVER_RUN_ROLE_SAFETY_INTEGRATION === '1'
    ? describe
    : describe.skip;

describeWithPostgres('runtime role safety PostgreSQL integration', () => {
  jest.setTimeout(30_000);

  it('rejects ownership inherited only after SET ROLE to a configured request role', async () => {
    const suffix = randomUUID().replace(/-/g, '').slice(0, 12);
    const parentRole = `rrs_parent_${suffix}`;
    const requestRole = `rrs_request_${suffix}`;
    const runtimeRole = `rrs_runtime_${suffix}`;
    const schema = `rrs_schema_${suffix}`;
    const password = `rrs-${randomUUID()}`;
    const quoteIdentifier = pg.escapeIdentifier;
    const adminConfig = getPgEnvOptions({});
    const adminPool = new pg.Pool({ ...adminConfig, max: 1 });
    let runtimePool: pg.Pool | null = null;

    try {
      await adminPool.query(`
        CREATE ROLE ${quoteIdentifier(parentRole)} NOLOGIN;
        CREATE ROLE ${quoteIdentifier(requestRole)} NOLOGIN INHERIT;
        CREATE ROLE ${quoteIdentifier(runtimeRole)} LOGIN NOINHERIT
          PASSWORD ${pg.escapeLiteral(password)};
        CREATE SCHEMA ${quoteIdentifier(schema)} AUTHORIZATION CURRENT_USER;
        CREATE TABLE ${quoteIdentifier(schema)}.owned_table (id integer);
        ALTER TABLE ${quoteIdentifier(schema)}.owned_table
          OWNER TO ${quoteIdentifier(parentRole)};
        GRANT USAGE ON SCHEMA ${quoteIdentifier(schema)}
          TO ${quoteIdentifier(requestRole)};
        GRANT ${quoteIdentifier(parentRole)} TO ${quoteIdentifier(requestRole)}
          WITH INHERIT TRUE, SET FALSE;
        GRANT ${quoteIdentifier(requestRole)} TO ${quoteIdentifier(runtimeRole)}
          WITH INHERIT FALSE, SET TRUE;
      `);

      runtimePool = new pg.Pool({
        ...adminConfig,
        user: runtimeRole,
        password,
        max: 1
      });
      const client = await runtimePool.connect();
      try {
        const before = await client.query<{
          parent_usage: boolean;
          parent_set: boolean;
          request_set: boolean;
        }>(`
          SELECT pg_catalog.pg_has_role(current_user, $1, 'USAGE') AS parent_usage,
                 pg_catalog.pg_has_role(current_user, $1, 'SET') AS parent_set,
                 pg_catalog.pg_has_role(current_user, $2, 'SET') AS request_set
        `, [parentRole, requestRole]);
        expect(before.rows[0]).toEqual({
          parent_usage: false,
          parent_set: false,
          request_set: true
        });

        await client.query('BEGIN');
        await client.query(`SET ROLE ${quoteIdentifier(requestRole)}`);
        const after = await client.query<{ parent_usage: boolean }>(
          'SELECT pg_catalog.pg_has_role(current_user, $1, \'USAGE\') AS parent_usage',
          [parentRole]
        );
        expect(after.rows[0]?.parent_usage).toBe(true);
        await expect(client.query(
          `ALTER TABLE ${quoteIdentifier(schema)}.owned_table ADD COLUMN escaped integer`
        )).resolves.toBeDefined();
        await client.query('ROLLBACK');
      } finally {
        client.release(true);
      }

      let rejected: unknown;
      try {
        await assertRuntimeRoleSafety(
          runtimePool,
          [requestRole],
          [schema]
        );
      } catch (error) {
        rejected = error;
      }
      expect(rejected).toBeInstanceOf(UnsafeRuntimeRoleError);
      expect((rejected as UnsafeRuntimeRoleError).violations).toContain(
        `${requestRole} can reach role ${parentRole}`
        + ' after SET ROLE (USAGE=true,SET=false)'
      );
    } finally {
      await runtimePool?.end();
      await adminPool.query(`
        DROP SCHEMA IF EXISTS ${quoteIdentifier(schema)} CASCADE;
        DROP ROLE IF EXISTS ${quoteIdentifier(runtimeRole)};
        DROP ROLE IF EXISTS ${quoteIdentifier(requestRole)};
        DROP ROLE IF EXISTS ${quoteIdentifier(parentRole)};
      `);
      await adminPool.end();
    }
  });

  it('rejects BYPASSRLS, object ownership, SECURITY DEFINER, and cross-schema privileges', async () => {
    const suffix = randomUUID().replace(/-/g, '').slice(0, 12);
    const requestRole = `rrs_request_${suffix}`;
    const runtimeRole = `rrs_runtime_${suffix}`;
    const approvedSchema = `rrs_approved_${suffix}`;
    const externalSchema = `rrs_external_${suffix}`;
    const password = `rrs-${randomUUID()}`;
    const quoteIdentifier = pg.escapeIdentifier;
    const adminConfig = getPgEnvOptions({});
    const adminPool = new pg.Pool({ ...adminConfig, max: 1 });
    let runtimePool: pg.Pool | null = null;

    try {
      await adminPool.query(`
        CREATE ROLE ${quoteIdentifier(requestRole)} NOLOGIN NOINHERIT BYPASSRLS;
        CREATE ROLE ${quoteIdentifier(runtimeRole)} LOGIN NOINHERIT
          PASSWORD ${pg.escapeLiteral(password)};
        CREATE SCHEMA ${quoteIdentifier(approvedSchema)} AUTHORIZATION CURRENT_USER;
        CREATE SCHEMA ${quoteIdentifier(externalSchema)} AUTHORIZATION CURRENT_USER;
        CREATE TABLE ${quoteIdentifier(approvedSchema)}.owned_table (id integer);
        ALTER TABLE ${quoteIdentifier(approvedSchema)}.owned_table
          OWNER TO ${quoteIdentifier(requestRole)};
        CREATE FUNCTION ${quoteIdentifier(approvedSchema)}.privileged_function()
          RETURNS integer LANGUAGE sql SECURITY DEFINER AS 'SELECT 1';
        CREATE TABLE ${quoteIdentifier(externalSchema)}.external_table (id integer);
        CREATE SEQUENCE ${quoteIdentifier(externalSchema)}.external_sequence;
        CREATE FUNCTION ${quoteIdentifier(externalSchema)}.external_function()
          RETURNS integer LANGUAGE sql AS 'SELECT 1';
        CREATE TYPE ${quoteIdentifier(externalSchema)}.external_type AS ENUM ('one');
        GRANT USAGE ON SCHEMA ${quoteIdentifier(approvedSchema)},
          ${quoteIdentifier(externalSchema)} TO ${quoteIdentifier(requestRole)};
        GRANT SELECT ON ${quoteIdentifier(externalSchema)}.external_table
          TO ${quoteIdentifier(requestRole)};
        GRANT USAGE ON SEQUENCE ${quoteIdentifier(externalSchema)}.external_sequence
          TO ${quoteIdentifier(requestRole)};
        GRANT EXECUTE ON FUNCTION ${quoteIdentifier(externalSchema)}.external_function()
          TO ${quoteIdentifier(requestRole)};
        GRANT USAGE ON TYPE ${quoteIdentifier(externalSchema)}.external_type
          TO ${quoteIdentifier(requestRole)};
        GRANT ${quoteIdentifier(requestRole)} TO ${quoteIdentifier(runtimeRole)}
          WITH INHERIT FALSE, SET TRUE;
      `);

      runtimePool = new pg.Pool({
        ...adminConfig,
        user: runtimeRole,
        password,
        max: 1
      });

      let rejected: unknown;
      try {
        await assertRuntimeRoleSafety(
          runtimePool,
          [requestRole],
          [approvedSchema]
        );
      } catch (error) {
        rejected = error;
      }

      expect(rejected).toBeInstanceOf(UnsafeRuntimeRoleError);
      const violations = (rejected as UnsafeRuntimeRoleError).violations;
      expect(violations).toContain(`${requestRole} has BYPASSRLS`);
      expect(violations).toContain(
        `${requestRole} owns RELATION ${approvedSchema}.owned_table`
      );
      expect(violations).toContain(
        `SECURITY DEFINER FUNCTION ${approvedSchema}.privileged_function `
          + 'is not allowed in the approved GraphQL schema scope'
      );
      expect(violations).toContain(
        `${requestRole} has RELATION,SEQUENCE,FUNCTION,TYPE on unapproved schema ${externalSchema}`
      );
    } finally {
      await runtimePool?.end();
      await adminPool.query(`
        DROP SCHEMA IF EXISTS ${quoteIdentifier(approvedSchema)} CASCADE;
        DROP SCHEMA IF EXISTS ${quoteIdentifier(externalSchema)} CASCADE;
        DROP ROLE IF EXISTS ${quoteIdentifier(runtimeRole)};
        DROP ROLE IF EXISTS ${quoteIdentifier(requestRole)};
      `);
      await adminPool.end();
    }
  });
});
