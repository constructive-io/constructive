CREATE FUNCTION bulk_test.items_label(item bulk_test.plain_items) RETURNS text
  LANGUAGE sql STABLE AS $$ SELECT 'plain:' || item.quantity::text $$;
