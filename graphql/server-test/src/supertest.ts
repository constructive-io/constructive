import type { DocumentNode } from 'graphql';
import { print } from 'graphql';
import supertest from 'supertest';

import type {
  ServerInfo,
  GraphQLResponse,
  GraphQLQueryFn
} from './types';

/**
 * Create a SuperTest agent for the given server
 */
export const createSuperTestAgent = (server: ServerInfo): supertest.Agent => {
  return supertest(server.httpServer);
};

/**
 * Convert a query to a string (handles both string and DocumentNode)
 */
const queryToString = (query: string | DocumentNode): string => {
  return typeof query === 'string' ? query : print(query);
};

/**
 * Create a GraphQL query function
 */
export const createQueryFn = (agent: supertest.Agent): GraphQLQueryFn => {
  return async <TResult = any, TVariables = Record<string, any>>(
    query: string | DocumentNode,
    variables?: TVariables,
    headers?: Record<string, string>
  ): Promise<GraphQLResponse<TResult>> => {
    const response = await agent
      .post('/graphql')
      .set('Content-Type', 'application/json')
      .set(headers || {})
      .send({
        query: queryToString(query),
        variables
      });

    return response.body as GraphQLResponse<TResult>;
  };
};
