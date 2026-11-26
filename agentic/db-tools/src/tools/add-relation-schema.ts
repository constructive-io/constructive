import { identifierParam, strictObject } from '@agentic-kit/harness';
import type { BlueprintRelation } from 'node-type-registry';
import { z } from 'zod';

// delete_action is always sent: the backend refuses a RelationBelongsTo
// without one. It defaults to 'a' (NO ACTION) so the model never has to
// supply it.
export const DeleteAction = z
  .enum(['c', 'r', 'n', 'a', 'd'])
  .describe(
    'FK delete action: c=CASCADE, r=RESTRICT, n=SET NULL, a=NO ACTION (default), d=SET DEFAULT',
  );

export const AddRelationZod = strictObject('the input', {
  relation_type: z
    .enum(['belongs_to', 'many_to_many'])
    .describe(
      'belongs_to adds an FK column on the source table; many_to_many adds a junction table. Defaults to belongs_to.',
    )
    .optional(),
  source_table: identifierParam().describe('Existing source table name (snake_case).'),
  target_table: identifierParam().describe('Existing target table name (snake_case).'),
  field_name: identifierParam()
    .describe('belongs_to only: FK column name to add on the source table, e.g. "author_id".')
    .optional(),
  junction_table_name: identifierParam()
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

// Build a relation-only blueprint definition (no tables): constructBlueprint
// applies relations to existing tables without recreating them, as long as
// delete_action is supplied.
export function buildRelation(params: AddRelationParams): BlueprintRelation[] {
  const deleteAction = params.delete_action ?? 'a';
  if ((params.relation_type ?? 'belongs_to') === 'many_to_many') {
    // The backend reads delete_action for every relation; the registry's type of this one does not name it.
    return [
      {
        $type: 'RelationManyToMany',
        source_table: params.source_table,
        target_table: params.target_table,
        junction_table_name: params.junction_table_name as string,
        delete_action: deleteAction,
      } as BlueprintRelation,
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
