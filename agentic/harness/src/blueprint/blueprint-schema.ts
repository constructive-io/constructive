import { type Static, Type } from 'typebox';

const FieldBlueprint = Type.Object({
  name: Type.String({ description: 'Field name in snake_case' }),
  type: Type.String({
    description:
      'PostgreSQL type: uuid, text, integer, smallint, numeric, boolean, date, timestamp, timestamptz, time, json, jsonb, inet, citext, email, url, image, upload',
  }),
  is_required: Type.Optional(Type.Boolean({ description: 'Whether the field is NOT NULL' })),
  default: Type.Optional(
    Type.Union([Type.String(), Type.Null()], {
      description: 'SQL default expression, e.g. "uuidv7()", "now()", "\'draft\'"',
    }),
  ),
});

const PolicyBlueprint = Type.Object({
  $type: Type.String({
    description:
      'Policy type: AuthzDirectOwner, AuthzEntityMembership, AuthzAllowAll, AuthzPublishable, AuthzAppMembership',
  }),
  data: Type.Optional(
    Type.Record(Type.String(), Type.Unknown(), { description: 'Policy config overrides' }),
  ),
  privileges: Type.Optional(
    Type.Array(Type.String(), {
      description:
        'SQL privileges this policy applies to, lowercase, e.g. ["select","insert","update","delete"]. Defaults to all.',
    }),
  ),
  policy_role: Type.Optional(
    Type.String({ description: 'Role name. Defaults to "authenticated".' }),
  ),
  permissive: Type.Optional(
    Type.Boolean({
      description: 'Whether permissive (true) or restrictive (false). Defaults to true.',
    }),
  ),
});

const NodeBlueprint = Type.Union([
  Type.String({ description: 'Node type shorthand, e.g. "DataTimestamps"' }),
  Type.Object({
    $type: Type.String({ description: 'Node type, e.g. "DataDirectOwner"' }),
    data: Type.Optional(
      Type.Record(Type.String(), Type.Unknown(), { description: 'Node configuration data' }),
    ),
  }),
]);

const DeleteAction = Type.Union(
  [
    Type.Literal('c'),
    Type.Literal('r'),
    Type.Literal('n'),
    Type.Literal('a'),
    Type.Literal('d'),
  ],
  {
    description:
      'FK delete action: c=CASCADE, r=RESTRICT, n=SET NULL, a=NO ACTION (default), d=SET DEFAULT',
  },
);

const BelongsToRelation = Type.Object({
  $type: Type.Literal('RelationBelongsTo'),
  source_table: Type.String({ description: 'Source table name' }),
  target_table: Type.String({ description: 'Target table name' }),
  field_name: Type.String({ description: 'FK column name on the source table, e.g. "author_id"' }),
  delete_action: Type.Optional(DeleteAction),
  is_required: Type.Optional(
    Type.Boolean({ description: 'Whether the FK is NOT NULL (default: true)' }),
  ),
});

const ManyToManyRelation = Type.Object({
  $type: Type.Literal('RelationManyToMany'),
  source_table: Type.String({ description: 'Source table name' }),
  target_table: Type.String({ description: 'Target table name' }),
  junction_table_name: Type.String({ description: 'Junction table name, e.g. "post_tags"' }),
  delete_action: Type.Optional(DeleteAction),
});

const RelationBlueprint = Type.Union([BelongsToRelation, ManyToManyRelation]);

const TableBlueprint = Type.Object({
  table_name: Type.String({ description: 'PostgreSQL table name in snake_case, plural' }),
  nodes: Type.Optional(
    Type.Array(NodeBlueprint, {
      description:
        'Data behavior nodes (e.g. DataTimestamps, DataSoftDelete). DataId and DataTimestamps are auto-included.',
    }),
  ),
  fields: Type.Optional(
    Type.Array(FieldBlueprint, {
      description:
        'Custom fields only — do NOT include id, timestamps, or node-generated fields (owner_id, entity_id, is_published, published_at)',
    }),
  ),
  policies: Type.Array(PolicyBlueprint, {
    description: 'RLS policies for this table. At least one required.',
  }),
});

export const BlueprintDefinitionSchema = Type.Object({
  tables: Type.Array(TableBlueprint, { description: 'Tables to create' }),
  relations: Type.Optional(
    Type.Array(RelationBlueprint, { description: 'Relations between tables' }),
  ),
});

export const BlueprintSchema = Type.Object({
  name: Type.String({ description: 'Blueprint name in snake_case' }),
  description: Type.String({ description: 'Brief description of what this schema is for' }),
  definition: BlueprintDefinitionSchema,
  categories: Type.Optional(
    Type.Array(Type.String(), {
      description: 'Template categories if saved as template, e.g. ["e-commerce", "healthcare"]',
    }),
  ),
  tags: Type.Optional(
    Type.Array(Type.String(), {
      description: 'Freeform search tags if saved as template, e.g. ["products", "orders"]',
    }),
  ),
});

export type Blueprint = Static<typeof BlueprintSchema>;
export type BlueprintDefinition = Static<typeof BlueprintDefinitionSchema>;
export type TableBlueprint = Static<typeof TableBlueprint>;
export type FieldBlueprint = Static<typeof FieldBlueprint>;
export type PolicyBlueprint = Static<typeof PolicyBlueprint>;
export type RelationBlueprint = Static<typeof RelationBlueprint>;
export type NodeBlueprint = Static<typeof NodeBlueprint>;
