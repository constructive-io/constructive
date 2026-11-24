import type { BlueprintDefinition } from '../src/blueprint-types.generated';

test('types accept the builder field and schema-qualified relation inputs', () => {
  const definition = {
    tables: [{
      table_name: 'projects',
      fields: [{
        name: 'status',
        type: { name: 'text' },
        default: { value: 'pending' },
        is_required: true
      }]
    }],
    relations: [{
      $type: 'RelationBelongsTo',
      source_table: 'projects',
      source_schema: 'app_public',
      target_table: 'organizations',
      target_schema: 'app_public',
      delete_action: 'r'
    }]
  } satisfies BlueprintDefinition;

  expect(definition.tables[0].fields[0].default.value).toBe('pending');
});
