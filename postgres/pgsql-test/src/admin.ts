import { DbAdmin as BaseDbAdmin } from 'pgsql-client';
import { PgTestConnectionOptions } from '@pgpmjs/types';
import { PgConfig } from 'pg-env';
import { SeedAdapter } from './seed/types';

// Extend DbAdmin from pgsql-client with test-specific methods
export class DbAdmin extends BaseDbAdmin {
  constructor(
    config: PgConfig,
    verbose: boolean = false,
    roleConfig?: PgTestConnectionOptions
  ) {
    super(config, verbose, roleConfig);
  }

  async createSeededTemplate(templateName: string, adapter: SeedAdapter): Promise<void> {
    const seedDb = this.config.database;
    this.create(seedDb);

    await adapter.seed({
      admin: this,
      config: this.config,
      pg: null as any, // placeholder for PgTestClient
      connect: null as any // placeholder for connection factory
    });

    this.cleanupTemplate(templateName);
    this.createTemplateFromBase(seedDb, templateName);
    this.drop(seedDb);
  }
}
