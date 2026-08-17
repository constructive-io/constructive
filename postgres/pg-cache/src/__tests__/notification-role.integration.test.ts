import type pg from 'pg';
import { getPgEnvOptions } from 'pg-env';

import { teardownPgPools } from '../lru';
import {
  acquirePgNotificationBroker,
  getPgNotificationBrokerStats,
  teardownPgNotificationBrokers,
} from '../notification-broker';
import {
  assertPgNotificationRole,
  auditPgNotificationRole,
} from '../notification-role';
import { defaultPgPoolFactory, getPgPool } from '../pg';

const describeWithNotificationRole =
  process.env.PG_CACHE_RUN_NOTIFICATION_ROLE_INTEGRATION === '1'
    ? describe
    : describe.skip;

describeWithNotificationRole(
  'dedicated notification role against PostgreSQL',
  () => {
    const pgConfig = getPgEnvOptions();
    let pool: pg.Pool;

    beforeAll(() => {
      pool = defaultPgPoolFactory(
        { ...pgConfig, pool: { max: 1 } },
        { purpose: 'notification-role-integration' }
      ) as pg.Pool;
    });

    afterAll(async () => {
      await teardownPgNotificationBrokers();
      await teardownPgPools();
      await pool?.end();
    });

    it('accepts only the exact credential-free role/database contract', async () => {
      const audit = await assertPgNotificationRole(pool, {
        role: pgConfig.user,
        database: pgConfig.database,
      });

      expect(audit).toMatchObject({
        role: pgConfig.user,
        database: pgConfig.database,
        safe: true,
        violations: [],
      });
      expect(Object.keys(audit).sort()).toEqual([
        'database',
        'role',
        'safe',
        'version',
        'violations',
      ]);
      expect(audit).not.toHaveProperty('password');
      expect(audit).not.toHaveProperty('host');

      const wrongRole = await auditPgNotificationRole(pool, {
        role: `wrong_${process.pid}`,
        database: pgConfig.database,
      });
      expect(wrongRole).toMatchObject({
        safe: false,
        violations: expect.arrayContaining(['LOGIN_ROLE_MISMATCH']),
      });

      const wrongDatabase = await auditPgNotificationRole(pool, {
        role: pgConfig.user,
        database: `wrong_${process.pid}`,
      });
      expect(wrongDatabase).toMatchObject({
        safe: false,
        violations: expect.arrayContaining([
          'DATABASE_MISMATCH',
          'TARGET_DATABASE_MISSING',
          'TARGET_CONNECT_REQUIRED',
          'CROSS_DATABASE_CONNECT',
        ]),
      });
    });

    it('retains enough privilege for isolated LISTEN and NOTIFY delivery', async () => {
      const nonce = `${process.pid}_${Date.now().toString(36)}`;
      const topics = [0, 1, 2].map(
        (index) => `notify_role_it_${nonce}_${index}`
      );
      const listenerConfig = { ...pgConfig, pool: { max: 1 } };
      const statsBefore = getPgNotificationBrokerStats();
      const [first, second, third] = await Promise.all(
        topics.map((topic) =>
          acquirePgNotificationBroker(listenerConfig, { topics: [topic] })
        )
      );
      const brokerPool = getPgPool(listenerConfig, {
        purpose: 'notification-broker',
      });
      await first.revalidateRole();
      const next = second.subscribe(topics[1]).next();

      await pool.query('SELECT pg_notify($1, $2)', [
        topics[1],
        'safe-listener',
      ]);
      await expect(next).resolves.toEqual({
        done: false,
        value: 'safe-listener',
      });
      expect(getPgNotificationBrokerStats()).toMatchObject({
        brokers: 1,
        listenerConnections: 1,
        leases: 3,
        topics: 3,
        roleAuditAttempts: statsBefore.roleAuditAttempts + 4,
        roleAuditFailures: statsBefore.roleAuditFailures,
      });
      expect(brokerPool.totalCount).toBe(1);
      expect(brokerPool.idleCount).toBe(0);

      await Promise.all([first.release(), second.release(), third.release()]);
      expect(getPgNotificationBrokerStats()).toMatchObject({
        brokers: 0,
        listenerConnections: 0,
        leases: 0,
        topics: 0,
      });
    });
  }
);
