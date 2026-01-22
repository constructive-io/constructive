/**
 * React Query Hooks Test File
 * Tests that the generated hooks work correctly with React + TypeScript
 *
 * This file is for type-checking purposes. Run: npx tsc --noEmit examples/react-hooks-test.tsx
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import generated hooks
import {
  useUsersQuery,
  usersQueryKey,
  fetchUsersQuery,
  prefetchUsersQuery,
} from './output/generated-sdk-public/queries/useUsersQuery';
import {
  useUserQuery,
  userQueryKey,
} from './output/generated-sdk-public/queries/useUserQuery';
import {
  useDatabasesQuery,
  databasesQueryKey,
} from './output/generated-sdk-public/queries/useDatabasesQuery';
import {
  useTablesQuery,
  tablesQueryKey,
} from './output/generated-sdk-public/queries/useTablesQuery';
import {
  useCurrentUserQuery,
  currentUserQueryKey,
} from './output/generated-sdk-public/queries/useCurrentUserQuery';

// Import mutation hooks
import { useCreateUserMutation } from './output/generated-sdk-public/mutations/useCreateUserMutation';
import { useUpdateUserMutation } from './output/generated-sdk-public/mutations/useUpdateUserMutation';
import { useDeleteUserMutation } from './output/generated-sdk-public/mutations/useDeleteUserMutation';
import { useSignInMutation } from './output/generated-sdk-public/mutations/useSignInMutation';
import { useSignOutMutation } from './output/generated-sdk-public/mutations/useSignOutMutation';
import { useSignUpMutation } from './output/generated-sdk-public/mutations/useSignUpMutation';

// Import types
import type {
  UserFilter,
  DatabaseFilter,
  TableFilter,
} from './output/generated-sdk-public/schema-types';
import type { User, Database, Table } from './output/generated-sdk-public/types';

// Import client configuration
import { configure } from './output/generated-sdk-public/client';

// Import query/mutation keys for cache invalidation
import {
  queryKeys,
  userKeys,
  customQueryKeys,
} from './output/generated-sdk-public/query-keys';
import {
  mutationKeys,
  customMutationKeys,
} from './output/generated-sdk-public/mutation-keys';
import { invalidate } from './output/generated-sdk-public/invalidation';

const queryClient = new QueryClient();

/**
 * Test: List query hook with pagination and filtering
 */
function UsersListComponent() {
  const filter: UserFilter = {
    username: { isNull: false },
    and: [{ type: { equalTo: 0 } }, { type: { greaterThan: 5 } }],
  };

  const { data, isLoading, error, refetch } = useUsersQuery({
    first: 10,
    orderBy: ['USERNAME_ASC'],
    filter,
  });

  // Type assertions to verify return types
  const users: User[] | undefined = data?.users?.nodes;
  const totalCount: number | undefined = data?.users?.totalCount;
  const hasNextPage: boolean | undefined = data?.users?.pageInfo.hasNextPage;
  const hasPreviousPage: boolean | undefined =
    data?.users?.pageInfo.hasPreviousPage;
  const startCursor: string | null | undefined =
    data?.users?.pageInfo.startCursor;
  const endCursor: string | null | undefined = data?.users?.pageInfo.endCursor;

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Users ({totalCount})</h2>
      <ul>
        {users?.map((user) => (
          <li key={user.id}>
            {user.username} - {user.displayName}
          </li>
        ))}
      </ul>
      <button onClick={() => refetch()}>Refresh</button>
      <p>
        Page: {hasNextPage ? 'Has more' : 'Last page'} |{' '}
        {hasPreviousPage ? 'Has previous' : 'First page'}
      </p>
    </div>
  );
}

/**
 * Test: Single item query hook
 */
function UserDetailComponent({ userId }: { userId: string }) {
  const { data, isLoading, error } = useUserQuery({ id: userId });

  // Type assertion
  const user: User | null | undefined = data?.user;

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div>
      <h2>{user.username}</h2>
      <p>Display name: {user.displayName}</p>
      <p>Type: {user.type}</p>
      <p>Created: {user.createdAt}</p>
    </div>
  );
}

/**
 * Test: Custom query hook (currentUser)
 */
function CurrentUserComponent() {
  const { data, isLoading, error } = useCurrentUserQuery();

  const currentUser = data?.currentUser;

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!currentUser) return <div>Not logged in</div>;

  return (
    <div>
      <h2>Welcome, {currentUser.username}</h2>
      <p>ID: {currentUser.id}</p>
    </div>
  );
}

/**
 * Test: Create mutation hook
 */
