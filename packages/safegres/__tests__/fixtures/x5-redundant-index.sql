-- X5 seed: a duplicate index, a prefix index, and shapes that must not be
-- reported (unique, partial, expression, constraint-backed).
-- Expected findings: X5 on widgets_tenant_a_idx, widgets_tenant_b_idx (its
-- duplicate), and widgets_tenant_idx (a prefix of both).

CREATE SCHEMA IF NOT EXISTS fx_x5;

CREATE TABLE fx_x5.widgets (
  id bigint PRIMARY KEY,
  tenant_id bigint,
  kind text,
  slug text,
  archived_at timestamptz
);

CREATE INDEX widgets_tenant_a_idx ON fx_x5.widgets (tenant_id, kind);
CREATE INDEX widgets_tenant_b_idx ON fx_x5.widgets (tenant_id, kind);

CREATE INDEX widgets_tenant_idx ON fx_x5.widgets (tenant_id);
CREATE INDEX widgets_tenant_kind_idx ON fx_x5.widgets (tenant_id, kind, slug);

-- Not redundant: unique, partial, and expression indexes each carry semantics
-- a wider plain index does not.
CREATE UNIQUE INDEX widgets_slug_uidx ON fx_x5.widgets (slug);
CREATE INDEX widgets_slug_live_idx ON fx_x5.widgets (slug) WHERE archived_at IS NULL;
CREATE INDEX widgets_slug_lower_idx ON fx_x5.widgets (lower(slug));
