# LLM Metering Architecture

How graphile-llm integrates with the billing module to meter LLM inference costs
across two tiers: platform (Constructive → database owner) and tenant (database owner → end users).

---

## Two-Tier Billing Model

LLM inference serves two distinct user populations with different billing relationships:

1. **Constructive App Users** — people using the Constructive platform to build databases.
   LLM costs are Constructive infrastructure. entity_id = database_id.

2. **Generated DB App Users** — end users of apps built on Constructive-generated databases.
   Their `user_id` only exists in the generated DB. The database owner should pay Constructive;
   the owner may pass costs through to their users.

```
LLM Provider (OpenAI, Ollama, etc.)
    ↑ one API call, one charge
    │
Constructive Platform
    │
    ├── Tier 1: PLATFORM billing ─────────────────────────────────────────
    │   entity_id  = database_id
    │   meter_slug = model name (e.g. 'text-embedding-3-small')
    │   Tracked in: platform billing tables
    │   Purpose:    Constructive bills the database owner
    │   Always:     yes (Constructive needs to track costs)
    │
    └── Tier 2: TENANT billing ───────────────────────────────────────────
        entity_id  = actor_id (jwt.claims.user_id in generated DB)
        meter_slug = model name (e.g. 'text-embedding-3-small')
        Tracked in: generated DB's own billing_module (if provisioned)
        Purpose:    App owner tracks/limits per-user LLM usage
        Always:     no (only if billing_module is provisioned on the DB)
```

Cost flows one direction: `LLM Provider → Constructive → DB Owner → (optionally) End User`.
Each level pays the level above. Constructive helps at every level by providing the accounting.

---

## Meter Slug = Model Name

Each LLM model gets its own meter. The meter slug IS the model name — no mapping, no guessing:

```sql
INSERT INTO meters (slug, display_name, meter_type, aggregation, credit_cost, category_meter)
VALUES
  -- Category pool (aggregates all model usage)
  ('inference', 'Inference', 'usage_pool', 'cumulative', 1, NULL),

  -- Per-model meters (slug = model name, category_meter → inference pool)
  ('text-embedding-3-small', 'text-embedding-3-small', 'quota', 'cumulative', 1, 'inference'),
  ('text-embedding-3-large', 'text-embedding-3-large', 'quota', 'cumulative', 2, 'inference'),
  ('nomic-embed-text',       'nomic-embed-text',       'quota', 'cumulative', 1, 'inference'),
  ('gpt-4o-mini',            'gpt-4o-mini',            'quota', 'cumulative', 3, 'inference'),
  ('gpt-4o',                 'gpt-4o',                 'quota', 'cumulative', 10, 'inference'),
  ('claude-sonnet-4-20250514',     'claude-sonnet-4-20250514',     'quota', 'cumulative', 8, 'inference');
```

The `credit_cost` reflects relative model expense (embedding-3-small = 1, gpt-4o = 10).
When a new model is added, insert a meter row. The plugin doesn't change.

---

## Three-Level Waterfall

The billing module's `category_meter` field creates an automatic three-level overflow:

```
record_usage('text-embedding-3-small', entity_id, 256)
    │
    ▼
┌─ Level 1: Per-model meter ──────────────────────────────────────────┐
│  slug = 'text-embedding-3-small'                                    │
│  Has its own balance, plan_limit, effective_limit                    │
│  If within quota → increment usage, write ledger, done              │
│  If exceeded → overflow to category pool                            │
└─────────────────────────────────────────────────────────────────────┘
    │ category_meter = 'inference'
    ▼
┌─ Level 2: Inference usage pool ─────────────────────────────────────┐
│  slug = 'inference'                                                  │
│  Shared pool across all model meters                                 │
│  cost = credit_cost × quantity (e.g. 1 × 256 = 256 pool units)     │
│  If within quota → charge pool, done                                 │
│  If exceeded → overflow to universal                                 │
└─────────────────────────────────────────────────────────────────────┘
    │ credit_cost on inference meter
    ▼
┌─ Level 3: Universal credits ────────────────────────────────────────┐
│  slug = 'universal'                                                  │
│  Last-resort fallback pool                                           │
│  If has capacity → charge universal, done                            │
│  If exhausted → record_usage returns false → quota exceeded          │
└─────────────────────────────────────────────────────────────────────┘
```

This is handled entirely by `record_usage()` — the metering plugin just calls it with the
model name as the meter slug. The billing module does the rest.

---

## Per-Plan Limits

Plans set the per-model and inference pool limits:

```sql
-- Starter plan: 10k inference pool, no per-model limits
('starter', 'inference', 10000)

-- Pro plan: 100k inference pool
('pro', 'inference', 100000)

-- Enterprise: unlimited
('enterprise', 'inference', -1)
```

Rate limits also apply at the inference level:

```sql
-- Starter: 2000 inference requests/hour per entity
('starter', 'inference', '1 hour', 'entity', 2000, '5 minutes')

-- Pro: 20000 inference requests/hour per entity
('pro', 'inference', '1 hour', 'entity', 20000, '2 minutes')
```

---

## Plugin Architecture

The metering plugin is separate from the pure LLM plugins:

