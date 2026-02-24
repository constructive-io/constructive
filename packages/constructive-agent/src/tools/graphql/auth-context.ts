import type { AgentIdentityContext } from '../../types/config';

export interface GraphQLAuthContext {
  endpoint: string;
  headers: Record<string, string>;
}

export function createGraphQLHeaders(
  identity: AgentIdentityContext,
  extraHeaders: Record<string, string> = {},
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${identity.accessToken}`,
    ...extraHeaders,
  };

  if (identity.databaseId) {
    headers['X-Database-Id'] = identity.databaseId;
  }

  if (identity.apiName) {
    headers['X-Api-Name'] = identity.apiName;
  }

  if (identity.metaSchema) {
    headers['X-Meta-Schema'] = identity.metaSchema;
  }

  if (identity.origin) {
    headers.Origin = identity.origin;
  }

  if (identity.userAgent) {
    headers['User-Agent'] = identity.userAgent;
  }

  return headers;
}
