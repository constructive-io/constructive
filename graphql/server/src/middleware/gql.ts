import { GraphileQuery } from 'graphile-query';

import {
  type ApiSelect,
  type ApiWithRelations,
  type DomainFilter,
  type DomainSelect,
  type DomainWithRelations,
} from '../codegen/orm/input-types';
import {
  OrmClient,
  type GraphQLError,
  type QueryResult,
} from '../codegen/orm/client';
import { ApiModel, DomainModel } from '../codegen/orm/models';
import { createQueryOperations } from '../codegen/orm/query';
import type { InferSelectResult } from '../codegen/orm/select-types';
import { ApiStructure, RlsModule, SchemaNode } from '../types';

export const connectionFirst = 1000;

export const apiSelect = {
  databaseId: true,
  dbname: true,
  roleName: true,
  anonRole: true,
  isPublic: true,
  domains: {
    select: {
      subdomain: true,
      domain: true,
    },
    first: connectionFirst,
  },
  apiExtensions: {
    select: { schemaName: true },
    first: connectionFirst,
  },
  schemasByApiSchemaApiIdAndSchemaId: {
    select: { schemaName: true },
    first: connectionFirst,
  },
  rlsModule: {
    select: {
      privateSchema: { select: { schemaName: true } },
      authenticateStrict: true,
      authenticate: true,
      currentRole: true,
      currentRoleId: true,
    },
  },
  apiModules: {
    select: { name: true, data: true },
    first: connectionFirst,
  },
} satisfies ApiSelect;

export const domainSelect = {
  domain: true,
  subdomain: true,
  api: { select: apiSelect },
} satisfies DomainSelect;

export const apiListSelect = {
  id: true,
  databaseId: true,
  name: true,
  dbname: true,
  roleName: true,
  anonRole: true,
  isPublic: true,
  domains: {
    select: { domain: true, subdomain: true },
    first: connectionFirst,
  },
} satisfies ApiSelect;

export type ApiRecord = InferSelectResult<ApiWithRelations, typeof apiSelect>;
export type DomainRecord = InferSelectResult<
  DomainWithRelations,
  typeof domainSelect
>;
export type ApiListRecord = InferSelectResult<
  ApiWithRelations,
  typeof apiListSelect
>;

class GraphileOrmClient extends OrmClient {
  constructor(private readonly graphile: GraphileQuery) {
    super({ endpoint: 'http://localhost/graphql' });
  }

  async execute<T>(
    document: string,
    variables?: Record<string, unknown>
  ): Promise<QueryResult<T>> {
    const result = await this.graphile.query({
      role: 'administrator',
      query: document,
      variables,
    });

    if (result.errors?.length) {
      return {
        ok: false,
        data: null,
        errors: result.errors as unknown as GraphQLError[],
      };
    }

    return {
      ok: true,
      data: result.data as T,
      errors: undefined,
    };
  }
}

type ApiByNameResult = QueryResult<{ apiByDatabaseIdAndName: ApiRecord }>;
export type ApiQueryOps = {
  apiByDatabaseIdAndName: (
    args: { databaseId: string; name: string },
    options: { select: typeof apiSelect }
  ) => { execute: () => Promise<ApiByNameResult> };
};
type DomainLookupResult = QueryResult<{ domains: { nodes: DomainRecord[] } }>;
export type DomainLookupModel = {
  findFirst: (args: { select: typeof domainSelect; where: DomainFilter }) => {
    execute: () => Promise<DomainLookupResult>;
  };
};
type ApiListResult = QueryResult<{ apis: { nodes: ApiListRecord[] } }>;
export type ApiListModel = {
  findMany: (args: { select: typeof apiListSelect; first: number }) => {
    execute: () => Promise<ApiListResult>;
  };
};

export const createGraphileOrm = (graphile: GraphileQuery) => {
  const client = new GraphileOrmClient(graphile);
  return {
    api: new ApiModel(client),
    domain: new DomainModel(client),
    query: createQueryOperations(client),
  };
};

export const normalizeApiRecord = (api: ApiRecord): ApiStructure => {
  const schemaNames =
    api.apiExtensions?.nodes?.map((n: SchemaNode) => n.schemaName) || [];
  const additionalSchemas =
    api.schemasByApiSchemaApiIdAndSchemaId?.nodes?.map(
      (n: SchemaNode) => n.schemaName
    ) || [];

  let domains: string[] = [];
  if (api.domains?.nodes?.length) {
    domains = api.domains.nodes.reduce((acc: string[], domain) => {
      if (!domain.domain) return acc;
      const hostname = domain.subdomain
        ? `${domain.subdomain}.${domain.domain}`
        : domain.domain;
      const protocol = domain.domain === 'localhost' ? 'http://' : 'https://';
      return [...acc, protocol + hostname];
    }, []);
  }

  return {
    dbname: api.dbname,
    anonRole: api.anonRole,
    roleName: api.roleName,
    schema: [...schemaNames, ...additionalSchemas],
    apiModules:
      api.apiModules?.nodes?.map((node) => ({
        name: node.name,
        data: node.data,
      })) || [],
    rlsModule: api.rlsModule as RlsModule | null,
    domains,
    databaseId: api.databaseId,
    isPublic: api.isPublic,
  };
};
