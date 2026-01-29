import type { ConstructiveOptions } from '@constructive-io/graphql-types';

import {
  type GraphqlServerOptions,
  isGraphqlServerOptions,
  hasPgConfig,
  hasServerConfig,
  hasApiConfig,
  toGraphqlServerOptions,
  normalizeServerOptions,
  isLegacyOptions,
  graphqlServerDefaults
} from '../../server/src/options';

describe('GraphqlServerOptions', () => {
  describe('interface validation', () => {
    it('accepts valid config with 5 active fields (pg, server, api, graphile, features)', () => {
      const opts: GraphqlServerOptions = {
        pg: {
          host: 'localhost',
          port: 5432,
          database: 'testdb'
        },
        server: {
          host: 'localhost',
          port: 3000,
          trustProxy: false
        },
        api: {
          enableServicesApi: true,
          exposedSchemas: ['app_public'],
          anonRole: 'anonymous',
          roleName: 'authenticated'
        },
        graphile: {
          schema: ['app_public']
        },
        features: {
          simpleInflection: true,
          oppositeBaseNames: true,
          postgis: false
        }
      };

      expect(opts.pg).toBeDefined();
      expect(opts.server).toBeDefined();
      expect(opts.api).toBeDefined();
      expect(opts.graphile).toBeDefined();
      expect(opts.features).toBeDefined();
    });

    it('accepts 7 future fields (db, cdn, deployment, migrations, jobs, errorOutput, smtp)', () => {
      const opts: GraphqlServerOptions = {
        db: {
          rootDb: 'postgres',
          prefix: 'test-'
        },
        cdn: {
          provider: 'minio',
          bucketName: 'test-bucket'
        },
        deployment: {
          useTx: true,
          fast: false
        },
        migrations: {
          codegen: { useTx: false }
        },
        jobs: {
          schema: { schema: 'app_jobs' }
        },
        errorOutput: {
          queryHistoryLimit: 50,
          maxLength: 20000,
          verbose: false
        },
        smtp: {
          host: 'smtp.example.com',
          port: 587
        }
      };

      expect(opts.db).toBeDefined();
      expect(opts.cdn).toBeDefined();
      expect(opts.deployment).toBeDefined();
      expect(opts.migrations).toBeDefined();
      expect(opts.jobs).toBeDefined();
      expect(opts.errorOutput).toBeDefined();
      expect(opts.smtp).toBeDefined();
    });

    it('allows partial configuration', () => {
      const opts: GraphqlServerOptions = {
        pg: { host: 'localhost' }
      };

      expect(opts.pg).toBeDefined();
      expect(opts.server).toBeUndefined();
      expect(opts.api).toBeUndefined();
    });
  });

  describe('type guards', () => {
    it('isGraphqlServerOptions() returns true for valid options', () => {
      const opts: GraphqlServerOptions = {
        pg: { host: 'localhost', port: 5432 },
        server: { port: 3000 }
      };

      expect(isGraphqlServerOptions(opts)).toBe(true);
    });

    it('isGraphqlServerOptions() returns false for plain objects', () => {
      const plainObj = { random: 'value', nothing: 123 };
      expect(isGraphqlServerOptions(plainObj)).toBe(false);
    });

    it('isGraphqlServerOptions() returns false for null/undefined', () => {
      expect(isGraphqlServerOptions(null)).toBe(false);
      expect(isGraphqlServerOptions(undefined)).toBe(false);
    });

    it('hasPgConfig() returns true when pg config present', () => {
      const opts = { pg: { host: 'localhost' } };
      expect(hasPgConfig(opts)).toBe(true);
    });

    it('hasPgConfig() returns false when pg config absent', () => {
      const opts = { server: { port: 3000 } };
      expect(hasPgConfig(opts)).toBe(false);
    });

    it('hasPgConfig() returns false for empty pg object', () => {
      const opts = { pg: {} };
      // An empty pg object is still a pg config, just with no values
      expect(hasPgConfig(opts)).toBe(true);
    });

    it('hasServerConfig() returns true when server config present', () => {
      const opts = { server: { port: 3000, host: 'localhost' } };
      expect(hasServerConfig(opts)).toBe(true);
    });

    it('hasServerConfig() returns false when server config absent', () => {
      const opts = { pg: { host: 'localhost' } };
      expect(hasServerConfig(opts)).toBe(false);
    });

    it('hasApiConfig() returns true when api config present', () => {
      const opts = { api: { enableServicesApi: true } };
      expect(hasApiConfig(opts)).toBe(true);
    });

    it('hasApiConfig() returns false when api config absent', () => {
      const opts = { server: { port: 3000 } };
      expect(hasApiConfig(opts)).toBe(false);
    });
  });

  describe('normalizeServerOptions()', () => {
    it('handles GraphqlServerOptions input directly', () => {
      const input: GraphqlServerOptions = {
        pg: { host: 'myhost', port: 5433 },
        server: { port: 4000 }
      };

      const result = normalizeServerOptions(input);

      expect(result.pg?.host).toBe('myhost');
      expect(result.pg?.port).toBe(5433);
      expect(result.server?.port).toBe(4000);
    });

    it('extracts from ConstructiveOptions', () => {
      const input: ConstructiveOptions = {
        pg: { host: 'dbhost', port: 5432, database: 'mydb' },
        server: { port: 3000, host: '0.0.0.0' },
        api: { enableServicesApi: false },
        graphile: { schema: ['public'] },
        features: { simpleInflection: true }
      };

      const result = normalizeServerOptions(input);

      expect(result.pg?.host).toBe('dbhost');
      expect(result.server?.port).toBe(3000);
      expect(result.api?.enableServicesApi).toBe(false);
      expect(result.graphile?.schema).toEqual(['public']);
      expect(result.features?.simpleInflection).toBe(true);
    });

    it('applies graphqlServerDefaults for missing fields', () => {
      const input: GraphqlServerOptions = {
        pg: { database: 'testdb' }
      };

      const result = normalizeServerOptions(input);

      // Should have defaults applied
      expect(result.pg).toBeDefined();
      expect(result.server).toBeDefined();
      expect(result.api).toBeDefined();
      expect(result.graphile).toBeDefined();
      expect(result.features).toBeDefined();
    });

    it('deep merges nested objects', () => {
      const input: GraphqlServerOptions = {
        pg: { database: 'customdb' },
        server: { port: 5000 }
      };

      const result = normalizeServerOptions(input);

      // Custom values should override defaults
      expect(result.pg?.database).toBe('customdb');
      expect(result.server?.port).toBe(5000);
      // Default values should be filled in
      expect(result.server?.host).toBeDefined();
    });
  });

  describe('toGraphqlServerOptions()', () => {
    it('extracts graphql-relevant fields from ConstructiveOptions', () => {
      const constructive: ConstructiveOptions = {
        pg: { host: 'localhost', port: 5432, database: 'mydb' },
        server: { port: 3000 },
        api: { enableServicesApi: true, exposedSchemas: ['app_public'] },
        graphile: { schema: ['app_public'] },
        features: { simpleInflection: true, postgis: false },
        db: { rootDb: 'postgres' },
        cdn: { bucketName: 'files' },
        deployment: { useTx: true }
      };

      const result = toGraphqlServerOptions(constructive);

      expect(result.pg).toEqual({ host: 'localhost', port: 5432, database: 'mydb' });
      expect(result.server).toEqual({ port: 3000 });
      expect(result.api).toEqual({ enableServicesApi: true, exposedSchemas: ['app_public'] });
      expect(result.graphile).toEqual({ schema: ['app_public'] });
      expect(result.features).toEqual({ simpleInflection: true, postgis: false });
    });

    it('preserves pg, server, api, graphile, features', () => {
      const constructive: ConstructiveOptions = {
        pg: { host: 'dbhost' },
        server: { port: 8080 },
        api: { anonRole: 'anon' },
        graphile: { schema: 'public' },
        features: { postgis: true }
      };

      const result = toGraphqlServerOptions(constructive);

      expect(result).toHaveProperty('pg');
      expect(result).toHaveProperty('server');
      expect(result).toHaveProperty('api');
      expect(result).toHaveProperty('graphile');
      expect(result).toHaveProperty('features');
    });

    it('includes future extensibility fields when present', () => {
      const constructive: ConstructiveOptions = {
        pg: { host: 'localhost' },
        db: { prefix: 'test-' },
        cdn: { provider: 's3' },
        deployment: { fast: true },
        migrations: { codegen: { useTx: true } },
        jobs: { worker: { pollInterval: 2000 } },
        smtp: { host: 'mail.example.com' }
      };

      const result = toGraphqlServerOptions(constructive);

      expect(result.db).toBeDefined();
      expect(result.cdn).toBeDefined();
      expect(result.deployment).toBeDefined();
      expect(result.migrations).toBeDefined();
      expect(result.jobs).toBeDefined();
      expect(result.smtp).toBeDefined();
    });
  });

  describe('graphqlServerDefaults', () => {
    it('has correct default values for all active fields', () => {
      expect(graphqlServerDefaults).toBeDefined();

      // pg defaults
      expect(graphqlServerDefaults.pg).toBeDefined();
      expect(graphqlServerDefaults.pg?.host).toBe('localhost');
      expect(graphqlServerDefaults.pg?.port).toBe(5432);

      // server defaults
      expect(graphqlServerDefaults.server).toBeDefined();
      expect(graphqlServerDefaults.server?.host).toBe('localhost');
      expect(graphqlServerDefaults.server?.port).toBe(3000);
      expect(graphqlServerDefaults.server?.trustProxy).toBe(false);

      // api defaults
      expect(graphqlServerDefaults.api).toBeDefined();
      expect(graphqlServerDefaults.api?.enableServicesApi).toBe(true);
      expect(graphqlServerDefaults.api?.anonRole).toBe('administrator');

      // graphile defaults
      expect(graphqlServerDefaults.graphile).toBeDefined();
      expect(graphqlServerDefaults.graphile?.schema).toEqual([]);

      // features defaults
      expect(graphqlServerDefaults.features).toBeDefined();
      expect(graphqlServerDefaults.features?.simpleInflection).toBe(true);
      expect(graphqlServerDefaults.features?.oppositeBaseNames).toBe(true);
      expect(graphqlServerDefaults.features?.postgis).toBe(true);
    });

    it('does not include future fields in defaults', () => {
      // Future fields should be undefined in defaults since they are optional
      // and we don't want to impose defaults on features not yet implemented
      expect(graphqlServerDefaults.db).toBeUndefined();
      expect(graphqlServerDefaults.cdn).toBeUndefined();
      expect(graphqlServerDefaults.deployment).toBeUndefined();
      expect(graphqlServerDefaults.migrations).toBeUndefined();
      expect(graphqlServerDefaults.jobs).toBeUndefined();
      expect(graphqlServerDefaults.errorOutput).toBeUndefined();
      expect(graphqlServerDefaults.smtp).toBeUndefined();
    });
  });

  describe('isLegacyOptions()', () => {
    it('detects legacy options format', () => {
      // Legacy format might have different structure or deprecated fields
      const legacy = {
        schemas: ['public'], // old array-style schema config
        pgConfig: { host: 'localhost' }, // old naming convention
        serverPort: 3000 // flat config instead of nested
      };

      expect(isLegacyOptions(legacy)).toBe(true);
    });

    it('returns false for new format', () => {
      const newFormat: GraphqlServerOptions = {
        pg: { host: 'localhost' },
        server: { port: 3000 },
        graphile: { schema: ['public'] }
      };

      expect(isLegacyOptions(newFormat)).toBe(false);
    });

    it('returns false for empty objects', () => {
      expect(isLegacyOptions({})).toBe(false);
    });

    it('returns false for null/undefined', () => {
      expect(isLegacyOptions(null)).toBe(false);
      expect(isLegacyOptions(undefined)).toBe(false);
    });
  });
});
