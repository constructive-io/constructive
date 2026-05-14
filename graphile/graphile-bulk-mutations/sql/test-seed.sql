-- Test seed for graphile-bulk-mutations
-- Creates tables with smart tags enabling bulk operations

CREATE SCHEMA IF NOT EXISTS bulk_test;

-- ============================================================================
-- ITEMS TABLE (all bulk ops enabled)
-- ============================================================================
CREATE TABLE bulk_test.items (
  id serial PRIMARY KEY,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  quantity int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

COMMENT ON TABLE bulk_test.items IS E'@behavior +bulkInsert +bulkUpsert +bulkUpdate +bulkDelete';

-- Unique constraint for upsert ON CONFLICT testing
ALTER TABLE bulk_test.items ADD CONSTRAINT items_name_unique UNIQUE (name);

-- ============================================================================
-- CATEGORIES TABLE (insert + upsert only)
-- ============================================================================
CREATE TABLE bulk_test.categories (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text
);

COMMENT ON TABLE bulk_test.categories IS E'@behavior +bulkInsert +bulkUpsert';

-- ============================================================================
-- PRODUCTS TABLE (all bulk ops, with FK to categories)
-- ============================================================================
CREATE TABLE bulk_test.products (
  id serial PRIMARY KEY,
  name text NOT NULL,
  category_id int NOT NULL REFERENCES bulk_test.categories(id),
  price numeric(10,2) NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true
);

COMMENT ON TABLE bulk_test.products IS E'@behavior +bulkInsert +bulkUpdate +bulkDelete';

CREATE INDEX idx_products_category_id ON bulk_test.products(category_id);

-- ============================================================================
-- NO_BULK TABLE (no smart tags, should NOT have bulk mutations)
-- ============================================================================
CREATE TABLE bulk_test.no_bulk (
  id serial PRIMARY KEY,
  value text
);

-- ============================================================================
-- ORDERS TABLE (for relational/nested insert testing)
-- ============================================================================
CREATE TABLE bulk_test.orders (
  id serial PRIMARY KEY,
  customer_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
);

COMMENT ON TABLE bulk_test.orders IS E'@behavior +bulkInsert';

-- ============================================================================
-- ORDER_ITEMS TABLE (child of orders, for nested insert testing)
-- ============================================================================
CREATE TABLE bulk_test.order_items (
  id serial PRIMARY KEY,
  order_id int NOT NULL REFERENCES bulk_test.orders(id),
  product_name text NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL
);

COMMENT ON TABLE bulk_test.order_items IS E'@behavior +bulkInsert';

CREATE INDEX idx_order_items_order_id ON bulk_test.order_items(order_id);

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Categories
INSERT INTO bulk_test.categories (name, description) VALUES
  ('Electronics', 'Electronic devices'),
  ('Books', 'Physical and digital books');

-- Items
INSERT INTO bulk_test.items (name, description, price, quantity, is_active) VALUES
  ('Widget A', 'A basic widget', 9.99, 100, true),
  ('Widget B', 'An advanced widget', 19.99, 50, true),
  ('Gadget X', 'A cool gadget', 49.99, 25, false);

-- Products
INSERT INTO bulk_test.products (name, category_id, price, is_available) VALUES
  ('Laptop', 1, 999.99, true),
  ('Phone', 1, 699.99, true),
  ('Novel', 2, 14.99, true);
