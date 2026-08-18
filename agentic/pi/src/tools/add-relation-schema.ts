import type { BlueprintDefinition } from '@agentic-kit/harness';
import { z } from 'zod';

// delete_action is intentionally always sent: the backend REJECTS a
// RelationBelongsTo whose delete_action is absent ("PROVISION_RELATION:
// delete_action is required"). We default it to 'a' (NO ACTION) so the model
// never has to supply it.
export const DeleteAction = z
  .enum(['c', 'r', 'n', 'a', 'd'])
  .describe(
    'FK delete action: c=CASCADE, r=RESTRICT, n=SET NULL, a=NO ACTION (default), d=SET DEFAULT',
  );

export const AddRelationZod = z.object({
  relation_type: z
    .enum(['belongs_to', 'many_to_many'])
    .describe(
      'belongs_to adds an FK column on the source table; many_to_many adds a junction table. Defaults to belongs_to.',
    )
    .optional(),
  source_table: z.string().describe('Existing source table name (snake_case).'),
  target_table: z.string().describe('Existing target table name (snake_case).'),
  field_name: z
    .string()
    .describe('belongs_to only: FK column name to add on the source table, e.g. "author_id".')
    .optional(),
  junction_table_name: z
    .string()
    .describe('many_to_many only: name of the junction table to create, e.g. "post_tags".')
    .optional(),
  delete_action: DeleteAction.optional(),
  is_required: z
    .boolean()
    .describe(
      'belongs_to only: make the FK NOT NULL. Defaults to false — a NOT NULL FK fails if the source table already has rows.',
    )
    .optional(),
});

export type AddRelationParams = z.infer<typeof AddRelationZod>;

// Build a relation-only blueprint definition (no tables): the spike proved
// constructBlueprint applies relations to PRE-EXISTING tables without recreating
// them, as long as delete_action is supplied.
export function buildRelation(params: AddRelationParams): BlueprintDefinition['relations'] {
  const deleteAction = params.delete_action ?? 'a';
  if ((params.relation_type ?? 'belongs_to') === 'many_to_many') {
    return [
      {
        $type: 'RelationManyToMany',
        source_table: params.source_table,
        target_table: params.target_table,
        junction_table_name: params.junction_table_name as string,
        delete_action: deleteAction,
      },
    ];
  }
  return [
    {
      $type: 'RelationBelongsTo',
      source_table: params.source_table,
      target_table: params.target_table,
      field_name: params.field_name as string,
      delete_action: deleteAction,
      is_required: params.is_required ?? false,
    },
  ];
}
