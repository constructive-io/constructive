/**
 * Test script for React Query mode (non-React manual usage).
 *
 * This file demonstrates the NEW convenience helpers that eliminate manual generic assembly.
 * Run with: pnpm -C packages/graphql-sdk exec tsx examples/test-rq.ts
 */

import { QueryClient } from '@tanstack/react-query';
import { configure } from '../output-rq/client';

// NEW: Import the standalone fetch functions - no generics needed!
import {
  fetchUsersQuery,
  prefetchUsersQuery,
  usersQueryKey,
} from '../output-rq/queries/useUsersQuery';
import { fetchCurrentUserQuery } from '../output-rq/queries/useCurrentUserQuery';
import { fetchProductsQuery } from '../output-rq/queries/useProductsQuery';
import { fetchCategoriesQuery } from '../output-rq/queries/useCategoriesQuery';

import { DB_GRAPHQL_ENDPOINT, SEED_USER, login } from './test.config';

const queryClient = new QueryClient();

// ============================================================================
// Test Functions - Demonstrating NEW DX
// ============================================================================

async function testFetchUsers() {
  console.log('========================================');
  console.log('NEW DX: fetchUsersQuery (no generics!)');
  console.log('========================================');

  // OLD WAY (verbose, requires generics):
  // const data = await execute<UsersQueryResult, UsersQueryVariables>(
  //   usersQueryDocument,
  //   { first: 5, orderBy: ['CREATED_AT_DESC'] }
  // );

  // NEW WAY (clean, type-safe, no generics needed):
  const data = await fetchUsersQuery({
    first: 5,
    orderBy: ['CREATED_AT_DESC'],
  });

  console.log('Total users:', data.users.totalCount);
  console.log(
    'First user:',
    data.users.nodes[0]
      ? { id: data.users.nodes[0].id, username: data.users.nodes[0].username }
      : 'none'
  );
}

async function testPrefetchUsers() {
  console.log('========================================');
  console.log('NEW DX: prefetchUsersQuery (SSR-ready)');
  console.log('========================================');

  // Prefetch for SSR or cache warming - also no generics!
  await prefetchUsersQuery(queryClient, { first: 10 });

  // Data is now in cache, can access via query key
  const cachedData = queryClient.getQueryData(usersQueryKey({ first: 10 }));
  console.log('Prefetched and cached:', cachedData ? 'yes' : 'no');
}

async function testFetchCurrentUser() {
  console.log('========================================');
  console.log('NEW DX: fetchCurrentUserQuery');
  console.log('========================================');

  try {
    const data = await fetchCurrentUserQuery();

    if (data.currentUser) {
      console.log('Current user:', {
        id: data.currentUser.id,
        username: data.currentUser.username,
        displayName: data.currentUser.displayName,
      });
    } else {
      console.log('Current user: Not logged in (null)');
    }
  } catch (error) {
    // Some schemas may not have full currentUser permissions
    console.log(
      'currentUser query failed (permission issue):',
      error instanceof Error ? error.message : error
    );
  }
}

async function testFetchProducts() {
  console.log('========================================');
  console.log('NEW DX: fetchProductsQuery');
  console.log('========================================');

  const data = await fetchProductsQuery({
    first: 5,
    orderBy: ['NAME_ASC'],
  });

  console.log('Total products:', data.products.totalCount);
  console.log(
    'Products:',
    data.products.nodes.slice(0, 3).map((p) => ({ name: p.name, price: p.price }))
  );
}

async function testFetchCategories() {
  console.log('========================================');
  console.log('NEW DX: fetchCategoriesQuery');
  console.log('========================================');

  const data = await fetchCategoriesQuery({ first: 10 });

  console.log('Total categories:', data.categories.totalCount);
  console.log(
    'Categories:',
    data.categories.nodes.map((c) => c.name)
  );
}

async function testWithQueryClient() {
  console.log('========================================');
  console.log('With QueryClient.fetchQuery');
  console.log('========================================');

  // Can still use QueryClient if needed - helpers work great with it too
  const data = await queryClient.fetchQuery({
    queryKey: usersQueryKey({ first: 1 }),
    queryFn: () => fetchUsersQuery({ first: 1 }),
  });

  console.log(
    'QueryClient result:',
    data.users.nodes[0]
      ? { id: data.users.nodes[0].id }
      : 'none'
  );
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('========================================');
  console.log('React Query Test Script - NEW DX Demo');
  console.log(`Endpoint: ${DB_GRAPHQL_ENDPOINT}`);
  console.log('========================================\n');

  // Configure client with endpoint
  configure({ endpoint: DB_GRAPHQL_ENDPOINT });

  // Login to get auth token
  console.log('Logging in...');
  try {
    const token = await login(DB_GRAPHQL_ENDPOINT, SEED_USER);
    console.log('Login successful, token obtained\n');

    // Reconfigure with auth header
    configure({
      endpoint: DB_GRAPHQL_ENDPOINT,
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    console.warn(
      'Login failed (continuing without auth):',
      error instanceof Error ? error.message : error
    );
    console.log('');
  }

  // Run tests demonstrating NEW DX
  await testFetchUsers();
  console.log('');

  await testPrefetchUsers();
  console.log('');

  await testFetchCurrentUser();
  console.log('');

  await testFetchProducts();
  console.log('');

  await testFetchCategories();
  console.log('');

  await testWithQueryClient();
  console.log('');

  console.log('========================================');
  console.log('All tests completed!');
  console.log('');
  console.log('KEY IMPROVEMENT:');
  console.log('  Before: execute<UsersQueryResult, UsersQueryVariables>(usersQueryDocument, vars)');
  console.log('  After:  fetchUsersQuery(vars)');
  console.log('========================================');
}

main().catch((error) => {
  console.error('test-rq failed:', error);
  process.exit(1);
});
