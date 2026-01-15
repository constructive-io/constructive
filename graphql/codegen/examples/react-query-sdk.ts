/**
 * React Query SDK Example
 * Run: pnpm exec tsx examples/react-query-sdk.ts
 */
import {
  configure,
  setHeader,
  execute,
  executeWithErrors,
  GraphQLClientError,
} from './output/generated-sdk/client';
import {
  usersQueryDocument,
  type UsersQueryResult,
  type UsersQueryVariables,
} from './output/generated-sdk/queries/useUsersQuery';
import {
  userQueryDocument,
  type UserQueryResult,
  type UserQueryVariables,
} from './output/generated-sdk/queries/useUserQuery';
import {
  databasesQueryDocument,
  type DatabasesQueryResult,
  type DatabasesQueryVariables,
} from './output/generated-sdk/queries/useDatabasesQuery';
import {
  tablesQueryDocument,
  type TablesQueryResult,
  type TablesQueryVariables,
} from './output/generated-sdk/queries/useTablesQuery';
import {
  currentUserQueryDocument,
  type CurrentUserQueryResult,
} from './output/generated-sdk/queries/useCurrentUserQuery';
import {
  userByUsernameQueryDocument,
  type UserByUsernameQueryResult,
  type UserByUsernameQueryVariables,
} from './output/generated-sdk/queries/useUserByUsernameQuery';
import {
  signInMutationDocument,
  type SignInMutationResult,
  type SignInMutationVariables,
} from './output/generated-sdk/mutations/useSignInMutation';
import type {
  UserFilter,
  TableFilter,
} from './output/generated-sdk/schema-types';

const ENDPOINT = 'http://api.localhost:3000/graphql';
const section = (title: string) =>
  console.log(`\n${'─'.repeat(50)}\n${title}\n${'─'.repeat(50)}`);

async function main() {
  console.log('React Query SDK Demo\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Configuration
  // ─────────────────────────────────────────────────────────────────────────────
  section('1. Configuration');
  configure({
    endpoint: ENDPOINT,
    headers: { 'Content-Type': 'application/json' },
  });
  console.log('✓ Client configured');

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. SignIn Mutation
  // ─────────────────────────────────────────────────────────────────────────────
  section('2. SignIn Mutation');
  try {
    const signInResult = await execute<
      SignInMutationResult,
      SignInMutationVariables
    >(signInMutationDocument, {
      input: { email: 'admin@gmail.com', password: 'password1111!@#$' },
    });
    const token = signInResult.signIn?.apiToken?.accessToken;
    if (token) {
      // Use setHeader() to update auth without re-configuring
      setHeader('Authorization', `Bearer ${token}`);
      console.log('✓ Signed in, token:', token.slice(0, 30) + '...');
    }
  } catch (e) {
    if (e instanceof GraphQLClientError)
      console.log('SignIn failed:', e.errors[0]?.message);
    else throw e;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. List Query with Pagination
  // ─────────────────────────────────────────────────────────────────────────────
  section('3. List Query with Pagination');
  const { data, errors } = await executeWithErrors<
    UsersQueryResult,
    UsersQueryVariables
  >(usersQueryDocument, { first: 5, orderBy: ['USERNAME_ASC'] });
  console.log(
    'Users:',
    data?.users?.nodes?.map((u) => u.username)
  );
  console.log(
    'Total:',
    data?.users?.totalCount,
    '| HasNext:',
    data?.users?.pageInfo.hasNextPage
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. PostGraphile Filters
  // ─────────────────────────────────────────────────────────────────────────────
  section('4. PostGraphile Filters');

  // String filter
  const filter1: UserFilter = { username: { includesInsensitive: 'seed' } };
  const r1 = await executeWithErrors<UsersQueryResult, UsersQueryVariables>(
    usersQueryDocument,
    { first: 5, filter: filter1 }
  );
  console.log(
    'includesInsensitive "seed":',
    r1.data?.users?.nodes?.map((u) => u.username)
  );

  // AND/OR/NOT composition
  const filter2: UserFilter = {
    and: [
      { username: { isNull: false } },
      { or: [{ type: { equalTo: 0 } }, { type: { greaterThan: 5 } }] },
    ],
  };
  const r2 = await executeWithErrors<UsersQueryResult, UsersQueryVariables>(
    usersQueryDocument,
    { first: 5, filter: filter2 }
  );
  console.log(
    'AND/OR filter:',
    r2.data?.users?.nodes?.map((u) => ({ u: u.username, t: u.type }))
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Single Item & Unique Constraint Queries
  // ─────────────────────────────────────────────────────────────────────────────
  section('5. Single Item & Unique Constraint Queries');
  const userId = data?.users?.nodes?.[0]?.id;
  if (userId) {
    const { data: userData } = await executeWithErrors<
      UserQueryResult,
      UserQueryVariables
    >(userQueryDocument, { id: userId });
    console.log('User by ID:', userData?.user?.username);
  }

  const { data: byUsername } = await executeWithErrors<
    UserByUsernameQueryResult,
    UserByUsernameQueryVariables
  >(userByUsernameQueryDocument, { username: 'seeder' });
  console.log('User by username:', byUsername?.userByUsername?.displayName);

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. Custom Queries
  // ─────────────────────────────────────────────────────────────────────────────
  section('6. Custom Queries');
  const { data: currentUser } = await executeWithErrors<CurrentUserQueryResult>(
    currentUserQueryDocument
  );
  console.log('Current user:', currentUser?.currentUser?.username);

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. Relation Queries (Foreign Key Filter)
  // ─────────────────────────────────────────────────────────────────────────────
  section('7. Relation Queries');
  const { data: dbData } = await executeWithErrors<
    DatabasesQueryResult,
    DatabasesQueryVariables
  >(databasesQueryDocument, { first: 1 });
  const databaseId = dbData?.databases?.nodes?.[0]?.id;
  if (databaseId) {
    const tableFilter: TableFilter = { databaseId: { equalTo: databaseId } };
    const { data: tablesData } = await executeWithErrors<
      TablesQueryResult,
      TablesQueryVariables
    >(tablesQueryDocument, {
      first: 10,
      filter: tableFilter,
      orderBy: ['NAME_ASC'],
    });
    console.log(
      'Tables in DB:',
      tablesData?.tables?.nodes?.map((t) => t.name)
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. Error Handling
  // ─────────────────────────────────────────────────────────────────────────────
  section('8. Error Handling');

  // executeWithErrors - graceful, returns { data, errors }
  const { data: d1, errors: e1 } = await executeWithErrors<
    UserQueryResult,
    UserQueryVariables
  >(userQueryDocument, { id: '00000000-0000-0000-0000-000000000000' });
  console.log(
    'executeWithErrors:',
    d1?.user ?? 'null',
    '| errors:',
    e1?.[0]?.message ?? 'none'
  );

  // execute - throws on error
  try {
    await execute<SignInMutationResult, SignInMutationVariables>(
      signInMutationDocument,
      { input: { email: 'invalid@x.com', password: 'wrong' } }
    );
  } catch (e) {
    if (e instanceof GraphQLClientError)
      console.log('execute() caught:', e.message);
  }

  console.log('\n✓ All demos completed!');
}

main().catch((e) => {
  console.error('Failed:', e);
  process.exit(1);
});
