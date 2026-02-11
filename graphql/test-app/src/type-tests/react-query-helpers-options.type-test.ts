/**
 * Compile-time regression checks for helper overloads and React Query options.
 *
 * Focus:
 * - fetch/prefetch signatures for selection-enabled queries
 * - optional variables flow for non-selection custom queries
 * - pass-through and blocked React Query options
 */

import { QueryClient } from '@tanstack/react-query';

import {
  fetchCurrentUserQuery,
  fetchDatabasesQuery,
  fetchUserQuery,
  fetchStepsRequiredQuery,
  prefetchCurrentUserQuery,
  prefetchDatabasesQuery,
  prefetchUserQuery,
  prefetchStepsRequiredQuery,
  useAppPermissionsGetByMaskQuery,
  useCurrentUserQuery,
  useDatabasesQuery,
  useSignInMutation,
  useStepsRequiredQuery,
} from '../generated/hooks';

type Assert<T extends true> = T;
type HasKey<T, K extends PropertyKey> = K extends keyof T ? true : false;
type NotHasKey<T, K extends PropertyKey> = K extends keyof T ? false : true;

function helperOverloadChecks() {
  const queryClient = new QueryClient();

  const idOnlyDatabasesFetch = fetchDatabasesQuery({
    selection: {
      first: 2,
      fields: {
        id: true,
      },
    },
  });
  type IdOnlyDatabaseNode = Awaited<
    typeof idOnlyDatabasesFetch
  >['databases']['nodes'][number];
  type _idOnlyDatabaseFetchOmitsName = Assert<
    NotHasKey<IdOnlyDatabaseNode, 'name'>
  >;

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
  type SelectedDatabaseNode = Awaited<
    typeof selectedDatabasesFetch
  >['databases']['nodes'][number];
  type _selectedDatabaseFetchHasName = Assert<
    HasKey<SelectedDatabaseNode, 'name'>
  >;

  prefetchDatabasesQuery(queryClient, {
    selection: {
      first: 2,
      fields: {
        id: true,
      },
    },
  });

  // @ts-expect-error selection.fields is required
  fetchDatabasesQuery({ selection: { first: 2 } });

  const selectedCurrentUserFetch = fetchCurrentUserQuery({
    selection: {
      fields: {
        id: true,
        username: true,
      },
    },
  });
  type SelectedCurrentUser = Awaited<
    typeof selectedCurrentUserFetch
  >['currentUser'];
  type _selectedCurrentUserHasUsername = Assert<
    HasKey<SelectedCurrentUser, 'username'>
  >;

  prefetchCurrentUserQuery(queryClient, {
    selection: {
      fields: {
        id: true,
      },
    },
  });

  const selectedUserFetch = fetchUserQuery({
    id: '00000000-0000-0000-0000-000000000000',
    selection: {
      fields: {
        id: true,
        username: true,
      },
    },
  });
  type SelectedUser = Awaited<typeof selectedUserFetch>['user'];
  type _selectedUserHasUsername = Assert<
    HasKey<NonNullable<SelectedUser>, 'username'>
  >;

  prefetchUserQuery(queryClient, {
    id: '00000000-0000-0000-0000-000000000000',
    selection: {
      fields: {
        id: true,
      },
    },
  });

  // @ts-expect-error selection is required for selection-enabled single-item helpers
  fetchUserQuery({ id: '00000000-0000-0000-0000-000000000000' });

  // @ts-expect-error selection is required for selection-enabled single-item helpers
  prefetchUserQuery(queryClient, { id: '00000000-0000-0000-0000-000000000000' });

  // @ts-expect-error selection is required for selection-enabled custom query helpers
  fetchCurrentUserQuery();

  // Optional variables flow for custom queries without selection support.
  fetchStepsRequiredQuery();
  fetchStepsRequiredQuery({ variables: { vlevel: '1', first: 10 } });
  prefetchStepsRequiredQuery(queryClient);
  prefetchStepsRequiredQuery(queryClient, { variables: { vlevel: '1' } });
  useStepsRequiredQuery();
  useStepsRequiredQuery({
    variables: { vlevel: '1' },
    enabled: false,
  });
  // @ts-expect-error selection is not available on this custom query
  useStepsRequiredQuery({ selection: { fields: { id: true } } });

  useAppPermissionsGetByMaskQuery({
    variables: { mask: '1001', first: 5 },
    enabled: false,
  });
  // @ts-expect-error selection is not available on this custom query
  useAppPermissionsGetByMaskQuery({ selection: { fields: { id: true } } });
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

  const currentUserResult = useCurrentUserQuery({
    selection: {
      fields: {
        id: true,
        username: true,
      },
    },
    placeholderData: (previousData) =>
      previousData ?? {
        currentUser: {
          id: 'fallback-user-id',
          username: 'fallback-user',
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
  const currentUserId: string | undefined = currentUserResult.data?.currentUser.id;
  void currentUserId;

  const permissionIdsResult = useAppPermissionsGetByMaskQuery({
    variables: { mask: '101', first: 10 },
    select: (data) => data.appPermissionsGetByMask.nodes.map((node) => node.id),
    enabled: false,
    staleTime: 5_000,
  });
  const permissionIds: Array<string | undefined> | undefined = permissionIdsResult.data;
  void permissionIds;

  // @ts-expect-error unknown React Query option should be rejected
  useDatabasesQuery({ selection: { fields: { id: true } }, unknownOption: true });

  // @ts-expect-error queryKey is owned by generated hooks
  useDatabasesQuery({ selection: { fields: { id: true } }, queryKey: ['override'] as const });

  useDatabasesQuery({
    selection: { fields: { id: true } },
    // @ts-expect-error queryFn is owned by generated hooks
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
        result: {
          select: {
            accessToken: true,
            isVerified: true,
            totpEnabled: true,
            userId: true,
          },
        },
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
      const accessToken = data.signIn.result.accessToken;
      const email = variables.input.email;
      void accessToken;
      void email;
    },
  });

  useSignInMutation({
    selection: { fields: { clientMutationId: true } },
    // @ts-expect-error mutationFn is owned by generated hooks
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
