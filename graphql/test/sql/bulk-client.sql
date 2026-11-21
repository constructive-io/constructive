CREATE SCHEMA bulk_test;
CREATE TABLE bulk_test.items (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  quantity int NOT NULL DEFAULT 0
);
COMMENT ON TABLE bulk_test.items IS E'@behavior +bulkInsert +bulkUpsert +bulkUpdate +bulkDelete';
INSERT INTO bulk_test.items (name, quantity) VALUES ('Widget A', 100);
