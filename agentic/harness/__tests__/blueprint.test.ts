import { expandBlueprintDefaults } from '../src/blueprint/blueprint-defaults';
import type { BlueprintDefinition } from '../src/blueprint/blueprint-schema';
import { fieldTypeToTypeName, toFieldDefault, toFieldType } from '../src/blueprint/field-type';

describe('field-type conversions', () => {
  it('round-trips array types', () => {
    expect(toFieldType('text[]')).toEqual({ name: 'text', array_dimensions: 1 });
    expect(fieldTypeToTypeName({ name: 'text', array_dimensions: 1 })).toBe('text[]');
  });

  it('parses defaults into structured FieldDefault values', () => {
    expect(toFieldDefault('now()')).toEqual({ function: 'now' });
    expect(toFieldDefault('CURRENT_TIMESTAMP')).toEqual({ sql_keyword: 'CURRENT_TIMESTAMP' });
    expect(toFieldDefault("'draft'")).toEqual({ value: 'draft' });
    expect(toFieldDefault('42')).toEqual({ value: 42 });
    expect(toFieldDefault(null)).toBeUndefined();
  });
});

describe('expandBlueprintDefaults', () => {
  it('derives nodes, default grants, and policy defaults for a bare table', () => {
    const definition: BlueprintDefinition = {
      tables: [
        {
          table_name: 'posts',
          fields: [
            { name: 'id', type: 'uuid' },
            { name: 'title', type: 'text', is_required: true },
          ],
          policies: [{ $type: 'AuthzDirectOwner' }],
        },
      ],
    };
    const expanded = expandBlueprintDefaults(definition) as {
      tables: Array<Record<string, unknown>>;
    };
    const table = expanded.tables[0];
    expect(table.table_name).toBe('posts');
    expect(table.use_rls).toBe(true);
    expect(Array.isArray(table.grants)).toBe(true);
    const nodeTypes = (table.nodes as Array<string | { $type: string }>).map((n) =>
      typeof n === 'string' ? n : n.$type
    );
    expect(nodeTypes[0]).toBe('DataId');
    expect(nodeTypes[nodeTypes.length - 1]).toBe('DataTimestamps');
    // auto-generated id field is stripped from explicit fields
    const fields = table.fields as Array<{ name: string }>;
    expect(fields.map((f) => f.name)).toEqual(['title']);
    const policies = table.policies as Array<Record<string, unknown>>;
    expect(policies[0].policy_role).toBe('authenticated');
    expect(policies[0].permissive).toBe(true);
  });
});
