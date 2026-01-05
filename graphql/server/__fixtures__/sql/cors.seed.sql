BEGIN;

INSERT INTO services_public.api_modules (id, database_id, api_id, name, data) VALUES
  ('99999999-9999-9999-9999-999999999999', '0b22e268-16d6-582b-950a-24e108688849', '11111111-1111-1111-1111-111111111111', 'cors',
   '{"urls": ["https://allowed.example.com", "https://app.example.com"]}');

COMMIT;
