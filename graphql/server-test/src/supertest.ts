import type { DocumentNode } from 'graphql';
import { print } from 'graphql';
import supertest from 'supertest';

import type {
  ServerInfo,
  GraphQLQueryOptions,
  GraphQLResponse,
  GraphQLQueryFn,
  GraphQLQueryFnObj
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
 * Execute a GraphQL query via HTTP using SuperTest
 */
const executeGraphQLQuery = async <T>(
  agent: supertest.Agent,
  query: string | DocumentNode,
  variables?: Record<string, any>,
  headers?: Record<string, string>
): Promise<GraphQLResponse<T>> => {
  const response = await agent
    .post('/graphql')
    .set('Content-Type', 'application/json')
    .set(headers || {})
    .send({
      query: queryToString(query),
      variables
    });

  return response.body as GraphQLResponse<T>;
};

/**
 * Create a GraphQL query function (positional API)
 */
export const createQueryFn = (agent: supertest.Agent): GraphQLQueryFn => {
  return async <TResult = any, TVariables = Record<string, any>>(
    query: string | DocumentNode,
    variables?: TVariables,
    headers?: Record<string, string>
  ): Promise<GraphQLResponse<TResult>> => {
    return executeGraphQLQuery<TResult>(agent, query, variables, headers);
  };
};

/**
 * Create a GraphQL query function (object-based API)
 */
export const createQueryFnObj = (agent: supertest.Agent): GraphQLQueryFnObj => {
  return async <TResult = any, TVariables = Record<string, any>>(
    opts: GraphQLQueryOptions<TVariables>
  ): Promise<GraphQLResponse<TResult>> => {
    return executeGraphQLQuery<TResult>(agent, opts.query, opts.variables, opts.headers);
  };
};

/**
 * Create a GraphQL query function with logging (positional API)
 */
export const createQueryFnWithLogging = (agent: supertest.Agent): GraphQLQueryFn => {
  return async <TResult = any, TVariables = Record<string, any>>(
    query: string | DocumentNode,
    variables?: TVariables,
    headers?: Record<string, string>
  ): Promise<GraphQLResponse<TResult>> => {
    console.log('Executing GraphQL query:', queryToString(query));
    if (variables) {
      console.log('Variables:', JSON.stringify(variables, null, 2));
    }
    const result = await executeGraphQLQuery<TResult>(agent, query, variables, headers);
    console.log('GraphQL result:', JSON.stringify(result, null, 2));
    return result;
  };
};

/**
 * Create a GraphQL query function with logging (object-based API)
 */
export const createQueryFnObjWithLogging = (agent: supertest.Agent): GraphQLQueryFnObj => {
  return async <TResult = any, TVariables = Record<string, any>>(
    opts: GraphQLQueryOptions<TVariables>
  ): Promise<GraphQLResponse<TResult>> => {
    console.log('Executing GraphQL query:', queryToString(opts.query));
    if (opts.variables) {
      console.log('Variables:', JSON.stringify(opts.variables, null, 2));
    }
    const result = await executeGraphQLQuery<TResult>(agent, opts.query, opts.variables, opts.headers);
    console.log('GraphQL result:', JSON.stringify(result, null, 2));
    return result;
  };
};

/**
 * Create a GraphQL query function with timing (positional API)
 */
export const createQueryFnWithTiming = (agent: supertest.Agent): GraphQLQueryFn => {
  return async <TResult = any, TVariables = Record<string, any>>(
    query: string | DocumentNode,
    variables?: TVariables,
    headers?: Record<string, string>
  ): Promise<GraphQLResponse<TResult>> => {
    const start = Date.now();
    const result = await executeGraphQLQuery<TResult>(agent, query, variables, headers);
    const duration = Date.now() - start;
    console.log(`GraphQL query took ${duration}ms`);
    return result;
  };
};

/**
 * Create a GraphQL query function with timing (object-based API)
 */
export const createQueryFnObjWithTiming = (agent: supertest.Agent): GraphQLQueryFnObj => {
  return async <TResult = any, TVariables = Record<string, any>>(
    opts: GraphQLQueryOptions<TVariables>
  ): Promise<GraphQLResponse<TResult>> => {
    const start = Date.now();
    const result = await executeGraphQLQuery<TResult>(agent, opts.query, opts.variables, opts.headers);
    const duration = Date.now() - start;
    console.log(`GraphQL query took ${duration}ms`);
    return result;
  };
};
