/**
 * Type inference verification test
 * 
 * This file verifies that Select types with relations have proper type inference.
 * Run: npx tsc --noEmit examples/type-inference-test.ts
 */
import { createClient } from '../output-orm';
import type { OrderSelect, ProductSelect, UserSelect } from '../output-orm/input-types';

const db = createClient({ endpoint: 'http://public-0e394519.localhost:3000/graphql' });

// ============================================================================
// TYPE VERIFICATION SECTION
// These type aliases are for verifying the structure is correct
// ============================================================================

// Verify OrderSelect has relation fields with proper typing
type OrderSelectKeys = keyof OrderSelect;
type TestBelongsTo = OrderSelect['customer']; // boolean | { select?: UserSelect }
type TestHasMany = OrderSelect['orderItems'];  // boolean | { select?: OrderItemSelect; first?: number; ... }

// Verify ProductSelect has relation fields
type ProductSelectKeys = keyof ProductSelect;
type TestProductSeller = ProductSelect['seller']; // boolean | { select?: UserSelect }
type TestProductCategory = ProductSelect['category']; // boolean | { select?: CategorySelect }

// ============================================================================
// COMPILE-TIME TEST SECTION
// If these functions compile without errors, the types are correct
// ============================================================================

async function testBelongsToRelation() {
  // Test belongsTo relation: Order.customer -> User
  const orders = await db.order.findMany({
    select: {
      id: true,
      orderNumber: true,
      status: true,
      // belongsTo: nested select should accept UserSelect fields
      customer: {
        select: {
          id: true,
          username: true,
          displayName: true
        }
      }
    },
    first: 10
  }).execute();

  // Return type should be narrowed
  if (orders.data?.orders?.nodes[0]) {
    const order = orders.data.orders.nodes[0];
    console.log(order.id);
    console.log(order.orderNumber);
    // Uncomment to verify TypeScript error:
    // console.log(order.totalAmount); // Error: Property 'totalAmount' does not exist
  }
}

async function testHasManyRelation() {
  // Test hasMany relation: Order.orderItems -> OrderItemsConnection
  const orders = await db.order.findMany({
    select: {
      id: true,
      // hasMany: should accept nested select + pagination params
      orderItems: {
        select: {
          id: true,
          quantity: true,
          price: true
        },
        first: 5
        // filter and orderBy are also available but not tested here
      }
    }
  }).execute();

  return orders;
}

async function testManyToManyRelation() {
  // Test manyToMany relation: Order.productsByOrderItemOrderIdAndProductId -> ProductsConnection
  const orders = await db.order.findMany({
    select: {
      id: true,
      // manyToMany through junction table
      productsByOrderItemOrderIdAndProductId: {
        select: {
          id: true,
          name: true,
          price: true
        },
        first: 10
      }
    }
  }).execute();

  return orders;
}

async function testNestedRelations() {
  // Test multiple levels of relations
  const products = await db.product.findMany({
    select: {
      id: true,
      name: true,
      // belongsTo: seller
      seller: {
        select: {
          id: true,
          username: true
        }
      },
      // belongsTo: category
      category: {
        select: {
          id: true,
          name: true
        }
      },
      // hasMany: reviews
      reviews: {
        select: {
          id: true,
          rating: true,
          comment: true
        },
        first: 5
      }
    },
    first: 10
  }).execute();

  return products;
}

// ============================================================================
// RUNTIME TEST
// ============================================================================

async function runTests() {
  console.log('Type inference tests:');
  console.log('1. BelongsTo relation...');
  await testBelongsToRelation();
  
  console.log('2. HasMany relation...');
  await testHasManyRelation();
  
  console.log('3. ManyToMany relation...');
  await testManyToManyRelation();
  
  console.log('4. Nested relations...');
  await testNestedRelations();
  
  console.log('\nAll type inference tests passed!');
}

// This file is primarily for type checking, but can be run for verification
runTests().catch(console.error);
