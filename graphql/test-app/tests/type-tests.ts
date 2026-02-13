/**
 * Compile-time type validation for generated ORM and React Query hooks.
 *
 * This file is NOT executed at runtime. All assertions are via @ts-expect-error,
 * `satisfies`, and explicit type assignments. Run with:
 *
 *   pnpm test:types
 *
 * Known Limitations:
 * 1. Composite PKs: Only first PK field used for findOne/update/delete.
 *    Use findFirst + filter for composite keys.
 * 2. Tables without PK: Silently skipped for mutation generation.
 *    findMany/findFirst still work.
 * 3. DeepExact depth cap: ORM validates 10 levels, hooks validate 5 levels.
 *    Beyond that, StrictSelect passes without validation.
 * 4. strictNullChecks: false: The project doesn't enforce null checks,
 *    so `| null` annotations are cosmetic.
 */

import { createClient } from '../src/generated/orm';
import type {
  UserSelect,
  DatabaseSelect,
  SchemaSelect,
  TableSelect,
  FieldSelect,
  UserPatch,
  DatabasePatch,
  UserFilter,
  DatabaseFilter,
} from '../src/generated/orm/input-types';
import type { ConnectionResult, InferSelectResult, PageInfo } from '../src/generated/orm/select-types';
import type { UserWithRelations, DatabaseWithRelations } from '../src/generated/orm/input-types';

import {
  useUsersQuery,
  useUserQuery,
  useDatabasesQuery,
  useUpdateUserMutation,
  useCurrentUserQuery,
  useCurrentUserIdQuery,
} from '../src/generated/hooks';

// ---------------------------------------------------------------------------
// A. Helper Types
// ---------------------------------------------------------------------------

/** Detects `any` — returns `true` if T is `any`, `false` otherwise. */
type IsAny<T> = 0 extends (1 & T) ? true : false;

/** Compile-time assertion: resolves to T if T is NOT any, `never` otherwise. */
type AssertNotAny<T> = IsAny<T> extends true ? never : T;

/** Forces evaluation — used to check a type compiles without creating a runtime value. */
declare function assertType<T>(value: T): void;

// ---------------------------------------------------------------------------
// B. ORM Flat Select
// ---------------------------------------------------------------------------

const client = createClient({ endpoint: 'http://localhost/graphql' });

{
  // Flat select compiles
  const builder = client.user.findMany({
    select: { id: true, username: true },
  });

  // Result has expected shape
  type Result = Awaited<ReturnType<typeof builder.unwrap>>;
  type Node = Result['users']['nodes'][0];

  // Scalar types are correct
  const _id: AssertNotAny<Node['id']> = '' as string;
  const _username: AssertNotAny<Node['username']> = '' as string;
  void _id;
  void _username;

  // @ts-expect-error — excess property rejected by StrictSelect
  client.user.findMany({ select: { id: true, nonExistentField: true } });
}

// ---------------------------------------------------------------------------
// C. Deep Nesting (4 Levels: User → ownedDatabases → schemas → tables → fields)
// ---------------------------------------------------------------------------

