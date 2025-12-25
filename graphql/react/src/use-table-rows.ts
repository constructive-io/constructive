// @ts-nocheck
import { useMemo } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient
} from 'react-query';

import { useConstructiveQuery } from './use-constructive-client';
import { useGraphqlClient } from './use-graphql-client';
const noop = () => {};

export function useTableRowsPaginated(options = {}) {
  const {
    tableName,
    first,
    after,
    last,
    before,
    condition,
    filter,
    orderBy,
    onSuccess = noop,
    onError,
    skip = false,
    select,
    ...restOptions
  } = options;

  const graphqlClient = useGraphqlClient();
  const queryBuilder = useConstructiveQuery();

  const graphqlQuery = useMemo(() => {
    if (!queryBuilder) return null;
    const result = queryBuilder.query(tableName).getMany({ select }).print();

    return {
      hash: result._hash,
      key: result._key
    };
  }, [queryBuilder, select, tableName]);

  const params = useMemo(
    () => ({
      skip,
      first,
      after,
      last,
      before,
      condition,
      filter,
      orderBy,
      graphqlQuery
    }),
    [after, before, condition, filter, first, graphqlQuery, last, orderBy, skip]
  );

  const query = useQuery(
    [tableName, params],
    async ({ queryKey }) => {
      const [, params] = queryKey;
      const {
        skip,
        first,
        last,
        after,
        before,
        condition,
        filter,
        orderBy,
        graphqlQuery
      } = normalize(params);

      if (skip || !graphqlQuery) return null;

      const result = await graphqlClient.request(graphqlQuery.hash, {
        first,
        last,
        after,
        before,
        condition,
        filter,
        orderBy
      });

      return result[graphqlQuery.key];
    },
    {
      onError,
      onSuccess,
      enabled: !!graphqlClient && !!graphqlQuery,
      ...restOptions
      // Read more what this does at:
      // https://react-query.tanstack.com/guides/paginated-queries#better-paginated-queries-with-keeppreviousdata
      // keepPreviousData: true
    }
  );

  return query;
}

export function useTableRowsInfinite(options = {}) {
  const {
    tableName,
    condition,
    filter,
    orderBy,
    onSuccess = noop,
    onError,
    select,
    ...restOptions
  } = options;

  const graphqlClient = useGraphqlClient();
  const queryBuilder = useConstructiveQuery();

  const graphqlQuery = useMemo(() => {
    if (!queryBuilder) return null;
    const result = queryBuilder.query(tableName).getMany({ select }).print();

    return {
      hash: result._hash,
      key: result._key
    };
  }, [queryBuilder, select, tableName]);

  const params = useMemo(
    () => ({
      graphqlQuery,
      condition,
      filter,
      orderBy
    }),
    [condition, filter, graphqlQuery, orderBy]
  );

  const infiniteQuery = useInfiniteQuery(
    [tableName, params],
    async ({ queryKey, pageParam = null }) => {
      const [, params] = queryKey;
      const { condition, filter, orderBy, graphqlQuery } = normalize(params);

      if (!graphqlQuery) return null;

      const result = await graphqlClient.request(graphqlQuery.hash, {
        first: 50,
        after: pageParam,
        condition,
        filter,
        orderBy
      });

      return result[graphqlQuery.key];
    },
    {
      onError,
      onSuccess,
      enabled: !!graphqlClient && !!graphqlQuery,
      getNextPageParam: (lastPage) => lastPage.pageInfo.endCursor,
      ...restOptions
    }
  );

  return infiniteQuery;
}

export function useCreateTableRow(options = {}) {
  const { tableName, onSuccess, onError } = options;

  const queryClient = useQueryClient();
  const graphqlClient = useGraphqlClient();
  const queryBuilder = useConstructiveQuery();

  const graphqlMutation = useMemo(() => {
    if (!queryBuilder) return null;
    const result = queryBuilder.query(tableName).create().print();

    return {
      hash: result._hash,
      key: result._key
    };
  }, [queryBuilder, tableName]);

  const mutation = useMutation(
    async (variables) => {
      const result = await graphqlClient.request(
        graphqlMutation.hash,
        variables
      );

      return result[graphqlMutation.key];
    },
    {
      onSuccess: (...args) => {
        // Will invalidate every query that has query key starting with tableName
        // ex: ['Action'] and ['Action', params] will both be invalidated
        queryClient.invalidateQueries(tableName);
        if (typeof onSuccess === 'function') onSuccess(args);
      },
      onError
    }
  );

  return mutation;
}

export function useDeleteTableRow(options = {}) {
  const { tableName, onSuccess, onError } = options;

  const queryClient = useQueryClient();
  const graphqlClient = useGraphqlClient();
  const queryBuilder = useConstructiveQuery();

  const graphqlMutation = useMemo(() => {
    if (!queryBuilder) return null;
    const result = queryBuilder.query(tableName).delete().print();

    return {
      hash: result._hash,
      key: result._key
    };
  }, [queryBuilder, tableName]);

  const mutation = useMutation(
    async (variables) => {
      const result = await graphqlClient.request(
        graphqlMutation.hash,
        variables
      );

      return result[graphqlMutation.key];
    },
    {
      onSuccess: (...args) => {
        // Will invalidate every query that has query key starting with tableName
        // ex: ['Action'] and ['Action', params] will both be invalidated
        queryClient.invalidateQueries(tableName);
        if (typeof onSuccess === 'function') onSuccess(args);
      },
      onError
    }
  );

  return mutation;
}

function normalize(params) {
  return {
    ...params,
    after: params.after ? String(params.after) : null,
    before: params.before ? String(params.before) : null,
    first: isValidPageSize(params.first) ? undefined : Number(params.first),
    last: isValidPageSize(params.last) ? undefined : Number(params.last)
  };
}

function isValidPageSize(size) {
  return isNaN(size) || size == null;
}
