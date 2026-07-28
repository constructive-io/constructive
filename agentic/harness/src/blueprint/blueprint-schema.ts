import { z } from 'zod';

const FieldBlueprintSchema = z.object({
  name: z.string().describe('Field name in snake_case'),
  type: z
    .string()
    .describe(
      'PostgreSQL type: uuid, text, integer, smallint, numeric, boolean, date, timestamp, timestamptz, time, json, jsonb, inet, citext, email, url, image, upload'
    ),
  is_required: z.boolean().optional().describe('Whether the field is NOT NULL'),
  default: z
    .union([z.string(), z.null()])
    .optional()
    .describe('SQL default expression, e.g. "uuidv7()", "now()", "\'draft\'"'),
});

const PolicyBlueprintSchema = z.object({
  $type: z
    .string()
    .describe(
      'Policy type: AuthzDirectOwner, AuthzEntityMembership, AuthzAllowAll, AuthzPublishable, AuthzAppMembership'
    ),
  data: z.record(z.string(), z.unknown()).optional().describe('Policy config overrides'),
  privileges: z
    .array(z.string())
    .optional()
    .describe(
      'SQL privileges this policy applies to, lowercase, e.g. ["select","insert","update","delete"]. Defaults to all.'
    ),
  policy_role: z.string().optional().describe('Role name. Defaults to "authenticated".'),
  permissive: z
    .boolean()
    .optional()
    .describe('Whether permissive (true) or restrictive (false). Defaults to true.'),
});

const NodeBlueprintSchema = z.union([
  z.string().describe('Node type shorthand, e.g. "DataTimestamps"'),
  z.object({
    $type: z.string().describe('Node type, e.g. "DataDirectOwner"'),
    data: z.record(z.string(), z.unknown()).optional().describe('Node configuration data'),
  }),
]);

const DeleteActionSchema = z
  .enum(['c', 'r', 'n', 'a', 'd'])
  .describe(
    'FK delete action: c=CASCADE, r=RESTRICT, n=SET NULL, a=NO ACTION (default), d=SET DEFAULT'
  );

const BelongsToRelationSchema = z.object({
  $type: z.literal('RelationBelongsTo'),
  source_table: z.string().describe('Source table name'),
  target_table: z.string().describe('Target table name'),
  field_name: z.string().describe('FK column name on the source table, e.g. "author_id"'),
  delete_action: DeleteActionSchema.optional(),
  is_required: z.boolean().optional().describe('Whether the FK is NOT NULL (default: true)'),
});

const ManyToManyRelationSchema = z.object({
  $type: z.literal('RelationManyToMany'),
  source_table: z.string().describe('Source table name'),
  target_table: z.string().describe('Target table name'),
  junction_table_name: z.string().describe('Junction table name, e.g. "post_tags"'),
  delete_action: DeleteActionSchema.optional(),
});

const RelationBlueprintSchema = z.union([BelongsToRelationSchema, ManyToManyRelationSchema]);

const TableBlueprintSchema = z.object({
  table_name: z.string().describe('PostgreSQL table name in snake_case, plural'),
  nodes: z
    .array(NodeBlueprintSchema)
    .optional()
    .describe(
      'Data behavior nodes (e.g. DataTimestamps, DataSoftDelete). DataId and DataTimestamps are auto-included.'
    ),
  fields: z
    .array(FieldBlueprintSchema)
    .optional()
    .describe(
      'Custom fields only — do NOT include id, timestamps, or node-generated fields (owner_id, entity_id, is_published, published_at)'
    ),
  policies: z
    .array(PolicyBlueprintSchema)
    .describe('RLS policies for this table. At least one required.'),
});

export const BlueprintDefinitionZod = z.object({
  tables: z.array(TableBlueprintSchema).describe('Tables to create'),
  relations: z
    .array(RelationBlueprintSchema)
    .optional()
    .describe('Relations between tables'),
});

export const BlueprintZod = z.object({
  name: z.string().describe('Blueprint name in snake_case'),
  description: z.string().describe('Brief description of what this schema is for'),
  definition: BlueprintDefinitionZod,
  categories: z
    .array(z.string())
    .optional()
    .describe('Template categories if saved as template, e.g. ["e-commerce", "healthcare"]'),
  tags: z
    .array(z.string())
    .optional()
    .describe('Freeform search tags if saved as template, e.g. ["products", "orders"]'),
});

/**
 * JSON Schema objects for hosts that hand tool parameter schemas to an agent
 * runtime (e.g. pi's `ToolDefinition.parameters`). Same shapes the previous
 * typebox exports produced.
 */
export const BlueprintDefinitionSchema = toJsonSchema(BlueprintDefinitionZod);
export const BlueprintSchema = toJsonSchema(BlueprintZod);

function toJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _$schema, ...rest } = z.toJSONSchema(schema, { target: 'draft-7' });
  return rest;
}

export type Blueprint = z.infer<typeof BlueprintZod>;
export type BlueprintDefinition = z.infer<typeof BlueprintDefinitionZod>;
export type TableBlueprint = z.infer<typeof TableBlueprintSchema>;
export type FieldBlueprint = z.infer<typeof FieldBlueprintSchema>;
export type PolicyBlueprint = z.infer<typeof PolicyBlueprintSchema>;
export type RelationBlueprint = z.infer<typeof RelationBlueprintSchema>;
export type NodeBlueprint = z.infer<typeof NodeBlueprintSchema>;