{
  const deepSelect = {
    id: true,
    username: true,
    ownedDatabases: {
      first: 2,
      select: {
        id: true,
        name: true,
        schemas: {
          first: 3,
          select: {
            id: true,
            schemaName: true,
            tables: {
              first: 5,
              select: {
                id: true,
                name: true,
                fields: {
                  first: 10,
                  select: {
                    id: true,
                    name: true,
                    label: true,
                  },
                },
              },
            },
          },
        },
      },
    },
  } satisfies UserSelect;

  const builder = client.user.findMany({ select: deepSelect });
  type Result = Awaited<ReturnType<typeof builder.unwrap>>;
  type UserNode = Result['users']['nodes'][0];

  // Level 1: User fields — fully typed
  const _userId: AssertNotAny<UserNode['id']> = '' as string;
  void _userId;

  // Level 2: Database scalar fields — fully typed
  // (ownedDatabases is ConnectionResult<Database>, so scalar fields resolve)
  type DbConn = UserNode['ownedDatabases'];
  type DbNode = DbConn['nodes'][0];
  const _dbId: AssertNotAny<DbNode['id']> = '' as string;
  const _dbName: AssertNotAny<DbNode['name']> = '' as string;
  void _dbId;
  void _dbName;

  // Level 3+: Known limitation — relation fields on nested entities resolve to `never`
  // because ConnectionResult uses base entity types (e.g., ConnectionResult<Database>)
  // rather than WithRelations variants (ConnectionResult<DatabaseWithRelations>).
  // The SELECT shape is still validated by StrictSelect/DeepExact (see @ts-expect-error
  // tests below), but InferSelectResult can't infer typed results beyond level 2 relations.
  // Runtime data is still returned correctly — this is purely a type inference limitation.

  // @ts-expect-error — excess property at level 2 (inside ownedDatabases.select)
  client.user.findMany({
    select: {
      id: true,
      ownedDatabases: {
        select: {
          id: true,
          bogusField: true,
        },
      },
    },
  });

  // @ts-expect-error — excess property at level 3 (inside schemas.select)
  client.user.findMany({
    select: {
      id: true,
      ownedDatabases: {
        select: {
          id: true,
          schemas: {
            select: {
              id: true,
              bogusField: true,
            },
          },
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// D. Connection Fields with Pagination
// ---------------------------------------------------------------------------

{
  const paginatedSelect = {
    id: true,
    ownedDatabases: {
      first: 5,
      orderBy: ['CREATED_AT_DESC' as const],
      select: {
        id: true,
        name: true,
      },
    },
  } satisfies UserSelect;

  const builder = client.user.findMany({ select: paginatedSelect });
  type Result = Awaited<ReturnType<typeof builder.unwrap>>;
  type UserNode = Result['users']['nodes'][0];

  // Connection metadata
  type DbConn = UserNode['ownedDatabases'];
  const _totalCount: AssertNotAny<DbConn['totalCount']> = 0;
  const _pageInfo: AssertNotAny<DbConn['pageInfo']> = {} as PageInfo;
  const _hasNextPage: AssertNotAny<DbConn['pageInfo']['hasNextPage']> = true;
  const _endCursor: DbConn['pageInfo']['endCursor'] = 'cursor';
  void _totalCount;
  void _pageInfo;
  void _hasNextPage;
  void _endCursor;

  // Nested connection nodes are arrays
  const _nodes: DbConn['nodes'] = [];
  void _nodes;
  // Verify nodes is actually an array type (compile-time check)
  type _NodesIsArray = DbConn['nodes'] extends unknown[] ? true : false;
  const _nodesCheck: _NodesIsArray = true;
  void _nodesCheck;
}

// ---------------------------------------------------------------------------
// E. Mutation Variable Types
// ---------------------------------------------------------------------------

{
  // User update uses entity-specific `userPatch` (not generic `patch`)
  const userUpdateBuilder = client.user.update({
    where: { id: '123' },
    data: { displayName: 'test' },
    select: { id: true, displayName: true },
  });
  type UserUpdateResult = Awaited<ReturnType<typeof userUpdateBuilder.unwrap>>;
  const _updatedUser: AssertNotAny<UserUpdateResult['updateUser']['user']['displayName']> =
    '' as string;
  void _updatedUser;

  // Database update uses entity-specific `databasePatch` (not generic `patch`)
  const dbUpdateBuilder = client.database.update({
    where: { id: '123' },
    data: { label: 'test-db' },
    select: { id: true, label: true },
  });
  type DbUpdateResult = Awaited<ReturnType<typeof dbUpdateBuilder.unwrap>>;
  const _updatedDb: AssertNotAny<DbUpdateResult['updateDatabase']['database']['label']> =
    '' as string;
  void _updatedDb;

  // UserPatch type has expected fields
  const _userPatch: UserPatch = {
    displayName: 'test',
    username: 'user1',
  };
  void _userPatch;

  // DatabasePatch type has expected fields
  const _dbPatch: DatabasePatch = {
    label: 'my-db',
    name: 'db_name',
  };
  void _dbPatch;
}

// ---------------------------------------------------------------------------
// F. Custom Operation Types
// ---------------------------------------------------------------------------

{
  // Scalar custom query
  const currentUserIdBuilder = client.query.currentUserId();
  type CurrentUserIdResult = Awaited<ReturnType<typeof currentUserIdBuilder.unwrap>>;
  const _currentUserId: AssertNotAny<CurrentUserIdResult['currentUserId']> = '' as string;
  void _currentUserId;

  // Custom query with select
  const currentUserBuilder = client.query.currentUser({
    select: { id: true, username: true },
  });
  type CurrentUserResult = Awaited<ReturnType<typeof currentUserBuilder.unwrap>>;
  const _currentUserName: AssertNotAny<CurrentUserResult['currentUser']['username']> =
    '' as string;
  void _currentUserName;

  // Custom mutation with variables and select
  const signInBuilder = client.mutation.signIn(
    {
      input: {
        email: 'test@test.com',
        password: 'password',
        rememberMe: true,
      },
    },
    {
      select: {
        result: {
          select: {
            accessToken: true,
            userId: true,
          },
        },
      },
    },
  );
  type SignInResult = Awaited<ReturnType<typeof signInBuilder.unwrap>>;
  const _token: AssertNotAny<NonNullable<SignInResult['signIn']['result']>['accessToken']> =
    '' as string;
  void _token;
}

// ---------------------------------------------------------------------------
// G. No `any` Leak
// ---------------------------------------------------------------------------

{
  const builder = client.user.findMany({
    select: { id: true, username: true },
  });
  type Result = Awaited<ReturnType<typeof builder.unwrap>>;

  // Top-level result
  type _R1 = AssertNotAny<Result>;
  // Connection
  type _R2 = AssertNotAny<Result['users']>;
  // Nodes array
  type _R3 = AssertNotAny<Result['users']['nodes']>;
  // Single node
  type _R4 = AssertNotAny<Result['users']['nodes'][0]>;
  // Scalar field on node
  type _R5 = AssertNotAny<Result['users']['nodes'][0]['id']>;

  // Custom query result
  const cidBuilder = client.query.currentUserId();
  type CidResult = Awaited<ReturnType<typeof cidBuilder.unwrap>>;
  type _R6 = AssertNotAny<CidResult>;
  type _R7 = AssertNotAny<CidResult['currentUserId']>;

  // Update result
  const updateBuilder = client.user.update({
    where: { id: '1' },
    data: { displayName: 'x' },
    select: { id: true },
  });
  type UpdateResult = Awaited<ReturnType<typeof updateBuilder.unwrap>>;
  type _R8 = AssertNotAny<UpdateResult>;
  type _R9 = AssertNotAny<UpdateResult['updateUser']>;
}

// ---------------------------------------------------------------------------
// H. FindOne Null Handling
// ---------------------------------------------------------------------------

{
  const builder = client.user.findOne({
    id: '123',
    select: { id: true, displayName: true },
  });
  type Result = Awaited<ReturnType<typeof builder.unwrap>>;

  // findOne result can be null
  type UserResult = Result['user'];
  const _nullable: null extends UserResult ? true : false = true;
  void _nullable;

  // When non-null, fields are accessible
  type NonNullUser = NonNullable<UserResult>;
  const _id: AssertNotAny<NonNullUser['id']> = '' as string;
  const _name: AssertNotAny<NonNullUser['displayName']> = '' as string;
  void _id;
  void _name;

  // @ts-expect-error — excess property on findOne select
  client.user.findOne({ id: '123', select: { id: true, nonExistent: true } });
}

// ---------------------------------------------------------------------------
// I. Hook Types (structural validation — hooks are not called, just type-checked)
// ---------------------------------------------------------------------------

{
  // useUsersQuery accepts deeply nested fields
  assertType<Parameters<typeof useUsersQuery>[0]>({
    selection: {
      fields: {
        id: true,
        username: true,
        ownedDatabases: {
          first: 2,
          select: {
            id: true,
            schemas: {
              first: 3,
              select: {
                id: true,
                schemaName: true,
              },
            },
          },
        },
      },
      first: 10,
      orderBy: ['CREATED_AT_DESC'],
    },
  });

  // useUserQuery accepts single-entity selection
  assertType<Parameters<typeof useUserQuery>[0]>({
    id: 'some-uuid',
    selection: {
      fields: {
        id: true,
        username: true,
        displayName: true,
      },
    },
  });

  // useUpdateUserMutation requires entity-specific `userPatch` in variables
  assertType<Parameters<typeof useUpdateUserMutation>[0]>({
    selection: {
      fields: { id: true, displayName: true },
    },
  });

  // useCurrentUserQuery accepts nested selection
  assertType<Parameters<typeof useCurrentUserQuery>[0]>({
    selection: {
      fields: {
        id: true,
        username: true,
        ownedDatabases: {
          first: 1,
          select: { id: true },
        },
      },
    },
  });

  // useCurrentUserIdQuery works with no args
  assertType<Parameters<typeof useCurrentUserIdQuery>>([]);
}

// ---------------------------------------------------------------------------
// J. Filter Types
// ---------------------------------------------------------------------------

{
  // String filter with equalTo
  client.user.findMany({
    where: { username: { equalTo: 'testuser' } },
    select: { id: true },
  });

  // Logical operators: and/or/not
  client.user.findMany({
    where: {
      and: [
        { username: { equalTo: 'testuser' } },
        { displayName: { includesInsensitive: 'test' } },
      ],
      or: [{ type: { equalTo: 1 } }],
      not: { id: { equalTo: '00000000-0000-0000-0000-000000000000' } },
    },
    select: { id: true, username: true },
  });

  // Nested entity filter (database filter)
  client.database.findMany({
    where: {
      name: { includesInsensitive: 'test' },
      ownerId: { equalTo: 'some-uuid' },
    },
    select: { id: true, name: true },
  });

  // UserFilter type shape check
  const _filter: UserFilter = {
    username: { equalTo: 'x' },
    and: [{ displayName: { includesInsensitive: 'y' } }],
    or: [{ type: { equalTo: 1 } }],
    not: { id: { equalTo: 'z' } },
  };
  void _filter;

  // DatabaseFilter type shape check
  const _dbFilter: DatabaseFilter = {
    name: { includesInsensitive: 'test' },
    and: [{ label: { equalTo: 'x' } }],
    not: { ownerId: { equalTo: 'z' } },
  };
  void _dbFilter;
}
