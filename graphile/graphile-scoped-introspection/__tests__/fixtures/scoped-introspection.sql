create schema scope_root;
create schema scope_dependency;
create schema scope_unrelated;
create schema scope_extension;
create schema scope_capability_root;

create extension pg_trgm with schema scope_extension;

create type scope_dependency.item_status as enum (
  'draft',
  'active',
  'archived'
);

create domain scope_dependency.positive_integer as integer
  check (value > 0);

create type scope_dependency.item_payload as (
  status scope_dependency.item_status,
  score scope_dependency.positive_integer
);

create type scope_dependency.integer_span as range (
  subtype = integer,
  multirange_type_name = scope_dependency.integer_span_set
);

create table scope_dependency.dependency_owners (
  id bigint generated always as identity primary key,
  status scope_dependency.item_status not null
);

create table scope_dependency.inherited_base (
  inherited_status scope_dependency.item_status not null
);

create table scope_root.closure_items (
  id bigint generated always as identity primary key,
  dependency_owner_id bigint not null
    references scope_dependency.dependency_owners (id),
  title text not null,
  status scope_dependency.item_status not null,
  score scope_dependency.positive_integer not null,
  payload scope_dependency.item_payload not null,
  active_span scope_dependency.integer_span
);

create table scope_root.inherited_items (
  id bigint generated always as identity primary key
) inherits (scope_dependency.inherited_base);

create table scope_root.inheritance_root (
  id bigint generated always as identity primary key,
  root_note text not null
);

create table scope_dependency.reverse_inherited_item (
  dependency_note text not null
) inherits (scope_root.inheritance_root);

create index closure_items_status_idx
  on scope_root.closure_items (status);

create index closure_items_title_gin_trgm_idx
  on scope_root.closure_items
  using gin (title scope_extension.gin_trgm_ops);

create index closure_items_title_gist_trgm_idx
  on scope_root.closure_items
  using gist (title scope_extension.gist_trgm_ops(siglen = 32));

create function scope_root.echo_dependency_status(
  input_status scope_dependency.item_status
)
returns scope_dependency.item_status
language sql
immutable
strict
parallel safe
as $$
  select input_status;
$$;

create function scope_root.make_dependency_payload(
  input_status scope_dependency.item_status,
  input_score scope_dependency.positive_integer
)
returns scope_dependency.item_payload
language sql
immutable
strict
parallel safe
as $$
  select row(input_status, input_score)::scope_dependency.item_payload;
$$;

create type scope_unrelated.item_status as enum (
  'draft',
  'active',
  'archived'
);

create table scope_unrelated.closure_items (
  id bigint generated always as identity primary key,
  status scope_unrelated.item_status not null
);

create function scope_unrelated.echo_dependency_status(
  input_status scope_unrelated.item_status
)
returns scope_unrelated.item_status
language sql
immutable
strict
parallel safe
as $$
  select input_status;
$$;

create table scope_capability_root.capability_items (
  id bigint generated always as identity primary key,
  title text not null
);

insert into scope_dependency.dependency_owners (status)
values ('active');

insert into scope_root.closure_items (
  dependency_owner_id,
  title,
  status,
  score,
  payload
)
values (
  1,
  'scoped fixture item',
  'active',
  7,
  row('active', 7)::scope_dependency.item_payload
);
