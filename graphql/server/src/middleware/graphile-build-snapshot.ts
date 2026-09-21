import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import type { DatabaseSettings, ComputeConfig, ComputeModuleConfig } from '@constructive-io/express-context';
import type { PgConfig } from 'pg-env';
import type { Pool } from 'pg';

import { referenceGraphileBuildValue, snapshotGraphileBuildValue } from 'graphile-cache';
import type { GraphileBuildReference } from 'graphile-cache';

export interface GraphileServerBuildSnapshot {
  ownerIdentity: GraphileBuildReference<object>;
  serviceKey: string;
  poolIdentity: GraphileBuildReference<Pool>;
  poolKey: string;
  pgConfig: PgConfig;
  databaseName: string;
  databaseId: string | null;
  apiId?: string;
  schemas: string[];
  anonRole: string;
  roleName: string;
  introspectionRole?: string;
  databaseSettings?: DatabaseSettings;
  graphileOptions?: ConstructiveOptions['graphile'];
  computeModules: ComputeModuleConfig[];
  explain: boolean;
  grafserv: {
    graphqlPath: string;
    graphiqlPath: string;
    graphiql: boolean;
    graphiqlOnGraphQLGET: boolean;
    maskError: (...args: any[]) => any;
  };
}

interface GraphileServerBuildSnapshotInput {
  ownerIdentity: object;
  serviceKey: string;
  pool: Pool;
  pgConfig: PgConfig;
  databaseName: string;
  databaseId?: string | null;
  apiId?: string;
  schemas: string[];
  anonRole: string;
  roleName: string;
  introspectionRole?: string;
  databaseSettings?: DatabaseSettings;
  graphileOptions?: ConstructiveOptions['graphile'];
  compute?: ComputeConfig;
  explain: boolean;
  maskError: (...args: any[]) => any;
}

export const createGraphileServerBuildSnapshot = (
  input: GraphileServerBuildSnapshotInput
): Readonly<GraphileServerBuildSnapshot> => {
  const computeModules = (input.compute?.modules ?? []).map((module) => ({
    schemaName: module.schemaName,
    definitionsTableName: module.definitionsTableName,
    bindingsTableName: module.bindingsTableName,
    invocationsSchemaName: module.invocationsSchemaName,
    invocationsTableName: module.invocationsTableName,
    invocationsEntityField: module.invocationsEntityField
  }));

  return snapshotGraphileBuildValue({
    ownerIdentity: referenceGraphileBuildValue(input.ownerIdentity),
    serviceKey: input.serviceKey,
    poolIdentity: referenceGraphileBuildValue(input.pool),
    poolKey: input.pgConfig.database,
    pgConfig: input.pgConfig,
    databaseName: input.databaseName,
    databaseId: input.databaseId ?? null,
    apiId: input.apiId,
    schemas: input.schemas,
    anonRole: input.anonRole,
    roleName: input.roleName,
    introspectionRole: input.introspectionRole,
    databaseSettings: input.databaseSettings,
    graphileOptions: input.graphileOptions,
    computeModules,
    explain: input.explain,
    grafserv: {
      graphqlPath: '/graphql',
      graphiqlPath: '/graphiql',
      graphiql: true,
      graphiqlOnGraphQLGET: false,
      maskError: input.maskError
    }
  });
};
