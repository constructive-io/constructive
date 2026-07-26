import type { GraphileConfig } from 'graphile-config';
import { createConstructivePreset, makePgService } from 'graphile-settings';
import type { Pool } from 'pg';

export interface DevPresetInput {
  pool: Pool;
  schemas: string[];
  /** Postgres role every request runs as (there is no per-request auth here). */
  role: string;
}

/**
 * Build the dev-server PostGraphile v5 preset.
 *
 * This is a pure-PostGraphile surface over a single database: it exposes the
 * configured schemas with a fixed role and no scoped-routing plane. Only
 * plugins that do NOT depend on a tenant database id are enabled. The presigned
 * upload / bucket-provisioner plugins resolve per-tenant storage config from a
 * `database_id`, and the LLM plugin resolves per-tenant billing / inference-log
 * config from a `database_id`, so all three are excluded here. Direct uploads
 * stream to a fixed env-configured bucket and need no database id, so they stay.
 * Nothing enabled here reads `jwt.claims.database_id`.
 */
export const buildDevPreset = ({ pool, schemas, role }: DevPresetInput): GraphileConfig.Preset => ({
  extends: [
    createConstructivePreset({
      enablePresignedUploads: false,
      enableLlm: false
    })
  ],
  pgServices: [makePgService({ pool, schemas })],
  grafserv: {
    graphqlPath: '/graphql',
    graphiqlPath: '/graphiql',
    graphiql: true,
    graphiqlOnGraphQLGET: false
  },
  grafast: {
    explain: process.env.NODE_ENV === 'development',
    context: () => ({ pgSettings: { role } })
  }
});