```
┌─ LlmModulePlugin (pure) ──────────────────────────────────────────┐
│  Resolves embedder + chat completer from config/env                │
│  Exposes build.llmEmbedder and build.llmChatCompleter              │
│  No billing imports                                                │
└────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─ LlmMeteringPlugin (opt-in) ──────────────────────────────────────┐
│  Wraps build.llmEmbedder with metered version via AsyncLocalStorage│
│  Same function signature: (text: string) => Promise<number[]|null> │
│  Per-request context: entity_id, billing config, withPgClient      │
│  Calls: check_billing_quota(model_name, entity_id, est_tokens)     │
│  Then:  record_usage(model_name, entity_id, actual_tokens)         │
│  Quota exceeded → returns null                                     │
└────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─ Consumer plugins (pure) ──────────────────────────────────────────┐
│  LlmTextSearchPlugin — text → vector for search filters            │
│    null → skip vector path, text-only search continues             │
│  LlmTextMutationPlugin — text → vector for INSERT/UPDATE fields    │
│    null → throw EMBED_QUOTA_EXCEEDED error                         │
│  LlmRagPlugin — embed prompt + chat completion                     │
│    null → throw quota error                                        │
└────────────────────────────────────────────────────────────────────┘
```

### Enabling Metering

```typescript
// No metering (default)
GraphileLlmPreset({
  defaultEmbedder: { provider: 'ollama', model: 'nomic-embed-text' },
})

// With metering
GraphileLlmPreset({
  defaultEmbedder: { provider: 'ollama', model: 'nomic-embed-text' },
  metering: true,
})

// Custom entity_id resolution (e.g. bill the database owner, not the requesting user)
GraphileLlmPreset({
  defaultEmbedder: { provider: 'ollama', model: 'nomic-embed-text' },
  metering: {
    resolveEntityId: (pgSettings) => pgSettings['jwt.claims.database_id'],
  },
})
```

---

## Request Flow

```
1. User sends GraphQL query with unifiedSearch or vector mutation

2. LlmMeteringPlugin establishes AsyncLocalStorage context:
   - entity_id from resolveEntityId(pgSettings)
   - model name from build config
   - billing config from config-cache (LRU, 5-min TTL per database_id)
   - withPgClient for SQL calls

3. Consumer plugin calls build.llmEmbedder(text)
   → transparently calls metered wrapper

4. Metered wrapper:
   a. check_billing_quota(model_name, entity_id, estimated_tokens)
      → if false: return null (quota exceeded)
   b. Call actual embedding API
   c. record_usage(model_name, entity_id, actual_tokens)
      → fire-and-forget, billing module handles waterfall internally

5. Consumer plugin receives vector or null:
   - Search: null → skip vector, text-only fallback
   - Mutation: null → throw error to user
```

---

## Two-Tier Request Flow (Platform + Tenant)

When both platform and tenant billing are active:

```
1. Check PLATFORM quota:
   check_billing_quota(model_name, database_id, estimated_tokens)
   → "Can this database afford more LLM usage?"
   → If no: reject (DB owner exceeded their plan)

2. Check TENANT quota:
   check_billing_quota(model_name, actor_id, estimated_tokens)
   → "Can this user afford more LLM usage within this app?"
   → If billing_module not provisioned on generated DB: skip (allow)
   → If no: reject (per-user limit hit)

3. Call embedding API (one call, one charge from LLM provider)

4. Record PLATFORM usage:
   record_usage(model_name, database_id, actual_tokens)

5. Record TENANT usage:
   record_usage(model_name, actor_id, actual_tokens)
```

Both writes use the model name as the meter slug. The three-level waterfall
(per-model → inference pool → universal) runs independently at each tier.

---

## Config Cache

Billing configuration is cached per database_id to avoid SQL lookups on every LLM call:

- **LRU cache**: max 50 entries, 5-minute TTL
- **Key**: database_id
- **Value**: BillingConfig (meter slug, entity resolver, billing schema name) or null
- **Schema guard**: checks `information_schema.schemata` for `metaschema_modules_public`
  before querying `billing_module`. Missing schema → null → unmetered passthrough.

---

## Graceful Degradation

| Condition | Behavior |
|-----------|----------|
| `metering` option not set | No metering plugin loaded, pure passthrough |
| billing_module not provisioned | config-cache returns null, unmetered passthrough |
| `metaschema_modules_public` schema missing | null from schema guard, no error |
| entity_id not resolvable from JWT | unmetered passthrough |
| `check_billing_quota` throws | call is allowed (fail-open) |
| `record_usage` throws | call succeeds, recording silently skipped |
| Meter slug (model name) not found | `record_usage` returns false, call still succeeds |
| Per-model quota exceeded | waterfall to inference pool → universal |
| All three levels exceeded | embedder returns null, consumer handles it |

---

## Adding a New Model

1. Insert a meter row with the model name as slug:
   ```sql
   INSERT INTO meters (slug, display_name, meter_type, aggregation, credit_cost, category_meter)
   VALUES ('new-model-name', 'New Model', 'quota', 'cumulative', 5, 'inference');
   ```
2. The `credit_cost` sets the exchange rate to the inference pool (higher = more expensive).
3. No plugin code changes needed — the plugin reads the model name from `llm_module` config
   and passes it directly as the meter slug.

---

## Related

- [Limits & Billing Architecture](../../constructive-db/docs/limits-billing-architecture.md) — full billing module reference
- [Issue #892](https://github.com/constructive-io/constructive-planning/issues/892) — graphile-llm implementation plan
- [PR #1192](https://github.com/constructive-io/constructive/pull/1192) — Phase 1 metering implementation
