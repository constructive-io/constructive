/**
 * ORM SDK Example - Prisma-like API for GraphQL
 * Run: pnpm exec tsx examples/orm-sdk.ts
 */
import { createClient, GraphQLRequestError } from './output/generated-orm-public';

const ENDPOINT = 'http://api.localhost:3000/graphql';
let db = createClient({ endpoint: ENDPOINT });

const section = (title: string) =>
  console.log(`\n${'─'.repeat(50)}\n${title}\n${'─'.repeat(50)}`);

async function main() {
  console.log('ORM SDK Demo\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. SignIn & Auth
  // ─────────────────────────────────────────────────────────────────────────────
  section('1. SignIn Mutation');
  const signInResult = await db.mutation
    .signIn(
      { input: { email: 'admin@gmail.com', password: 'password1111!@#$' } },
      { select: { apiToken: { select: {
        accessToken: true,
        accessTokenExpiresAt: true,
        id: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
      }}}}
    )
    .execute();

  const token = signInResult.data?.signIn?.apiToken?.accessToken;
  if (token) {
    db = createClient({
      endpoint: ENDPOINT,
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('✓ Signed in, token:', token.slice(0, 30) + '...');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. findMany with pagination & ordering
  // ─────────────────────────────────────────────────────────────────────────────
  section('2. findMany - List with Pagination');
  const users = await db.user
    .findMany({
      select: { id: true, username: true, displayName: true },
      first: 3,
      orderBy: ['USERNAME_ASC'],
      where: {
        username: { notStartsWithInsensitive: 'admin' },
      },
    })
    .execute();
  console.log(
    'Users:',
    users.data?.users?.nodes?.map((u) => u.username)
  );
  console.log(
    'Total:',
    users.data?.users?.totalCount,
    '| HasNext:',
    users.data?.users?.pageInfo.hasNextPage
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Complex Filters (PostGraphile Filter Plugin)
  // ─────────────────────────────────────────────────────────────────────────────
  section('3. PostGraphile Filters');

  // String filters
  const stringFilters = await db.user
    .findMany({
      select: { id: true, username: true },
      first: 10,
      where: { username: { includesInsensitive: 'seed' } },
    })
    .execute();
  console.log(
    'includesInsensitive "seed":',
    stringFilters.data?.users?.nodes?.map((u) => u.username)
  );

  // AND/OR/NOT composition
  const composed = await db.user
    .findMany({
      select: { id: true, username: true, type: true },
      first: 5,
      where: {
        and: [
          { username: { isNull: false } },
          { or: [{ type: { equalTo: 0 } }, { type: { greaterThan: 5 } }] },
        ],
      },
    })
    .execute();
  console.log(
    'AND/OR filter:',
    composed.data?.users?.nodes?.map((u) => ({ u: u.username, t: u.type }))
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Relation Selection (Nested Objects)
  // ─────────────────────────────────────────────────────────────────────────────
  section('4. Relations & Nested Selection');
  const tables = await db.table
    .findMany({
      select: {
        name: true,
        category: true,
        database: { select: { schemaName: true } },
      },
      first: 3,
      orderBy: ['NAME_ASC'],
    })
    .execute();
  console.log(
    'Tables with DB:',
    tables.data?.tables?.nodes?.map(
      (t) => `${t.name} (${t.database?.schemaName})`
    )
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Foreign Key & Datetime Filters
  // ─────────────────────────────────────────────────────────────────────────────
  section('5. Foreign Key & Datetime Filters');
  const dbId = tables.data?.tables?.nodes?.[0]?.database?.schemaName;
  if (dbId) {
    const dbResult = await db.database
      .findMany({
        select: { id: true },
        first: 1,
        where: { schemaName: { equalTo: dbId } },
      })
      .execute();
    const databaseId = dbResult.data?.databases?.nodes?.[0]?.id;
    if (databaseId) {
      const filtered = await db.table
        .findMany({
          select: { name: true },
          first: 5,
          where: { databaseId: { equalTo: databaseId } },
        })
        .execute();
      console.log(
        'Tables in DB:',
        filtered.data?.tables?.nodes?.map((t) => t.name)
      );
    }
  }

  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();
  const recentDbs = await db.database
    .findMany({
      select: { schemaName: true, createdAt: true },
      first: 3,
      where: { createdAt: { greaterThan: thirtyDaysAgo } },
      orderBy: ['CREATED_AT_DESC'],
    })
    .execute();
  console.log(
    'Recent DBs:',
    recentDbs.data?.databases?.nodes?.map((d) => d.schemaName)
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. Custom Queries
  // ─────────────────────────────────────────────────────────────────────────────
  section('6. Custom Queries');
  const currentUser = await db.query
    .currentUser({
      select: { id: true, username: true, displayName: true },
    })
    .execute();
  console.log('Current user:', currentUser.data?.currentUser?.username);

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. Error Handling: execute(), unwrap(), unwrapOr()
  // ─────────────────────────────────────────────────────────────────────────────
  section('7. Error Handling');

  // execute() - discriminated union { ok, data, errors }
  const result = await db.user
    .findMany({ select: { id: true }, first: 1 })
    .execute();
  console.log(
    'execute():',
    result.ok
      ? `ok, ${result.data.users?.nodes?.length} users`
      : `error: ${result.errors[0]?.message}`
  );

  // unwrap() - throws on error
  try {
    const data = await db.database
      .findMany({ select: { id: true }, first: 1 })
      .unwrap();
    console.log('unwrap():', data.databases?.nodes?.length, 'databases');
  } catch (e) {
    if (e instanceof GraphQLRequestError)
      console.log('unwrap() error:', e.message);
  }

  // unwrapOr() - returns default on error
  const defaultData = {
    users: {
      nodes: [] as { id: string }[],
      totalCount: 0,
      pageInfo: { hasNextPage: false, hasPreviousPage: false },
    },
  };
  const safeData = await db.user
    .findMany({ select: { id: true }, first: 1 })
    .unwrapOr(defaultData);
  console.log('unwrapOr():', safeData.users?.nodes?.length ?? 0, 'users');

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. toGraphQL() - Inspect generated queries
  // ─────────────────────────────────────────────────────────────────────────────
  section('8. toGraphQL() - Query Inspection');
  const query = db.user.findMany({
    select: {
      id: true,
      username: true,
      roleTypeByType: { select: { name: true } },
    },
    first: 5,
    where: { username: { isNull: false } },
    orderBy: ['USERNAME_ASC'],
  });
  console.log('Generated GraphQL:\n', query.toGraphQL());

  console.log('\n✓ All demos completed!');
}

main().catch((e) => {
  console.error('Failed:', e);
  process.exit(1);
});
