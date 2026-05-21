-- Metering E2E test seed — minimal billing + inference log infrastructure
--
-- Creates stub schemas and tables that match what the metering plugin
-- queries via config-cache.ts (metaschema_modules_public.billing_module,
-- metaschema_modules_public.inference_log_module, metaschema_public.schema).
--
-- Also creates simplified billing functions (check_billing_quota, record_usage)
-- that operate on a real meters/balances/ledger schema so the test can verify
-- actual quota enforcement and ledger writes.

-- ============================================================================
-- 1. Metaschema lookup infrastructure
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS metaschema_public;
CREATE SCHEMA IF NOT EXISTS metaschema_modules_public;

CREATE TABLE metaschema_public.schema (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_name text NOT NULL UNIQUE
);

-- billing_module config table (queried by config-cache.ts BILLING_MODULE_SQL)
CREATE TABLE metaschema_modules_public.billing_module (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id uuid NOT NULL,
  schema_id uuid NOT NULL REFERENCES metaschema_public.schema(id),
  private_schema_id uuid NOT NULL REFERENCES metaschema_public.schema(id),
  record_usage_function text NOT NULL DEFAULT 'record_usage'
);

-- inference_log_module config table (queried by config-cache.ts INFERENCE_LOG_MODULE_SQL)
CREATE TABLE metaschema_modules_public.inference_log_module (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id uuid NOT NULL,
  schema_id uuid NOT NULL REFERENCES metaschema_public.schema(id),
  inference_log_table_name text NOT NULL DEFAULT 'usage_log_inferences'
);

-- ============================================================================
-- 2. Billing schemas + tables
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS billing_public;
CREATE SCHEMA IF NOT EXISTS billing_private;

-- Meters table
CREATE TABLE billing_public.meters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL DEFAULT '',
  meter_type text NOT NULL DEFAULT 'quota',
  aggregation text NOT NULL DEFAULT 'cumulative',
  credit_cost numeric NOT NULL DEFAULT 1,
  category_meter text,
  period_interval interval,
  unit text
);

-- Balances table (one row per entity+meter)
CREATE TABLE billing_public.balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL,
  meter_slug text NOT NULL REFERENCES billing_public.meters(slug),
  balance numeric NOT NULL DEFAULT 0,
  UNIQUE(entity_id, meter_slug)
);

-- Ledger table (append-only log of all usage)
CREATE TABLE billing_public.ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL,
  meter_slug text NOT NULL,
  amount numeric NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Meter credits (quota limits per entity+meter)
CREATE TABLE billing_public.meter_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL,
  meter_slug text NOT NULL REFERENCES billing_public.meters(slug),
  credit_amount numeric NOT NULL DEFAULT 0,
  UNIQUE(entity_id, meter_slug)
);

-- ============================================================================
-- 3. Billing functions (simplified but functional)
-- ============================================================================

-- check_billing_quota: returns TRUE if entity has remaining quota
CREATE FUNCTION billing_private.check_billing_quota(
  p_meter_slug text,
  p_entity_id uuid,
  p_amount numeric
) RETURNS boolean AS $$
DECLARE
  v_balance numeric;
  v_credit numeric;
BEGIN
  SELECT COALESCE(balance, 0) INTO v_balance
  FROM billing_public.balances
  WHERE entity_id = p_entity_id AND meter_slug = p_meter_slug;

  SELECT COALESCE(credit_amount, 0) INTO v_credit
  FROM billing_public.meter_credits
  WHERE entity_id = p_entity_id AND meter_slug = p_meter_slug;

  -- No credit row means unlimited
  IF v_credit IS NULL THEN RETURN TRUE; END IF;
  IF v_credit = 0 THEN RETURN TRUE; END IF;

  RETURN COALESCE(v_balance, 0) + p_amount <= v_credit;
END;
$$ LANGUAGE plpgsql;

-- record_usage: deducts from balance and writes to ledger
CREATE FUNCTION billing_private.record_usage(
  p_meter_slug text,
  p_entity_id uuid,
  p_amount numeric,
  p_metadata jsonb DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Upsert balance
  INSERT INTO billing_public.balances (entity_id, meter_slug, balance)
  VALUES (p_entity_id, p_meter_slug, p_amount)
  ON CONFLICT (entity_id, meter_slug)
  DO UPDATE SET balance = billing_public.balances.balance + p_amount;

  -- Append to ledger
  INSERT INTO billing_public.ledger (entity_id, meter_slug, amount, metadata)
  VALUES (p_entity_id, p_meter_slug, p_amount, p_metadata);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. Inference log schema + table
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS usage_public;

CREATE TABLE usage_public.usage_log_inferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id uuid,
  entity_id uuid NOT NULL,
  actor_id uuid,
  model text NOT NULL,
  provider text,
  service text NOT NULL,
  operation text NOT NULL,
  input_tokens bigint NOT NULL DEFAULT 0,
  output_tokens bigint NOT NULL DEFAULT 0,
  total_tokens bigint NOT NULL DEFAULT 0,
  cache_read_tokens bigint,
  cache_write_tokens bigint,
  latency_ms bigint NOT NULL DEFAULT 0,
  rag_enabled boolean NOT NULL DEFAULT false,
  chunks_retrieved integer,
  embedding_model text,
  embedding_latency_ms bigint,
  status text NOT NULL DEFAULT 'success',
  error_type text,
  raw_usage jsonb,
  request_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 5. Seed metaschema config entries
--    database_id = '00000000-0000-0000-0000-000000000001' (test constant)
-- ============================================================================
INSERT INTO metaschema_public.schema (id, schema_name) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'billing_public'),
  ('a0000000-0000-0000-0000-000000000002', 'billing_private'),
  ('a0000000-0000-0000-0000-000000000003', 'usage_public');

INSERT INTO metaschema_modules_public.billing_module (database_id, schema_id, private_schema_id, record_usage_function)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'record_usage'
);

INSERT INTO metaschema_modules_public.inference_log_module (database_id, schema_id, inference_log_table_name)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000003',
  'usage_log_inferences'
);

-- ============================================================================
-- 6. Seed meters for embedding + chat
-- ============================================================================
INSERT INTO billing_public.meters (slug, display_name, unit, credit_cost) VALUES
  ('nomic-embed-text', 'Nomic Embed', 'characters', 1),
  ('inference', 'Inference Pool', 'credits', 1);

-- ============================================================================
-- 7. Grant access to all roles (tests run as various roles)
-- ============================================================================
GRANT USAGE ON SCHEMA metaschema_public TO PUBLIC;
GRANT USAGE ON SCHEMA metaschema_modules_public TO PUBLIC;
GRANT USAGE ON SCHEMA billing_public TO PUBLIC;
GRANT USAGE ON SCHEMA billing_private TO PUBLIC;
GRANT USAGE ON SCHEMA usage_public TO PUBLIC;

GRANT ALL ON ALL TABLES IN SCHEMA metaschema_public TO PUBLIC;
GRANT ALL ON ALL TABLES IN SCHEMA metaschema_modules_public TO PUBLIC;
GRANT ALL ON ALL TABLES IN SCHEMA billing_public TO PUBLIC;
GRANT ALL ON ALL TABLES IN SCHEMA billing_private TO PUBLIC;
GRANT ALL ON ALL TABLES IN SCHEMA usage_public TO PUBLIC;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA billing_private TO PUBLIC;