function CreateUserForm() {
  const createMutation = useCreateUserMutation({
    onSuccess: (data) => {
      console.log('Created user:', data.createUser?.user?.id);
    },
    onError: (error) => {
      console.error('Failed to create user:', error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      input: {
        user: {
          username: 'newuser',
          displayName: 'New User',
        },
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <button type="submit" disabled={createMutation.isPending}>
        {createMutation.isPending ? 'Creating...' : 'Create User'}
      </button>
      {createMutation.isError && <p>Error: {createMutation.error.message}</p>}
      {createMutation.isSuccess && <p>User created!</p>}
    </form>
  );
}

/**
 * Test: Update mutation hook
 */
function UpdateUserForm({ userId }: { userId: string }) {
  const updateMutation = useUpdateUserMutation({
    onSuccess: (data) => {
      console.log('Updated user:', data.updateUser?.user?.username);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      input: {
        id: userId,
        patch: {
          displayName: 'Updated Display Name',
        },
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <button type="submit" disabled={updateMutation.isPending}>
        {updateMutation.isPending ? 'Updating...' : 'Update User'}
      </button>
    </form>
  );
}

/**
 * Test: Delete mutation hook
 */
function DeleteUserButton({ userId }: { userId: string }) {
  const deleteMutation = useDeleteUserMutation({
    onSuccess: () => {
      console.log('User deleted');
    },
  });

  return (
    <button
      onClick={() => deleteMutation.mutate({ input: { id: userId } })}
      disabled={deleteMutation.isPending}
    >
      {deleteMutation.isPending ? 'Deleting...' : 'Delete User'}
    </button>
  );
}

/**
 * Test: Auth mutations (signIn, signOut, signUp)
 */
function AuthComponent() {
  const signInMutation = useSignInMutation({
    onSuccess: (data) => {
      const token = data.signIn?.apiToken?.accessToken;
      if (token) {
        console.log('Signed in with token:', token);
      }
    },
  });

  const signOutMutation = useSignOutMutation({
    onSuccess: () => {
      console.log('Signed out');
    },
  });

  const signUpMutation = useSignUpMutation({
    onSuccess: (data) => {
      console.log('Signed up:', data.signUp?.apiToken?.accessToken);
    },
  });

  const handleSignIn = () => {
    signInMutation.mutate({
      input: {
        email: 'test@example.com',
        password: 'password123',
      },
    });
  };

  const handleSignOut = () => {
    signOutMutation.mutate({ input: {} });
  };

  const handleSignUp = () => {
    signUpMutation.mutate({
      input: {
        email: 'newuser@example.com',
        password: 'password123',
      },
    });
  };

  return (
    <div>
      <button onClick={handleSignIn} disabled={signInMutation.isPending}>
        Sign In
      </button>
      <button onClick={handleSignOut} disabled={signOutMutation.isPending}>
        Sign Out
      </button>
      <button onClick={handleSignUp} disabled={signUpMutation.isPending}>
        Sign Up
      </button>
    </div>
  );
}

/**
 * Test: Query keys and cache invalidation
 */
function CacheInvalidationTest() {
  // Test query key factories
  const usersKey = userKeys.list({ first: 10 });
  const userKey = userKeys.detail('123');
  const currentUserKey = customQueryKeys.currentUser();

  // Test centralized query keys
  const allUserKeys = queryKeys.user;
  const allDatabaseKeys = queryKeys.database;

  // Test invalidation helper
  const handleInvalidate = async () => {
    await invalidate.user.all(queryClient);
  };

  return (
    <div>
      <p>Users key: {JSON.stringify(usersKey)}</p>
      <p>User key: {JSON.stringify(userKey)}</p>
      <button onClick={handleInvalidate}>Invalidate Users Cache</button>
    </div>
  );
}

/**
 * Test: Prefetch and fetch functions
 */
async function testPrefetchAndFetch() {
  // Configure the client
  configure({
    endpoint: 'http://api.localhost:3000/graphql',
    headers: { Authorization: 'Bearer token' },
  });

  // Test fetch function (for SSR/server components)
  const users = await fetchUsersQuery({ first: 10 });
  console.log('Fetched users:', users.users?.nodes?.length);

  // Test prefetch function (for cache warming)
  await prefetchUsersQuery(queryClient, { first: 10 });
  console.log('Prefetched users query');
}

/**
 * Test: Relation queries with filters
 */
function RelationQueriesComponent() {
  const { data: dbData } = useDatabasesQuery({ first: 1 });
  const databaseId = dbData?.databases?.nodes?.[0]?.id;

  // Filter tables by database ID (foreign key filter)
  const tableFilter: TableFilter | undefined = databaseId
    ? { databaseId: { equalTo: databaseId } }
    : undefined;

  const { data: tablesData } = useTablesQuery(
    {
      first: 10,
      filter: tableFilter,
      orderBy: ['NAME_ASC'],
    },
    {
      enabled: !!databaseId,
    }
  );

  const tables: Table[] | undefined = tablesData?.tables?.nodes;

  return (
    <div>
      <h2>Tables in Database</h2>
      <ul>
        {tables?.map((table) => (
          <li key={table.id}>{table.name}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Main App component to wrap everything
 */
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div>
        <h1>React Query Hooks Test</h1>
        <CurrentUserComponent />
        <UsersListComponent />
        <UserDetailComponent userId="123" />
        <CreateUserForm />
        <UpdateUserForm userId="123" />
        <DeleteUserButton userId="123" />
        <AuthComponent />
        <CacheInvalidationTest />
        <RelationQueriesComponent />
      </div>
    </QueryClientProvider>
  );
}

export default App;
