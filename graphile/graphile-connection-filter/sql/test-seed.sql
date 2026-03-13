-- Test seed for graphile-connection-filter
-- Creates tables covering all filter scenarios: scalars, relations, computed columns

CREATE SCHEMA IF NOT EXISTS filter_test;

-- ============================================================================
-- SCALAR TYPES TABLE
-- ============================================================================
CREATE TABLE filter_test.items (
  id serial PRIMARY KEY,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  quantity int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  rating float,
  created_at timestamptz NOT NULL DEFAULT now(),
  tags text[]
);

-- ============================================================================
-- RELATION TABLES (forward + backward)
-- ============================================================================
CREATE TABLE filter_test.categories (
  id serial PRIMARY KEY,
  name text NOT NULL,
  description text
);

CREATE TABLE filter_test.products (
  id serial PRIMARY KEY,
  name text NOT NULL,
  category_id int NOT NULL REFERENCES filter_test.categories(id),
  price numeric(10,2) NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true
);

-- Index on the FK column so relation filters work with requireIndex
CREATE INDEX idx_products_category_id ON filter_test.products(category_id);

CREATE TABLE filter_test.reviews (
  id serial PRIMARY KEY,
  product_id int NOT NULL REFERENCES filter_test.products(id),
  reviewer_name text NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text
);

-- Index on the FK column so relation filters work with requireIndex
CREATE INDEX idx_reviews_product_id ON filter_test.reviews(product_id);

-- One-to-one: each product has at most one detail record
CREATE TABLE filter_test.product_details (
  id serial PRIMARY KEY,
  product_id int NOT NULL UNIQUE REFERENCES filter_test.products(id),
  weight_kg float,
  dimensions text,
  sku text NOT NULL
);

CREATE INDEX idx_product_details_product_id ON filter_test.product_details(product_id);

-- ============================================================================
-- COMPUTED COLUMN FUNCTION
-- ============================================================================
CREATE FUNCTION filter_test.items_full_label(item filter_test.items)
RETURNS text AS $$
  SELECT item.name || ' - ' || item.description;
$$ LANGUAGE sql STABLE;

CREATE FUNCTION filter_test.products_display_name(product filter_test.products)
RETURNS text AS $$
  SELECT product.name || ' ($' || product.price::text || ')';
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Items (for scalar operator tests)
INSERT INTO filter_test.items (name, description, price, quantity, is_active, rating, tags) VALUES
  ('Widget A', 'A basic widget', 9.99, 100, true, 4.5, ARRAY['popular', 'sale']),
  ('Widget B', 'An advanced widget', 19.99, 50, true, 3.8, ARRAY['new']),
  ('Gadget X', 'A cool gadget', 49.99, 25, false, 4.9, ARRAY['popular', 'premium']),
  ('Gadget Y', NULL, 29.99, 0, true, NULL, NULL),
  ('Doohickey', 'A mysterious doohickey', 99.99, 10, false, 2.1, ARRAY['clearance']);

-- Categories
INSERT INTO filter_test.categories (name, description) VALUES
  ('Electronics', 'Electronic devices and accessories'),
  ('Clothing', 'Apparel and fashion'),
  ('Books', 'Physical and digital books');

-- Products (linked to categories)
INSERT INTO filter_test.products (name, category_id, price, is_available) VALUES
  ('Laptop', 1, 999.99, true),
  ('Phone', 1, 699.99, true),
  ('T-Shirt', 2, 19.99, true),
  ('Jeans', 2, 49.99, false),
  ('Novel', 3, 14.99, true),
  ('Textbook', 3, 79.99, true);

-- Reviews (linked to products)
INSERT INTO filter_test.reviews (product_id, reviewer_name, rating, comment) VALUES
  (1, 'Alice', 5, 'Excellent laptop!'),
  (1, 'Bob', 4, 'Good but expensive'),
  (2, 'Charlie', 3, 'Average phone'),
  (3, 'Diana', 5, 'Love this shirt'),
  (5, 'Eve', 4, 'Great read');
-- Note: products 4 (Jeans) and 6 (Textbook) have no reviews

-- Product details (one-to-one with products)
INSERT INTO filter_test.product_details (product_id, weight_kg, dimensions, sku) VALUES
  (1, 2.1, '35x25x2cm', 'LAP-001'),
  (2, 0.2, '15x7x0.8cm', 'PHN-001'),
  (3, 0.15, NULL, 'TSH-001'),
  (5, 0.4, '21x14x2cm', 'NOV-001');
-- Note: products 4 (Jeans) and 6 (Textbook) have no details
