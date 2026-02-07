/**
 * Compile-time regression checks for helper overloads and React Query options.
 *
 * Focus:
 * - fetch/prefetch overload behavior
 * - optional variables + required selection.fields custom query overloads
 * - default vs explicit selection result narrowing in helpers
 * - allowed/disallowed React Query options on generated hooks
 */

import { QueryClient } from '@tanstack/react-query';

import {
  fetchDatabasesQuery,
  fetchGetObjectAtPathQuery,
  prefetchDatabasesQuery,
  prefetchGetObjectAtPathQuery,
  useCurrentUserQuery,
  useDatabasesQuery,
  useGetObjectAtPathQuery,
  useSignInMutation,
} from '../generated/hooks';

type Assert<T extends true> = T;
type HasKey<T, K extends PropertyKey> = K extends keyof T ? true : false;
type NotHasKey<T, K extends PropertyKey> = K extends keyof T ? false : true;

function helperOverloadChecks() {
  const queryClient = new QueryClient();

  const defaultDatabasesFetch = fetchDatabasesQuery({ selection: { first: 2 } });
  type DefaultDatabaseNode = Awaited<typeof defaultDatabasesFetch>['databases']['nodes'][number];
  type _defaultDatabaseFetchOmitsName = Assert<NotHasKey<DefaultDatabaseNode, 'name'>>;

  const selectedDatabasesFetch = fetchDatabasesQuery({
    selection: {
      first: 2,
      fields: {
        id: true,
        name: true,
        schemas: {
          first: 1,
          select: {
            id: true,
            schemaName: true,
          },
        },
      },
    },
  });
  type SelectedDatabaseNode = Awaited<typeof selectedDatabasesFetch>['databases']['nodes'][number];
  type _selectedDatabaseFetchHasName = Assert<HasKey<SelectedDatabaseNode, 'name'>>;

  prefetchDatabasesQuery(queryClient, { selection: { first: 2 } });
  prefetchDatabasesQuery(queryClient, {
    selection: {
      first: 2,
      fields: {
        id: true,
        name: true,
      },
    },
  });

  // @ts-expect-error invalid helper nested select key should be rejected
  fetchDatabasesQuery({ selection: { fields: { schemas: { select: { invalidField: true } } } } });

  const defaultGetObjectFetch = fetchGetObjectAtPathQuery({ variables: undefined });
  type DefaultGetObject = Awaited<typeof defaultGetObjectFetch>['getObjectAtPath'];
  type _defaultGetObjectOmitsData = Assert<NotHasKey<DefaultGetObject, 'data'>>;

  const selectedGetObjectFetch = fetchGetObjectAtPathQuery({
    variables: undefined,
    selection: {
      fields: {
        id: true,
        data: true,
      },
    },
  });
  type SelectedGetObject = Awaited<typeof selectedGetObjectFetch>['getObjectAtPath'];
  type _selectedGetObjectHasData = Assert<HasKey<SelectedGetObject, 'data'>>;

  prefetchGetObjectAtPathQuery(queryClient, { variables: undefined });
  prefetchGetObjectAtPathQuery(queryClient, {
    variables: undefined,
    selection: {
      fields: {
        id: true,
      },
    },
  });

  // @ts-expect-error invalid custom helper select key should be rejected
  prefetchGetObjectAtPathQuery(queryClient, {
    variables: undefined,
    selection: { fields: { invalidField: true } },
  });

  // @ts-expect-error custom helper select overload requires explicit variables
  fetchGetObjectAtPathQuery({ selection: { fields: { id: true } } });

  // @ts-expect-error custom helper prefetch overload requires explicit variables
  prefetchGetObjectAtPathQuery(queryClient, { selection: { fields: { id: true } } });
}

function reactQueryOptionsChecks() {
  useDatabasesQuery({
    selection: {
      first: 10,
      fields: {
        id: true,
        name: true,
      },
    },
    enabled: true,
    staleTime: 30_000,
    gcTime: 300_000,
    retry: 2,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
    networkMode: 'always',
    notifyOnChangeProps: ['data', 'error'],
    meta: { source: 'type-test' },
  });

  const transformedDatabases = useDatabasesQuery({
    selection: {
      first: 10,
      fields: {
        id: true,
        name: true,
      },
    },
    select: (data) => data.databases.nodes.map((node) => node.name),
    placeholderData: (previousData) =>
      previousData ?? {
        databases: {
          nodes: [],
          totalCount: 0,
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      },
    staleTime: (query) => {
      const status = query.state.status;
      void status;
      return 10_000;
    },
    throwOnError: (error) => error.message.length > 0,
  });
  const transformedDatabaseNames: string[] | undefined = transformedDatabases.data;
  void transformedDatabaseNames;
  // @ts-expect-error transformed query data should not expose connection shape
  transformedDatabases.data.databases;

  const transformedCurrentUser = useCurrentUserQuery({
    select: (data) => data.currentUser.id,
    placeholderData: (previousData) =>
      previousData ?? {
        currentUser: {
          id: 'fallback-user-id',
        },
      },
    enabled: false,
    staleTime: 5_000,
    gcTime: 60_000,
    retry: (failureCount, error) => {
      const msg = error.message;
      void msg;
      return failureCount < 2;
    },
  });
  const transformedCurrentUserId: string | undefined = transformedCurrentUser.data;
  void transformedCurrentUserId;
  // @ts-expect-error transformed query data should not expose object shape
  transformedCurrentUser.data.currentUser;

  useGetObjectAtPathQuery({
    variables: undefined,
    selection: {
      fields: {
        id: true,
      },
    },
    enabled: false,
    staleTime: 5_000,
    gcTime: 60_000,
    placeholderData: {
      getObjectAtPath: {
        id: 'placeholder',
      },
    },
    select: (data) => data.getObjectAtPath.id,
  });

  // @ts-expect-error unknown React Query option should be rejected
  useDatabasesQuery({ selection: { fields: { id: true } }, unknownOption: true });

  // @ts-expect-error queryKey is owned by generated hooks
  useDatabasesQuery({ selection: { fields: { id: true } }, queryKey: ['override'] as const });

  // @ts-expect-error queryFn is owned by generated hooks
  useDatabasesQuery({
    selection: { fields: { id: true } },
    queryFn: async () =>
      ({
        databases: {
          nodes: [],
          totalCount: 0,
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      }) as never,
  });

  useSignInMutation({
    selection: {
      fields: {
        clientMutationId: true,
      },
    },
    retry: 1,
    gcTime: 300_000,
    meta: { source: 'type-test' },
    networkMode: 'always',
    throwOnError: (error) => error.message.length > 0,
    onMutate: (variables) => {
      const email = variables.input.email;
      return { email };
    },
    onError: (error, variables, context) => {
      const message = error.message;
      const rememberMe = variables.input.rememberMe;
      void message;
      void rememberMe;
      void context;
    },
    onSuccess: (data, variables) => {
      const clientMutationId = data.signIn.clientMutationId;
      const email = variables.input.email;
      void clientMutationId;
      void email;
    },
  });

  // @ts-expect-error mutationFn is owned by generated hooks
  useSignInMutation({
    selection: { fields: { clientMutationId: true } },
    mutationFn: async () =>
      ({
        signIn: {
          clientMutationId: 'x',
        },
      }) as never,
  });
}

void helperOverloadChecks;
void reactQueryOptionsChecks;
