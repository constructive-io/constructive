import { buildFindFirstDocument } from '../codegen/orm/query-builder';

type BuiltDocument = { document: string; variables: Record<string, unknown> };

const apiSelect = {
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
    connection: true,
  },
  apiExtensions: {
    select: { schemaName: true },
    connection: true,
  },
  schemasByApiSchemaApiIdAndSchemaId: {
    select: { schemaName: true },
    connection: true,
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
  database: {
    select: {
      sites: {
        select: {
          domains: {
            select: { subdomain: true, domain: true },
            connection: true,
          },
        },
        connection: true,
      },
    },
  },
  apiModules: {
    select: { name: true, data: true },
    connection: true,
  },
} as const;

const domainSelect = {
  domain: true,
  subdomain: true,
  api: { select: apiSelect },
} as const;

const apisSelect = {
  id: true,
  databaseId: true,
  name: true,
  dbname: true,
  roleName: true,
  anonRole: true,
  isPublic: true,
  domains: {
    select: { domain: true, subdomain: true },
    connection: true,
  },
  database: {
    select: {
      sites: {
        select: {
          domains: {
            select: { domain: true, subdomain: true },
            connection: true,
          },
        },
        connection: true,
      },
    },
  },
} as const;

/**
 * Build query for domain lookup with optional subdomain
 * This uses domains connection instead of domainBySubdomainAndDomain
 * because we need to handle null subdomain with condition filter
 */
export const buildDomainLookup = (vars: {
  domain: string;
  subdomain?: string | null;
}): BuiltDocument => {
  const where: Record<string, unknown> = {
    domain: { equalTo: vars.domain },
  };

  if (vars.subdomain === null || vars.subdomain === undefined) {
    where.subdomain = { isNull: true };
  } else {
    where.subdomain = { equalTo: vars.subdomain };
  }

  return buildFindFirstDocument(
    'DomainLookup',
    'domains',
    domainSelect,
    { where },
    'DomainFilter'
  );
};

/**
 * Build query for API lookup by database ID and name
 * Uses the generated apiByDatabaseIdAndName custom query
 */
export const buildApiByDatabaseIdAndName = (vars: {
  databaseId: string;
  name: string;
}): BuiltDocument => {
  // Import buildCustomDocument locally to avoid circular dependency
  const { buildCustomDocument } = require('../codegen/orm/query-builder');
  return buildCustomDocument(
    'query',
    'ApiByDatabaseIdAndName',
    'apiByDatabaseIdAndName',
    apiSelect,
    vars,
    [
      { name: 'databaseId', type: 'UUID!' },
      { name: 'name', type: 'String!' },
    ]
  );
};

/**
 * Build query to list all APIs
 */
export const buildListApis = (): BuiltDocument => {
  // Import buildCustomDocument locally to avoid circular dependency
  const { buildCustomDocument } = require('../codegen/orm/query-builder');
  return buildCustomDocument(
    'query',
    'ListApisByDatabaseId',
    'apis',
    {
      select: apisSelect,
      connection: true,
    },
    undefined,
    []
  );
};
