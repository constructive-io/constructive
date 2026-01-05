/**
 * Test script for ORM client.
 *
 * This file exercises the ORM client with TypeScript autocomplete.
 * Run with: pnpm -C packages/graphql-sdk exec tsx examples/test-orm.ts
 */

import { createClient, GraphQLRequestError } from '../output-orm';
import { DB_GRAPHQL_ENDPOINT, SEED_USER, login } from './test.config';

// Create client instance (will be reconfigured after login)
let db = createClient({ endpoint: DB_GRAPHQL_ENDPOINT });

// ============================================================================
// Test Functions
// ============================================================================

async function testLogin() {
  console.log('========================================');
  console.log('ORM: Login mutation test');
  console.log('========================================');

  const loginQuery = db.mutation.login(
    { input: { email: SEED_USER.email, password: SEED_USER.password } },
    {
      select: {
        apiToken: {
          select: {
            totpEnabled: true,
            accessToken: true,
            expiresAt: true,
          }
        }
      },
    }
  );

  console.log('Generated mutation:');
  console.log(loginQuery.toGraphQL());

  const result = await loginQuery.execute();

  if (result.errors) {
    console.log('Login errors:', result.errors);
    return null;
  }

  const token = result.data?.login?.apiToken?.accessToken;
  console.log('Login success, token:', token ? `${token.slice(0, 20)}...` : 'null');
  return token;
}

async function testUsers() {
  console.log('========================================');
  console.log('ORM: Users findMany');
  console.log('========================================');

  const result = await db.user
    .findMany({
      select: { id: true, username: true, displayName: true },
      first: 5,
    })
    .execute();

  if (result.errors) {
    console.log('Users errors:', result.errors);
  } else {
    console.log('Total users:', result.data?.users?.totalCount ?? 0);
    console.log(
      'Users:',
      result.data?.users?.nodes?.map((u) => ({
        username: u.username,
        displayName: u.displayName,
      })) ?? []
    );
  }
}

async function testProducts() {
  console.log('========================================');
  console.log('ORM: Products findMany');
  console.log('========================================');

  const result = await db.product
    .findMany({
      select: { id: true, name: true, price: true },
      first: 5,
    })
    .execute();

  if (result.errors) {
    console.log('Products errors:', result.errors);
  } else {
    console.log('Total products:', result.data?.products?.totalCount ?? 0);
    console.log(
      'Products:',
      result.data?.products?.nodes?.slice(0, 3).map((p) => ({
        name: p.name,
        price: p.price,
      })) ?? []
    );
  }
}

async function testCategories() {
  console.log('========================================');
  console.log('ORM: Categories findMany');
  console.log('========================================');

  const result = await db.category
    .findMany({
      select: { id: true, name: true, slug: true },
      first: 10,
    })
    .execute();

  if (result.errors) {
    console.log('Categories errors:', result.errors);
  } else {
    console.log('Total categories:', result.data?.categories?.totalCount ?? 0);
    console.log(
      'Categories:',
      result.data?.categories?.nodes?.map((c) => c.name) ?? []
    );
  }
}

async function testCurrentUser() {
  console.log('========================================');
  console.log('ORM: currentUser query');
  console.log('========================================');

  const result = await db.query
    .currentUser({
      select: { id: true, username: true, displayName: true },
    })
    .execute();

  if (result.errors) {
    console.log('currentUser errors:', result.errors);
  } else if (result.data?.currentUser) {
    console.log('Current user:', {
      id: result.data.currentUser.id,
      username: result.data.currentUser.username,
      displayName: result.data.currentUser.displayName,
    });
  } else {
    console.log('Current user: Not logged in (null)');
  }
}

async function testRelations() {
  console.log('========================================');
  console.log('ORM: Relations selection');
  console.log('========================================');

  const ordersQuery = db.order.findMany({
    select: {
      id: true,
      orderNumber: true,
      status: true,
      // belongsTo relation
      customer: {
        select: { id: true, username: true },
      },
      // hasMany relation
      orderItems: {
        select: { id: true, quantity: true },
        first: 3,
      },
    },
    first: 2,
  });

  console.log('Generated query:');
  console.log(ordersQuery.toGraphQL());

  const result = await ordersQuery.execute();

  if (result.errors) {
    console.log('Orders errors:', result.errors);
  } else {
    console.log(
      'Orders:',
      JSON.stringify(result.data?.orders?.nodes ?? [], null, 2)
    );
  }
}

async function testTypeInference() {
  console.log('========================================');
  console.log('ORM: Type inference');
  console.log('========================================');

  const result = await db.user
    .findMany({
      select: { id: true, username: true }, // Only these fields
    })
    .execute();

  if (result.data?.users?.nodes?.[0]) {
    const user = result.data.users.nodes[0];
    // TypeScript narrows type to only selected fields
    console.log('User ID:', user.id);
    console.log('Username:', user.username);
    // user.displayName would be a TypeScript error (not selected)
  }
}

async function testErrorHandling() {
  console.log('========================================');
  console.log('ORM: Error handling');
  console.log('========================================');

  // Test discriminated union
  const result = await db.user
    .findMany({ select: { id: true }, first: 1 })
    .execute();

  if (result.ok) {
    console.log('Success (ok=true):', result.data.users?.nodes?.length, 'users');
  } else {
    console.log('Error (ok=false):', result.errors[0]?.message);
  }

  // Test unwrap
  try {
    const data = await db.product
      .findMany({ select: { id: true }, first: 1 })
      .unwrap();
    console.log('unwrap() success:', data.products?.nodes?.length, 'products');
  } catch (error) {
    if (error instanceof GraphQLRequestError) {
      console.log('unwrap() caught:', error.message);
    } else {
      throw error;
    }
  }

  // Test unwrapOr
  const dataOrDefault = await db.category
    .findMany({ select: { id: true }, first: 1 })
    .unwrapOr({
      categories: {
        nodes: [],
        totalCount: 0,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      },
    });
  console.log(
    'unwrapOr() result:',
    dataOrDefault.categories?.nodes?.length ?? 0,
    'categories'
  );
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('========================================');
  console.log('ORM Client Test Script');
  console.log(`Endpoint: ${DB_GRAPHQL_ENDPOINT}`);
  console.log('========================================\n');

  // Step 1: Login using shared config helper
  console.log('Logging in via config helper...');
  try {
    const token = await login(DB_GRAPHQL_ENDPOINT, SEED_USER);
    console.log('Login successful\n');

    // Reconfigure client with auth
    db = createClient({
      endpoint: DB_GRAPHQL_ENDPOINT,
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    console.warn(
      'Config login failed, trying ORM login:',
      error instanceof Error ? error.message : error
    );

    // Fallback: try ORM login mutation
    const ormToken = await testLogin();
    if (ormToken) {
      db = createClient({
        endpoint: DB_GRAPHQL_ENDPOINT,
        headers: { Authorization: `Bearer ${ormToken}` },
      });
    }
    console.log('');
  }

  // Step 2: Run tests
  await testUsers();
  console.log('');

  await testCurrentUser();
  console.log('');

  await testProducts();
  console.log('');

  await testCategories();
  console.log('');

  await testRelations();
  console.log('');

  await testTypeInference();
  console.log('');

  await testErrorHandling();
  console.log('');

  console.log('========================================');
  console.log('All tests completed');
  console.log('========================================');
}

main().catch((error) => {
  console.error('test-orm failed:', error);
  process.exit(1);
});
